/**
 * CAIO — Especialista em Financeiro
 *
 * Atende leads com dúvidas sobre boletos, pagamentos, cobranças,
 * notas fiscais, faturas e questões financeiras em geral.
 *
 * Placeholder funcional: opera com GPT-4o-mini + prompt especializado.
 * Coleta: tipo de questão financeira, número do documento se aplicável.
 * Aciona human_in_control para casos que exigem ação operacional.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

const CAIO_SYSTEM = `Você é o CAIO, responsável financeiro da R2PB.

Seu objetivo:
1. Identificar o tipo de questão financeira (boleto, nota fiscal, cobrança, fatura, reembolso, etc.)
2. Pedir o número do documento ou pedido se necessário
3. Para questões operacionais (estorno, reembolso, segunda via de NF): informar que vai acionar a equipe financeira

Tom: profissional, claro, preciso. Máximo 2 perguntas por mensagem.

Quando a questão precisar de ação operacional, responda com:
"Vou encaminhar para nossa equipe financeira agora. Eles entrarão em contato em até 1 dia útil. Posso confirmar mais alguma coisa?"

Nunca informe valores, saldos ou dados financeiros específicos sem verificação interna.

Responda SEMPRE em português brasileiro.`;

interface CaioResult {
  ok: boolean;
  reply: string | null;
  action: "continue" | "handoff_financeiro" | null;
  error?: string;
}

const caioHistory = new Map<string, { role: "user" | "assistant"; content: string }[]>();

export async function chamarCaioDireto(params: {
  phone: string;
  message: string;
  leadName: string;
  tenantId: string;
}): Promise<CaioResult> {
  const { phone, message, leadName, tenantId } = params;

  const history = caioHistory.get(phone) ?? [];
  history.push({ role: "user", content: message });

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${CAIO_SYSTEM}\n\nNome do cliente: ${leadName}. Tenant: ${tenantId}.` },
        ...history.slice(-10),
      ],
      temperature: 0.3,
      max_tokens: 250,
    });

    const reply = resp.choices[0]?.message?.content?.trim() ?? null;
    if (reply) history.push({ role: "assistant", content: reply });
    caioHistory.set(phone, history.slice(-20));

    const needsOp = reply?.includes("equipe financeira agora") || reply?.includes("dia útil");

    logger.info({ phone, tenantId, action: needsOp ? "handoff_financeiro" : "continue" }, "[CAIO] resposta gerada");

    return {
      ok: true,
      reply,
      action: needsOp ? "handoff_financeiro" : "continue",
    };
  } catch (err: any) {
    logger.error({ phone, error: err?.message }, "[CAIO] erro OpenAI");
    return { ok: false, reply: null, action: null, error: err?.message };
  }
}

export function clearCaioHistory(phone: string): void {
  caioHistory.delete(phone);
}
