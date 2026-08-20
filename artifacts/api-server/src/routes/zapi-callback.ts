import { Router } from "express";
import type { Request, Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../lib/logger";
import { db, pool, salesAutomationConfig } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { supabaseAdmin } from "../lib/supabase";
import { chamarMarcosDireto } from "../lib/marcosProvider";
import { chamarJoanaDireto } from "../lib/joanaProvider";
import { chamarLiaDireto } from "../lib/liaProvider";
import { chamarCaioDireto } from "../lib/caioProvider";

// ── Slug → UUID (via Supabase tenants, com cache em memória) ─────────────────
// set-human-control resolve UUID via supabaseAdmin.from("tenants") — a mesma
// fonte deve ser usada aqui, pois o heliumdb local não tem tabela de tenants.
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

// Sem um webhook próprio, a Mirage não deve processar mensagens. Fallback para
// rotas de outro escopo é proibido.
const MIRAGE_N8N_WEBHOOK_URL =
  process.env["N8N_ZAPI_WEBHOOK_MIRAGE"]?.trim() ?? "";

const R2PB_POSTFUNNEL_URL =
  process.env["N8N_ZAPI_WEBHOOK_R2PB"]?.trim() ?? "";

// ── Deduplicação em memória ──────────────────────────────────────────────────
// Evita processar o mesmo messageId duas vezes (Z-API pode duplicar eventos).
// TTL de 5 minutos por ID.
const seenIds = new Map<string, number>();
const SEEN_TTL_MS = 5 * 60 * 1000;

function isDuplicate(messageId: string): boolean {
  const now = Date.now();
  // Limpa IDs expirados (lazy cleanup)
  for (const [k, ts] of seenIds) {
    if (now - ts > SEEN_TTL_MS) seenIds.delete(k);
  }
  if (seenIds.has(messageId)) return true;
  seenIds.set(messageId, now);
  return false;
}

// ── Extrai texto de diferentes formatos de payload Z-API ──────────────────
function extractText(body: Record<string, unknown>): string | null {
  const text = body.text as Record<string, unknown> | string | undefined;
  if (typeof text === "string") return text || null;
  if (text && typeof text === "object") {
    return (text.message as string) ?? (text.body as string) ?? null;
  }
  // Fallback direto no body
  return (body.message as string) ?? (body.body as string) ?? null;
}

// ── Normaliza telefone: remove +, espaços, traços ────────────────────────
function normalizePhone(raw: string): string {
  return String(raw).replace(/[\s\-+()\u200B]/g, "");
}

function configuredMirageInstanceId(): string | null {
  const expectedInstanceId = process.env["ZAPI_INSTANCE_MIRAGE"]?.trim();
  const token = process.env["ZAPI_TOKEN_MIRAGE"]?.trim();
  const clientToken = process.env["ZAPI_CLIENT_TOKEN_MIRAGE"]?.trim();
  return expectedInstanceId && token && clientToken ? expectedInstanceId : null;
}

function hasValidMirageCallbackProof(req: Request): boolean {
  const internalKey = process.env["MARKETING_INTERNAL_API_KEY"]?.trim();
  const instanceId = configuredMirageInstanceId();
  const providedProof = String(req.query.proof ?? "").trim();
  if (!internalKey || !instanceId || !providedProof) return false;

  const expectedProof = createHmac("sha256", internalKey)
    .update(`zapi-inbound:mirage:${instanceId}`)
    .digest("hex");
  const provided = Buffer.from(providedProof);
  const expected = Buffer.from(expectedProof);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

async function resolveTenantUuidStrict(slug: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  return data?.id ?? null;
}

async function isExpectedInstanceForTenant(
  tenantSlug: string,
  body: Record<string, unknown>,
): Promise<boolean> {
  const receivedInstanceId = String(body.instanceId ?? "").trim();
  if (!receivedInstanceId) return false;

  if (tenantSlug === "mirage") {
    return receivedInstanceId === configuredMirageInstanceId();
  }

  const tenantId = await resolveTenantUuidStrict(tenantSlug);
  if (!tenantId) return false;

  const rows = await db
    .select({ whatsappInstances: salesAutomationConfig.whatsappInstances })
    .from(salesAutomationConfig)
    .where(eq(salesAutomationConfig.tenantId, tenantId))
    .limit(1);
  const instances = rows[0]?.whatsappInstances;

  return Array.isArray(instances) && instances.some((entry) => {
    const instance = entry as { canal?: string; instanceId?: string };
    return instance.canal === "zapi" && instance.instanceId === receivedInstanceId;
  });
}

async function forwardMirageMessageToN8n(params: {
  phone: string;
  chatName: string;
  messageId: string;
  momment: number;
  messageText: string;
  req: Request;
}): Promise<boolean> {
  const { phone, chatName, messageId, momment, messageText, req } = params;

  if (!MIRAGE_N8N_WEBHOOK_URL) {
    req.log.error("zapi-callback: webhook n8n exclusivo da Mirage não configurado");
    return false;
  }

  const payload = {
    type: "ReceivedCallback",
    company_slug: "mirage",
    phone,
    text: { message: messageText },
    lead_name: chatName,
    source: "zapi_direct",
    event_type: "MESSAGE_RECEIVED",
    channel: "whatsapp_zapi",
    momment,
    isGroup: false,
    fromMe: false,
    messageId: messageId || undefined,
  };

  try {
    const n8nRes = await fetch(MIRAGE_N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    if (!n8nRes.ok) {
      req.log.warn(
        { n8nStatus: n8nRes.status, phoneTail: phone.slice(-4) },
        "zapi-callback: webhook n8n Mirage retornou erro"
      );
      return false;
    }

    req.log.info(
      { phoneTail: phone.slice(-4), messageId },
      "zapi-callback: mensagem Mirage encaminhada ao n8n"
    );
    return true;
  } catch (error) {
    req.log.warn(
      { error: error instanceof Error ? error.message : "Falha de conexão", phoneTail: phone.slice(-4) },
      "zapi-callback: falha ao entregar callback Mirage ao n8n"
    );
    return false;
  }
}

// ── POST /api/zapi/callback ───────────────────────────────────────────────
//
// Endpoint público — recebe ReceivedCallback do Z-API (sem auth header).
// Segurança mínima: ?tenant=<slug> no URL identifica o tenant. Sem tenant
// explícito, o callback é rejeitado — nunca assumir r2pb como fallback.
//
// URL configurada no Z-API:
//   https://<dominio>/api/zapi/callback?tenant=mirage
//
// Payload esperado (Z-API v2):
//   { type, phone, chatName, senderName, text: { message }, momment,
//     isGroup, fromMe, messageId, instanceId, ... }

router.post("/zapi/callback", async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const tenantSlug = String(req.query.tenant ?? "").trim().toLowerCase();
  if (!tenantSlug) {
    res.status(400).json({ ok: false, error: "tenant obrigatório" });
    return;
  }
  if (!["r2pb", "mirage", "moda_conecta"].includes(tenantSlug)) {
    res.status(400).json({ ok: false, error: "tenant inválido" });
    return;
  }

  try {
    if (tenantSlug === "mirage" && !hasValidMirageCallbackProof(req)) {
      req.log.warn({ tenantSlug }, "zapi-callback: callback Mirage rejeitado por prova ausente ou inválida");
      res.status(403).json({ ok: false, error: "callback Mirage não autenticado" });
      return;
    }

    const expectedInstance = await isExpectedInstanceForTenant(tenantSlug, body);
    if (!expectedInstance) {
      req.log.warn(
        { tenantSlug, receivedInstanceId: body.instanceId ? "[present]" : "[missing]" },
        "zapi-callback: callback rejeitado por instância não autorizada para o tenant"
      );
      res.status(403).json({ ok: false, error: "instância não autorizada para este tenant" });
      return;
    }
    if (tenantSlug === "mirage" && !MIRAGE_N8N_WEBHOOK_URL) {
      res.status(503).json({ ok: false, error: "webhook n8n da Mirage não configurado" });
      return;
    }

    // A Mirage só recebe confirmação após o n8n confirmar o recebimento: em
    // caso de falha, a Z-API pode reenviar o callback. Os fluxos legados
    // continuam sendo reconhecidos após a validação de escopo.
    if (tenantSlug !== "mirage") {
      res.status(202).json({ ok: true });
    }

    const eventType = (body.type as string) ?? "";
    const fromMe    = Boolean(body.fromMe);
    const isGroup   = Boolean(body.isGroup);
    const messageId = (body.messageId as string) ?? "";
    const phone     = normalizePhone((body.phone as string) ?? "");
    const chatName  = (body.chatName as string) ?? (body.senderName as string) ?? "Lead";
    const momment   = (body.momment as number) ?? Date.now();

    // ── Filtros ────────────────────────────────────────────────────────────
    if (fromMe) {
      req.log.debug({ tenantSlug, phone, messageId }, "zapi-callback: fromMe=true, ignorado");
      if (tenantSlug === "mirage") res.status(200).json({ ok: true, ignored: "from_me" });
      return;
    }
    if (isGroup) {
      req.log.debug({ tenantSlug, phone, messageId }, "zapi-callback: grupo, ignorado");
      if (tenantSlug === "mirage") res.status(200).json({ ok: true, ignored: "group" });
      return;
    }

    // Só processa ReceivedCallback (mensagem de entrada)
    const isReceived =
      !eventType ||
      eventType === "ReceivedCallback" ||
      eventType === "MessageReceived" ||
      eventType.toLowerCase().includes("received");

    if (!isReceived) {
      req.log.debug({ tenantSlug, phone, eventType }, "zapi-callback: eventType não é mensagem recebida, ignorado");
      if (tenantSlug === "mirage") res.status(200).json({ ok: true, ignored: "event_type" });
      return;
    }

    // ── Deduplicação ────────────────────────────────────────────────────────
    if (messageId && isDuplicate(messageId)) {
      req.log.debug({ tenantSlug, phone, messageId }, "zapi-callback: messageId duplicado, ignorado");
      if (tenantSlug === "mirage") res.status(200).json({ ok: true, ignored: "duplicate" });
      return;
    }

    // ── Fluxo exclusivo Mirage ──────────────────────────────────────────────
    // A Mirage opera pela própria instância Z-API e pelo n8n. Ela não passa
    // pelo Helena, pelos agentes ou por qualquer automação da R2PB.
    if (tenantSlug === "mirage") {
      const messageText = extractText(body);
      if (!messageText) {
        req.log.debug({ messageId, phoneTail: phone.slice(-4) }, "zapi-callback: Mirage sem texto, ignorado");
        res.status(200).json({ ok: true, ignored: "no_text" });
        return;
      }
      const delivered = await forwardMirageMessageToN8n({
        phone,
        chatName,
        messageId,
        momment,
        messageText,
        req,
      });
      if (!delivered && messageId) seenIds.delete(messageId);
      res.status(delivered ? 200 : 502).json({
        ok: delivered,
        ...(delivered ? {} : { error: "Falha ao encaminhar mensagem Mirage ao n8n" }),
      });
      return;
    }

    // ── COTAÇÃO PARCEIROS: detecta ANTES do check de messageText ────────────
    // Para botões Z-API, text.message vem vazio → messageText seria null.
    // Por isso esta checagem roda ANTES do guard abaixo.
    try {
      const phoneTail = phone.replace(/\D/g, "").slice(-10);
      const bd = body as Record<string, any>;

      // Botão interativo (parceiro tocou em ✅ Sim / ❌ Não)
      const btnId = String(
        bd.buttonResponseMessage?.buttonId ??
        bd.listResponseMessage?.singleSelectReply?.selectedRowId ?? ""
      ).toLowerCase();
      let cotacaoSim = !!(btnId && (btnId === "btn_sim" || btnId.includes("sim")));
      let cotacaoNao = !!(btnId && (btnId === "btn_nao" || btnId.includes("nao") || btnId.includes("não")));

      // Texto livre digitado (fallback)
      if (!cotacaoSim && !cotacaoNao) {
        const rawText = (
          String(bd.text?.message ?? bd.text?.body ?? bd.message ?? bd.body ?? "")
        ).toLowerCase().trim();
        if (rawText) {
          cotacaoSim = /^(s|sim|yes|y|quero|tenho|ok|top|pode|claro|aceito|interesse|interessado|disponivel|disponível|com certeza|👍)/.test(rawText);
          cotacaoNao = /^(n|nao|não|no|negativo|indisponivel|indisponível|não tenho|nao tenho|nope|agora n)/.test(rawText);
        }
      }

      if (cotacaoSim || cotacaoNao) {
        const phoneDigits = phone.replace(/\D/g, "");
        const resposta = cotacaoSim ? "sim" : "nao";

        // 1ª tentativa: sistema novo (cotacao_destinatarios)
        const { rows: destRows } = await pool.query(
          `SELECT cd.id
           FROM cotacao_destinatarios cd
           WHERE cd.resposta IS NULL
             AND cd.enviado_at IS NOT NULL
             AND (
               regexp_replace(cd.parceiro_whatsapp, '[^0-9]', '', 'g') LIKE $1
               OR regexp_replace(cd.parceiro_whatsapp, '[^0-9]', '', 'g') = $2
               OR regexp_replace(cd.parceiro_whatsapp, '[^0-9]', '', 'g') = $3
             )
           ORDER BY cd.enviado_at DESC
           LIMIT 1`,
          [`%${phoneTail}`, phoneDigits, phoneDigits.replace(/^55/, "")]
        );

        if (destRows.length) {
          await pool.query(
            `UPDATE cotacao_destinatarios SET resposta = $1, resposta_at = NOW() WHERE id = $2`,
            [resposta, destRows[0].id]
          );
          req.log.info({ destId: destRows[0].id, resposta, phoneTail }, "zapi-callback: resposta de cotação (novo sistema) registrada");
          fetch("https://webhook.wts.chat/v1/zapi", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(8_000),
          }).catch(() => {});
          return;
        }

        // 2ª tentativa: sistema legado (parceiros_producao.cotacao_resposta)
        const { rows: parceiroRows } = await pool.query(
          `SELECT id FROM parceiros_producao
           WHERE cotacao_enviada_at IS NOT NULL
             AND cotacao_resposta IS NULL
             AND (
               regexp_replace(whatsapp, '[^0-9]', '', 'g') LIKE $1
               OR regexp_replace(whatsapp, '[^0-9]', '', 'g') = $2
               OR regexp_replace(whatsapp, '[^0-9]', '', 'g') = $3
             )
           LIMIT 1`,
          [`%${phoneTail}`, phoneDigits, phoneDigits.replace(/^55/, "")]
        );

        if (parceiroRows.length) {
          await pool.query(
            `UPDATE parceiros_producao SET cotacao_resposta = $1, updated_at = NOW() WHERE id = $2`,
            [resposta, parceiroRows[0].id]
          );
          req.log.info({ parceiroId: parceiroRows[0].id, resposta, phoneTail }, "zapi-callback: resposta de cotação (legado) registrada");
          fetch("https://webhook.wts.chat/v1/zapi", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body), signal: AbortSignal.timeout(8_000),
          }).catch(() => {});
          return;
        }
      }
    } catch (cotacaoErr: any) {
      req.log.warn({ error: cotacaoErr?.message }, "zapi-callback: erro ao checar cotação parceiro — continuando fluxo normal");
    }

    // ── Extrai texto da mensagem ─────────────────────────────────────────────
    const messageText = extractText(body);
    if (!messageText) {
      req.log.debug({ tenantSlug, phone, body }, "zapi-callback: sem texto, ignorado");
      return;
    }

    // ── PROTEÇÃO HUMANO: não encaminhar para IA se agente está no controle ───
    // IMPORTANTE: set-human-control grava com UUID do tenant, não com slug.
    // O check PRECISA usar o mesmo UUID, caso contrário nunca encontra a linha.
    const tenantUuid = await resolveSlugToUuid(tenantSlug);
    try {
      const phoneDigits = phone.replace(/\D/g, "");
      const phoneWith55 = phoneDigits.startsWith("55") ? phoneDigits : `55${phoneDigits}`;
      const phoneWithout55 = phoneWith55.slice(2);
      const hicRows = await db.execute(
        sql`SELECT 1 FROM lead_conversation_state
            WHERE tenant_id = ${tenantUuid}
              AND phone IN (${phoneWith55}, ${phoneWithout55})
              AND human_in_control = true
            LIMIT 1`
      );
      if ((hicRows.rows as unknown[]).length > 0) {
        req.log.info(
          { tenantSlug, tenantUuid, phone, messageId },
          "[Joana Guard] zapi-callback: human_in_control=true → IA BLOQUEADA, mensagem ignorada"
        );
        return;
      }
      req.log.debug(
        { tenantSlug, tenantUuid, phone },
        "[Joana Guard] zapi-callback: human_in_control=false → seguir"
      );
    } catch (hicErr: any) {
      req.log.warn({ error: hicErr?.message }, "zapi-callback: erro ao checar human_in_control — prosseguindo normalmente");
    }

    // ── Verifica se lead tem agente AI atribuído ────────────────────────────
    const phoneWith55 = phone.replace(/\D/g, "").replace(/^(?!55)/, "55");
    try {
      const stateRows = await db.execute(
        sql`SELECT current_agent, lead_name FROM lead_conversation_state
            WHERE tenant_id = ${tenantUuid}
              AND phone IN (${phoneWith55}, ${phone})
            LIMIT 1`
      );
      const stateRow = (stateRows.rows as any[])[0];
      const currentAgent = stateRow?.current_agent as string | null;
      const leadNameDb   = (stateRow?.lead_name as string) || chatName;

      if (currentAgent && currentAgent !== "carla") {
        req.log.info({ tenantSlug, phone, currentAgent }, `[MULTIAGENTE] zapi-callback → roteando para ${currentAgent}`);

        const selfUrl     = `http://localhost:${process.env.PORT ?? 3001}`;
        const internalKey = process.env.MARKETING_INTERNAL_API_KEY ?? "";

        const sendReply = async (reply: string, agentLabel: string) => {
          await fetch(`${selfUrl}/api/internal/zapi/send-message`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
            body: JSON.stringify({
              company_slug: tenantSlug,
              phone,
              message: `${reply}\n\n_— ${agentLabel}_`,
              route_type: `${currentAgent}_zapi`,
            }),
          });
        };

        if (currentAgent === "marcos") {
          const r = await chamarMarcosDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
          if (r.ok && r.reply) await sendReply(r.reply, "MARCOS | R2PB Parceiros");
        } else if (currentAgent === "joana") {
          const r = await chamarJoanaDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
          if (r.ok && r.reply) await sendReply(r.reply, "JOANA | R2PB");
        } else if (currentAgent === "lia") {
          const r = await chamarLiaDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
          if (r.ok && r.reply) await sendReply(r.reply, "LIA | Suporte R2PB");
        } else if (currentAgent === "admin") {
          const r = await chamarCaioDireto({ phone, message: messageText, leadName: leadNameDb, tenantId: tenantSlug });
          if (r.ok && r.reply) await sendReply(r.reply, "CAIO | Administrativo R2PB");
        }

        return; // não cai no n8n
      }
    } catch (agentErr: any) {
      req.log.warn({ error: agentErr?.message, phone }, "zapi-callback: erro no roteamento de agente — caindo no n8n");
    }

    // ── Forward para Helena (fire-and-forget) ────────────────────────────────
    // Garante que as mensagens continuem aparecendo no CRM Helena mesmo com
    // o webhook "Ao receber" apontando para o nosso servidor.
    fetch("https://webhook.wts.chat/v1/zapi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8_000),
    }).catch((e: any) => {
      req.log.warn({ error: e?.message, phone }, "zapi-callback: falha ao fazer forward para Helena (ignorado)");
    });

    // ── Fluxo de triagem R2PB (sem agente) — zapi-check anti-loop ────────────
    // Verifica se o lead já foi triado e qual ação tomar. O endpoint cacheia
    // o resultado na 1ª chamada; chamadas seguintes retornam imediatamente.
    if (tenantSlug === "r2pb") {
      try {
        const selfUrl     = `http://localhost:${process.env.PORT ?? 3001}`;
        const internalKey = process.env.MARKETING_INTERNAL_API_KEY ?? "";

        const checkRes = await fetch(`${selfUrl}/api/internal/r2pb/zapi-check`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
          body: JSON.stringify({ phone }),
          signal: AbortSignal.timeout(8_000),
        });

        if (checkRes.ok) {
          const check = await checkRes.json() as {
            already_handled: boolean;
            action: string;
            human_in_control?: boolean;
            nome?: string;
            form_link?: string;
          };

          req.log.info({ phone, action: check.action, already_handled: check.already_handled }, "zapi-callback: zapi-check result");

          // Se já está em controle humano ou foi tratado e ação é silenciosa → não fazer nada
          if (check.human_in_control || check.action === "noop_client" || check.action === "noop_supplier") {
            req.log.info({ phone, action: check.action }, "zapi-callback: ação silenciosa → encaminhando ao POSTFUNNEL");
            // Cai no POSTFUNNEL normalmente abaixo
          } else if (check.action === "send_form") {
            // Envia link do diagnóstico (1ª vez OU já_tratado=true com ação send_form)
            if (!check.already_handled) {
              const msg = `Olá! 👋 Para te direcionar da melhor forma, preciso entender seu perfil primeiro.\n\nAcesse nosso diagnóstico gratuito (leva menos de 2 min):\n${check.form_link ?? "https://www.gestaomirage.com.br/onboarding-portal/diagnostico"}`;
              await fetch(`${selfUrl}/api/internal/zapi/send-message`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
                body: JSON.stringify({ company_slug: tenantSlug, phone, message: msg, route_type: "triagem_form" }),
                signal: AbortSignal.timeout(10_000),
              });
              req.log.info({ phone }, "zapi-callback: link do diagnóstico enviado");
            }
            return;
          } else if (check.action === "handoff") {
            // Lead aprovado — avisa e ativa controle humano
            if (!check.already_handled) {
              const nome = check.nome ? `, ${check.nome.split(" ")[0]}` : "";
              const msg = `Olá${nome}! 👋 Vi que você já passou pelo nosso diagnóstico e tem perfil qualificado para a R2PB.\n\nUm de nossos consultores vai entrar em contato em breve. Fique à disposição!`;
              await fetch(`${selfUrl}/api/internal/zapi/send-message`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
                body: JSON.stringify({ company_slug: tenantSlug, phone, message: msg, route_type: "triagem_handoff" }),
                signal: AbortSignal.timeout(10_000),
              });
              // Ativa controle humano
              await fetch(`${selfUrl}/api/internal/leads/set-human-control`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
                body: JSON.stringify({ tenant_id: tenantSlug, phone, human_in_control: true }),
                signal: AbortSignal.timeout(5_000),
              });
              req.log.info({ phone }, "zapi-callback: lead aprovado → handoff ativado");
            }
            return;
          } else if (check.action === "send_rejection") {
            // Perfil reprovado — informa e oferece atualizar
            if (!check.already_handled) {
              const nome = check.nome ? `, ${check.nome.split(" ")[0]}` : "";
              const msg = `Olá${nome}! 👋 Passei a vista no seu diagnóstico e por enquanto seu perfil ainda não se encaixa no nosso modelo de produção.\n\nSe sua situação mudou ou quiser atualizar seus dados, é só refazer o diagnóstico:\nhttps://www.gestaomirage.com.br/onboarding-portal/diagnostico`;
              await fetch(`${selfUrl}/api/internal/zapi/send-message`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
                body: JSON.stringify({ company_slug: tenantSlug, phone, message: msg, route_type: "triagem_rejection" }),
                signal: AbortSignal.timeout(10_000),
              });
              req.log.info({ phone }, "zapi-callback: lead reprovado → mensagem de rejeição enviada");
            }
            return;
          }
        } else {
          req.log.warn({ phone, status: checkRes.status }, "zapi-callback: zapi-check retornou erro, caindo no POSTFUNNEL");
        }
      } catch (zapiCheckErr: any) {
        req.log.warn({ error: zapiCheckErr?.message, phone }, "zapi-callback: falha no zapi-check → caindo no POSTFUNNEL");
      }
    }

    req.log.info(
      { tenantSlug, phone, chatName, messageText: messageText.slice(0, 100), messageId },
      "zapi-callback: sem agente atribuído → encaminhando para POSTFUNNEL"
    );

    // ── Encaminha para n8n POSTFUNNEL_ROUTER ───────────────────────────────
    const postfunnelPayload = {
      type: "ReceivedCallback",
      company_slug: tenantSlug,
      phone,
      text: { message: messageText },
      lead_name: chatName,
      source: "zapi_direct",
      event_type: "MESSAGE_RECEIVED",
      channel: "whatsapp_zapi",
      momment,
      isGroup: false,
      fromMe: false,
      messageId: messageId || undefined,
    };

    if (!R2PB_POSTFUNNEL_URL) {
      req.log.warn({ tenantSlug, phoneTail: phone.slice(-4) }, "zapi-callback: webhook n8n R2PB não configurado");
      return;
    }

    const n8nRes = await fetch(R2PB_POSTFUNNEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postfunnelPayload),
      signal: AbortSignal.timeout(15_000),
    });

    if (!n8nRes.ok) {
      req.log.warn(
        { tenantSlug, phone, n8nStatus: n8nRes.status },
        "zapi-callback: n8n retornou status não-OK"
      );
    } else {
      req.log.info(
        { tenantSlug, phone, n8nStatus: n8nRes.status },
        "zapi-callback: POSTFUNNEL acionado com sucesso"
      );
    }
  } catch (err: any) {
    logger.error({ err: err?.message, tenantSlug }, "zapi-callback: erro ao processar");
    if (!res.headersSent) {
      res.status(502).json({ ok: false, error: "Falha ao processar callback" });
    }
  }
});

// ── GET /api/zapi/callback ────────────────────────────────────────────────
// Health check — confirma que o endpoint está ativo.
router.get("/zapi/callback", (_req: Request, res: Response) => {
  res.json({ ok: true, endpoint: "zapi-callback", status: "active" });
});

export default router;
