import { Router } from "express";
import type { Request, Response } from "express";
import { db, leadAiEvents, comercialLeads } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { supabaseAdmin } from "../../lib/supabase";
import { logger } from "../../lib/logger";

const router = Router();

// ── Constantes de Step IDs do Helena/WTS ─────────────────────────────────────
const POS_VENDAS_INICIO_STEP    = "f9060456-b94c-4c64-b8e2-bb9f2501afb0";
const VENDAS_PRO_PRIMEIRO_STEP  = process.env.VENDAS_PRO_PRIMEIRO_STEP_ID ?? "";

// Pipeline PERDIDO/NUTRIÇÃO (ddad2f4e-1142-4dbc-a665-aa2fb1418450)
const NUTRICAO_PIPELINE_ID           = "ddad2f4e-1142-4dbc-a665-aa2fb1418450";
const NUTRICAO_STEP_ORCAMENTO_EXPIRADO = "b35996c0-ed66-4193-9903-3b8ff8995171"; // Início — leads sem dados / dúvida simples
const NUTRICAO_STEP_AGUARDANDO_MOMENTO = "476c17ad-9c3f-438a-80d1-4c7b2e0fbad7"; // Interessados mas abaixo do threshold
const NUTRICAO_STEP_NUTRICAO_ATIVA     = "7b070ae8-35b6-4ec0-974d-18be9d815f74"; // Já em nutrição ativa (reativação)
// Etapas finais (usadas pelo n8n/humano):
// REATIVAÇÃO ENVIADA: 4fdbfdb5-5894-4d25-bb67-3d8865329d26
// REATIVADO (Final):  7cb62479-3c1d-44f3-b7e7-687fc4e7b157

// Pipeline FIDELIZAÇÃO/RECOMPRA (70317fb0-37a2-4537-a1c7-147bc8de7773)
// Clientes com entrega concluída — nutrição automática até recompra
const FIDELIZACAO_PIPELINE_ID         = "70317fb0-37a2-4537-a1c7-147bc8de7773";
const FIDELIZACAO_STEP_ENTREGUE       = "69508c16-93ef-423f-a2af-087182bcf8dc"; // Início: entrega recém-concluída
const FIDELIZACAO_STEP_NUTRICAO       = "b62b637b-728f-4cae-af37-ed6c416c7d72"; // Em nutrição automática
const FIDELIZACAO_STEP_REAGIU         = "08bfb03f-30fb-4cfb-b9b9-2c30591bca4e"; // Cliente reagiu à nutrição / entrou em contato
const FIDELIZACAO_STEP_VOLTA_COMERCIAL = "e64e2286-58ae-4c08-9b5c-83ad6a6c4c90"; // Pronto para voltar ao Vendas PRO

const WTS_BASE = "https://api.wts.chat";

// ── Auth middleware ───────────────────────────────────────────────────────────
// GPTMaker não suporta headers customizados → token via ?token= na URL
function requireWebhookAuth(req: Request, res: Response, next: () => void) {
  const gptHeader   = req.headers["x-gptmaker-token"] as string | undefined;
  const gptQuery    = req.query["token"] as string | undefined;
  const internalKey = req.headers["x-internal-key"] as string | undefined;

  const expectedGpt      = process.env.GPTMAKER_WEBHOOK_SECRET;
  const expectedInternal = process.env.MARKETING_INTERNAL_API_KEY;

  // Sem secret configurado → deixa passar (modo setup)
  if (!expectedGpt) { next(); return; }

  const gptOk      = gptHeader === expectedGpt || gptQuery === expectedGpt;
  const internalOk = expectedInternal && internalKey === expectedInternal;

  if (!gptOk && !internalOk) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// ── Slug → tenantId ───────────────────────────────────────────────────────────
const slugCache = new Map<string, { id: string; ts: number }>();
async function resolveSlug(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  if (!data?.id) return null;
  slugCache.set(slug, { id: data.id, ts: Date.now() });
  return data.id;
}

// ── Extrai campos do payload GPTMaker (formato real da API) ──────────────────
// O GPTMaker envia diferentes formatos dependendo do evento.
// Tentamos cobrir as variações documentadas e não-documentadas.
interface GptPayload {
  // Campos reais do GPTMaker (confirmados via payload ao vivo)
  assistantId?: string;
  contextId?: string;       // formato: "{agentId}-{phone}" — ex: "3F61...-5511992436154"
  contactPhone?: string;    // telefone do lead (campo real do GPTMaker)
  contactName?: string;     // nome do lead (campo real do GPTMaker)
  message?: string | { text?: string; body?: string };
  role?: string;            // "user" | "assistant"
  channel?: string;         // "WHATSAPP"
  messageId?: string;
  date?: string;
  images?: unknown[];
  audios?: unknown[];
  documents?: unknown[];
  variables?: Record<string, unknown>;  // variáveis coletadas pela Joana

  // Campos legados / formato alternativo
  event?: string;
  type?: string;
  chatId?: string;
  contact?: { name?: string; phone?: string; pushName?: string; [key: string]: unknown };
  lastMessage?: string | { text?: string; body?: string };
  telefone?: string;
  phone?: string;
  nome?: string;
  name?: string;
  company_slug?: string;
  destino_sugerido?: string;
  volume_estimado?: number | null;
  investimento_previsto?: number | null;
  resumo?: string;
  cliente_existente?: boolean;
  tipo_demanda?: string;
  [key: string]: unknown;
}

function extrairCampos(body: GptPayload, eventoOverride?: string): {
  evento: string;
  telefone: string;
  nome: string | undefined;
  resumo: string | undefined;
  variables: Record<string, unknown>;
  volumeEstimado: number | null;
  investimentoPrevisto: number | null;
  clienteExistente: boolean;
  tipoDemanda: string | undefined;
  destinoSugerido: string | undefined;
  publicoAlvo: string | undefined;
} {
  // Evento: prioridade ao override (query param ?event=), depois body, depois default
  const evento = eventoOverride ?? body.event ?? body.type ?? "onNewMessage";

  // Telefone: campo real GPTMaker é "contactPhone"; fallbacks para formatos alternativos
  // contextId vem como "{agentId}-{phone}" — extrai o sufixo numérico
  const phoneFromContext = body.contextId?.split("-").pop() ?? "";
  const telefone = String(
    body.contactPhone ??
    body.contact?.phone ??
    body.telefone ??
    body.phone ??
    body.chatId?.replace(/@.*/, "") ??
    phoneFromContext ??
    ""
  ).replace(/\D/g, "").slice(-13); // mantém só dígitos, máx 13

  // Nome: campo real GPTMaker é "contactName"
  const nome =
    body.contactName ??
    body.contact?.name ??
    body.contact?.pushName ??
    body.nome ??
    body.name ??
    undefined;

  // Variables (coletadas pela Joana durante a conversa)
  const variables: Record<string, unknown> = body.variables ?? {};

  // Última mensagem como resumo
  const lastMsg = body.lastMessage ?? body.message;
  const lastMsgText =
    typeof lastMsg === "string" ? lastMsg :
    typeof lastMsg === "object" && lastMsg ? (lastMsg.text ?? lastMsg.body ?? "") : "";

  const resumo =
    body.resumo ??
    (typeof variables.resumo === "string" ? variables.resumo : undefined) ??
    (lastMsgText ? String(lastMsgText).slice(0, 500) : undefined);

  // Dados quantitativos de qualificação (podem vir do payload direto ou das variables)
  const volumeEstimado =
    toNumber(body.volume_estimado) ??
    toNumber(variables.volume_estimado) ??
    toNumber(variables.volume) ??
    null;

  const investimentoPrevisto =
    toNumber(body.investimento_previsto) ??
    toNumber(variables.investimento_previsto) ??
    toNumber(variables.investimento) ??
    toNumber(variables.budget) ??
    null;

  const clienteExistente =
    body.cliente_existente === true ||
    variables.cliente_existente === true ||
    variables.cliente_existente === "true";

  const tipoDemanda =
    body.tipo_demanda ??
    (typeof variables.tipo_demanda === "string" ? variables.tipo_demanda : undefined) ??
    undefined;

  const destinoSugerido =
    body.destino_sugerido ??
    (typeof variables.destino_sugerido === "string" ? variables.destino_sugerido : undefined) ??
    undefined;

  const publicoAlvo =
    (typeof (body as any).publico_alvo === "string" ? (body as any).publico_alvo : undefined) ??
    (typeof variables.publico_alvo === "string" ? variables.publico_alvo : undefined) ??
    (typeof variables.publico === "string" ? variables.publico : undefined) ??
    undefined;

  return {
    evento,
    telefone,
    nome,
    resumo,
    variables,
    volumeEstimado,
    investimentoPrevisto,
    clienteExistente,
    tipoDemanda,
    destinoSugerido,
    publicoAlvo,
  };
}

function toNumber(val: unknown): number | null {
  if (val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

// ── Regra de bloqueio comercial ───────────────────────────────────────────────
// Critérios PRO: volume ≥ 72, investimento > R$2k, público A/B (linha premium)
// Qualquer critério abaixo do mínimo → nutricao (não vai para Venda Pro)

const PUBLICO_CD_KEYWORDS = [
  "popular", "básico", "basico", "econômico", "economico",
  "sacoleiro", "feirinha", "feira", "mercado de massa",
  "atacadão", "atacadao", "atacado", "bazar", "classe c", "classe d",
];

function classificarPublico(publico: string | undefined): "AB" | "CD" | "unknown" {
  if (!publico) return "unknown";
  const lower = publico.toLowerCase();
  if (PUBLICO_CD_KEYWORDS.some(kw => lower.includes(kw))) return "CD";
  return "AB"; // qualquer menção não-CD é tratada como A/B
}

function aplicarBloqueioComercial(
  destino: string,
  volume: number | null,
  investimento: number | null,
  publicoAlvo?: string | undefined,
): string {
  if (destino !== "venda_pro") return destino;

  const volumeBaixo       = volume != null && volume < 72;
  const investimentoBaixo = investimento != null && investimento < 3000;
  const publicoCD         = classificarPublico(publicoAlvo) === "CD";

  // Público C/D → nutrição direta (não abre card PRO)
  if (publicoCD) return "nutricao_lead";
  // Volume ou investimento abaixo → basic_starter → nutrição com dados
  if (volumeBaixo || investimentoBaixo) return "basic_starter";

  return destino;
}

// ── Decide destino a partir do evento GPTMaker ────────────────────────────────
// Cobre tanto os nomes em inglês da API quanto os rótulos em PT do painel
function resolverDestino(evento: string, destinoSugerido: string | undefined): string {
  if (destinoSugerido) return destinoSugerido;

  const ev = evento.toLowerCase().trim();

  // "Agente transferiu para humano" / onTransfer
  if (ev.includes("transfer") || ev.includes("humano assumiu") || ev.includes("agente transferiu")) {
    return "venda_pro";
  }

  // "Não souber responder" / onLackKnowledge
  if (ev.includes("souber") || ev.includes("lack") || ev.includes("knowledge") || ev.includes("nao sabe")) {
    return "revisao_manual";
  }

  // "Finalizar atendimento" / onFinishAttendance
  // Destino real decidido depois com base nas variáveis coletadas (volume, investimento)
  if (ev.includes("finaliz") || ev.includes("finish") || ev.includes("encerr")) {
    return "finalizar_atendimento"; // marcador — lógica abaixo decide o destino real
  }

  // "Nova mensagem" / onNewMessage e demais → só loga
  return "log_only";
}

// ── Cache de mensagens da conversa por telefone ───────────────────────────────
// Acumula as últimas mensagens de cada lead para enriquecer o card
const conversationCache = new Map<string, { role: string; text: string; ts: number }[]>();
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 horas

function cacheMensagem(phone: string, role: string, text: string): void {
  if (!phone || !text) return;
  const msgs = conversationCache.get(phone) ?? [];
  msgs.push({ role, text: text.slice(0, 300), ts: Date.now() });
  // mantém só as últimas 30 mensagens
  conversationCache.set(phone, msgs.slice(-30));
}

function resumoConversa(phone: string): string {
  const msgs = conversationCache.get(phone) ?? [];
  const now = Date.now();
  const recentes = msgs.filter(m => now - m.ts < CACHE_TTL_MS);
  if (!recentes.length) return "";
  return recentes
    .map(m => `${m.role === "user" ? "Lead" : "Joana"}: ${m.text}`)
    .join("\n");
}

function limparCacheConversa(phone: string): void {
  conversationCache.delete(phone);
}

// ── Extrai volume e investimento do cache de conversa ─────────────────────────
function extrairDadosConversa(phone: string): { volume: number | null; investimento: number | null } {
  const msgs = conversationCache.get(phone) ?? [];
  const texto = msgs.map(m => m.text).join(" ");

  // Volume: "500 peças", "500 pcs", "500 unidades"
  const volumeMatch = texto.match(/(\d[\d.,]*)\s*(?:pe[cç]as?|pcs?|unidades?)/i);
  const volume = volumeMatch ? parseFloat(volumeMatch[1].replace(",", ".")) : null;

  // Investimento: "R$5.000", "5000 reais", "R$ 2500"
  const invMatch = texto.match(/R\$\s*([\d.,]+)|(\d[\d.,]*)\s*reais/i);
  const investimento = invMatch
    ? parseFloat((invMatch[1] ?? invMatch[2]).replace(/\./g, "").replace(",", "."))
    : null;

  return { volume, investimento };
}

// ── Cria card no Helena/WTS ───────────────────────────────────────────────────
async function criarCardHelena(params: {
  titulo: string;
  stepId: string;
  descricao?: string;
  investimentoCents?: number;
}): Promise<string | null> {
  const token = process.env.HELENA_API_TOKEN;
  if (!token) {
    logger.warn("gptmaker-webhook: HELENA_API_TOKEN não configurado");
    return null;
  }
  if (!params.stepId) {
    logger.warn("gptmaker-webhook: stepId não configurado");
    return null;
  }

  const body: Record<string, unknown> = { title: params.titulo, stepId: params.stepId };
  if (params.descricao)        body.description    = params.descricao;
  if (params.investimentoCents) body.monetaryAmount = params.investimentoCents;

  const res = await fetch(`${WTS_BASE}/crm/v2/panel/card`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    logger.error({ status: res.status, err }, "gptmaker-webhook: falha ao criar card na Helena");
    return null;
  }

  const data = await res.json() as Record<string, unknown>;
  const cardId = (data.id as any)?.value ?? data.id ?? null;
  return cardId ? String(cardId) : null;
}

// ── Registra/atualiza lead no Mirage DB ───────────────────────────────────────
async function registrarHandoff(params: {
  tenantId: string;
  phone: string;
  nome?: string;
  resumo?: string;
  pipelineKey: string;
  handoffReason: string;
}): Promise<void> {
  const now = new Date();
  const existing = await db
    .select({ id: comercialLeads.id })
    .from(comercialLeads)
    .where(and(eq(comercialLeads.tenantId, params.tenantId), eq(comercialLeads.phone, params.phone)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(comercialLeads).set({
      ...(params.nome   && { leadName: params.nome }),
      ...(params.resumo && { mensagemRecebida: params.resumo }),
      handoffReason: params.handoffReason,
      pipelineKey:   params.pipelineKey,
      status:        "aberto",
      closedAt:      null,
      closedBy:      null,
      lastHandoffAt: now,
      updatedAt:     now,
    }).where(eq(comercialLeads.id, existing[0].id));
  } else {
    await db.insert(comercialLeads).values({
      tenantId:         params.tenantId,
      leadName:         params.nome,
      phone:            params.phone,
      mensagemRecebida: params.resumo ?? null,
      handoffReason:    params.handoffReason,
      pipelineKey:      params.pipelineKey,
      status:           "aberto",
      lastHandoffAt:    now,
    });
  }
}

// ── POST /api/gptmaker/webhook ────────────────────────────────────────────────
//
// Recebe eventos do GPTMaker (Joana):
//   onNewMessage       → loga (monitoramento)
//   onTransfer         → cria card Vendas PRO (humano vai assumir)
//   onFinishAttendance → cria card se tiver destino_sugerido nas variáveis
//   onLackKnowledge    → marca revisao_manual
//
// Configurar no GPTMaker: Configurações do agente → Webhooks → URL abaixo
// URL: https://<domínio>/api/gptmaker/webhook?token=<GPTMAKER_WEBHOOK_SECRET>
//
router.post("/gptmaker/webhook", requireWebhookAuth, async (req: Request, res: Response) => {
  // Responde imediatamente para o GPTMaker não timeout
  res.status(200).json({ ok: true });

  const body = req.body as GptPayload;

  // Evento pode vir via query param ?event=onTransfer (GPTMaker não manda event no body)
  const eventoQuery = req.query["event"] as string | undefined;

  // Log raw completo — essencial para debug nos primeiros dias
  logger.info({ rawBody: body, eventoQuery, rawKeys: Object.keys(body) }, "gptmaker-webhook: payload recebido");

  try {
    const {
      evento,
      telefone,
      nome,
      resumo,
      variables,
      volumeEstimado,
      investimentoPrevisto,
      clienteExistente,
      tipoDemanda,
      destinoSugerido,
      publicoAlvo,
    } = extrairCampos(body, eventoQuery);

    // onNewMessage sem telefone → só loga (normal no início da conversa)
    if (!telefone && evento === "onNewMessage") {
      logger.info({ evento, rawBody: body }, "gptmaker-webhook: onNewMessage sem telefone — ignorado");
      return;
    }

    if (!telefone) {
      logger.warn({ evento, rawBody: body }, "gptmaker-webhook: payload sem telefone");
      return;
    }

    // company_slug é obrigatório — sem fallback silencioso para nenhum tenant.
    if (!body.company_slug) {
      logger.warn({ evento, rawBody: body }, "gptmaker-webhook: payload sem company_slug — bloqueado (nunca assumir tenant)");
      return;
    }
    const companySlug = String(body.company_slug);
    const tenantId = await resolveSlug(companySlug);
    if (!tenantId) {
      logger.warn({ companySlug }, "gptmaker-webhook: tenant não encontrado");
      return;
    }

    // ── VIP check: cliente ativo marcado pelo atendente na Helena ────────────
    const vipRows = await db.execute(
      (await import("drizzle-orm")).sql`
        SELECT 1 FROM vip_phones
        WHERE tenant_id = ${tenantId} AND phone = ${telefone} AND removed_at IS NULL
        LIMIT 1`
    ).catch(() => ({ rows: [] }));
    const isVip = vipRows.rows.length > 0;

    if (isVip && evento === "onNewMessage") {
      // Acumula mensagens normalmente mas registra contexto VIP
      const roleVip = String(body.role ?? "").toLowerCase();
      const msgVip = typeof body.message === "string" ? body.message : "";
      if (msgVip && roleVip !== "tool") {
        cacheMensagem(telefone, roleVip === "assistant" ? "assistant" : "user", msgVip);
      }

      // Se o lead ainda não tem card aberto, cria direto como VIP
      const vipExistente = await db
        .select({ id: comercialLeads.id, status: comercialLeads.status })
        .from(comercialLeads)
        .where(and(eq(comercialLeads.tenantId, tenantId), eq(comercialLeads.phone, telefone)))
        .limit(1);
      const vipJaTemCard = vipExistente.length > 0 && vipExistente[0].status === "aberto";

      if (!vipJaTemCard && roleVip === "user") {
        // Primeira mensagem do VIP → cria card VIP imediatamente
        logger.info({ telefone, nome }, "gptmaker-webhook: ⭐ VIP detectado → criando card VIP direto");
        const msgTextoVip = typeof body.message === "string" ? body.message.slice(0, 300) : "";
        const descVip = [
          "⭐ CLIENTE ATIVO (VIP)",
          nome ? `👤 ${nome}  |  📱 ${telefone}` : `📱 ${telefone}`,
          "",
          "Primeira mensagem:",
          msgTextoVip,
        ].join("\n");

        const cardIdVip = await criarCardHelena({
          titulo:    `${nome ?? telefone} — ⭐ VIP`,
          stepId:    VENDAS_PRO_PRIMEIRO_STEP,
          descricao: descVip,
        });
        await registrarHandoff({
          tenantId,
          phone:         telefone,
          nome,
          resumo:        "vip_cliente_ativo",
          pipelineKey:   "vendas_pro",
          handoffReason: "vip_direct",
        });
        logger.info({ cardIdVip, telefone }, "gptmaker-webhook: ⭐ card VIP criado");
      } else if (!vipJaTemCard) {
        logger.info({ telefone, roleVip }, "gptmaker-webhook: ⭐ VIP — mensagem não-user, aguardando primeira mensagem do lead");
      } else {
        logger.info({ telefone }, "gptmaker-webhook: ⭐ VIP — já tem card aberto, ignorando");
      }
      return;
    }

    // Determina destino baseado no evento + destino_sugerido da Joana
    let destinoBase = resolverDestino(evento, destinoSugerido);

    // "Finalizar atendimento" com dados coletados → decide pelo que Joana reuniu
    if (destinoBase === "finalizar_atendimento") {
      const temDados = volumeEstimado != null || investimentoPrevisto != null;
      destinoBase = temDados ? "venda_pro" : "nutricao_lead";
    }

    const destinoFinal = aplicarBloqueioComercial(destinoBase, volumeEstimado, investimentoPrevisto, publicoAlvo);
    const bloqueioAtivado = destinoFinal !== destinoBase;

    logger.info(
      {
        evento,
        telefone,
        nome,
        destinoBase,
        destinoFinal,
        bloqueioAtivado,
        volumeEstimado,
        investimentoPrevisto,
        publicoAlvo,
        publicoClassificado: classificarPublico(publicoAlvo),
        variables,
      },
      "gptmaker-webhook: processando evento",
    );

    // ── Cache: acumula mensagens da conversa para enriquecer o card ────────────
    const roleMsg = String(body.role ?? "").toLowerCase();
    const msgTexto = typeof body.message === "string" ? body.message : "";
    if (evento === "onNewMessage" && msgTexto && roleMsg !== "tool") {
      cacheMensagem(telefone, roleMsg === "assistant" ? "assistant" : "user", msgTexto);
    }

    // ── Joana respondeu: encaminha para Z-API ───────────────────────────────────
    // Quando GPTMaker envia role="assistant" + onNewMessage, é a resposta real da Joana.
    // Enviamos ao lead via Z-API (nosso único canal WhatsApp).
    if (evento === "onNewMessage" && roleMsg === "assistant" && msgTexto && telefone) {
      try {
        // Checar human_in_control antes de enviar
        const altPhone = telefone.startsWith("55") ? telefone.slice(2) : `55${telefone}`;
        const hicRows = await db.execute(
          sql`SELECT 1 FROM lead_conversation_state
              WHERE tenant_id = ${tenantId}
                AND phone IN (${telefone}, ${altPhone})
                AND human_in_control = true
              LIMIT 1`
        ).catch(() => ({ rows: [] }));

        if ((hicRows.rows as unknown[]).length > 0) {
          logger.info({ telefone, tenantId }, "gptmaker-webhook: human_in_control=true → resposta Joana bloqueada");
        } else {
          const selfUrl = `http://localhost:${process.env.PORT ?? 3001}`;
          const internalKey = process.env.MARKETING_INTERNAL_API_KEY ?? "";
          const sendRes = await fetch(`${selfUrl}/api/internal/zapi/send-message`, {
            method:  "POST",
            headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
            body: JSON.stringify({
              company_slug: companySlug,
              phone:        telefone,
              message:      msgTexto,
              route_type:   "joana_response",
            }),
          });
          if (sendRes.ok) {
            logger.info({ telefone, msgLen: msgTexto.length }, "gptmaker-webhook: ✅ resposta Joana enviada via Z-API");
          } else {
            const errBody = await sendRes.text().catch(() => "");
            logger.warn({ telefone, status: sendRes.status, errBody }, "gptmaker-webhook: falha ao enviar resposta Joana via Z-API");
          }
        }
      } catch (zapiErr: any) {
        logger.error({ error: zapiErr?.message, telefone }, "gptmaker-webhook: erro ao encaminhar resposta Joana");
      }
    }

    // onNewMessage com role="tool" → Joana chamou o sales-intent tool → lead qualificado
    // O tool falha no n8n (404) mas nós interceptamos aqui e criamos o card diretamente
    const roleTool = roleMsg === "tool";
    if (destinoFinal === "log_only" && roleTool && telefone) {
      // Verifica se já existe card recente para evitar duplicata
      const existente = await db
        .select({ id: comercialLeads.id, status: comercialLeads.status })
        .from(comercialLeads)
        .where(and(eq(comercialLeads.tenantId, tenantId), eq(comercialLeads.phone, telefone)))
        .limit(1);

      const jaTemCard = existente.length > 0 && existente[0].status === "aberto";

      if (!jaTemCard) {
        logger.info({ telefone, nome, evento }, "gptmaker-webhook: role=tool detectado → criando card Vendas PRO");

        // Extrai dados da conversa acumulada no cache
        const dadosConversa = extrairDadosConversa(telefone);
        const volFinal = volumeEstimado ?? dadosConversa.volume;
        const invFinal = investimentoPrevisto ?? dadosConversa.investimento;

        const linhasDesc: string[] = ["✅ Lead qualificado pela Joana (WhatsApp)"];
        if (nome)    linhasDesc.push(`👤 ${nome}  |  📱 ${telefone}`);
        else         linhasDesc.push(`📱 ${telefone}`);
        if (volFinal != null) linhasDesc.push(`📦 Volume: ${volFinal} peças`);
        if (invFinal != null) linhasDesc.push(`💰 Investimento: R$${invFinal.toLocaleString("pt-BR")}`);
        const trechoConversa = resumoConversa(telefone);
        if (trechoConversa) linhasDesc.push("", "── Trecho da conversa ──", trechoConversa.slice(0, 800));

        const helenCardId = await criarCardHelena({
          titulo:            `${nome ?? telefone} — Venda PRO (Joana)`,
          stepId:            VENDAS_PRO_PRIMEIRO_STEP,
          descricao:         linhasDesc.join("\n"),
          investimentoCents: invFinal != null ? Math.round(invFinal * 100) : undefined,
        });

        limparCacheConversa(telefone);

        await registrarHandoff({
          tenantId,
          phone:         telefone,
          nome,
          resumo:        `qualificado_pela_joana_tool | vol=${volFinal ?? "?"} | inv=${invFinal ?? "?"}`,
          pipelineKey:   "vendas_pro",
          handoffReason: "tool_sales_intent",
        });
        await db.insert(leadAiEvents).values({
          tenantId,
          phone:             telefone,
          leadName:          nome ?? null,
          messageSnippet:    `role=tool → sales_intent interceptado`,
          leadType:          clienteExistente ? "lead_recorrente" : "novo_lead",
          intention:         "sales_intent_tool",
          route:             "human_handoff",
          suggestedResponse: `card=${helenCardId ?? "erro"} | via=role_tool_intercept`,
          operationalStatus: "venda_pro",
        }).catch(() => {});
        logger.info({ helenCardId, telefone, volFinal, invFinal }, "gptmaker-webhook: card criado via role=tool");
      } else {
        logger.info({ destinoBase, destinoFinal, helenCardId: existente[0]?.id }, "gptmaker-webhook: role=tool, mas lead já tem card aberto — ignorado");
      }
      return;
    }

    // onNewMessage → só loga (a Joana ainda está conversando)
    if (destinoFinal === "log_only") {
      await db.insert(leadAiEvents).values({
        tenantId,
        phone:             telefone,
        leadName:          nome ?? null,
        messageSnippet:    resumo?.slice(0, 500) ?? null,
        leadType:          clienteExistente ? "lead_recorrente" : "novo_lead",
        intention:         tipoDemanda ?? evento,
        route:             "nurture",
        suggestedResponse: `evento=${evento} | sem ação`,
        operationalStatus: "monitoring",
      }).catch(() => {});
      return;
    }

    // Antes de criar card via onTransfer/outros → verifica deduplicação
    const existenteAntes = await db
      .select({ id: comercialLeads.id, status: comercialLeads.status })
      .from(comercialLeads)
      .where(and(eq(comercialLeads.tenantId, tenantId), eq(comercialLeads.phone, telefone)))
      .limit(1);
    const jaTemCardAntes = existenteAntes.length > 0 && existenteAntes[0].status === "aberto";

    let helenCardId: string | null = null;
    let acaoRealizada = `log_${destinoFinal}`;

    if (destinoFinal === "venda_pro") {
      if (jaTemCardAntes) {
        logger.info({ telefone, evento }, "gptmaker-webhook: venda_pro ignorado — lead já tem card aberto");
        return;
      }

      const dadosConversa = extrairDadosConversa(telefone);
      const volFinal = volumeEstimado ?? dadosConversa.volume;
      const invFinal = investimentoPrevisto ?? dadosConversa.investimento;

      const linhasDesc: string[] = [`🔄 Transferência pela Joana (${evento})`];
      if (nome)    linhasDesc.push(`👤 ${nome}  |  📱 ${telefone}`);
      else         linhasDesc.push(`📱 ${telefone}`);
      if (volFinal != null) linhasDesc.push(`📦 Volume: ${volFinal} peças`);
      if (invFinal != null) linhasDesc.push(`💰 Investimento: R$${invFinal.toLocaleString("pt-BR")}`);
      if (resumo)           linhasDesc.push("", resumo.slice(0, 400));

      helenCardId = await criarCardHelena({
        titulo:            `${nome ?? telefone} — Venda PRO`,
        stepId:            VENDAS_PRO_PRIMEIRO_STEP,
        descricao:         linhasDesc.join("\n"),
        investimentoCents: invFinal != null ? Math.round(invFinal * 100) : undefined,
      });
      limparCacheConversa(telefone);
      await registrarHandoff({
        tenantId,
        phone:         telefone,
        nome,
        resumo,
        pipelineKey:   "vendas_pro",
        handoffReason: evento === "onTransfer" ? "transferido_joana" : "qualificado_joana",
      });
      acaoRealizada = "card_criado_vendas_pro";

    } else if (destinoFinal === "pos_venda") {
      helenCardId = await criarCardHelena({
        titulo:    `${nome ?? telefone} — Pós-Venda`,
        stepId:    POS_VENDAS_INICIO_STEP,
        descricao: resumo ?? `Encaminhado pela Joana (${evento})`,
      });
      await registrarHandoff({
        tenantId,
        phone:         telefone,
        nome,
        resumo,
        pipelineKey:   "pos_venda",
        handoffReason: "suporte_joana",
      });
      acaoRealizada = "card_criado_pos_venda";

    } else if (destinoFinal === "revisao_manual") {
      const stepId = VENDAS_PRO_PRIMEIRO_STEP || POS_VENDAS_INICIO_STEP;
      helenCardId = await criarCardHelena({
        titulo:    `${nome ?? telefone} — Revisão Manual`,
        stepId,
        descricao: resumo ?? "IA não soube responder — revisão humana necessária",
      });
      await registrarHandoff({
        tenantId,
        phone:         telefone,
        nome,
        resumo,
        pipelineKey:   "revisao_manual",
        handoffReason: "lack_knowledge_joana",
      });
      acaoRealizada = "card_criado_revisao_manual";

    } else if (destinoFinal === "basic_starter") {
      // Lead com dados mas abaixo do threshold → AGUARDANDO MOMENTO no pipeline Nutrição
      if (jaTemCardAntes) {
        logger.info({ telefone, evento }, "gptmaker-webhook: basic_starter ignorado — lead já tem card aberto");
        acaoRealizada = "basic_starter_ja_tem_card";
      } else {
        const dadosConversa = extrairDadosConversa(telefone);
        const volFinal = volumeEstimado ?? dadosConversa.volume;
        const invFinal = investimentoPrevisto ?? dadosConversa.investimento;

        const linhasDesc: string[] = ["📋 Lead com volume/investimento abaixo do mínimo PRO"];
        if (nome) linhasDesc.push(`👤 ${nome}  |  📱 ${telefone}`);
        else       linhasDesc.push(`📱 ${telefone}`);
        if (volFinal != null) linhasDesc.push(`📦 Volume informado: ${volFinal} peças (mín: 72)`);
        if (invFinal != null) linhasDesc.push(`💰 Investimento informado: R$${invFinal.toLocaleString("pt-BR")} (mín: R$2.000)`);
        const trechoConversa = resumoConversa(telefone);
        if (trechoConversa) linhasDesc.push("", "── Trecho da conversa ──", trechoConversa.slice(0, 600));

        helenCardId = await criarCardHelena({
          titulo:    `${nome ?? telefone} — Aguardando Momento`,
          stepId:    NUTRICAO_STEP_AGUARDANDO_MOMENTO,
          descricao: linhasDesc.join("\n"),
          investimentoCents: invFinal != null ? Math.round(invFinal * 100) : undefined,
        });
        limparCacheConversa(telefone);
        await registrarHandoff({
          tenantId,
          phone:         telefone,
          nome,
          resumo,
          pipelineKey:   "nutricao",
          handoffReason: `basic_starter_vol${volFinal ?? "?"}_inv${invFinal ?? "?"}`,
        });
        acaoRealizada = "card_criado_nutricao_aguardando_momento";
      }

    } else if (destinoFinal === "nutricao_lead") {
      // Lead sem dados suficientes (só tirou dúvida) → ORÇAMENTO EXPIRADO no pipeline Nutrição
      if (jaTemCardAntes) {
        logger.info({ telefone, evento }, "gptmaker-webhook: nutricao_lead ignorado — lead já tem card aberto");
        acaoRealizada = "nutricao_ja_tem_card";
      } else {
        const trechoConversa = resumoConversa(telefone);
        const linhasDesc: string[] = ["💬 Lead sem qualificação — acompanhamento de nutrição"];
        if (nome) linhasDesc.push(`👤 ${nome}  |  📱 ${telefone}`);
        else       linhasDesc.push(`📱 ${telefone}`);
        if (resumo) linhasDesc.push("", resumo.slice(0, 400));
        else if (trechoConversa) linhasDesc.push("", "── Trecho da conversa ──", trechoConversa.slice(0, 600));

        helenCardId = await criarCardHelena({
          titulo:    `${nome ?? telefone} — Nutrição`,
          stepId:    NUTRICAO_STEP_ORCAMENTO_EXPIRADO,
          descricao: linhasDesc.join("\n"),
        });
        limparCacheConversa(telefone);
        await registrarHandoff({
          tenantId,
          phone:         telefone,
          nome,
          resumo,
          pipelineKey:   "nutricao",
          handoffReason: "sem_qualificacao_joana",
        });
        acaoRealizada = "card_criado_nutricao_orcamento_expirado";
      }

    } else if (destinoFinal === "fidelizacao") {
      // Cliente com entrega concluída que entrou em contato → REAGIU no pipeline Fidelização/Recompra
      // (ENTREGUE é populado pelo n8n ao fechar o Pós-Venda; REAGIU = cliente veio até nós)
      const trechoConversa = resumoConversa(telefone);
      const linhasDesc: string[] = ["🔄 Cliente ativo em recontato — pipeline Fidelização/Recompra"];
      if (nome) linhasDesc.push(`👤 ${nome}  |  📱 ${telefone}`);
      else       linhasDesc.push(`📱 ${telefone}`);
      if (resumo) linhasDesc.push("", resumo.slice(0, 400));
      else if (trechoConversa) linhasDesc.push("", "── Trecho da conversa ──", trechoConversa.slice(0, 600));

      helenCardId = await criarCardHelena({
        titulo:    `${nome ?? telefone} — Recompra`,
        stepId:    FIDELIZACAO_STEP_REAGIU,
        descricao: linhasDesc.join("\n"),
      });
      limparCacheConversa(telefone);
      await registrarHandoff({
        tenantId,
        phone:         telefone,
        nome,
        resumo,
        pipelineKey:   "fidelizacao",
        handoffReason: "cliente_ativo_recontato",
      });
      acaoRealizada = "card_criado_fidelizacao_reagiu";
    }

    // Auditoria
    await db.insert(leadAiEvents).values({
      tenantId,
      phone:             telefone,
      leadName:          nome ?? null,
      messageSnippet:    resumo?.slice(0, 500) ?? null,
      leadType:          clienteExistente ? "lead_recorrente" : "novo_lead",
      intention:         tipoDemanda ?? evento,
      route:             ["venda_pro", "pos_venda", "revisao_manual", "nutricao_lead", "basic_starter", "fidelizacao"].includes(destinoFinal)
                           ? "human_handoff" : "nurture",
      suggestedResponse: [
        `evento=${evento}`,
        `destino_base=${destinoBase}`,
        `destino_final=${destinoFinal}`,
        bloqueioAtivado ? `bloqueio(vol=${volumeEstimado},inv=${investimentoPrevisto})` : null,
        `card=${helenCardId ?? "não criado"}`,
      ].filter(Boolean).join(" | "),
      operationalStatus: destinoFinal,
    }).catch(() => {});

    logger.info({ acaoRealizada, helenCardId, destinoFinal, telefone }, "gptmaker-webhook: concluído");

  } catch (err: any) {
    logger.error({ error: err?.message, stack: err?.stack }, "gptmaker-webhook: erro inesperado");
  }
});

export default router;
