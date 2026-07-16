/**
 * MARCOS — Especialista em Fornecedores / Parceiros Produtivos
 *
 * Atende leads que são donos de oficinas, ateliers, estamparias,
 * bordadeiras, ou qualquer serviço de confecção que deseja se cadastrar
 * como parceiro produtivo da R2PB / Moda Conecta.
 *
 * Placeholder funcional: opera com GPT-4o-mini + prompt especializado.
 * Coleta: tipo de serviço, capacidade, localização, WhatsApp/contato.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

const MARCOS_SYSTEM = `Você é o MARCOS, representante da R2PB responsável por cadastrar novos parceiros produtivos.

Seu objetivo:
1. Identificar o tipo de serviço oferecido (oficina de costura, bordado, estamparia, acabamento, facção, ateliê, etc.)
2. Entender a capacidade produtiva (peças/mês ou peças/semana)
3. Confirmar localização (cidade e estado)
4. Confirmar contato para um consultor entrar em ação

Tom: profissional, direto, acolhedor. Máximo 2 perguntas por mensagem. Não prometa nada sobre parcerias — apenas colete os dados.

Quando tiver: nome do serviço, tipo, capacidade e localização — finalize com:
"Perfeito! Registrei seus dados. Um de nossos consultores entrará em contato em breve para dar os próximos passos. 🤝"

Responda SEMPRE em português brasileiro.`;

interface MarcosResult {
  ok: boolean;
  reply: string | null;
  action: "continue" | "handoff_consultor" | null;
  error?: string;
}

const marcosHistory = new Map<string, { role: "user" | "assistant"; content: string }[]>();

export async function chamarMarcosDireto(params: {
  phone: string;
  message: string;
  leadName: string;
  tenantId: string;
}): Promise<MarcosResult> {
  const { phone, message, leadName, tenantId } = params;

  const history = marcosHistory.get(phone) ?? [];
  history.push({ role: "user", content: message });

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${MARCOS_SYSTEM}\n\nNome do lead: ${leadName}. Tenant: ${tenantId}.` },
        ...history.slice(-10),
      ],
      temperature: 0.5,
      max_tokens: 300,
    });

    const reply = resp.choices[0]?.message?.content?.trim() ?? null;
    if (reply) history.push({ role: "assistant", content: reply });
    marcosHistory.set(phone, history.slice(-20));

    const isFinished = reply?.includes("consultores entrará em contato") || reply?.includes("próximos passos");

    logger.info({ phone, tenantId, action: isFinished ? "handoff_consultor" : "continue" }, "[MARCOS] resposta gerada");

    return {
      ok: true,
      reply,
      action: isFinished ? "handoff_consultor" : "continue",
    };
  } catch (err: any) {
    logger.error({ phone, error: err?.message }, "[MARCOS] erro OpenAI");
    return { ok: false, reply: null, action: null, error: err?.message };
  }
}

export function clearMarcosHistory(phone: string): void {
  marcosHistory.delete(phone);
}
