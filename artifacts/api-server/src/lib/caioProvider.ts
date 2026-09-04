/**
 * ADMIN — Agente Administrativo da R2PB
 *
 * Cobre dois domínios:
 *   1. Financeiro — boletos, pagamentos, cobranças, NF, faturas
 *   2. RH / Currículo — candidatos a vagas, estágios, oportunidades de trabalho
 *
 * Para questões que exigem ação humana (financeiro operacional ou entrevista),
 * aciona handoff para a equipe interna.
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

const ADMIN_SYSTEM = `Você é o CAIO, agente administrativo da R2PB confecções.

Você atende dois tipos de assunto:

## 1. Financeiro
Questões sobre boletos, pagamentos, cobranças, notas fiscais, faturas, mensalidades.
- Identifique o tipo de questão financeira
- Peça número do documento ou pedido se necessário
- Para ações operacionais (estorno, 2ª via de NF, reembolso): informe que vai acionar a equipe

## 2. RH / Currículo
Candidatos a vagas, estágios ou oportunidades de trabalho na R2PB ou na rede produtiva.
- Pergunte: nome completo, área de interesse (costura, administrativo, comercial, etc.), cidade
- Pergunte se tem experiência na área e se pode enviar currículo por e-mail
- E-mail para envio: rh@r2pb.com.br
- Informe que a equipe entrará em contato se houver compatibilidade

## Regras gerais:
- Tom: profissional, acolhedor, direto
- Máximo 2 perguntas por mensagem
- Nunca informe valores, saldos ou vagas específicas sem verificação interna
- Responda SEMPRE em português brasileiro

## Encerramento:
Financeiro operacional → diga: "Vou acionar nossa equipe financeira agora. Eles entrarão em contato em até 1 dia útil."
RH → diga: "Ótimo! Registrei seu interesse. Envie seu currículo para rh@r2pb.com.br e nossa equipe entrará em contato se houver uma oportunidade compatível. 📩"`;

interface AdminResult {
  ok: boolean;
  reply: string | null;
  action: "continue" | "handoff_admin" | null;
  error?: string;
}

const adminHistory = new Map<string, { role: "user" | "assistant"; content: string }[]>();

export async function chamarCaioDireto(params: {
  phone: string;
  message: string;
  leadName: string;
  tenantId: string;
}): Promise<AdminResult> {
  const { phone, message, leadName, tenantId } = params;

  const history = adminHistory.get(phone) ?? [];
  history.push({ role: "user", content: message });

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: `${ADMIN_SYSTEM}\n\nNome: ${leadName}. Tenant: ${tenantId}.` },
        ...history.slice(-10),
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    const reply = resp.choices[0]?.message?.content?.trim() ?? null;
    if (reply) history.push({ role: "assistant", content: reply });
    adminHistory.set(phone, history.slice(-20));

    const needsHandoff =
      reply?.includes("equipe financeira agora") ||
      reply?.includes("dia útil") ||
      reply?.includes("rh@r2pb.com.br") ||
      reply?.includes("oportunidade compatível");

    logger.info({ phone, tenantId, action: needsHandoff ? "handoff_admin" : "continue" }, "[ADMIN] resposta gerada");

    return {
      ok: true,
      reply,
      action: needsHandoff ? "handoff_admin" : "continue",
    };
  } catch (err: any) {
    logger.error({ phone, error: err?.message }, "[ADMIN] erro OpenAI");
    return { ok: false, reply: null, action: null, error: err?.message };
  }
}

export function clearCaioHistory(phone: string): void {
  adminHistory.delete(phone);
}
