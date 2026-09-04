import { logger } from "./logger";

const GPTMAKER_BASE_URL = "https://api.gptmaker.ai/v2";

function getToken(): string {
  const token = process.env.GPTMAKER_API_TOKEN ?? process.env.gptmaker_api_token;
  if (!token) throw new Error("GPTMAKER_API_TOKEN não configurado");
  return token;
}

function getDefaultAgentId(): string | undefined {
  return process.env.GPTMAKER_AGENT_ID ?? process.env.gptmaker_agent_id;
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GptMakerConversationInput {
  agentId?: string;
  phone: string;
  leadName?: string | null;
  incomingMessage: string;
  tenantId?: string;
  companySlug?: string;
  extraContext?: Record<string, unknown>;
}

export interface GptMakerConversationResult {
  ok: boolean;
  agentId: string;
  phone: string;
  reply: string | null;
  rawResponse: unknown;
  error?: string;
}

// ── sendConversation ───────────────────────────────────────────────────────────
//
// Envia mensagem ao agente GPTMaker e retorna resposta normalizada.

export async function sendConversation(
  input: GptMakerConversationInput,
): Promise<GptMakerConversationResult> {
  const agentId = input.agentId ?? getDefaultAgentId();
  if (!agentId) throw new Error("agentId não fornecido e GPTMAKER_AGENT_ID não configurado");

  const token = getToken();
  const url = `${GPTMAKER_BASE_URL}/agent/${agentId}/conversation`;

  const payload: Record<string, unknown> = {
    phone:   input.phone,
    message: input.incomingMessage,
    ...(input.leadName  ? { name: input.leadName }        : {}),
    ...(input.extraContext ?? {}),
  };

  logger.info(
    { agentId, phone: input.phone, companySlug: input.companySlug },
    "gptmaker: enviando mensagem ao agente",
  );

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const rawResponse = await res.json().catch(() => null);

  if (!res.ok) {
    logger.error(
      { agentId, phone: input.phone, status: res.status, rawResponse },
      "gptmaker: erro na chamada ao agente",
    );
    return {
      ok: false,
      agentId,
      phone: input.phone,
      reply: null,
      rawResponse,
      error: `GPTMaker retornou ${res.status}`,
    };
  }

  // Tenta extrair a resposta do agente — ajuste o campo conforme doc real da API
  const reply: string | null =
    (rawResponse as any)?.reply ??
    (rawResponse as any)?.message ??
    (rawResponse as any)?.response ??
    (rawResponse as any)?.text ??
    null;

  logger.info(
    { agentId, phone: input.phone, replyLength: reply?.length ?? 0 },
    "gptmaker: resposta recebida",
  );

  return { ok: true, agentId, phone: input.phone, reply, rawResponse };
}

// ── configureWebhook ──────────────────────────────────────────────────────────
//
// Registra (ou atualiza) o webhook do agente GPTMaker para receber respostas async.

export async function configureWebhook(
  webhookUrl: string,
  agentId?: string,
): Promise<{ ok: boolean; rawResponse: unknown; error?: string }> {
  const resolvedAgentId = agentId ?? getDefaultAgentId();
  if (!resolvedAgentId) throw new Error("agentId não fornecido e GPTMAKER_AGENT_ID não configurado");

  const token = getToken();
  const url = `${GPTMAKER_BASE_URL}/agent/${resolvedAgentId}/webhooks`;

  const res = await fetch(url, {
    method:  "PUT",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ url: webhookUrl }),
  });

  const rawResponse = await res.json().catch(() => null);

  logger.info(
    { agentId: resolvedAgentId, webhookUrl, status: res.status },
    "gptmaker: webhook configurado",
  );

  return {
    ok: res.ok,
    rawResponse,
    ...(!res.ok ? { error: `GPTMaker retornou ${res.status}` } : {}),
  };
}
