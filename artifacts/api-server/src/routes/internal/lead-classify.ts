import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, or, desc, sql } from "drizzle-orm";
import { db, comercialLeads, leadsEspelho, leadAiEvents, leadConversationState } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { supabaseAdmin } from "../../lib/supabase";
import { logger } from "../../lib/logger";

const router = Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized — invalid x-internal-key" }); return; }
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

// ── SdrConfig: carrega do banco (por tenant) ──────────────────────────────────
interface SdrConfig {
  personaNome: string;
  personaTom: string;
  contextoNegocio: string;
  maxTurns: number;
}

const sdrConfigCache = new Map<string, { config: SdrConfig; ts: number }>();

async function loadSdrConfig(tenantId: string): Promise<SdrConfig> {
  const cached = sdrConfigCache.get(tenantId);
  if (cached && Date.now() - cached.ts < 300_000) return cached.config;
  try {
    const rows = await db.execute(
      sql`SELECT ai_sdr_config FROM sales_automation_config WHERE tenant_id = ${tenantId} LIMIT 1`
    );
    const row = (rows as any).rows?.[0] ?? (rows as any)[0];
    const saved = row?.ai_sdr_config;
    if (saved?.contextoNegocio || saved?.personaNome) {
      const config: SdrConfig = {
        personaNome:     saved.personaNome     ?? "SDR",
        personaTom:      saved.personaTom      ?? "consultivo, casual, direto",
        contextoNegocio: saved.contextoNegocio ?? "",
        maxTurns:        saved.maxTurns        ?? 5,
      };
      sdrConfigCache.set(tenantId, { config, ts: Date.now() });
      return config;
    }
  } catch (e) {
    logger.warn({ tenantId, error: String(e) }, "lead-classify: falha ao carregar sdr_config, usando fallback");
  }
  return {
    personaNome:     "Atha",
    personaTom:      "consultivo, casual, direto, sem enrolação. Igual a um bom SDR humano.",
    contextoNegocio: R2PB_CONTEXT,
    maxTurns:        5,
  };
}

// ── Normalização de telefone ──────────────────────────────────────────────────
function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const variants = new Set<string>([digits]);
  if (digits.startsWith("55") && digits.length >= 12) variants.add(digits.slice(2));
  if (!digits.startsWith("55") && digits.length <= 11) variants.add("55" + digits);
  const withoutDDI = digits.startsWith("55") ? digits.slice(2) : digits;
  if (withoutDDI.length === 10) {
    const with9 = withoutDDI.slice(0, 2) + "9" + withoutDDI.slice(2);
    variants.add(with9);
    variants.add("55" + with9);
  }
  if (withoutDDI.length === 11 && withoutDDI[2] === "9") {
    const without9 = withoutDDI.slice(0, 2) + withoutDDI.slice(3);
    variants.add(without9);
    variants.add("55" + without9);
  }
  return Array.from(variants);
}

// ── Determina goal da conversa a partir da classificação ─────────────────────
function deriveGoal(intention: string, route: string): string {
  if (route === "rescue") return "rescue";
  if (intention === "urgencia" || intention === "compra") return "schedule";
  if (intention === "pricing" || intention === "minimum_quantity" || intention === "lead_time" || intention === "product_type") return "qualify";
  if (intention === "private_label" || intention === "qualifying") return "qualify";
  if (intention === "objection_price" || intention === "objection_time") return "objection_handling";
  if (intention === "disqualified_lead") return "disqualify";
  if (intention === "human_request") return "schedule";
  return "qualify";
}

// ── Bloco de contexto R2PB (baseado no site oficial r2pbconfeccoes.com.br) ─────
const R2PB_CONTEXT = `
## SOBRE A R2PB CONFECÇÕES
Fábrica de private label premium localizada no Bom Retiro, São Paulo. No mercado desde 2006.
Produzimos vestuário com a marca do cliente — do zero ao acabamento: tecelagem, tinturaria, corte, estamparia, bordados, costura, lavanderia, acabamento e revisão.
Segmentos: streetwear, surfwear, casual, fitness e alfaiataria.
Contato/WhatsApp: (11) 99439-3480 | Rua Tenente Pena, 166 — Bom Retiro, SP

## OS 3 PLANOS (DO MAIOR PARA O MENOR)

### 🏆 Plano Pro — NOSSO FOCO PRINCIPAL
- Mínimo: **72 peças por modelo** (pode dividir em até 4 tamanhos e 2 cores)
- Private label premium com personalização TOTAL
- Ficha técnica própria ou a partir de fotos/referências do cliente
- Pode começar por peça piloto existente
- Grade de tamanhos livre, diversidade de cores ilimitada
- Desenvolvimento exclusivo + peça piloto + consultoria dedicada
- Pré-venda personalizada + plano de mentoria incluso
- Compra via assessoria comercial (não pela loja virtual)
- IMPORTANTE: cada estampa diferente = um modelo diferente (não dá dividir as 72 peças entre estampas)
- Preço: varia por produto, tecido e quantidade — necessário orçamento personalizado

### Plano Starter — INTERMEDIÁRIO
- Kit de **36 peças** com produtos do catálogo
- Grade de tamanhos pré-definida (sem alteração possível)
- Personalização via loja virtual: arte em 300 DPI, máximo 2 cores, apenas acima de 36 peças
- Compra: https://r2pbconfeccoes.com.br/loja-virtual/

### Plano Basic — ENTRADA
- Kit de **12 peças** com produtos do catálogo
- Sem personalização de estampas ou etiquetas
- Compra: https://r2pbconfeccoes.com.br/loja-virtual/

## PERFIL IDEAL (PLANO PRO)
✅ Tem marca própria ou está criando uma
✅ Quer produzir 72+ peças por modelo
✅ Precisa de desenvolvimento exclusivo e personalização total
✅ Valoriza qualidade e suporte consultivo, não só preço mínimo
✅ Segmentos: streetwear, surfwear, casual, fitness, alfaiataria

## LEADS QUE NÃO SÃO PRO → REDIRECIONAR COM GENTILEZA
❌ Quer menos de 72 peças → Starter (36 pçs) ou Basic (12 pçs) pela loja virtual
❌ Comprador final (quer comprar pra si mesmo) → não é nosso modelo
❌ Quer só estoque pronto sem personalização → loja virtual

## QUALIFICAÇÃO PROGRESSIVA (Plano Pro)
Para qualificar um lead Pro, colete nesta ordem:
1. **Produto**: o que quer produzir? (tipo de peça)
2. **Quantidade**: quantas peças por modelo? (determina se é Pro ≥72, Starter 36, Basic 12)
3. **Marca**: já tem marca ou está criando?
4. **Segmento**: streetwear, surfwear, casual, fitness ou outro?
5. **Prazo**: tem data de lançamento?
→ Com produto + quantidade confirmados ≥72 peças → oferecer conversa com consultor

## PLAYBOOKS DE RESPOSTA POR INTENÇÃO

**pricing** (perguntou preço/valor/quanto custa):
→ Nunca invente valores. Explique que depende de produto, tecido e quantidade.
→ Peça produto + quantidade para dar uma faixa.
→ Exemplo: "O valor varia conforme produto, tecido e quantidade. Me conta: que tipo de peça quer produzir e já tem uma noção de quantas unidades por modelo?"

**minimum_quantity** (perguntou mínimo, MOQ, pedido mínimo):
→ Informe o mínimo do Plano Pro (72 peças/modelo), mencione opções menores.
→ Exemplo: "No Plano Pro o mínimo é 72 peças por modelo, que dá pra dividir em até 4 tamanhos e 2 cores. Se precisar de menos, temos opções a partir de 12 e 36 peças pela loja virtual. O que você está planejando produzir?"

**lead_time** (perguntou prazo, entrega, tempo):
→ Prazo depende do projeto — mencione que é consultado no processo de assessoria.
→ Exemplo: "O prazo depende do projeto, tipo de peça e complexidade — isso é definido junto com o consultor no início do processo. Você tem uma data específica em mente pra lançar?"

**product_type** (perguntou quais produtos fazem):
→ Liste os segmentos reais e ofereça continuar.
→ Exemplo: "Trabalhamos com streetwear, surfwear, casual, fitness e alfaiataria — tudo com a sua marca. Qual segmento é o da sua marca?"

**private_label** (interesse em marca própria, lançar marca, produção com marca do cliente):
→ Valide com entusiasmo, pergunte sobre marca e produto.
→ Exemplo: "É exatamente o que fazemos! Do desenvolvimento até o acabamento, tudo com a sua marca. Você já tem marca registrada ou está começando agora?"

**qualifying** (lead respondendo perguntas, avançando na qualificação):
→ Avance para o próximo dado que falta na sequência: produto → quantidade → marca → segmento → prazo.
→ Se quantidade for ≥72: "Perfeito! Com [quantidade] peças você se encaixa no Plano Pro. O próximo passo é uma conversa rápida com nosso consultor para montar o orçamento. Posso conectar você?"
→ Se quantidade for <72: direcionar para loja virtual gentilmente.

**small_quantity** (quer menos de 72 peças):
→ Route: nurture. Apresente Starter/Basic com loja virtual.
→ Exemplo: "Com [X] peças você se encaixaria no nosso Plano Starter ou Basic! Tem tudo pela nossa loja virtual: r2pbconfeccoes.com.br/loja-virtual — fica bem mais simples. Quer dar uma olhada lá?"

**disqualified_lead** (comprador final, quer produto pra si mesmo):
→ Route: human_handoff. Gentil, explica o modelo de negócio.
→ Exemplo: "A R2PB trabalha com produção para marcas — se você quiser criar sua própria linha um dia, a gente topa! Para comprar peças individuais, infelizmente não é o nosso modelo. 😊"

**human_request** (pediu pra falar com uma pessoa):
→ Route: human_handoff imediato.
→ Exemplo: "Claro! Deixa eu te conectar com um dos nossos consultores agora. 😊"

**objection_price** (achou caro, comparou com concorrente):
→ Valide sem defender. Posicione: qualidade total, marca própria, suporte completo, processo consultivo.
→ Exemplo: "Entendo! O nosso diferencial é entrega consultiva completa — modelagem, desenvolvimento e acompanhamento. Mas me diz: qual é o seu orçamento disponível agora?"

**generic_interest** (interesse vago, sem especificação):
→ Faça UMA pergunta que identifique o produto de interesse.
→ Exemplo: "Que legal! Pra te ajudar melhor, me conta: que tipo de roupa você quer produzir?"
`;

// ── Prompt de primeiro contato V1.3 ──────────────────────────────────────────
function buildFirstContactPrompt(
  message: string,
  leadContext: {
    name: string | null;
    operationalStatus: string;
    currentPipeline: string | null;
    currentStage: string | null;
    lastInteractionAt: string | null;
    humanActive: boolean;
    agendou: boolean;
  },
  conversationHistory: Array<{ role: string; snippet: string; createdAt: string }>,
  companySlug: string,
  cfg: SdrConfig
): string {
  const historyBlock = conversationHistory.length > 0
    ? conversationHistory.map(h => `[${h.createdAt}] ${h.role}: ${h.snippet}`).join("\n")
    : "Nenhum histórico encontrado.";

  const firstName = leadContext.name?.split(" ")[0] ?? null;

  return `Você é ${cfg.personaNome}, SDR comercial. Tom: ${cfg.personaTom}.
${cfg.contextoNegocio}

## CONTEXTO DO LEAD
- Nome: ${leadContext.name ?? "desconhecido"}
- Status: ${leadContext.operationalStatus}
- Pipeline anterior: ${leadContext.currentPipeline ?? "nenhum"}
- Agendou reunião antes: ${leadContext.agendou ? "SIM" : "NÃO"}
- Última interação: ${leadContext.lastInteractionAt ?? "nunca"}

HISTÓRICO:
${historyBlock}

MENSAGEM DO LEAD:
"${message}"

## PERSONA
- Tom: ${cfg.personaTom}
- ${firstName ? `Use o nome "${firstName}" se ajudar` : "Não use o nome por enquanto"}
- JAMAIS use: "Recebi sua mensagem", "Já vou te ajudar", "Estou aqui para", "Como posso ajudar"
- JAMAIS mencione IA, robô ou automação
- SEMPRE termine com UMA pergunta objetiva que avança a qualificação
- Resposta máxima: 3 frases curtas

## TAREFA
Identifique a intenção, classifique e gere a resposta ideal segundo os playbooks acima.
Retorne APENAS este JSON (sem markdown):

{
  "lead_type": "novo_lead" | "lead_recorrente" | "lead_reativado" | "lead_perdido_que_voltou",
  "intention": "pricing" | "minimum_quantity" | "lead_time" | "product_type" | "private_label" | "qualifying" | "human_request" | "objection_price" | "objection_time" | "disqualified_lead" | "generic_interest" | "urgencia" | "desistencia" | "ignore",
  "objection": "preco" | "tempo" | "concorrente" | "nao_precisa" | "nao_confia" | null,
  "confidence": 0.0,
  "route": "nurture" | "rescue" | "human_handoff" | "ignore" | "hold_human",
  "suggested_response": "resposta comercial real, conforme playbook, máximo 3 frases, com UMA pergunta objetiva no fim",
  "reasoning": "raciocínio em 1 linha"
}

REGRAS DE ROTEAMENTO:
- route "human_handoff": intention = human_request, urgencia, disqualified_lead, ou confiança >= 0.9 com intenção de compra clara
- route "nurture": lead qualificável mas sem urgência
- route "rescue": lead que sumiu e voltou
- route "ignore": mensagem é "ok", "oi", emoji solto, resposta sem contexto comercial
- route "hold_human": humanActive = true`;
}

// ── Prompt de continuação de conversa V1.3 ────────────────────────────────────
function buildContinuationPrompt(
  message: string,
  conversationGoal: string,
  turnCount: number,
  maxTurns: number,
  lastAiResponse: string | null,
  recentEvents: Array<{ role: string; snippet: string; createdAt: string }>,
  leadName: string | null,
  companySlug: string,
  cfg: SdrConfig
): string {
  const turnsRemaining = maxTurns - turnCount;
  const isLastTurns = turnsRemaining <= 2;

  const historyBlock = recentEvents.length > 0
    ? recentEvents.map(h => `[${h.createdAt}] ${h.role === "automation" ? cfg.personaNome : "Lead"}: ${h.snippet}`).join("\n")
    : "Sem histórico anterior.";

  const firstName = leadName?.split(" ")[0] ?? null;

  return `Você é ${cfg.personaNome}, SDR comercial. Tom: ${cfg.personaTom}.
${cfg.contextoNegocio}

## ESTADO DA CONVERSA
- Lead: ${leadName ?? "desconhecido"}
- Objetivo atual: ${conversationGoal}
- Turno: ${turnCount} de ${maxTurns}
- Turnos restantes: ${turnsRemaining}
- Última resposta sua: "${lastAiResponse ?? "nenhuma"}"

HISTÓRICO DA CONVERSA:
${historyBlock}

NOVA MENSAGEM DO LEAD:
"${message}"

## PERSONA
- Tom: ${cfg.personaTom}
- ${firstName ? `Use "${firstName}" se natural` : "Sem nome por enquanto"}
- JAMAIS repita a mesma estrutura da resposta anterior
- JAMAIS use: "Recebi sua mensagem", "Já vou te ajudar", "Estou aqui", "Com certeza"
- JAMAIS mencione IA, robô ou automação
- Cada turno deve avançar a conversa — nunca repetir, nunca ficar no lugar
- Resposta máxima: 3 frases

${isLastTurns ? `## ATENÇÃO — ÚLTIMOS TURNOS AUTOMÁTICOS
Você tem ${turnsRemaining} turno(s) restante(s). Avalie:
- Se o lead já deu dados suficientes → ofereça conectar com o time
- Se o lead ainda não qualificou → ofereça conexão com humano de forma natural
- Route DEVE ser "human_handoff" se ainda não converteu e turnsRemaining = 1` : ""}

## TAREFA
Analise a mensagem no contexto da conversa e retorne APENAS este JSON (sem markdown):

{
  "lead_type": "lead_recorrente",
  "intention": "pricing" | "minimum_quantity" | "lead_time" | "product_type" | "private_label" | "qualifying" | "human_request" | "objection_price" | "objection_time" | "disqualified_lead" | "generic_interest" | "urgencia" | "desistencia" | "ignore",
  "objection": "preco" | "tempo" | "concorrente" | "nao_precisa" | "nao_confia" | null,
  "confidence": 0.0,
  "route": "nurture" | "rescue" | "human_handoff" | "ignore" | "hold_human",
  "suggested_response": "resposta contextual que avança a conversa sem repetir o que já foi dito, conforme playbook, max 3 frases",
  "reasoning": "raciocínio em 1 linha"
}

REGRAS:
- Se intention = human_request ou urgencia → route "human_handoff" imediatamente
- Se mensagem é "ok", "sim", "não", emoji solto sem contexto → route "ignore"
- Se desistencia → route "nurture", ofereça algo concreto
- Se ${turnsRemaining <= 1} (último turno) → route "human_handoff" com CTA claro`;
}

// ── POST /api/internal/lead-classify ─────────────────────────────────────────
//
// Classifica intenção e perfil de um lead. V1.1: inclui estado conversacional
// com guardrails de turno, detecção de first_contact vs continuation, e
// handoff automático ao atingir limite de turnos.
//
// Body: { company_slug, phone, message, lead_name? }
// Header: x-internal-key: <MARKETING_INTERNAL_API_KEY>

router.post(
  "/internal/lead-classify",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone, message, lead_name } = req.body as {
      company_slug?: string;
      tenant_id?: string;
      phone: string;
      message: string;
      lead_name?: string;
    };

    if (!phone) {
      res.status(400).json({ error: "phone é obrigatório" });
      return;
    }
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    // Mensagem vazia = áudio/imagem sem transcrição. Trata como contato genérico
    // e força nurture com resposta de fallback imediatamente (sem chamar IA).
    const effectiveMessage = (message ?? "").trim();
    if (!effectiveMessage) {
      const resolvedSlug2 = company_slug ?? tenant_id ?? "unknown";
      logger.info({ phone, tenantId: company_slug ?? tenant_id }, "lead-classify: mensagem vazia (áudio/mídia) → nurture fallback imediato");
      return res.json({
        ok: true,
        event_id: null,
        contact_type: "media_message",
        lead_type: "novo_lead",
        intention: "generic_interest",
        objection: null,
        confidence: 0,
        route: "nurture",
        suggested_response: "Oi! Recebi sua mensagem de mídia 😊 Me conta em texto o que você está precisando para eu te ajudar melhor!",
        reasoning: "Mensagem sem texto (áudio/imagem) — resposta de engajamento para manter conversa ativa",
        operational_status: "unknown",
        lead: { name: null, phone, pipeline: null, stage: null },
        company_slug: resolvedSlug2,
        turn_count: 0,
        max_turns: 5,
        max_turns_reached: false,
        conversation_state: { status: "active", turn_count: 0, max_turns: 5, goal: "qualify", handoff_required: false },
        tokens: { prompt: "0", completion: "0" },
      });
    }

    try {
      let resolvedTenantId: string | null = tenant_id ?? null;
      const resolvedSlug = company_slug ?? tenant_id ?? "unknown";
      if (!resolvedTenantId && company_slug) {
        resolvedTenantId = await resolveSlug(company_slug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado: ${company_slug}` });
          return;
        }
      }

      const variants = phoneVariants(phone);
      const canonicalPhone = variants[0];

      // ── 1. Carrega estado conversacional ────────────────────────────────────
      const [convStateRows, clRows, espelhoRows] = await Promise.all([
        db.select().from(leadConversationState).where(
          and(
            eq(leadConversationState.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(leadConversationState.phone, v)))
          )
        ).limit(1),
        db.select().from(comercialLeads).where(
          and(
            eq(comercialLeads.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(comercialLeads.phone, v)))
          )
        ).limit(1),
        db.select().from(leadsEspelho).where(
          and(
            eq(leadsEspelho.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(leadsEspelho.whatsapp, v)))
          )
        ).limit(1),
      ]);

      const convState = convStateRows[0] ?? null;
      const cl = clRows[0] ?? null;
      const espelho = espelhoRows[0] ?? null;

      // ── 2. Proteção PRIORITÁRIA: humanInControl na tabela de estado ─────────
      // Esta é a proteção mais forte — supera qualquer outra lógica.
      // É setada por /api/internal/leads/set-human-control quando um agente
      // assume a conversa no Helena (ou manualmente).
      if (convState?.humanInControl === true) {
        logger.info(
          { tenantId: resolvedTenantId, phone, agentName: convState.humanAgentName },
          "lead-classify: humanInControl=true → automação bloqueada"
        );
        return res.json({
          ok: true,
          contact_type: "hold_human",
          lead_type: null,
          intention: null,
          objection: null,
          confidence: 1.0,
          route: "hold_human",
          suggested_response: null,
          reasoning: `Conversa sob controle humano (agente: ${convState.humanAgentName ?? "desconhecido"}). Nenhuma automação deve ser disparada.`,
          operational_status: "human_active",
          phone,
          company_slug: resolvedSlug,
          conversation_state: { status: "hold_human", turn_count: convState.turnCount },
        });
      }

      // ── 3. Determina status operacional ─────────────────────────────────────
      let operationalStatus = "unknown";
      if (cl?.status === "aberto")    operationalStatus = "human_active";
      else if (cl?.status === "fechado") operationalStatus = "reactivated";
      else if (espelho && !espelho.agendou) operationalStatus = "abandoned_before_human";
      else if (espelho && espelho.agendou) operationalStatus = "dormant";

      // Proteção secundária: comercialLeads.status = 'aberto' (caminho legado)
      if (operationalStatus === "human_active") {
        logger.info({ tenantId: resolvedTenantId, phone, operationalStatus }, "lead-classify: humano ativo (comercialLeads), classificação ignorada");
        return res.json({
          ok: true,
          contact_type: "hold_human",
          lead_type: null,
          intention: null,
          objection: null,
          confidence: 1.0,
          route: "hold_human",
          suggested_response: null,
          reasoning: "Lead em atendimento humano ativo. Nenhuma automação deve ser disparada.",
          operational_status: operationalStatus,
          phone,
          company_slug: resolvedSlug,
          conversation_state: { status: "hold_human", turn_count: convState?.turnCount ?? 0 },
        });
      }

      // ── 3b. Detecção de lead pré-qualificado da Landing Page PRO ───────────
      // Quando a primeira mensagem contém "vim pelo Plano PRO" + dados estruturados,
      // o lead já respondeu as perguntas de qualificação. Criamos o card direto
      // e fazemos handoff imediato sem passar pela IA.
      const isFirstContact = convState === null || convState.conversationStatus !== "active" || convState.turnCount === 0;
      const isLpProLead =
        isFirstContact &&  // Só na primeira mensagem
        /vim pelo (plano pro|site da r2pb)/i.test(effectiveMessage) &&
        /segmento:/i.test(effectiveMessage) &&
        /volume:/i.test(effectiveMessage) &&
        /investimento:/i.test(effectiveMessage);

      if (isLpProLead) {
        // Extrai dados estruturados da mensagem
        const parseName     = effectiveMessage.match(/meu nome [eé]\s+([^\n]+?)(?:\s+e vim| e vim)/i)?.[1]?.trim() ?? lead_name ?? null;
        const parseSegmento = effectiveMessage.match(/segmento:\s*([^\n]+)/i)?.[1]?.trim() ?? null;
        const parseVolume   = effectiveMessage.match(/volume:\s*([^\n]+)/i)?.[1]?.trim() ?? null;
        const parseInvest   = effectiveMessage.match(/investimento:\s*([^\n]+)/i)?.[1]?.trim() ?? null;

        const notasCard = [
          "📋 Lead pré-qualificado via Landing Page /pro",
          parseSegmento  ? `Segmento: ${parseSegmento}`    : null,
          parseVolume    ? `Volume: ${parseVolume}`         : null,
          parseInvest    ? `Investimento: ${parseInvest}`  : null,
        ].filter(Boolean).join("\n");

        // Cria/atualiza o card no pipeline comercial
        await db.insert(comercialLeads).values({
          tenantId:         resolvedTenantId!,
          phone:            canonicalPhone,
          leadName:         parseName,
          origem:           "landing_pro",
          canal:            "whatsapp",
          handoffReason:    "lead_qualificado_lp",
          mensagemRecebida: effectiveMessage.slice(0, 500),
          pipelineKey:      "comercial_humano",
          stageKey:         "lead_qualificado_lp",
          status:           "aberto",
          lastHandoffAt:    new Date(),
          updatedAt:        new Date(),
        }).onConflictDoUpdate({
          target: [comercialLeads.tenantId, comercialLeads.phone],
          set: {
            leadName:         parseName ?? undefined,
            origem:           "landing_pro",
            handoffReason:    "lead_qualificado_lp",
            mensagemRecebida: effectiveMessage.slice(0, 500),
            pipelineKey:      "comercial_humano",
            stageKey:         "lead_qualificado_lp",
            status:           "aberto",
            lastHandoffAt:    new Date(),
            updatedAt:        new Date(),
          },
        });

        // Registra o evento
        await db.insert(leadAiEvents).values({
          tenantId:          resolvedTenantId!,
          phone:             canonicalPhone,
          leadName:          parseName,
          messageSnippet:    effectiveMessage.slice(0, 500),
          leadType:          "lead_qualificado_lp",
          intention:         "compra",
          objection:         null,
          suggestedResponse: notasCard,
          route:             "human_handoff",
          operationalStatus: "pre_qualified",
          promptTokens:      "0",
          completionTokens:  "0",
        });

        // Cria estado conversacional em handoff
        await db.insert(leadConversationState).values({
          tenantId:           resolvedTenantId!,
          phone:              canonicalPhone,
          conversationStatus: "handoff",
          turnCount:          1,
          maxTurns:           5,
          conversationGoal:   "close",
          lastAiResponse:     null,
          lastLeadMessage:    effectiveMessage.slice(0, 500),
          handoffRequired:    true,
          handoffReason:      "lead_qualificado_lp",
          windowOpenedAt:     new Date(),
          lastActivityAt:     new Date(),
          updatedAt:          new Date(),
        }).onConflictDoUpdate({
          target: [leadConversationState.tenantId, leadConversationState.phone],
          set: {
            conversationStatus: "handoff",
            turnCount:          1,
            conversationGoal:   "close",
            lastLeadMessage:    effectiveMessage.slice(0, 500),
            handoffRequired:    true,
            handoffReason:      "lead_qualificado_lp",
            windowOpenedAt:     new Date(),
            lastActivityAt:     new Date(),
            updatedAt:          new Date(),
          },
        });

        const firstName = parseName?.split(" ")[0] ?? null;
        const greet = firstName ? `Oi ${firstName}! ` : "Oi! ";
        const lpSuggestedResponse = `${greet}Aqui é da R2PB. Recebi seus dados aqui — ${parseSegmento ? `segmento ${parseSegmento}, ` : ""}${parseVolume ? `${parseVolume}, ` : ""}${parseInvest ? `investimento de ${parseInvest}` : ""}. Já to passando pra nossa equipe te atender agora! 🙌`;

        logger.info(
          { tenantId: resolvedTenantId, phone: canonicalPhone, segmento: parseSegmento, volume: parseVolume },
          "lead-classify: lead pré-qualificado LP PRO detectado → handoff imediato"
        );

        return res.json({
          ok: true,
          event_id: null,
          contact_type: "first_contact",
          lead_type: "lead_qualificado_lp",
          intention: "compra",
          objection: null,
          confidence: 1.0,
          route: "human_handoff",
          suggested_response: lpSuggestedResponse,
          reasoning: "Lead veio pré-qualificado da Landing Page /pro com segmento, volume e investimento. Card criado. Handoff imediato.",
          operational_status: "pre_qualified",
          lead: {
            name:     parseName,
            phone:    canonicalPhone,
            pipeline: "comercial_humano",
            stage:    "lead_qualificado_lp",
          },
          company_slug:   resolvedSlug,
          turn_count:     1,
          max_turns:      5,
          max_turns_reached: false,
          conversation_state: {
            status:          "handoff",
            turn_count:      1,
            max_turns:       5,
            goal:            "close",
            handoff_required: true,
          },
          tokens: { prompt: "0", completion: "0" },
        });
      }

      // ── 4. Determina tipo de contato: first_contact vs continuation ──────────
      const isActiveConversation =
        convState !== null &&
        convState.conversationStatus === "active" &&
        convState.turnCount > 0;

      // Conversa em handoff = não processar automaticamente
      if (convState?.conversationStatus === "handoff") {
        logger.info({ tenantId: resolvedTenantId, phone }, "lead-classify: conversa em handoff, ignorando automação");
        return res.json({
          ok: true,
          contact_type: "hold_handoff",
          lead_type: null,
          intention: null,
          objection: null,
          confidence: 1.0,
          route: "hold_human",
          suggested_response: null,
          reasoning: "Conversa em handoff para humano. Aguardando atendimento.",
          operational_status: operationalStatus,
          phone,
          company_slug: resolvedSlug,
          conversation_state: {
            status: convState.conversationStatus,
            turn_count: convState.turnCount,
            handoff_reason: convState.handoffReason,
          },
        });
      }

      const contactType = isActiveConversation ? "conversation_continuation" : "first_contact";
      const currentTurnCount = isActiveConversation ? convState!.turnCount : 0;
      const sdrCfg = await loadSdrConfig(resolvedTenantId!);
      const maxTurns = convState?.maxTurns ?? sdrCfg.maxTurns;

      // ── 4. Guardrail: limite de turnos ─────────────────────────────────────
      if (isActiveConversation && currentTurnCount >= maxTurns) {
        logger.info(
          { tenantId: resolvedTenantId, phone, turnCount: currentTurnCount, maxTurns },
          "lead-classify: limite de turnos atingido → human_handoff forçado"
        );

        // Atualiza estado para handoff
        await db.update(leadConversationState)
          .set({
            conversationStatus: "handoff",
            handoffRequired: true,
            handoffReason: "max_turns_reached",
            lastLeadMessage: message.slice(0, 500),
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(leadConversationState.id, convState!.id));

        return res.json({
          ok: true,
          contact_type: "conversation_continuation",
          lead_type: "lead_recorrente",
          intention: "duvida",
          objection: null,
          confidence: 1.0,
          route: "human_handoff",
          suggested_response: "Deixa eu te conectar com alguém do nosso time agora pra você ser bem atendido(a)! 😊",
          reasoning: `Limite de ${maxTurns} turnos automáticos atingido. Handoff obrigatório.`,
          operational_status: operationalStatus,
          phone,
          company_slug: resolvedSlug,
          turn_count: currentTurnCount,
          max_turns: maxTurns,
          max_turns_reached: true,
          conversation_state: {
            status: "handoff",
            turn_count: currentTurnCount,
            handoff_reason: "max_turns_reached",
          },
        });
      }

      // ── 5. Busca histórico de eventos AI ────────────────────────────────────
      const recentEvents = await db.select({
        role: leadAiEvents.route,
        snippet: leadAiEvents.messageSnippet,
        createdAt: leadAiEvents.createdAt,
      })
        .from(leadAiEvents)
        .where(
          and(
            eq(leadAiEvents.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(leadAiEvents.phone, v)))
          )
        )
        .orderBy(desc(leadAiEvents.createdAt))
        .limit(5);

      const resolvedName = lead_name ?? cl?.leadName ?? espelho?.nome ?? null;

      // ── 6. Chama OpenAI com prompt adequado ao tipo de contato ──────────────
      let systemPrompt: string;

      if (contactType === "conversation_continuation") {
        systemPrompt = buildContinuationPrompt(
          message,
          convState!.conversationGoal ?? "qualify",
          currentTurnCount,
          maxTurns,
          convState!.lastAiResponse,
          recentEvents.map(e => ({
            role: e.role ?? "automation",
            snippet: e.snippet ?? "",
            createdAt: e.createdAt.toISOString(),
          })),
          resolvedName,
          resolvedSlug,
          sdrCfg
        );
      } else {
        systemPrompt = buildFirstContactPrompt(
          message,
          {
            name: resolvedName,
            operationalStatus,
            currentPipeline: cl?.pipelineKey ?? null,
            currentStage: cl?.stageKey ?? null,
            lastInteractionAt: cl?.updatedAt?.toISOString() ?? espelho?.updatedAt?.toISOString() ?? null,
            humanActive: false,
            agendou: espelho?.agendou ?? false,
          },
          recentEvents.map(e => ({
            role: e.role ?? "automation",
            snippet: e.snippet ?? "",
            createdAt: e.createdAt.toISOString(),
          })),
          resolvedSlug,
          sdrCfg
        );
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.2,
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices[0]?.message?.content ?? "{}";
      let parsed: {
        lead_type?: string;
        intention?: string;
        objection?: string | null;
        confidence?: number;
        route?: string;
        suggested_response?: string;
        reasoning?: string;
      } = {};

      try {
        parsed = JSON.parse(rawContent);
      } catch {
        logger.warn({ rawContent }, "lead-classify: falha ao parsear JSON da IA");
        parsed = { route: "manual_review", reasoning: "Resposta inválida da IA" };
      }

      const leadType          = parsed.lead_type ?? "novo_lead";
      const intention         = parsed.intention ?? "curiosidade";
      const objection         = parsed.objection ?? null;
      const confidence        = parsed.confidence ?? 0.7;
      let route               = parsed.route ?? "nurture";
      let suggestedResponse   = parsed.suggested_response ?? null;
      const reasoning         = parsed.reasoning ?? "";
      const promptTokens      = String(completion.usage?.prompt_tokens ?? 0);
      const completionTokens  = String(completion.usage?.completion_tokens ?? 0);

      // Lead solto (sem humano ativo) nunca deve ser ignorado — qualquer mensagem merece resposta,
      // seja primeiro contato ou continuação. Se chegou até aqui é porque human_in_control = false.
      if (route === "ignore") {
        route = "nurture";
        // Garante resposta não-nula: a IA não gerou suggested_response quando classificou como ignore
        if (!suggestedResponse) {
          suggestedResponse = contactType === "first_contact"
            ? "Olá! Que tipo de roupa você está pensando em produzir? Me conta mais sobre o seu projeto 😊"
            : "Oi! Posso te ajudar com alguma coisa? Me conta o que você está precisando 😊";
        }
      }

      // Força handoff se intention = urgencia ou compra em continuation
      if (contactType === "conversation_continuation" && (intention === "urgencia" || intention === "compra")) {
        route = "human_handoff";
      }

      // ── 7. Persiste o evento no banco ────────────────────────────────────────
      const [savedEvent] = await db.insert(leadAiEvents).values({
        tenantId:          resolvedTenantId!,
        phone:             canonicalPhone,
        leadName:          resolvedName,
        messageSnippet:    message.slice(0, 500),
        leadType,
        intention,
        objection:         objection ?? null,
        suggestedResponse,
        route,
        operationalStatus,
        promptTokens,
        completionTokens,
      }).returning({ id: leadAiEvents.id });

      // ── 8. Upsert estado conversacional ─────────────────────────────────────
      const newTurnCount  = route === "ignore" ? currentTurnCount : currentTurnCount + 1;
      const newStatus     = route === "human_handoff" ? "handoff" : "active";
      const newGoal       = convState?.conversationGoal ?? deriveGoal(intention, route);
      const isHandoff     = route === "human_handoff";

      if (contactType === "first_contact") {
        // Tenta upsert (pode já existir estado closed/expired da conversa anterior)
        await db.insert(leadConversationState).values({
          tenantId:           resolvedTenantId!,
          phone:              canonicalPhone,
          conversationStatus: newStatus,
          turnCount:          route === "ignore" ? 0 : 1,
          maxTurns:           5,
          conversationGoal:   newGoal,
          lastAiResponse:     suggestedResponse,
          lastLeadMessage:    message.slice(0, 500),
          handoffRequired:    isHandoff,
          handoffReason:      isHandoff ? "ai_decision_first_contact" : null,
          windowOpenedAt:     new Date(),
          lastActivityAt:     new Date(),
          updatedAt:          new Date(),
        })
        .onConflictDoUpdate({
          target: [leadConversationState.tenantId, leadConversationState.phone],
          // Aqui usamos o unique index — drizzle precisa dos campos que formam o índice
          set: {
            conversationStatus: newStatus,
            turnCount:          route === "ignore" ? 0 : 1,
            conversationGoal:   newGoal,
            lastAiResponse:     suggestedResponse,
            lastLeadMessage:    message.slice(0, 500),
            handoffRequired:    isHandoff,
            handoffReason:      isHandoff ? "ai_decision_first_contact" : null,
            windowOpenedAt:     new Date(),
            lastActivityAt:     new Date(),
            updatedAt:          new Date(),
          },
        });
      } else {
        // Atualiza estado existente
        await db.update(leadConversationState)
          .set({
            conversationStatus: newStatus,
            turnCount:          newTurnCount,
            conversationGoal:   newGoal,
            lastAiResponse:     suggestedResponse ?? convState?.lastAiResponse,
            lastLeadMessage:    message.slice(0, 500),
            handoffRequired:    isHandoff,
            handoffReason:      isHandoff ? "ai_decision_continuation" : convState?.handoffReason,
            lastActivityAt:     new Date(),
            updatedAt:          new Date(),
          })
          .where(eq(leadConversationState.id, convState!.id));
      }

      const maxTurnsReached = newTurnCount >= maxTurns;

      logger.info(
        {
          tenantId: resolvedTenantId,
          phone,
          contactType,
          leadType,
          intention,
          objection,
          route,
          confidence,
          turnCount: newTurnCount,
          maxTurns,
          maxTurnsReached,
          eventId: savedEvent.id,
        },
        "lead-classify: classificação V1.2 concluída"
      );

      return res.json({
        ok: true,
        event_id: savedEvent.id,
        contact_type: contactType,
        lead_type: leadType,
        intention,
        objection,
        confidence,
        route,
        suggested_response: suggestedResponse,
        reasoning,
        operational_status: operationalStatus,
        lead: {
          name: resolvedName,
          phone,
          pipeline: cl?.pipelineKey ?? null,
          stage:    cl?.stageKey ?? null,
        },
        company_slug: resolvedSlug,
        turn_count: newTurnCount,
        max_turns: maxTurns,
        max_turns_reached: maxTurnsReached,
        conversation_state: {
          status: newStatus,
          turn_count: newTurnCount,
          max_turns: maxTurns,
          goal: newGoal,
          handoff_required: isHandoff,
        },
        tokens: { prompt: promptTokens, completion: completionTokens },
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "lead-classify: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

// ── GET /api/internal/lead-classify/history ──────────────────────────────────
router.get(
  "/internal/lead-classify/history",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone, limit: limitStr } = req.query as Record<string, string>;

    if (!phone) {
      res.status(400).json({ error: "Parâmetro 'phone' é obrigatório" });
      return;
    }
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      let resolvedTenantId: string | null = tenant_id ?? null;
      if (!resolvedTenantId && company_slug) {
        resolvedTenantId = await resolveSlug(company_slug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado: ${company_slug}` });
          return;
        }
      }

      const variants = phoneVariants(phone);
      const limit = Math.min(parseInt(limitStr ?? "20", 10), 50);

      const events = await db.select()
        .from(leadAiEvents)
        .where(
          and(
            eq(leadAiEvents.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(leadAiEvents.phone, v)))
          )
        )
        .orderBy(desc(leadAiEvents.createdAt))
        .limit(limit);

      res.json({ ok: true, phone, total: events.length, events });
    } catch (err: any) {
      logger.error({ error: err?.message }, "lead-classify/history: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

export default router;
