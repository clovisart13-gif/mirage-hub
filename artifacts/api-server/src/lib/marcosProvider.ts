/**
 * MARCOS — Curador de Rede Produtiva / Captação de Parceiros
 *
 * Atende fornecedores de serviço: donos de oficinas, ateliers, facções,
 * estamparias, bordadeiras, acabamentos — qualquer serviço de confecção
 * que deseja integrar a rede produtiva da R2PB.
 *
 * Objetivo: coletar dados objetivos e qualificados para handoff ao time
 * de curadoria. MARCOS NÃO vende e NÃO promete parcerias — apenas coleta
 * e encaminha.
 *
 * Dados coletados:
 * - Tipo de serviço (costura, bordado, estamparia, acabamento, facção…)
 * - Capacidade produtiva (peças/mês ou peças/semana)
 * - Localização (cidade + estado)
 * - Contato principal (WhatsApp ou e-mail)
 * - Diferencial ou equipamentos relevantes (opcional)
 *
 * Auto-save: ao concluir a coleta, salva automaticamente em moda_conecta_leads
 * com status "novo" (aparece como Pendente na dashboard de Curadoria).
 */

import { openai } from "@workspace/integrations-openai-ai-server";
import { db, modaConectaLeads } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { logger } from "./logger";

const MARCOS_SYSTEM = `Você é o MARCOS, curador de rede produtiva da R2PB.

Seu único papel: identificar fornecedores de serviço produtivo e coletar os dados necessários para o time de curadoria entrar em contato.

## Contexto
A R2PB conecta marcas de moda com parceiros produtivos especializados. Você está falando com alguém que OFERECE serviços — não com alguém que quer comprar.

## O que coletar (em ordem de prioridade):
1. **Tipo de serviço** — costura, facção, bordado, estamparia, acabamento, modelagem, pilotagem, ou combinação
2. **Capacidade produtiva** — quantas peças por mês ou semana conseguem produzir
3. **Localização** — cidade e estado
4. **Contato** — WhatsApp ou e-mail para o consultor entrar em contato

Itens opcionais (se o parceiro mencionar espontaneamente):
- Maquinário específico (overloque, reta, bordadeira…)
- Especialidade de produto (jeans, malha, fitness, íntimo, casual…)
- Certificações ou diferenciais

## Regras de comportamento:
- Tom: profissional, direto, acolhedor. Fale como colega do setor, não como vendedor.
- Máximo **2 perguntas por mensagem** — nunca sobrecarregue com um formulário.
- Nunca prometa parcerias, contratos, pagamentos ou volume de pedidos.
- Nunca use linguagem de vendedor ou termos como "oportunidade imperdível", "exclusivo".
- Se o contato já enviou o WhatsApp (o número do qual está falando), confirme se é o melhor contato.
- Responda SEMPRE em português brasileiro, linguagem natural.

## Detecção de encerramento:
Quando você tiver coletado: tipo de serviço + capacidade + localização + contato confirmado,
encerre com exatamente esta frase:
"Perfeito! Registrei seus dados no sistema. Nossa equipe de curadoria vai entrar em contato em breve para dar os próximos passos. 🤝"

## O que NÃO fazer:
- Não use termos de lead, funil, conversão, comprador ou cliente comprador — esse parceiro é fornecedor.
- Não prometa datas, volumes ou valores.
- Não peça CNPJ, CPF ou documentos nesta fase.
- Não fale sobre preços da R2PB.`;

interface MarcosResult {
  ok: boolean;
  reply: string | null;
  action: "continue" | "handoff_consultor" | null;
  summary?: string;
  savedLeadId?: string;
  error?: string;
}

interface DadosExtraidos {
  roleInChain: string | null;
  specialties: string[] | null;
  productionCapacity: string | null;
  city: string | null;
  state: string | null;
  mainOffer: string | null;
  email: string | null;
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
        {
          role: "system",
          content: `${MARCOS_SYSTEM}\n\nNome do parceiro: ${leadName || "não identificado"}. Tenant: ${tenantId}.`
        },
        ...history.slice(-12),
      ],
      temperature: 0.4,
      max_tokens: 350,
    });

    const reply = resp.choices[0]?.message?.content?.trim() ?? null;
    if (reply) history.push({ role: "assistant", content: reply });
    marcosHistory.set(phone, history.slice(-24));

    const isFinished =
      reply?.includes("Registrei seus dados no sistema") ||
      reply?.includes("curadoria vai entrar em contato") ||
      reply?.includes("próximos passos");

    let summary: string | undefined;
    let savedLeadId: string | undefined;

    if (isFinished) {
      summary = gerarResumoHandoff(history);
      logger.info({ phone, tenantId, summary }, "[MARCOS] ✅ handoff_consultor gerado");

      // Auto-save assíncrono — não bloqueia o reply ao lead
      setImmediate(async () => {
        try {
          savedLeadId = await salvarPreCadastroModa({
            phone,
            leadName,
            tenantId,
            history: [...history],
          });
          logger.info({ phone, tenantId, savedLeadId }, "[MARCOS] ✅ pré-cadastro salvo em moda_conecta_leads");
        } catch (err: any) {
          logger.error({ phone, tenantId, error: err?.message }, "[MARCOS] ❌ erro ao salvar pré-cadastro");
        }
      });
    }

    logger.info(
      { phone, tenantId, action: isFinished ? "handoff_consultor" : "continue" },
      "[MARCOS] resposta gerada"
    );

    return {
      ok: true,
      reply,
      action: isFinished ? "handoff_consultor" : "continue",
      summary,
      savedLeadId,
    };
  } catch (err: any) {
    logger.error({ phone, error: err?.message }, "[MARCOS] erro OpenAI");
    return { ok: false, reply: null, action: null, error: err?.message };
  }
}

export function clearMarcosHistory(phone: string): void {
  marcosHistory.delete(phone);
}

// Injeta contexto pré-coletado pelo bot Helena no histórico do MARCOS
// para que ele não repita perguntas já respondidas.
export function injetarContextoBotNoMarcos(phone: string, leadName: string, contextoBot: string): void {
  const history = marcosHistory.get(phone) ?? [];
  // Simula: o "usuário" já enviou as respostas do bot como contexto inicial
  history.push({
    role: "user",
    content: `Contexto pré-coletado pelo sistema antes de você assumir:\n${contextoBot}`,
  });
  // MARCOS "confirma" que entendeu e sabe o que já foi coletado
  history.push({
    role: "assistant",
    content: `Entendido! Já tenho as informações básicas que ${leadName || "você"} compartilhou. Vou continuar coletando o que falta para completar o cadastro.`,
  });
  marcosHistory.set(phone, history);
}

// ── Extrai dados estruturados da conversa via GPT ──────────────────────────────

async function extrairDadosEstruturados(
  history: { role: string; content: string }[]
): Promise<DadosExtraidos> {
  const conversa = history
    .map((m) => `${m.role === "user" ? "Parceiro" : "MARCOS"}: ${m.content}`)
    .join("\n");

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você é um extrator de dados estruturados. A partir de uma conversa entre MARCOS (curador) e um parceiro produtivo da moda, extraia os dados coletados e retorne SOMENTE um JSON válido, sem markdown, sem explicação.

Campos a extrair:
- roleInChain: tipo de serviço principal (ex: "costura", "bordado", "estamparia", "facção", "acabamento", "modelagem") — string ou null
- specialties: array de especialidades/serviços específicos mencionados — string[] ou null
- productionCapacity: capacidade produtiva mencionada (ex: "500 peças/mês") — string ou null
- city: cidade — string ou null
- state: estado brasileiro em 2 letras (ex: "SP", "MG") — string ou null
- mainOffer: diferenciais, maquinário ou equipamentos mencionados — string ou null
- email: e-mail se mencionado — string ou null

Retorne exatamente: {"roleInChain":...,"specialties":...,"productionCapacity":...,"city":...,"state":...,"mainOffer":...,"email":...}`
        },
        {
          role: "user",
          content: conversa.slice(0, 3000),
        },
      ],
      temperature: 0,
      max_tokens: 400,
    });

    const raw = resp.choices[0]?.message?.content?.trim() ?? "{}";
    return JSON.parse(raw) as DadosExtraidos;
  } catch (err: any) {
    logger.warn({ error: err?.message }, "[MARCOS] falha na extração estruturada — usando defaults");
    return {
      roleInChain: null, specialties: null, productionCapacity: null,
      city: null, state: null, mainOffer: null, email: null,
    };
  }
}

// ── Salva pré-cadastro em moda_conecta_leads ──────────────────────────────────

async function salvarPreCadastroModa(params: {
  phone: string;
  leadName: string;
  tenantId: string;
  history: { role: string; content: string }[];
}): Promise<string> {
  const { phone, leadName, tenantId, history } = params;

  // Evita duplicatas — se já existe lead com esse whatsapp e companySlug
  const existing = await db
    .select({ id: modaConectaLeads.id })
    .from(modaConectaLeads)
    .where(
      and(
        eq(modaConectaLeads.whatsapp, phone),
        eq(modaConectaLeads.companySlug, tenantId),
      )
    )
    .limit(1);

  if (existing.length > 0) {
    logger.info({ phone, tenantId, existingId: existing[0].id }, "[MARCOS] pré-cadastro já existe — pulando insert");
    return existing[0].id;
  }

  const dados = await extrairDadosEstruturados(history);

  const [row] = await db.insert(modaConectaLeads).values({
    companySlug: tenantId,
    campaignSource: "marcos_whatsapp",
    fullName: leadName?.trim() || "Parceiro WhatsApp",
    email: dados.email ?? `whatsapp_${phone}@sem-email.marcos`,
    whatsapp: phone,
    phone: phone,
    roleInChain: dados.roleInChain ?? null,
    specialties: dados.specialties ?? null,
    productionCapacity: dados.productionCapacity ?? null,
    city: dados.city ?? null,
    state: dados.state ?? null,
    mainOffer: dados.mainOffer ?? null,
    status: "novo",
    lgpdConsent: false,
    utmSource: "whatsapp",
    utmMedium: "marcos_ai",
    utmCampaign: "parceiro_produtivo",
  }).returning();

  return row.id;
}

// ── Gera resumo estruturado para handoff do consultor ─────────────────────────

function gerarResumoHandoff(history: { role: string; content: string }[]): string {
  const fullConversation = history
    .map((m) => `${m.role === "user" ? "Parceiro" : "MARCOS"}: ${m.content}`)
    .join("\n");

  return `=== RESUMO MARCOS — PARCEIRO PRODUTIVO ===\n${fullConversation.slice(0, 800)}\n=== FIM ===`;
}
