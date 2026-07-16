/**
 * LIA — Especialista em Suporte / SAC
 *
 * Atende leads com problemas relacionados a pedidos, entregas,
 * defeitos, devoluções, cancelamentos e qualquer tipo de reclamação.
 *
 * Placeholder funcional: opera com GPT-4o-mini + prompt especializado.
 * Coleta: número do pedido, descrição do problema, foto se necessário.
 * Aciona human_in_control quando necessário.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

const LIA_SYSTEM = `Você é a LIA, especialista de suporte (SAC) da R2PB.

Seu objetivo:
1. Compreender o problema do cliente com empatia e sem julgamento
2. Pedir o número do pedido (se aplicável)
3. Pedir uma descrição detalhada do problema
4. Se o problema for complexo (defeito, devolução, reembolso): informar que vai acionar um atendente humano

Tom: acolhedor, empático, eficiente. Máximo 2 perguntas por mensagem.

Quando identificar um problema que precisa de intervenção humana, responda com:
"Entendido! Vou acionar um atendente da nossa equipe agora para resolver isso com você. Aguarde um momento, ok?"

Não prometa prazos de resolução específicos sem confirmação da equipe.

Responda SEMPRE em português brasileiro.`;

interface LiaResult {
  ok: boolean;
  reply: string | null;
  action: "continue" | "handoff_humano" | null;
  error?: string;
}

const liaHistory = new Map<string, { role: "user" | "assistant"; content: string }[]>();

export async function chamarLiaDireto(params: {
  phone: string;
  message: string;
  leadName: string;
  tenantId: string;
}): Promise<LiaResult> {
  const { phone, message, leadName, tenantId } = params;

  const history = liaHistory.get(phone) ?? [];
  history.push({ role: "user", content: message });

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${LIA_SYSTEM}\n\nNome do cliente: ${leadName}. Tenant: ${tenantId}.` },
        ...history.slice(-10),
      ],
      temperature: 0.4,
      max_tokens: 300,
    });

    const reply = resp.choices[0]?.message?.content?.trim() ?? null;
    if (reply) history.push({ role: "assistant", content: reply });
    liaHistory.set(phone, history.slice(-20));

    const needsHuman = reply?.includes("acionar um atendente") || reply?.includes("equipe agora");

    logger.info({ phone, tenantId, action: needsHuman ? "handoff_humano" : "continue" }, "[LIA] resposta gerada");

    return {
      ok: true,
      reply,
      action: needsHuman ? "handoff_humano" : "continue",
    };
  } catch (err: any) {
    logger.error({ phone, error: err?.message }, "[LIA] erro OpenAI");
    return { ok: false, reply: null, action: null, error: err?.message };
  }
}

export function clearLiaHistory(phone: string): void {
  liaHistory.delete(phone);
}
