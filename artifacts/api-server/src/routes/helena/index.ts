import { Router } from "express";
import { db } from "@workspace/db";
import { helenaCardMigrations } from "@workspace/db";
import { desc, eq, gte, lte, and, sql, count } from "drizzle-orm";
import { requireAuth, requireTenantAccess, type AuthenticatedRequest } from "../../middlewares/auth";
import { supabaseAdmin } from "../../lib/supabase";
import { recordHelenaHeartbeat, getHelenaWebhookStatus } from "../../jobs/helenaWebhookMonitor";
import { chamarJoanaDireto, clearJoanaHistory, getJoanaHistory } from "../../lib/joanaProvider";
import { detectarIntencao } from "../../lib/carlaProvider";
import { chamarMarcosDireto } from "../../lib/marcosProvider";
import { chamarLiaDireto } from "../../lib/liaProvider";
import { chamarCaioDireto } from "../../lib/caioProvider";
import { comercialLeads } from "@workspace/db";
import { logger } from "../../lib/logger";

// Cache slug lookup: UUID → slug
const slugCache = new Map<string, { slug: string; ts: number }>();

async function resolveTenantSlug(tenantId: string): Promise<string> {
  if (!tenantId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) return tenantId;
  const cached = slugCache.get(tenantId);
  if (cached && Date.now() - cached.ts < 300_000) return cached.slug;
  const { data } = await supabaseAdmin.from("tenants").select("slug").eq("id", tenantId).single();
  const slug = data?.slug ?? tenantId;
  slugCache.set(tenantId, { slug, ts: Date.now() });
  return slug;
}

// Cache slug → UUID (inverso do acima)
const slugToUuidCache = new Map<string, { id: string; ts: number }>();

async function resolveSlugToUuid(slug: string): Promise<string> {
  if (slug.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i)) return slug; // já é UUID
  const cached = slugToUuidCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  const id = data?.id ?? slug;
  slugToUuidCache.set(slug, { id, ts: Date.now() });
  return id;
}

const router = Router();

const WTS_BASE = "https://api.wts.chat";
const WTS_TOKEN = process.env.HELENA_API_TOKEN!;

const N8N_POSTFUNNEL_URL = "https://clovisart13.app.n8n.cloud/webhook/mirage-zapi-postfunnel-router";

// ── Eventos que indicam AGENTE ASSUMINDO a conversa ──────────────────────────
// Quando estes chegarem, chamamos set-human-control para bloquear toda automação.
const AGENT_TAKEOVER_EVENT_TYPES = new Set([
  "ATENDIMENTO_ASSUMIDO",
  "ATTENDANCE_ASSUMED",
  "AGENT_ASSIGNED",
  "ATENDIMENTO_EM_ANDAMENTO",
  "ATTENDANCE_IN_PROGRESS",
  "ATENDIMENTO_ACEITO",
  "ATTENDANCE_ACCEPTED",
  "CHAT_ASSIGNED",
  "AGENT_STARTED",
]);

// Eventos que indicam conversa ENCERRADA pelo agente → libera automação novamente
const AGENT_RELEASE_EVENT_TYPES = new Set([
  "ATENDIMENTO_ENCERRADO",
  "ATTENDANCE_CLOSED",
  "ATENDIMENTO_FINALIZADO",
  "ATTENDANCE_FINISHED",
  "CHAT_CLOSED",
  "AGENT_RELEASED",
  "ATENDIMENTO_TRANSFERIDO",
  "ATTENDANCE_TRANSFERRED",
  // WTS.chat/Helena — "Atendimento concluído" (confirmado 2026-07-15 via log real)
  "SESSION_COMPLETE",
  "SESSION_CLOSED",
  "SESSION_ENDED",
  "SESSION_FINISHED",
  "SESSION_RESOLVED",
  "SESSION_CONCLUDED",
  "ATTENDANCE_CONCLUDED",
]);

// "Atendimento alterado" (SESSION_UPDATE) → takeover quando agente é atribuído
// Precisamos checar o payload: se content.userId não é null, um humano assumiu.
// Se content.status === "RESOLVED" ou similar, foi encerrado.
const SESSION_UPDATE_TYPES = new Set([
  "SESSION_UPDATE",
  "SESSION_UPDATED",
  "ATTENDANCE_UPDATED",
  "ATENDIMENTO_ALTERADO",
]);

// Lock de concorrência: impede que duas mensagens do mesmo telefone sejam
// processadas em paralelo pela Joana, o que causaria respostas duplas e
// race conditions no set de human_in_control.
const processingPhones = new Set<string>();

// Tipos de evento do WTS.chat que indicam mensagem nova do contato
// "Atendimento criado" = nova conversa iniciada por um lead (evento mais provável)
// "Mensagem - recebido" = possivelmente recibo de entrega (delivery receipt) — incluído por precaução
const MESSAGE_EVENT_TYPES = new Set([
  // WTS.chat / Helena — eventos de atendimento (nova conversa do lead)
  "ATENDIMENTO_CRIADO",
  "ATTENDANCE_CREATED",
  "NEW_ATTENDANCE",
  // WTS.chat / Helena — eventos de mensagem recebida (confirmado pelo suporte Helena em 2026-07-13)
  // Configurável em Ajustes → Integrações → Webhooks na plataforma
  "MENSAGEM_RECEBIDO",
  "MENSAGEM_RECEBIDA",
  "MENSAGEM_RECEBIDA_CONTATO",
  "MENSAGEM_NOVA",
  "MESSAGE_RECEIVED",
  "Mensagem Recebida",        // nome exato conforme suporte Helena
  "mensagem_recebida",        // lowercase variant
  // Variantes genéricas
  "CHAT_MESSAGE_RECEIVED",
  "CONTACT_MESSAGE",
  "NEW_MESSAGE",
  "CHAT_RECEIVED",
  "CUSTOMER_MESSAGE",
]);

async function forwardMessageToN8n(payload: {
  company_slug: string;
  phone: string;
  message: string;
  lead_name?: string;
  event_type: string;
  channel: string;
}): Promise<void> {
  // Normaliza phone: só dígitos, garante prefixo 55
  const phoneDigits = payload.phone.replace(/\D/g, "");
  const phoneNormalized = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;

  try {
    await fetch(N8N_POSTFUNNEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "ReceivedCallback",
        company_slug: payload.company_slug,
        phone: phoneNormalized,
        text: { message: payload.message },
        lead_name: payload.lead_name ?? "Lead",
        source: "helena",
        event_type: payload.event_type,
        channel: payload.channel,
        momment: Date.now(),
        isGroup: false,
        fromMe: false,
      }),
    });
  } catch (err: any) {
    console.error(`[Helena] ❌ Falha ao encaminhar mensagem para n8n:`, err?.message);
  }
}

// Step IDs dos pipelines no Helena
const VENDAS_PRO_STEP_ID    = process.env.VENDAS_PRO_PRIMEIRO_STEP_ID ?? "b6eea3b1-7832-4ea7-bd67-a0f35bee1298";
const BASIC_STARTER_STEP_ID = process.env.BASIC_STARTER_STEP_ID       ?? "476c17ad-9c3f-438a-80d1-4c7b2e0fbad7";
const NUTRICAO_STEP_ID      = process.env.NUTRICAO_STEP_ID            ?? "";

// ── Cria card no Helena/WTS ───────────────────────────────────────────────────
async function criarCardHelena(p: {
  titulo: string;
  stepId: string;
  descricao?: string;
}): Promise<string | null> {
  const token = process.env.HELENA_API_TOKEN;
  if (!token || !p.stepId) return null;
  const res = await fetch(`${WTS_BASE}/crm/v2/panel/card`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title: p.titulo, stepId: p.stepId, ...(p.descricao ? { description: p.descricao } : {}) }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    logger.error({ status: res.status, err }, "[Helena] falha ao criar card");
    return null;
  }
  const data = await res.json() as Record<string, unknown>;
  const cardId = (data.id as any)?.value ?? data.id ?? null;
  return cardId ? String(cardId) : null;
}

// ── Formata trecho da conversa para descrição do card ─────────────────────────
function formatarTrechoConversa(history: { role: string; content: string }[], phone: string): string {
  const linhas = history.slice(-6).map(m => {
    const quem = m.role === "user" ? "Lead" : "Joana";
    return `${quem}: ${m.content.slice(0, 120)}`;
  });
  return `✅ Lead qualificado pela Joana (WhatsApp)\n📞 ${phone}\n\n— Trecho da conversa —\n${linhas.join("\n")}`;
}

// ── Lê nome e contexto de qualificação persistido no BD ──────────────────────
async function readLeadContext(phone: string, tenantId: string): Promise<{ nome: string | null; contexto: string | null }> {
  try {
    const rows = await db.execute(
      sql`SELECT lead_name, joana_context FROM lead_conversation_state
          WHERE tenant_id = ${tenantId} AND phone = ${phone} LIMIT 1`
    );
    const row = (rows.rows as any[])[0] ?? null;
    return { nome: row?.lead_name ?? null, contexto: row?.joana_context ?? null };
  } catch {
    return { nome: null, contexto: null };
  }
}

// ── Persiste nome e contexto de qualificação no BD ───────────────────────────
async function saveLeadContext(phone: string, tenantId: string, nome: string | null, contexto: string | null): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO lead_conversation_state (tenant_id, phone, lead_name, joana_context, last_activity_at, updated_at)
          VALUES (${tenantId}, ${phone}, ${nome}, ${contexto}, NOW(), NOW())
          ON CONFLICT (tenant_id, phone)
          DO UPDATE SET
            lead_name     = COALESCE(EXCLUDED.lead_name, lead_conversation_state.lead_name),
            joana_context = COALESCE(EXCLUDED.joana_context, lead_conversation_state.joana_context),
            last_activity_at = NOW(),
            updated_at = NOW()`
    );
  } catch (e: any) {
    logger.warn({ error: e?.message, phone }, "[Joana] falha ao salvar contexto no BD");
  }
}

// ── Lê e salva estado de roteamento multiagente ───────────────────────────────
async function readAgentState(phone: string, tenantId: string): Promise<{
  current_agent: string | null;
  detected_intent: string | null;
}> {
  try {
    const rows = await db.execute(
      sql`SELECT current_agent, detected_intent FROM lead_conversation_state
          WHERE tenant_id = ${tenantId} AND phone = ${phone} LIMIT 1`
    );
    const row = (rows.rows as any[])[0] ?? null;
    return {
      current_agent: row?.current_agent ?? null,
      detected_intent: row?.detected_intent ?? null,
    };
  } catch {
    return { current_agent: null, detected_intent: null };
  }
}

async function saveAgentState(phone: string, tenantId: string, data: {
  current_agent: string;
  detected_intent: string;
  last_routing_reason: string;
}): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO lead_conversation_state (tenant_id, phone, current_agent, detected_intent, last_routing_reason, last_activity_at, updated_at)
          VALUES (${tenantId}, ${phone}, ${data.current_agent}, ${data.detected_intent}, ${data.last_routing_reason}, NOW(), NOW())
          ON CONFLICT (tenant_id, phone)
          DO UPDATE SET
            current_agent       = EXCLUDED.current_agent,
            detected_intent     = EXCLUDED.detected_intent,
            last_routing_reason = EXCLUDED.last_routing_reason,
            last_activity_at    = NOW(),
            updated_at          = NOW()`
    );
  } catch (e: any) {
    logger.warn({ error: e?.message, phone }, "[CARLA] falha ao salvar estado de roteamento");
  }
}

// ── Envia resposta via Z-API (helper genérico compartilhado por todos os agentes) ─
async function enviarViaZapi(params: {
  selfUrl: string;
  internalKey: string;
  tenantId: string;
  phone: string;
  message: string;
  routeType: string;
}): Promise<void> {
  const res = await fetch(`${params.selfUrl}/api/internal/zapi/send-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": params.internalKey },
    body: JSON.stringify({
      company_slug: params.tenantId,
      phone:        params.phone,
      message:      params.message,
      route_type:   params.routeType,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    logger.error({ phone: params.phone, status: res.status, errBody }, `[${params.routeType}] ❌ falha ao enviar via Z-API`);
  }
}

// ── CARLA: roteador de entrada — decide qual agente atende este lead ───────────
async function rotearParaAgente(params: {
  tenantId: string;
  tenantUuid: string;
  phone: string;
  message: string;
  leadName: string;
}): Promise<void> {
  const internalKey = process.env.MARKETING_INTERNAL_API_KEY ?? "";
  const selfUrl     = `http://localhost:${process.env.PORT ?? 3001}`;

  // ── Verifica se lead já tem agente atribuído ────────────────────────────────
  const agentState = await readAgentState(params.phone, params.tenantUuid);
  let agentKey = agentState.current_agent;
  let intent   = agentState.detected_intent;
  let reason   = "agente já atribuído — mantendo sessão";

  // ── Primeira mensagem: CARLA classifica e roteia ────────────────────────────
  if (!agentKey) {
    const decision = detectarIntencao(params.message);
    agentKey = decision.agent_key;
    intent   = decision.intent;
    reason   = decision.reason;

    logger.info(
      { phone: params.phone, tenantId: params.tenantId, agentKey, intent, reason, confidence: decision.confidence },
      "[CARLA] 🔀 roteamento definido"
    );

    await saveAgentState(params.phone, params.tenantUuid, {
      current_agent:       agentKey,
      detected_intent:     intent,
      last_routing_reason: reason,
    });
  } else {
    logger.info(
      { phone: params.phone, tenantId: params.tenantId, agentKey, intent },
      "[CARLA] ↩️ retomando sessão com agente existente"
    );
  }

  // ── Despacha para o agente especialista correto ─────────────────────────────
  switch (agentKey) {
    case "marcos": {
      const result = await chamarMarcosDireto({
        phone: params.phone, message: params.message,
        leadName: params.leadName, tenantId: params.tenantId,
      });
      if (result.ok && result.reply) {
        await enviarViaZapi({ selfUrl, internalKey, tenantId: params.tenantId, phone: params.phone, message: result.reply, routeType: "marcos_ai" });
        if (result.action === "handoff_consultor") {
          await db.execute(
            sql`UPDATE lead_conversation_state SET human_in_control = true, human_agent_name = 'Consultor Parceiro', last_handoff_target = 'marcos_consultor', updated_at = NOW()
                WHERE tenant_id = ${params.tenantUuid} AND phone = ${params.phone}`
          );
          logger.info({ phone: params.phone }, "[MARCOS] ✅ handoff_consultor ativado");
        }
      }
      break;
    }

    case "lia": {
      const result = await chamarLiaDireto({
        phone: params.phone, message: params.message,
        leadName: params.leadName, tenantId: params.tenantId,
      });
      if (result.ok && result.reply) {
        await enviarViaZapi({ selfUrl, internalKey, tenantId: params.tenantId, phone: params.phone, message: result.reply, routeType: "lia_ai" });
        if (result.action === "handoff_humano") {
          await db.execute(
            sql`UPDATE lead_conversation_state SET human_in_control = true, human_agent_name = 'Suporte', last_handoff_target = 'lia_suporte', updated_at = NOW()
                WHERE tenant_id = ${params.tenantUuid} AND phone = ${params.phone}`
          );
          logger.info({ phone: params.phone }, "[LIA] ✅ handoff_humano ativado");
        }
      }
      break;
    }

    case "caio": {
      const result = await chamarCaioDireto({
        phone: params.phone, message: params.message,
        leadName: params.leadName, tenantId: params.tenantId,
      });
      if (result.ok && result.reply) {
        await enviarViaZapi({ selfUrl, internalKey, tenantId: params.tenantId, phone: params.phone, message: result.reply, routeType: "caio_ai" });
        if (result.action === "handoff_financeiro") {
          await db.execute(
            sql`UPDATE lead_conversation_state SET human_in_control = true, human_agent_name = 'Equipe Financeira', last_handoff_target = 'caio_financeiro', updated_at = NOW()
                WHERE tenant_id = ${params.tenantUuid} AND phone = ${params.phone}`
          );
          logger.info({ phone: params.phone }, "[CAIO] ✅ handoff_financeiro ativado");
        }
      }
      break;
    }

    case "joana":
    default: {
      await chamarJoanaEResponder({
        tenantId: params.tenantId,
        tenantUuid: params.tenantUuid,
        phone: params.phone,
        message: params.message,
        leadName: params.leadName,
      });
      break;
    }
  }
}

// ── Chama Joana (OpenAI) e envia resposta diretamente via Z-API ───────────────
async function chamarJoanaEResponder(params: {
  tenantId: string;      // slug (ex: "r2pb") — usado para Z-API e set-human-control
  tenantUuid: string;    // UUID real do tenant — usado para queries no BD local
  phone: string;
  message: string;
  leadName: string;
}): Promise<void> {
  const internalKey = process.env.MARKETING_INTERNAL_API_KEY;
  const selfUrl     = `http://localhost:${process.env.PORT ?? 3001}`;

  try {
    // ── Lê contexto de qualificação anterior do BD (usando UUID) ─────────────
    const { nome: nomeDb, contexto: contextoDb } = await readLeadContext(params.phone, params.tenantUuid);

    // Prioridade do nome: DB → webhook → "Lead"
    const resolvedName = nomeDb || (params.leadName !== "Lead" ? params.leadName : null) || "Lead";

    logger.info({ phone: params.phone, tenantId: params.tenantId, resolvedName, temContexto: !!contextoDb }, "[Joana] chamando OpenAI");

    const result = await chamarJoanaDireto({
      phone:                 params.phone,
      message:               params.message,
      leadName:              resolvedName,
      tenantId:              params.tenantId,
      qualificationContext:  contextoDb,
    });

    if (!result.ok || !result.reply) {
      logger.warn({ phone: params.phone, error: result.error }, "[Joana] OpenAI não retornou resposta");
      return;
    }

    const clf   = result.classification;
    const phone = params.phone;

    // Resolve o melhor nome disponível (da classificação ou do BD ou do webhook)
    const nome =
      (clf?.nome && !["Lead", "Cliente"].includes(clf.nome) ? clf.nome : null) ??
      resolvedName;

    // ── Se há ação de handoff: bloqueia IA PRIMEIRO (antes do Z-API) ─────────
    if (result.action === "fit_premium_pro" || result.action === "encaminhar_suporte") {
      const agentName = result.action === "fit_premium_pro" ? "Jackson" : "Suporte";
      try {
        await fetch(`${selfUrl}/api/internal/leads/set-human-control`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
          body: JSON.stringify({ phone, tenant_id: params.tenantId, agent_name: agentName }),
        });
        logger.info({ phone, agentName }, "[Joana] ✅ human_in_control setado ANTES do Z-API");
      } catch (e: any) {
        logger.error({ error: e?.message }, "[Joana] falha ao set-human-control antecipado");
      }
    }

    // ── Envia resposta ao lead via Z-API ──────────────────────────────────────
    const sendRes = await fetch(`${selfUrl}/api/internal/zapi/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
      body: JSON.stringify({
        company_slug: params.tenantId,
        phone:        phone,
        message:      result.reply,
        route_type:   "joana_ai",
      }),
    });

    if (!sendRes.ok) {
      const errBody = await sendRes.text().catch(() => "");
      logger.error({ phone, status: sendRes.status, errBody }, "[Joana] ❌ falha ao enviar via Z-API");
    } else {
      logger.info({ phone, action: result.action ?? "reply" }, "[Joana] ✅ mensagem enviada ao lead via Z-API");
    }

    // ── Salva nome e contexto de qualificação no BD (usando UUID) ────────────
    if (result.action) {
      // Para reeducar_fit: salva flag de reeducação + contexto parcial já captado
      // O contexto é MESCLADO ao existente para não perder dados de turnos anteriores
      let contextoJson: string;
      if (result.action === "reeducar_fit") {
        const contextoAnterior = contextoDb ? (() => { try { return JSON.parse(contextoDb); } catch { return {}; } })() : {};
        contextoJson = JSON.stringify({
          ...contextoAnterior,
          passou_por_reeducacao: true,
          contexto_parcial:      clf?.contexto_parcial ?? contextoAnterior.contexto_parcial ?? "",
          razao_reeducacao:      clf?.razao_reeducacao ?? "",
          segmento:              clf?.segmento ?? contextoAnterior.segmento ?? "",
          atualizado_em:         new Date().toISOString(),
        });
      } else {
        contextoJson = JSON.stringify({
          classificacao:        result.action,
          resumo:               clf?.resumo ?? clf?.motivo ?? clf?.motivo_baixo_fit ?? clf?.motivo_nutricao ?? "",
          produto:              clf?.tipo_produto ?? "",
          segmento:             clf?.segmento ?? "",
          publico_alvo:         clf?.publico_alvo ?? "",
          estagio_marca:        clf?.estagio_marca ?? "",
          prioridade:           clf?.prioridade ?? "",
          volume:               clf?.volume_estimado ?? null,
          investimento:         clf?.investimento_previsto ?? null,
          tem_marca_ativa:      clf?.tem_marca_ativa ?? null,
          ja_vende:             clf?.ja_vende ?? null,
          dor_principal:        clf?.dor_principal ?? "",
          expectativa_parceria: clf?.expectativa_parceria ?? "",
          motivo_nutricao:      clf?.motivo_nutricao ?? "",
          potencial_futuro:     clf?.potencial_futuro ?? "",
          passou_por_reeducacao: clf?.passou_por_reeducacao ?? false,
          atualizado_em:        new Date().toISOString(),
        });
      }
      await saveLeadContext(phone, params.tenantUuid, nome, contextoJson);
    } else if (nome !== "Lead") {
      // Salva ao menos o nome quando não há classificação ainda
      await saveLeadContext(phone, params.tenantUuid, nome, null);
    }

    // ── Ações pós-classificação ───────────────────────────────────────────────
    if (!result.action) return;

    if (result.action === "fit_premium_pro") {
      const history   = getJoanaHistory(phone);
      const fitInfo   = [
        clf?.segmento      ? `Segmento: ${clf.segmento}` : "",
        clf?.publico_alvo  ? `Público: ${clf.publico_alvo}` : "",
        clf?.estagio_marca ? `Estágio: ${clf.estagio_marca}` : "",
        clf?.prioridade    ? `Prioridade: ${clf.prioridade}` : "",
        clf?.dor_principal ? `Dor: ${clf.dor_principal}` : "",
      ].filter(Boolean).join(" | ");
      const descricao = formatarTrechoConversa(history, phone)
        + (clf?.resumo ? `\n\n📋 ${clf.resumo}` : "")
        + (fitInfo ? `\n\n🎯 Fit Premium — ${fitInfo}` : "");
      const titulo = `🌟 ${nome} | 📞 ${phone} — Fit Premium PRO (Joana)`;

      const cardId = await criarCardHelena({ titulo, stepId: VENDAS_PRO_STEP_ID, descricao });
      logger.info({ phone, cardId, nome, stepId: VENDAS_PRO_STEP_ID }, "[Joana] ✅ card Fit Premium PRO criado");

    } else if (result.action === "fit_basico") {
      const history   = getJoanaHistory(phone);
      const descricao = `📦 Lead Basic/Starter registrado pela Joana (WhatsApp)\n📞 ${phone}`
        + (clf?.resumo ? `\n\n${clf.resumo}` : "")
        + (clf?.segmento ? `\nSegmento: ${clf.segmento}` : "")
        + `\n\n— Trecho da conversa —\n${history.slice(-4).map(m => `${m.role === "user" ? "Lead" : "Joana"}: ${m.content.slice(0, 100)}`).join("\n")}`;
      const titulo = `📦 ${nome} | 📞 ${phone} — Basic/Starter (Joana)`;

      const cardId = await criarCardHelena({ titulo, stepId: BASIC_STARTER_STEP_ID, descricao });
      logger.info({ phone, cardId, nome, stepId: BASIC_STARTER_STEP_ID }, "[Joana] ✅ card Basic criado");

    } else if (result.action === "reeducar_fit") {
      // Conversa continua — Joana já enviou a mensagem de reposicionamento
      // Sem card, sem HIC. Contexto já salvo com passou_por_reeducacao: true
      logger.info({ phone, nome, razao: clf?.razao_reeducacao }, "[Joana] 🔄 reeducar_fit: mensagem educativa enviada, conversa continua");

    } else if (result.action === "nutricao") {
      // Cria card de nutrição se NUTRICAO_STEP_ID estiver configurado
      if (NUTRICAO_STEP_ID) {
        const history   = getJoanaHistory(phone);
        const descricao = `🌱 Lead em nutrição registrado pela Joana (WhatsApp)\n📞 ${phone}`
          + (clf?.resumo         ? `\n\n${clf.resumo}` : "")
          + (clf?.motivo_nutricao ? `\n📌 Motivo: ${clf.motivo_nutricao}` : "")
          + (clf?.potencial_futuro ? `\n✨ Potencial: ${clf.potencial_futuro}` : "")
          + (clf?.segmento        ? `\nSegmento: ${clf.segmento}` : "")
          + (clf?.estagio_marca   ? `\nEstágio: ${clf.estagio_marca}` : "")
          + `\n\n— Trecho da conversa —\n${history.slice(-4).map(m => `${m.role === "user" ? "Lead" : "Joana"}: ${m.content.slice(0, 100)}`).join("\n")}`;
        const titulo = `🌱 ${nome} | 📞 ${phone} — Nutrição (Joana)`;
        const cardId = await criarCardHelena({ titulo, stepId: NUTRICAO_STEP_ID, descricao });
        logger.info({ phone, cardId, nome, stepId: NUTRICAO_STEP_ID }, "[Joana] ✅ card Nutrição criado");
      } else {
        logger.info({ phone, nome, motivo: clf?.motivo_nutricao }, "[Joana] 🌱 nutricao: lead salvo no contexto (NUTRICAO_STEP_ID não configurado, sem card)");
      }

    } else if (result.action === "baixo_fit") {
      logger.info({ phone, nome, motivo: clf?.motivo_baixo_fit, passouReeducacao: clf?.passou_por_reeducacao }, "[Joana] ℹ️ baixo_fit: mensagem de posicionamento enviada, sem card criado");

    } else if (result.action === "encaminhar_suporte") {
      logger.info({ phone, nome, motivo: clf?.motivo }, "[Joana] ✅ suporte: human_in_control já ativado, sem card de pipeline");
    }

  } catch (err: any) {
    logger.error({ error: err?.message, phone: params.phone }, "[Joana] erro inesperado");
  }
}

// Pipeline de origem: só processar movimentos neste pipeline
const PIPELINE_COMERCIAL_PRO_ID = "6d046deb-0c01-41db-8f19-046adab15b85";

// Step IDs destino (etapa Início)
const POS_VENDAS_INICIO_STEP = "f9060456-b94c-4c64-b8e2-bb9f2501afb0";
const PERDIDO_INICIO_STEP = "b35996c0-ed66-4193-9903-3b8ff8995171";

// ─── Configuração de etapas FINAIS ───────────────────────────────────────────
// Adicione aqui os IDs das etapas marcadas como "Final" no Helena.
// Após consolidar para uma única coluna GANHO, basta ter um ID em cada set.
// Enquanto houver múltiplas colunas por mês, keyword é fallback automático.

const FINAL_WON_STEP_IDS = new Set([
  "cc9d7e65-d118-4799-8377-e869a76403c2", // GANHO
]);

const FINAL_LOST_STEP_IDS = new Set([
  "b5de4988-51d5-4370-a17d-8163752befa0", // PERDIDO
]);

// Etapas que apenas roteiam para Perdido/Nutrição SEM registrar no relatório
// Ex: FEEDBACK - AVALIAÇÃO GOOGLE (etapa final do pipeline Pós Vendas)
const FEEDBACK_ROUTE_STEP_IDS = new Set([
  "0b490f3d-f021-4ca9-a772-2c2c5f5da2df", // FEEDBACK - AVALIAÇÃO GOOGLE (Pós Vendas)
]);

// Palavras-chave como fallback (cobre múltiplas colunas de mesmo tipo)
const WON_KEYWORDS = ["ganho", "won", "fechado", "fechada", "vendido", "contrato assinado"];
const LOST_KEYWORDS = ["perdido", "lost", "descartado", "sem interesse", "sem qualificação"];

// ─── Helpers WTS ─────────────────────────────────────────────────────────────

function wtsHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${WTS_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// Duplica o card original para outra etapa usando o endpoint oficial da WTS API v2.
// Mais confiável que criar do zero — preserva contatos, tags e todos os campos.
async function duplicateCard(
  sourceCardId: string,
  destStepId: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${WTS_BASE}/crm/v2/panel/card/${sourceCardId}/duplicate`, {
    method: "POST",
    headers: wtsHeaders(),
    body: JSON.stringify({ copyToStepId: destStepId }),
  });
  if (!res.ok) {
    console.error("[Helena] ❌ Erro ao duplicar card:", res.status, await res.text());
    return null;
  }
  return res.json() as Promise<Record<string, unknown>>;
}

// Arquiva o card original via WTS API v2 após duplicação bem-sucedida.
// Validado: PUT /crm/v2/panel/card/{id} com {"archived": true} funciona.
// Falhas são não-fatais — o fluxo principal continua mesmo se arquivar falhar.
async function archiveCard(cardId: string): Promise<boolean> {
  try {
    const res = await fetch(`${WTS_BASE}/crm/v2/panel/card/${cardId}`, {
      method: "PUT",
      headers: wtsHeaders(),
      body: JSON.stringify({ archived: true }),
    });
    if (!res.ok) {
      console.error("[Helena] ❌ Erro ao arquivar card:", cardId, res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[Helena] ❌ Exceção ao arquivar card:", cardId, err);
    return false;
  }
}

// Dispara o funil de qualificação no n8n de forma assíncrona (fire-and-forget).
// Falhas não interrompem o fluxo principal — são apenas logadas.
const N8N_QUALIFICACAO_URL = "https://clovisart13.app.n8n.cloud/webhook/r2pb-helena-qualificacao";

async function triggerQualificationFunnel(params: {
  tenantId: string;
  cardId: string;
  leadName: string;
  phone: string;
  outcome: "WON" | "LOST";
  stepTitle: string;
  monetaryAmount: string | null;
}): Promise<void> {
  try {
    const payload = {
      cardId: params.cardId,
      leadName: params.leadName,
      phone: params.phone,
      qualification: params.outcome === "WON" ? "pro" : "desqualificado",
      source: "helena",
      needVideo: params.outcome === "WON",
      outcome: params.outcome,
      stepTitle: params.stepTitle,
      tenantId: params.tenantId,
      monetaryAmount: params.monetaryAmount,
    };
    const res = await fetch(N8N_QUALIFICACAO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`[Helena:${params.tenantId}] ⚠️ n8n qualificação retornou ${res.status} para card ${params.cardId}`);
      return;
    }
    const data = await res.json() as Record<string, unknown>;
    console.log(`[Helena:${params.tenantId}] 🤖 n8n qualificação | route=${data.route} nextAction=${data.nextAction} cardId=${data.cardId}`);
  } catch (err) {
    console.error(`[Helena:${params.tenantId}] ⚠️ Falha ao acionar n8n qualificação para card ${params.cardId}:`, err);
  }
}

function detectOutcome(stepId: string, stepTitle: string): "WON" | "LOST" | null {
  // 1. Verificação por step ID (mais confiável — não depende do nome)
  if (FINAL_WON_STEP_IDS.has(stepId)) return "WON";
  if (FINAL_LOST_STEP_IDS.has(stepId)) return "LOST";

  // 2. Fallback: palavras-chave no título (cobre múltiplas colunas por mês)
  const lower = stepTitle.toLowerCase();
  if (WON_KEYWORDS.some((k) => lower.includes(k))) return "WON";
  if (LOST_KEYWORDS.some((k) => lower.includes(k))) return "LOST";

  return null;
}

// ─── Webhook ─────────────────────────────────────────────────────────────────
// URL: POST /api/helena/webhook?tenant=r2pb
// O parâmetro ?tenant identifica o assinante. Padrão: 'r2pb' (único assinante ativo).

router.post("/helena/webhook", async (req, res) => {
  res.status(200).json({ ok: true });

  try {
    // Tenant identificado via query string; fallback para 'r2pb' (assinante padrão)
    const tenantId = (req.query.tenant as string) || "r2pb";

    const body = req.body as Record<string, unknown>;
    const eventType = body.eventType as string | undefined;
    const content = body.content as Record<string, unknown> | undefined;

    // DEBUG: loga QUALQUER evento (usa req.log para aparecer no Pino)
    req.log.info(
      { tenantId, eventType, body },
      `[Helena] webhook recebido`
    );

    // Heartbeat — registra timestamp do último evento para o monitor de saúde
    recordHelenaHeartbeat();

    // ── Evento: agente assumiu a conversa → bloquear automação ────────────────
    if (eventType && AGENT_TAKEOVER_EVENT_TYPES.has(eventType)) {
      const msgContent = content ?? body;
      const phoneRaw =
        (msgContent as any)?.contact?.phone ||
        (msgContent as any)?.contact?.phonenumber ||
        (msgContent as any)?.contactDetails?.phonenumber ||   // SESSION_* events
        (msgContent as any)?.attendance?.contact?.phone ||
        (msgContent as any)?.phone ||
        (body as any)?.phone ||
        null;
      const agentName =
        (msgContent as any)?.agent?.name ||
        (msgContent as any)?.agentDetails?.name ||            // SESSION_* events
        (msgContent as any)?.attendance?.agent?.name ||
        (msgContent as any)?.agentName ||
        null;

      if (phoneRaw) {
        const internalKey = process.env.MARKETING_INTERNAL_API_KEY;
        const selfUrl = `http://localhost:${process.env.PORT ?? 3001}`;
        req.log.info({ tenantId, phone: phoneRaw, agentName, eventType }, "[Helena] agente assumiu → set-human-control");
        void fetch(`${selfUrl}/api/internal/leads/set-human-control`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
          body: JSON.stringify({ phone: String(phoneRaw), tenant_id: tenantId, agent_name: agentName }),
        }).catch((e: any) => req.log.error({ error: e?.message }, "[Helena] falha ao set-human-control"));
      }
      return;
    }

    // ── Evento: conversa encerrada pelo agente → liberar automação ─────────────
    if (eventType && AGENT_RELEASE_EVENT_TYPES.has(eventType)) {
      const msgContent = content ?? body;
      const phoneRaw =
        (msgContent as any)?.contact?.phone ||
        (msgContent as any)?.contact?.phonenumber ||
        (msgContent as any)?.contactDetails?.phonenumber ||   // SESSION_CLOSED events
        (msgContent as any)?.attendance?.contact?.phone ||
        (msgContent as any)?.phone ||
        (body as any)?.phone ||
        null;

      if (phoneRaw) {
        const phoneDigits = String(phoneRaw).replace(/\D/g, "");
        const phoneNorm = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
        const internalKey = process.env.MARKETING_INTERNAL_API_KEY;
        const selfUrl = `http://localhost:${process.env.PORT ?? 3001}`;
        req.log.info({ tenantId, phone: phoneRaw, eventType }, "[Helena] conversa encerrada → clear-human-control + limpar histórico Joana");
        void fetch(`${selfUrl}/api/internal/leads/clear-human-control`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
          body: JSON.stringify({ phone: String(phoneRaw), tenant_id: tenantId }),
        }).catch((e: any) => req.log.error({ error: e?.message }, "[Helena] falha ao clear-human-control"));
        clearJoanaHistory(phoneNorm);
      }
      return;
    }

    // ── PANEL_CARD_UPDATE com card arquivado → liberar automação ──────────────
    // Helena dispara PANEL_CARD_UPDATE quando o agente "conclui/arquiva" um atendimento.
    // Quando content.archived=true extrai o telefone de content.contacts[0].phonenumber.
    if (eventType === "PANEL_CARD_UPDATE") {
      const msgContent = content ?? body;
      const isArchived = (msgContent as any)?.archived === true;
      const isClosed   = (msgContent as any)?.status === "CLOSED" || (msgContent as any)?.status === "RESOLVED";

      if (isArchived || isClosed) {
        // Telefone vem como "+55|11960745137" ou "(11) 96074-5137" — normaliza removendo | e espaços
        const rawContacts = (msgContent as any)?.contacts as Array<Record<string, unknown>> | undefined;
        const firstContact = Array.isArray(rawContacts) ? rawContacts[0] : null;
        const phoneRaw: string | null =
          (firstContact?.phonenumber as string) ||
          (firstContact?.phone as string) ||
          (msgContent as any)?.contact?.phonenumber ||
          (msgContent as any)?.contact?.phone ||
          null;

        if (phoneRaw) {
          // Remove pipe, espaços, parênteses, hifens — mantém só dígitos
          const phoneCleaned = String(phoneRaw).replace(/[^\d]/g, "");
          const internalKey = process.env.MARKETING_INTERNAL_API_KEY;
          const selfUrl = `http://localhost:${process.env.PORT ?? 3001}`;
          req.log.info({ tenantId, phone: phoneCleaned, eventType, isArchived, isClosed }, "[Helena] PANEL_CARD_UPDATE arquivado → clear-human-control");
          void fetch(`${selfUrl}/api/internal/leads/clear-human-control`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
            body: JSON.stringify({ phone: phoneCleaned, tenant_id: tenantId }),
          }).catch((e: any) => req.log.error({ error: e?.message }, "[Helena] falha ao clear-human-control via PANEL_CARD_UPDATE"));
        } else {
          req.log.warn({ tenantId, eventType, msgContent }, "[Helena] PANEL_CARD_UPDATE arquivado sem telefone — ignorado");
        }
      }
      return;
    }

    // ── "Atendimento alterado" → detectar takeover ou encerramento ────────────
    // WTS.chat usa este evento para indicar mudança de status da sessão.
    // Se content.userId não é null → humano assumiu (takeover).
    // Se content.status === "RESOLVED"/"CLOSED"/"CONCLUDED" → encerrado.
    if (eventType && SESSION_UPDATE_TYPES.has(eventType)) {
      const msgContent = content ?? body;
      const phoneRaw =
        (msgContent as any)?.contactDetails?.phonenumber ||
        (msgContent as any)?.contact?.phonenumber ||
        (msgContent as any)?.contact?.phone ||
        null;

      if (phoneRaw) {
        const phoneCleaned = String(phoneRaw).replace(/[^\d]/g, "");
        const internalKey = process.env.MARKETING_INTERNAL_API_KEY;
        const selfUrl = `http://localhost:${process.env.PORT ?? 3001}`;

        const sessionStatus: string = ((msgContent as any)?.status ?? "").toUpperCase();
        const userId: string | null = (msgContent as any)?.userId ?? null;
        const agentName: string = (msgContent as any)?.agentDetails?.name ?? (msgContent as any)?.userId ?? "Agente";

        const isRelease = ["RESOLVED", "CLOSED", "CONCLUDED", "FINISHED", "ENDED"].some(s => sessionStatus.includes(s));
        const isTakeover = !isRelease && userId !== null && userId !== "00000000-0000-0000-0000-000000000000";

        if (isRelease) {
          req.log.info({ tenantId, phone: phoneCleaned, sessionStatus }, "[Helena] SESSION_UPDATE encerrado → clear-human-control");
          void fetch(`${selfUrl}/api/internal/leads/clear-human-control`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
            body: JSON.stringify({ phone: phoneCleaned, tenant_id: tenantId }),
          }).catch((e: any) => req.log.error({ error: e?.message }, "[Helena] falha ao clear-human-control via SESSION_UPDATE"));
        } else if (isTakeover) {
          req.log.info({ tenantId, phone: phoneCleaned, agentName, userId }, "[Helena] SESSION_UPDATE assumido → set-human-control");
          void fetch(`${selfUrl}/api/internal/leads/set-human-control`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": internalKey ?? "" },
            body: JSON.stringify({ phone: phoneCleaned, tenant_id: tenantId, agent_name: agentName }),
          }).catch((e: any) => req.log.error({ error: e?.message }, "[Helena] falha ao set-human-control via SESSION_UPDATE"));
        } else {
          req.log.info({ tenantId, eventType, sessionStatus, userId }, "[Helena] SESSION_UPDATE sem ação — status não indica takeover nem encerramento");
        }
      }
      return;
    }

    // ── Evento de mensagem nova do contato → encaminhar para n8n ──────────────
    if (eventType && MESSAGE_EVENT_TYPES.has(eventType)) {
      const msgContent = content ?? body;

      // Extrai telefone — cobre estruturas de "Atendimento criado" e "Mensagem recebida" do WTS.chat
      // MESSAGE_RECEIVED real: telefone do lead fica em content.details.from (confirmado 2026-07-15)
      const phoneRaw =
        // MESSAGE_RECEIVED (WTS.chat): lead phone em details.from
        (msgContent as any)?.details?.from ||
        // SESSION_NEW: contactDetails.phonenumber
        (msgContent as any)?.contactDetails?.phonenumber ||
        // Atendimento criado: contact.phone ou contact.phonenumber
        (msgContent as any)?.contact?.phone ||
        (msgContent as any)?.contact?.phonenumber ||
        (msgContent as any)?.contact?.whatsapp ||
        // Atendimento criado: attendance.contact.phone
        (msgContent as any)?.attendance?.contact?.phone ||
        (msgContent as any)?.attendance?.contact?.phonenumber ||
        // Mensagem direta
        (msgContent as any)?.phone ||
        (msgContent as any)?.from ||
        (msgContent as any)?.whatsapp ||
        (body as any)?.phone ||
        (body as any)?.contact?.phone ||
        null;

      // Extrai texto — "Atendimento criado" pode ter lastMessage ou message
      const messageText =
        (msgContent as any)?.lastMessage?.text ||
        (msgContent as any)?.lastMessage?.message ||
        (msgContent as any)?.attendance?.lastMessage?.text ||
        (msgContent as any)?.message?.text ||
        (msgContent as any)?.message ||
        (msgContent as any)?.text ||
        (msgContent as any)?.body ||
        (msgContent as any)?.content ||
        (body as any)?.message ||
        // Se não tiver texto, usa saudação padrão para atendimento novo
        (eventType?.includes("ATENDIMENTO") || eventType?.includes("ATTENDANCE") ? "Olá, gostaria de mais informações" : null);

      // Extrai nome — presente em ATENDIMENTO_CRIADO/SESSION_NEW, ausente em MESSAGE_RECEIVED
      const leadNameRaw =
        (msgContent as any)?.contact?.name ||
        (msgContent as any)?.attendance?.contact?.name ||
        (msgContent as any)?.contactDetails?.name ||
        (msgContent as any)?.name ||
        (msgContent as any)?.pushName ||
        (msgContent as any)?.details?.senderName ||
        (msgContent as any)?.details?.pushName ||
        null;
      const leadName = leadNameRaw ?? "Lead";

      if (phoneRaw) {
        // Normaliza phone: só dígitos, com prefixo 55
        const phoneDigits = String(phoneRaw).replace(/\D/g, "");
        const phoneForJoana = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
        const altPhone = phoneForJoana.startsWith("55") ? phoneForJoana.slice(2) : `55${phoneForJoana}`;

        // Resolve UUID do tenant — NECESSÁRIO antes do HIC check, pois set/clear-human-control
        // grava com UUID e não com slug, criando linhas separadas se não alinharmos.
        const tenantUuid = await resolveSlugToUuid(tenantId);

        // ── PROTEÇÃO HUMANO: não encaminhar para IA se agente está no controle ──
        try {
          const hicRows = await db.execute(
            sql`SELECT 1 FROM lead_conversation_state
                WHERE tenant_id = ${tenantUuid}
                  AND phone IN (${phoneForJoana}, ${altPhone})
                  AND human_in_control = true
                LIMIT 1`
          );
          if ((hicRows.rows as unknown[]).length > 0) {
            req.log.info(
              { tenantId, tenantUuid, phone: phoneForJoana, eventType },
              "[Helena] human_in_control=true → mensagem NÃO encaminhada para IA"
            );
            return;
          }
        } catch (hicErr: any) {
          req.log.warn({ error: hicErr?.message }, "[Helena] erro ao checar human_in_control — prosseguindo normalmente");
        }

        // ── LOCK DE CONCORRÊNCIA: impede processamento paralelo do mesmo telefone ─
        if (processingPhones.has(phoneForJoana)) {
          req.log.info({ tenantId, phone: phoneForJoana, eventType }, "[Helena] Joana já processando este telefone — mensagem duplicada ignorada");
          return;
        }

        // Persiste nome se vier de evento com dados completos (ex: ATENDIMENTO_CRIADO)
        if (leadNameRaw && leadNameRaw !== "Lead") {
          void saveLeadContext(phoneForJoana, tenantUuid, leadNameRaw, null);
        }

        req.log.info({ tenantId, tenantUuid, phone: phoneForJoana, eventType, messageText }, `[Helena] mensagem recebida → roteando via CARLA`);

        processingPhones.add(phoneForJoana);
        rotearParaAgente({
          tenantId,
          tenantUuid,
          phone:    phoneForJoana,
          message:  String(messageText ?? "Olá"),
          leadName: leadName,
        }).finally(() => {
          processingPhones.delete(phoneForJoana);
        }).catch((e: any) => {
          logger.error({ error: e?.message, phone: phoneForJoana }, "[CARLA] erro não capturado em rotearParaAgente");
        });
      } else {
        req.log.warn({ tenantId, eventType, body }, `[Helena] evento sem phone — ignorado`);
      }
      return;
    }

    // ── Evento: etiqueta adicionada a um card ─────────────────────────────────
    // Possíveis nomes: PANEL_CARD_TAG_ADDED, CARD_TAG_ADDED, TAG_ADDED, etc.
    // Logamos SEMPRE eventos de tag para auto-descoberta do nome exato.
    if (eventType && eventType.toLowerCase().includes("tag")) {
      req.log.info(
        { tenantId, eventType, content, body },
        `[Helena] ⭐ EVENTO DE ETIQUETA detectado — payload completo acima`
      );

      // Tenta detectar se é a etiqueta VIP sendo aplicada
      const cardIdTag =
        (content as any)?.cardId ||
        (content as any)?.id ||
        (content as any)?.card?.id ||
        (body as any)?.cardId ||
        null;

      const tagName: string =
        (content as any)?.tag?.name ||
        (content as any)?.tag?.title ||
        (content as any)?.tagName ||
        (content as any)?.name ||
        (body as any)?.tagName ||
        "";

      const tagId: string =
        (content as any)?.tag?.id ||
        (content as any)?.tagId ||
        (body as any)?.tagId ||
        "";

      const isVip = tagName.toLowerCase().includes("vip");

      if (isVip && cardIdTag) {
        req.log.info({ tenantId, cardIdTag, tagName, tagId }, `[Helena] ⭐ Etiqueta VIP detectada — buscando telefone no comercialLeads`);

        // Busca o telefone do lead via helenCardId no nosso banco
        try {
          const rows = await db.execute(
            (await import("drizzle-orm")).sql`
              SELECT phone FROM comercial_leads
              WHERE helen_card_id = ${cardIdTag} AND tenant_id = ${tenantId}
              LIMIT 1`
          );
          const phone = (rows.rows[0] as any)?.phone ?? null;

          if (phone) {
            await db.execute(
              (await import("drizzle-orm")).sql`
                INSERT INTO vip_phones (tenant_id, phone, source, helen_card_id, helen_tag_id)
                VALUES (${tenantId}, ${String(phone)}, 'helena_tag', ${cardIdTag}, ${tagId || null})
                ON CONFLICT (tenant_id, phone) DO UPDATE
                  SET removed_at = NULL, helen_card_id = EXCLUDED.helen_card_id, helen_tag_id = EXCLUDED.helen_tag_id, added_at = NOW()`
            );
            req.log.info({ tenantId, phone, cardIdTag }, `[Helena] ✅ Telefone marcado como VIP`);
          } else {
            req.log.warn({ tenantId, cardIdTag }, `[Helena] ⚠️ Card VIP sem telefone no banco — registre o lead primeiro`);
          }
        } catch (e: any) {
          req.log.error({ error: e?.message }, `[Helena] Erro ao salvar VIP`);
        }
      }
      return;
    }

    // Aceita variações do nome do evento de mudança de etapa (defensive — Helena pode mudar o nome)
    const isStepChangeEvent =
      eventType === "PANEL_CARD_STEP_CHANGE" ||
      eventType === "PANEL_CARD_STEP_CHANGED" ||
      eventType === "CARD_STEP_CHANGE" ||
      eventType === "CARD_STEP_CHANGED" ||
      eventType === "CARD_MOVED" ||
      eventType === "CARD_COLUMN_CHANGED" ||
      (typeof eventType === "string" && eventType.toUpperCase().includes("STEP_CHANGE"));

    if (!isStepChangeEvent) {
      req.log.info({ tenantId, eventType }, `[Helena] eventType ignorado`);
      return;
    }

    if (!content) {
      console.error(`[Helena:${tenantId}] ⚠️ Payload sem campo 'content'`);
      return;
    }

    const cardId = content.id as string;
    const panelId = content.panelId as string;
    const stepId = content.stepId as string;
    const stepTitle = (content.stepTitle as string) || "";
    const title = (content.title as string) || "";
    const cardKey = (content.key as string) || null;
    const contacts = content.contacts as Array<{ name?: string; phonenumber?: string }> | null;
    const monetaryAmount = content.monetaryAmount as string | null;

    console.log(`[Helena:${tenantId}] Card: "${title}" (${cardKey}) → etapa "${stepTitle}" (${stepId})`);

    // ── FEEDBACK (Pós Vendas) ─────────────────────────────────────────────────
    // Etapas que apenas roteiam para Perdido/Nutrição sem registrar no relatório
    if (FEEDBACK_ROUTE_STEP_IDS.has(stepId)) {
      console.log(`[Helena:${tenantId}] 🔄 FEEDBACK → duplicando para Perdido/Nutrição (sem registro)`);
      const novo = await duplicateCard(cardId, PERDIDO_INICIO_STEP);
      if (!novo) {
        console.error(`[Helena:${tenantId}] ❌ Falha ao duplicar card no Perdido/Nutrição`);
        return;
      }
      const novoFeedbackId = novo.id as string;
      console.log(`[Helena:${tenantId}] ✅ Card original: ${cardId} | Card duplicado: ${novoFeedbackId}`);
      const archivedFeedback = await archiveCard(cardId);
      if (archivedFeedback) {
        console.log(`[Helena:${tenantId}] 🗄️ Card original ${cardId} arquivado automaticamente`);
      } else {
        console.warn(`[Helena:${tenantId}] ⚠️ Arquivamento do card original ${cardId} falhou — arquivar manualmente`);
      }
      return;
    }

    // ── Pipeline Comercial PRO — GANHO / PERDIDO ──────────────────────────────
    if (panelId !== PIPELINE_COMERCIAL_PRO_ID) {
      console.log(`[Helena:${tenantId}] ⏭ Pipeline ignorado: ${panelId}`);
      return;
    }

    const outcome = detectOutcome(stepId, stepTitle);
    if (!outcome) {
      console.log(`[Helena:${tenantId}] ⏭ Etapa intermediária/início — sem ação`);
      return;
    }

    // ── 1. Verificar duplicata no banco (falha silenciosa — não bloqueia a movimentação) ──
    let jaRegistrado = false;
    try {
      const existing = await db
        .select({ id: helenaCardMigrations.id })
        .from(helenaCardMigrations)
        .where(and(eq(helenaCardMigrations.tenantId, tenantId), eq(helenaCardMigrations.cardId, cardId)))
        .limit(1);
      jaRegistrado = existing.length > 0;
      if (jaRegistrado) console.log(`[Helena:${tenantId}] ℹ️ Card ${cardId} já registrado — vai mover mas não duplicar no banco`);
    } catch (dbErr) {
      console.error(`[Helena:${tenantId}] ⚠️ DB indisponível para check deduplicação — prosseguindo com movimentação:`, dbErr);
    }

    // ── 2. Duplicar card no Helena (SEMPRE executa, independente do banco) ──────
    const destStep = outcome === "WON" ? POS_VENDAS_INICIO_STEP : PERDIDO_INICIO_STEP;
    console.log(`[Helena:${tenantId}] ${outcome === "WON" ? "🏆 GANHO" : "❌ PERDIDO"} → duplicando card...`);

    const novo = await duplicateCard(cardId, destStep);
    if (!novo) {
      console.error(`[Helena:${tenantId}] ❌ Falha ao duplicar card no pipeline destino`);
      return;
    }

    const novoId = novo.id as string;
    console.log(`[Helena:${tenantId}] ✅ Card original: ${cardId} | Card duplicado: ${novoId}`);

    // ── 3. Arquivar card original no Helena (falha silenciosa) ────────────────
    const archived = await archiveCard(cardId);
    if (archived) {
      console.log(`[Helena:${tenantId}] 🗄️ Card original ${cardId} arquivado automaticamente`);
    } else {
      console.warn(`[Helena:${tenantId}] ⚠️ Arquivamento do card original ${cardId} falhou — arquivar manualmente`);
    }

    // ── 5. Acionar funil de qualificação no n8n (fire-and-forget) ───────────
    void triggerQualificationFunnel({
      tenantId,
      cardId,
      leadName: contacts?.[0]?.name ?? title,
      phone: contacts?.[0]?.phonenumber?.replace("|", " ") ?? "",
      outcome,
      stepTitle,
      monetaryAmount: monetaryAmount ? monetaryAmount.toString() : null,
    });

    // ── 4. Registrar no banco (falha silenciosa — card já foi movido) ─────────
    if (!jaRegistrado) {
      try {
        await db.insert(helenaCardMigrations).values({
          tenantId,
          cardId,
          cardTitle: title,
          cardKey,
          outcome,
          sourceStepId: stepId,
          sourceStepTitle: stepTitle || null,
          contactName: contacts?.[0]?.name ?? null,
          contactPhone: contacts?.[0]?.phonenumber?.replace("|", " ") ?? null,
          monetaryAmount: monetaryAmount ? monetaryAmount.toString() : null,
          destinationCardId: novoId,
        });
        console.log(`[Helena:${tenantId}] 💾 Migração registrada no banco`);
      } catch (dbErr) {
        console.error(`[Helena:${tenantId}] ⚠️ DB indisponível para salvar migração (card JÁ foi movido no Helena):`, dbErr);
      }
    }
  } catch (err) {
    console.error("[Helena] Erro inesperado:", err);
  }
});

// ─── API de consulta para o dashboard — protegida por tenant ─────────────────

const auth = [requireAuth, requireTenantAccess];

// Resolve o slug real para a query helena:
// - Super admin sem tenant explícito → sem filtro (vê tudo)
// - Super admin com tenant_slug na query → filtra por aquele slug
// - Usuário regular → resolve UUID do req.tenantId para slug
async function resolveHelenaSlug(req: AuthenticatedRequest): Promise<string | null> {
  const explicitSlug = req.query.tenant_slug as string | undefined;
  if (explicitSlug) return explicitSlug;

  if (req.user?.isSuperAdmin) return null; // null = sem filtro, vê todos

  const slug = await resolveTenantSlug(req.tenantId ?? "");
  return slug || null;
}

router.get("/helena/migrations", ...auth, async (req: AuthenticatedRequest, res) => {
  try {
    const slug = await resolveHelenaSlug(req);
    const { mes, ano, outcome: outcomeFilter } = req.query as Record<string, string>;

    const conditions = slug ? [eq(helenaCardMigrations.tenantId, slug)] : [];

    if (ano) {
      const year = parseInt(ano);
      const start = new Date(year, mes ? parseInt(mes) - 1 : 0, 1);
      const end = mes
        ? new Date(year, parseInt(mes), 0, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);
      conditions.push(gte(helenaCardMigrations.migratedAt, start));
      conditions.push(lte(helenaCardMigrations.migratedAt, end));
    }

    if (outcomeFilter === "WON" || outcomeFilter === "LOST") {
      conditions.push(eq(helenaCardMigrations.outcome, outcomeFilter));
    }

    const rows = await db
      .select()
      .from(helenaCardMigrations)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(helenaCardMigrations.migratedAt))
      .limit(500);

    res.json({ ok: true, data: rows, total: rows.length });
  } catch (err) {
    console.error("[Helena] Erro ao listar migrações:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/helena/migrations/stats", ...auth, async (req: AuthenticatedRequest, res) => {
  try {
    const slug = await resolveHelenaSlug(req);

    const stats = await db
      .select({
        mes: sql<string>`to_char(migrated_at, 'YYYY-MM')`,
        outcome: helenaCardMigrations.outcome,
        total: sql<number>`count(*)::int`,
      })
      .from(helenaCardMigrations)
      .where(slug ? eq(helenaCardMigrations.tenantId, slug) : undefined)
      .groupBy(
        sql`to_char(migrated_at, 'YYYY-MM')`,
        helenaCardMigrations.outcome
      )
      .orderBy(sql`to_char(migrated_at, 'YYYY-MM') desc`);

    res.json({ ok: true, data: stats });
  } catch (err) {
    console.error("[Helena] Erro ao buscar stats:", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── Seed histórico — endpoint temporário para inserir dados de dev em produção ──
// Protegido por requireAuth. Idempotente: só insere se não houver registros para r2pb.
router.post("/helena/seed-historico", requireAuth, async (_req: AuthenticatedRequest, res) => {
  try {
    const existing = await db
      .select({ total: count() })
      .from(helenaCardMigrations)
      .where(eq(helenaCardMigrations.tenantId, "r2pb"));

    if ((existing[0]?.total ?? 0) > 0) {
      return res.json({ ok: true, message: "Dados já existem — seed ignorado", total: existing[0]?.total });
    }

    const historico = [
      { id: "d67c5941-3a0f-4d0b-8d60-d2520b512c09", tenantId: "r2pb", cardId: "5806fd79-b649-4bd7-8fc0-f42d1d0d8f5e", cardTitle: "Letícia Ferreira, Be Green", cardKey: "PCP-24", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Letícia Ferreira, Be Green", contactPhone: "+55 11976529521", monetaryAmount: "6829.60", destinationCardId: "075fe275-4f13-4b43-b0ee-c3b483583b64", migratedAt: new Date("2026-06-03T21:24:30.819Z") },
      { id: "7d578eca-722d-4d6d-9682-ac4ac520b685", tenantId: "r2pb", cardId: "41025735-31a4-419b-9ec0-773ef80c4675", cardTitle: "Sandra Beccaro, Ladies of the Road", cardKey: "PCP-130", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Sandra Beccaro, Ladies of the Road", contactPhone: "+55 11996167020", monetaryAmount: "1000.00", destinationCardId: "40a6f6b9-d640-48ff-8d58-6cded9a4a906", migratedAt: new Date("2026-06-03T21:24:32.250Z") },
      { id: "681ab5ef-7c85-4df9-b506-a0679b00573c", tenantId: "r2pb", cardId: "5e828d4d-7788-46c6-acec-2ceab65b15de", cardTitle: "Ricard Alves, Games(11) 94446-1032", cardKey: "PCP-72", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Ricard Alves, Games", contactPhone: "+55 11944461032", monetaryAmount: "700.00", destinationCardId: "9b1892cd-b894-4ce4-9e39-9d5e96ef293e", migratedAt: new Date("2026-06-03T21:24:36.769Z") },
      { id: "a35841ec-ced9-4e9f-a666-b410102d3879", tenantId: "r2pb", cardId: "9b13a26e-5ed0-4d15-ad19-d5f3bc96c0a0", cardTitle: "Nathalia, Bag2go ABRIL", cardKey: "PCP-283", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Nathalia, Bag2go", contactPhone: "+55 11999117722", monetaryAmount: "6438.53", destinationCardId: "cefcd726-dbd1-42de-bf01-aa6c43ee163c", migratedAt: new Date("2026-06-03T21:24:38.203Z") },
      { id: "2fb4c7b7-8d6d-449c-9b41-954145ffec93", tenantId: "r2pb", cardId: "a0d60b96-c70d-466b-846f-9de1d95fd3fe", cardTitle: "Maria Clara Quinderé, Stark Bank TECIDO FINO", cardKey: "PCP-284", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Maria Clara Quinderé, Stark Bank", contactPhone: "+55 85981922997", monetaryAmount: "19548.00", destinationCardId: "63596f81-925a-4987-97fd-56326e1999c2", migratedAt: new Date("2026-06-03T21:24:39.159Z") },
      { id: "b776ddae-cdea-4480-9d27-c9b131ba3b2d", tenantId: "r2pb", cardId: "1399897f-4f13-455e-bea6-08bd86ab3c13", cardTitle: "Antonio Artigas, starstarstar 2", cardKey: "PCP-75", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Antonio Artigas, starstarstar", contactPhone: "+55 21974026186", monetaryAmount: "14080.00", destinationCardId: "36ed9ff7-f46e-4734-9c0d-6cc507a1c593", migratedAt: new Date("2026-06-03T21:24:40.550Z") },
      { id: "745f61de-a7c5-4868-89a6-6277b1d78f53", tenantId: "r2pb", cardId: "166f5725-3d6e-4528-ace7-1cb16bf26665", cardTitle: "Tamara, SUPER BOUTIQUE(65) 99972-4699", cardKey: "PCP-244", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Tamara, SUPER BOUTIQUE", contactPhone: "+55 65999724699", monetaryAmount: "3980.00", destinationCardId: "ba8c962e-e074-4525-b0e7-dfdb30141094", migratedAt: new Date("2026-06-03T21:24:41.455Z") },
      { id: "83a3e86d-f862-44bc-828e-a4f13575633c", tenantId: "r2pb", cardId: "c060cd09-aae2-4af2-b15e-cc026908052f", cardTitle: "Vincenzo Barbagallo, DIRT DAD", cardKey: "PCP-226", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Vincenzo Barbagallo, DIRT DAD", contactPhone: "+55 19992245710", monetaryAmount: "5391.36", destinationCardId: "e045f176-8edd-4110-b2fd-6cac5475dee9", migratedAt: new Date("2026-06-03T21:24:42.587Z") },
      { id: "b087b2c9-83a5-4558-a238-4da38a72b15b", tenantId: "r2pb", cardId: "5f932f46-c2fa-4e94-9555-71c9a404df74", cardTitle: "Janaina Cruvinel Rosa", cardKey: "PCP-334", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Janaina Cruvinel Rosa", contactPhone: "+55 11976464619", monetaryAmount: "1639.80", destinationCardId: "74596538-6311-47c8-a97f-fbf023fbfa45", migratedAt: new Date("2026-06-03T21:24:43.694Z") },
      { id: "766a39bd-5de8-46c1-a648-c9f23629c518", tenantId: "r2pb", cardId: "62a86c26-0d41-47c6-a046-1b16929f26dc", cardTitle: "Pedro, kenoa labs (BONÉ)", cardKey: "PCP-308", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Pedro, kenoa labs", contactPhone: "+55 82988111000", monetaryAmount: "200.00", destinationCardId: "1c6c6fbb-1c78-4fd5-84a3-42bae3715a40", migratedAt: new Date("2026-06-03T21:24:44.672Z") },
      { id: "9b35013a-7f7f-4b0c-a214-2bb426ff37ab", tenantId: "r2pb", cardId: "19e48ba8-fe38-44f6-98fb-00f05ba40c29", cardTitle: "Diogo, Berço Eletrico(11) 97277-3827", cardKey: "PCP-272", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Diogo, Berço Eletrico", contactPhone: "+55 11972773827", monetaryAmount: "10640.40", destinationCardId: "42dd3e28-a485-4a76-afe6-3ba79fc063e0", migratedAt: new Date("2026-06-03T21:24:45.800Z") },
      { id: "8443e7f9-c4e9-4ecc-bbec-bc4e846c6274", tenantId: "r2pb", cardId: "853c845b-84c4-4320-bac5-10a924a4a618", cardTitle: "Ingrid e frederico, éliou", cardKey: "PCP-21", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Ingrig, éliou", contactPhone: "+55 27999958989", monetaryAmount: "80258.00", destinationCardId: "80d58ca7-140f-4748-86b3-dfeff1ddbf30", migratedAt: new Date("2026-06-03T21:24:47.886Z") },
      { id: "8ed4f888-550d-44fb-8c93-f8137d4a9930", tenantId: "r2pb", cardId: "3a4097de-8754-46f8-a195-c1c07c1a1788", cardTitle: "Maria Mendes, TALCHÁ", cardKey: "PCP-456", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Maria Mendes, TALCHÁ", contactPhone: "+55 11991191591", monetaryAmount: "4104.00", destinationCardId: "67abefa1-f487-477e-b0fc-a1b482d629e5", migratedAt: new Date("2026-06-03T21:24:49.619Z") },
      { id: "e1e37c88-1d6f-4470-99ca-a781eb543144", tenantId: "r2pb", cardId: "787764f7-abd0-4cfe-a28b-3705afb14609", cardTitle: "Felipe Vetturi, Naice Company - PEDIDO JAQUETA", cardKey: "PCP-339", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Felipe Vetturi, Naice Company", contactPhone: "+55 11971890052", monetaryAmount: "7292.00", destinationCardId: "bbf59b1a-3be7-4c63-9f42-d89a7a199426", migratedAt: new Date("2026-06-03T21:24:51.072Z") },
      { id: "a7cfa249-dfad-4a22-a862-3c10005a09e8", tenantId: "r2pb", cardId: "538ec8f8-f21d-4bd7-afbc-2d0aa5ec5941", cardTitle: "Victoria, CAFÉ COM LEITE+972 543217444", cardKey: "PCP-434", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Victoria, CAFÉ COM LEITE", contactPhone: "+972 543217444", monetaryAmount: "7226.46", destinationCardId: "d63c8c0f-7567-4d60-b477-648b5666ff50", migratedAt: new Date("2026-06-03T21:24:52.685Z") },
      { id: "941f3eb3-442e-4312-b9f2-26c2daed77ec", tenantId: "r2pb", cardId: "94cb4b7a-5954-44ef-9b18-857a01815ae0", cardTitle: "Tais e Adriano, ESSENCIA DO ALTO(11) 98762-5608", cardKey: "PCP-422", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Tais e Adriano, ESSENCIA DO ALTO", contactPhone: "+55 11987625608", monetaryAmount: "5054.40", destinationCardId: "7bab14be-6928-4f0e-a29e-385828de8d86", migratedAt: new Date("2026-06-03T21:24:54.294Z") },
      { id: "f3e1f7f4-90d4-4b94-b242-2a7344b4bb06", tenantId: "r2pb", cardId: "8b7a1cdf-8bed-44fe-9b75-0ce93aa9ba2a", cardTitle: "Felipe Vetturi, Naice Company - REPIQUE 19 MAIO", cardKey: "PCP-542", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Felipe Vetturi, Naice Company", contactPhone: "+55 11971890052", monetaryAmount: "4980.00", destinationCardId: "8a096e5e-b9b3-4db4-8004-da30635c9408", migratedAt: new Date("2026-06-03T21:24:55.131Z") },
      { id: "2515bb91-e0aa-44e7-8b8a-d67a67ce016a", tenantId: "r2pb", cardId: "b14aa53d-8dc1-4e5c-bce5-08f885daeebe", cardTitle: "Paola Merlin, LOUMI (17) 99788-0024", cardKey: "PCP-95", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Paola Merlin, LOUMI", contactPhone: "+55 17997880024", monetaryAmount: "21142.80", destinationCardId: "7af73af3-85cf-480c-9e1f-b5388112c880", migratedAt: new Date("2026-06-03T21:24:56.189Z") },
      { id: "1a4b7426-1d89-4f23-b030-c3591ac8b3de", tenantId: "r2pb", cardId: "97eae84b-382a-443c-bc3e-e9341ac57eb7", cardTitle: "Felipe, ARENO (13) 99608-9876", cardKey: "PCP-468", outcome: "WON" as const, sourceStepId: "cc9d7e65-d118-4799-8377-e869a76403c2", sourceStepTitle: "GANHO MARÇO", contactName: "Felipe, ARENO", contactPhone: "+55 13996089876", monetaryAmount: "8179.20", destinationCardId: "b192dcb7-a9dc-4f72-ae9f-0f056d265a58", migratedAt: new Date("2026-06-03T21:24:57.642Z") },
    ];

    await db.insert(helenaCardMigrations).values(historico);
    return res.json({ ok: true, message: `${historico.length} registros históricos inseridos com sucesso` });
  } catch (err) {
    console.error("[Helena] Erro no seed histórico:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// ─── Sync manual — busca cards numa etapa WTS e insere os faltantes no banco ──
// Aceita autenticação por sessão OU por Bearer HELENA_API_TOKEN
async function syncStep(
  tenantId: string,
  stepId: string,
  stepTitle: string,
  outcome: "WON" | "LOST",
  res: import("express").Response
) {
  const wtsRes = await fetch(
    `${WTS_BASE}/crm/v2/panel/card?panelId=${PIPELINE_COMERCIAL_PRO_ID}&stepId=${stepId}&pageSize=100&pageNumber=1`,
    { headers: wtsHeaders() }
  );
  if (!wtsRes.ok) {
    return res.status(502).json({ ok: false, error: `WTS API error: ${wtsRes.status}` });
  }
  const data = await wtsRes.json() as { items: Array<Record<string, unknown>>; totalItems: number };
  const cards = data.items ?? [];

  const existingRows = await db
    .select({ cardId: helenaCardMigrations.cardId })
    .from(helenaCardMigrations)
    .where(eq(helenaCardMigrations.tenantId, tenantId));
  const existingIds = new Set(existingRows.map((r) => r.cardId));

  const novos = cards.filter((c) => !existingIds.has(c.id as string));

  if (novos.length === 0) {
    return res.json({ ok: true, inserted: 0, total: cards.length, message: "Todos os cards já estão registrados" });
  }

  await db.insert(helenaCardMigrations).values(
    novos.map((c) => ({
      tenantId,
      cardId: c.id as string,
      cardTitle: (c.title as string) || null,
      cardKey: (c.key as string) || null,
      outcome,
      sourceStepId: stepId,
      sourceStepTitle: stepTitle,
      contactName: null,
      contactPhone: null,
      monetaryAmount: c.monetaryAmount != null ? String(c.monetaryAmount) : null,
      destinationCardId: null,
      migratedAt: new Date(),
    }))
  );

  console.log(`[Helena] 🔄 Sync ${outcome}: ${novos.length} cards inseridos para tenant ${tenantId}`);
  return res.json({ ok: true, inserted: novos.length, total: cards.length, message: `${novos.length} cards sincronizados com sucesso` });
}

// POST /api/helena/sync-ganho?tenant=r2pb
router.post("/helena/sync-ganho", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantId = (req.query.tenant as string) || "r2pb";
  try {
    return await syncStep(tenantId, [...FINAL_WON_STEP_IDS][0], "GANHO", "WON", res);
  } catch (err) {
    console.error("[Helena] Erro no sync GANHO:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/helena/sync-perdido?tenant=r2pb
router.post("/helena/sync-perdido", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantId = (req.query.tenant as string) || "r2pb";
  try {
    return await syncStep(tenantId, [...FINAL_LOST_STEP_IDS][0], "PERDIDO", "LOST", res);
  } catch (err) {
    console.error("[Helena] Erro no sync PERDIDO:", err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get("/helena/webhook/status", (_req, res) => {
  const health = getHelenaWebhookStatus();
  res.json({
    ok: true,
    token_configured: !!WTS_TOKEN,
    pipeline_comercial_pro: PIPELINE_COMERCIAL_PRO_ID,
    final_won_step_ids: [...FINAL_WON_STEP_IDS],
    final_lost_step_ids: [...FINAL_LOST_STEP_IDS],
    keyword_fallback: { won: WON_KEYWORDS, lost: LOST_KEYWORDS },
    webhook_url_format: "/api/helena/webhook?tenant=<slug-do-tenant>",
    monitor: {
      healthy: health.healthy,
      lastEventAt: health.lastEventAt,
      silenceHours: health.silenceHours,
      alertThresholdHours: 2,
    },
  });
});

export default router;
