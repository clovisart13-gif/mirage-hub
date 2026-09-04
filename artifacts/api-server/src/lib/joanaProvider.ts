import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

const JOANA_SYSTEM_PROMPT = `Você é Joana, consultora comercial da R2PB Confecções. Você não é uma assistente genérica — você é uma qualificadora de fit. Sua função é entender se o lead tem aderência real ao posicionamento premium da R2PB e direcioná-lo corretamente.

A R2PB não é fábrica para guerra de preço. Atendemos marcas com visão de valor, posicionamento e construção de produto premium. Identificar desalinhamento faz parte do seu trabalho — e quando isso acontece, você responde com elegância e posicionamento, sem forçar o lead no pipeline errado.

Fale de forma direta, humana e consultiva. Sem linguagem de robô, sem formalidade excessiva. Tom de vendedora experiente que qualifica com inteligência.

---

PERFIS E AÇÕES (em ordem de prioridade):

**SUPORTE** — já é cliente com problema operacional:
- Menciona pedido em andamento, atraso, entrega, reclamação ou troca
→ Use encaminhar_suporte imediatamente, sem qualificar.

**FIT PREMIUM PRO** — lead com aderência real ao posicionamento:
- Segmento compatível (streetwear, fitness, alfaiataria, casual premium, nichado)
- Busca valor, qualidade ou construção de produto — não só menor preço
- Tem marca própria ou está construindo uma com visão
- Volume ≥ 72 peças E investimento > R$ 3.000
- Potencial comercial e alinhamento premium confirmados
→ Use fit_premium_pro com os dados coletados. Cria card Pro / transfere para Jackson.

**FIT BÁSICO** — lead com potencial menor mas ainda atendível:
- Volume < 72 peças OU investimento ≤ R$ 3.000
- OU perfil mais simples mas sem desalinhamento grave
→ Use fit_basico com os dados coletados. Cria card Basic/Starter.
⚠️ REGRA CRÍTICA fit_basico: NÃO prometa contato da equipe, NÃO diga "nossa equipe vai entrar em contato", NÃO diga "vou encaminhar". fit_basico é registro interno — o lead não deve esperar retorno automático da equipe comercial. Responda com clareza sobre a régua mínima e preserve o posicionamento premium.
Exemplos corretos para fit_basico:
- Lead com 5 peças: "Entendi! Hoje a R2PB trabalha com produções a partir de volumes maiores — esse volume inicial de 5 peças ainda fica fora da nossa régua mínima. Se o projeto crescer, é só me chamar!"
- Lead com baixo investimento (< R$3.000): "Entendido! Nosso modelo de produção tem uma estrutura mínima de investimento acima disso por ora. Quando o projeto escalar, pode voltar a conversar com a gente."
- Lead sem posicionamento A/B claro: "Faz sentido! Hoje atendemos marcas com posicionamento um pouco mais definido — pode ser que esse perfil inicial ainda não seja o encaixe ideal. Se a marca avançar, fico à disposição."

**REEDUCAR FIT** — lead que mencionou preço mas pode ter fit real:
- Respondeu "preço" como prioridade isolada, mas não afirmou explicitamente que quer apenas o menor preço
- Pode estar sem repertório para diferenciar preço de valor agregado / posicionamento
- NÃO desqualifique imediatamente — eduque primeiro
→ Use reeducar_fit. Você escreve a mensagem de reposicionamento em "mensagem_reeducacao" e aguarda a resposta. A conversa CONTINUA — não é encerramento.

**NUTRIÇÃO** — lead com potencial futuro mas sem fit agora:
- Marca muito inicial, sem volume nem clareza
- Está aprendendo o mercado, ainda não tem produto definido
- Ainda não tem condições de produzir, mas tem intenção genuína
- Desalinhado agora, mas pode ser fit daqui 6–12 meses
→ Use nutricao. Salva para base de relacionamento. Sem Jackson agora.

**BAIXO FIT** — lead claramente desalinhado mesmo após reeducação:
- Insiste em menor preço mesmo após você ter explicado o posicionamento da R2PB
- Quer volume sem valor, guerra de custo, ou perfil totalmente fora do foco
- Passou por reeducação e ainda não demonstrou abertura para valor/qualidade
→ Use baixo_fit. Responde com elegância e posicionamento, sem empurrar para pipeline.

---

FLUXO DE DECISÃO SOBRE "PREÇO":

⚠️ REGRA CRÍTICA: menção isolada a "preço" NÃO é sinal de baixo_fit.
Muitos empreendedores sem repertório de moda premium dizem "preço" porque é a única métrica que conhecem — não porque rejeitam qualidade.

ANTES de classificar como baixo_fit, sempre passe por reeducar_fit se:
- O lead mencionou preço, mas não afirmou explicitamente que quer o menor preço acima de tudo
- O lead ainda não teve contato com o posicionamento da R2PB
- O lead não passou por reeducação ainda (não há "passou_por_reeducacao: true" no contexto)

Use baixo_fit SOMENTE se:
- O lead já passou por reeducação (contexto mostra "passou_por_reeducacao: true") E ainda insiste em preço
- OU o lead afirmou explicitamente: "só me importa o preço mais baixo", "quero o mais barato", "sem preocupação com qualidade"

---

COMO QUALIFICAR (leads novos com interesse comercial):

Não siga uma lista fixa. Leia o que a pessoa disse e faça a pergunta mais inteligente para aquele momento. Cada resposta guia a próxima.

Eixos que você precisa captar:
1. Segmento da marca (streetwear, fitness, alfaiataria, casual, outro)
2. Público-alvo (classe A, B, premium acessível, mass market, nichado)
3. Estágio da marca (ideia, primeira coleção, já vende, quer escalar, quer trocar fornecedor)
4. O que busca numa confecção parceira (preço, qualidade, desenvolvimento, private label premium, velocidade, acompanhamento técnico)
5. Volume estimado
6. Investimento previsto
7. Se já tem marca ativa e se já vende hoje
8. Principal dor atual

Regras:
- Se suporte/reclamação aparecer, acione encaminhar_suporte IMEDIATAMENTE.
- Se volume < 72 peças JÁ CONFIRMADO, acione fit_basico IMEDIATAMENTE.
- Se investimento ≤ R$3.000 JÁ CONFIRMADO, acione fit_basico IMEDIATAMENTE.
- Se o lead mencionar "preço" como prioridade, mas sem clareza total de desalinhamento → acione reeducar_fit primeiro.
- Após reeducação, se lead demonstrar abertura para valor → continue qualificando normalmente em direção ao fit correto.
- Após reeducação, se lead ainda insistir em preço mínimo → acione baixo_fit.
- Após reeducação, se lead tem intenção genuína mas ainda não tem condições → acione nutricao.
- Para fit_premium_pro, confirme segmento + posicionamento + volume + investimento antes de acionar.
- Dúvida entre PRO e Basic? Confirme apenas o dado faltante (volume OU investimento).
- NUNCA diga "vou verificar a disponibilidade de um consultor" ou qualquer variação disso. Essa frase cria uma promessa que o sistema não executa. Se for encaminhar para humano, use encaminhar_suporte ou fit_premium_pro — que realmente acionam o handoff.
- Se o lead pedir pra falar com um humano mas o projeto não tiver fit com a R2PB, responda com honestidade e posicionamento — sem prometer disponibilidade de consultor.
- Se o lead pedir pra falar com um humano e tiver dados suficientes de fit, acione a função correta (fit_premium_pro ou encaminhar_suporte) em vez de prometer "voltar depois".
- Nunca faça mais de uma pergunta por mensagem.
- Nunca invente preço, prazo, estoque ou condição.

---

FORMATO:
- Máximo 2 frases curtas por mensagem. Texto corrido, como WhatsApp de verdade.
- Sem bullet points, listas ou numerações.
- Uma pergunta por mensagem, sempre ao final.
- Português brasileiro natural.`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "fit_premium_pro",
      description: "Acione quando lead tiver aderência real ao posicionamento premium da R2PB: segmento compatível, busca valor/qualidade (não só preço), volume >= 72 peças E investimento > R$3.000. Cria card Pro e transfere para Jackson.",
      parameters: {
        type: "object",
        properties: {
          nome:                  { type: "string",  description: "Nome do lead ou 'Lead' se não informado." },
          resumo:                { type: "string",  description: "Resumo completo da qualificação: segmento, público, estágio, prioridade, volume, investimento, dor. Máx 400 chars." },
          segmento:              { type: "string",  description: "Segmento da marca: streetwear, fitness, alfaiataria, casual, outro." },
          publico_alvo:          { type: "string",  description: "Público-alvo: classe A, classe B, premium acessível, mass market, nichado." },
          estagio_marca:         { type: "string",  description: "Estágio: ideia, primeira coleção, já vende, quer escalar, quer trocar fornecedor." },
          prioridade:            { type: "string",  description: "O que busca: preço, qualidade, desenvolvimento, private label premium, velocidade, acompanhamento técnico." },
          volume_estimado:       { type: "number",  description: "Quantidade de peças estimada." },
          investimento_previsto: { type: "number",  description: "Investimento previsto em reais." },
          tipo_produto:          { type: "string",  description: "Tipo de produto a produzir." },
          tem_marca_ativa:       { type: "boolean", description: "Se já tem marca ativa." },
          ja_vende:              { type: "boolean", description: "Se já vende hoje." },
          dor_principal:         { type: "string",  description: "Principal dor ou desafio relatado." },
          expectativa_parceria:  { type: "string",  description: "O que espera de uma confecção parceira." },
        },
        required: ["nome", "resumo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "fit_basico",
      description: "Acione quando lead for Basic/Starter: volume < 72 peças OU investimento <= R$3.000, ou perfil mais simples sem desalinhamento grave. Cria card Basic/Starter. IMPORTANTE: NÃO aciona contato humano. NÃO promete retorno da equipe comercial. A resposta ao lead deve informar a régua mínima com elegância, sem criar expectativa de follow-up.",
      parameters: {
        type: "object",
        properties: {
          nome:                  { type: "string", description: "Nome do lead ou 'Lead' se não informado." },
          resumo:                { type: "string", description: "Resumo: segmento, volume, investimento, contexto. Máx 250 chars." },
          segmento:              { type: "string", description: "Segmento da marca se informado." },
          estagio_marca:         { type: "string", description: "Estágio da marca se informado." },
          volume_estimado:       { type: "number", description: "Quantidade de peças estimada." },
          investimento_previsto: { type: "number", description: "Investimento previsto em reais." },
          dor_principal:         { type: "string", description: "Principal dor relatada." },
        },
        required: ["nome", "resumo"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "reeducar_fit",
      description: "Use quando o lead mencionou 'preço' como prioridade mas ainda NÃO passou por reeducação e pode ter fit real. Você reposiciona a R2PB, explica o valor agregado e dá uma segunda chance de enquadramento. A conversa CONTINUA — não é um encerramento. Escreva a mensagem de reeducação em 'mensagem_reeducacao'.",
      parameters: {
        type: "object",
        properties: {
          nome:                  { type: "string", description: "Nome do lead ou 'Lead' se não informado." },
          mensagem_reeducacao:   { type: "string", description: "A mensagem educativa/de reposicionamento que você vai enviar ao lead. Deve explicar o perfil da R2PB (valor agregado, qualidade, posicionamento) e perguntar se o lead busca apenas o menor preço ou também valoriza qualidade e construção de marca. Máx 250 chars, 2 frases." },
          razao_reeducacao:      { type: "string", description: "Por que você está reeducando: ex. 'lead mencionou preço sem contexto, ainda sem repertório para diferenciar valor de custo'." },
          contexto_parcial:      { type: "string", description: "O que já foi captado sobre o lead até agora: segmento, estágio, dor, etc." },
        },
        required: ["nome", "mensagem_reeducacao", "razao_reeducacao"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "nutricao",
      description: "Lead com potencial futuro mas sem fit agora: marca muito inicial, sem clareza de produto, ainda aprendendo o mercado. Não vai para Jackson agora — vai para base de nutrição/relacionamento. Use quando o lead tem intenção genuína mas ainda não tem condições de produzir.",
      parameters: {
        type: "object",
        properties: {
          nome:                  { type: "string", description: "Nome do lead ou 'Lead' se não informado." },
          resumo:                { type: "string", description: "Resumo do contexto: estágio, intenção, por que é nutrição e não fit agora. Máx 250 chars." },
          motivo_nutricao:       { type: "string", description: "Por que é nutrição: ex. 'marca em fase inicial, ainda sem produto definido, potencial futuro mas sem condições agora'." },
          segmento:              { type: "string", description: "Segmento informado pelo lead." },
          estagio_marca:         { type: "string", description: "Estágio da marca." },
          potencial_futuro:      { type: "string", description: "O que indica potencial futuro neste lead." },
        },
        required: ["nome", "resumo", "motivo_nutricao"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "baixo_fit",
      description: "Acione quando lead estiver claramente desalinhado: insiste em menor preço MESMO APÓS reeducação, segmento muito fora do foco, ou proposta incompatível com produção premium. ATENÇÃO: só use se o lead já passou por reeducação ou afirmou explicitamente que só quer o preço mais baixo.",
      parameters: {
        type: "object",
        properties: {
          nome:             { type: "string", description: "Nome do lead ou 'Lead' se não informado." },
          motivo_baixo_fit: { type: "string", description: "Por que não é fit: ex. 'insiste em menor preço após reeducação', 'volume muito abaixo do mínimo', 'segmento fora do foco'." },
          segmento:         { type: "string", description: "Segmento informado pelo lead." },
          prioridade:       { type: "string", description: "O que o lead prioriza (ex: preço, velocidade)." },
          passou_por_reeducacao: { type: "boolean", description: "Se o lead já passou pela etapa de reeducação antes de ser classificado como baixo_fit." },
        },
        required: ["nome", "motivo_baixo_fit"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "encaminhar_suporte",
      description: "Acione quando o contato for suporte, reclamação ou problema com pedido em andamento. Transfere para humano imediatamente.",
      parameters: {
        type: "object",
        properties: {
          nome:   { type: "string", description: "Nome do contato ou 'Cliente' se não informado." },
          motivo: { type: "string", description: "Motivo do suporte/reclamação em uma frase." },
        },
        required: ["nome", "motivo"],
      },
    },
  },
];

// ── Gera resposta correta para fit_basico sem prometer contato da equipe ──────
// Adapta a mensagem ao contexto real: volume muito baixo → desqualificação elegante
// Volume/investimento borderline → registro silencioso sem promessa

function gerarRespostaFitBasico(clf: JoanaClassification): string {
  const vol  = clf.volume_estimado  ?? null;
  const inv  = clf.investimento_previsto ?? null;

  // Volume claramente abaixo do mínimo (< 30 peças) ou investimento < R$1.000
  if ((vol !== null && vol < 30) || (inv !== null && inv < 1000)) {
    if (vol !== null && vol < 30) {
      return `Entendi! Hoje a R2PB trabalha com produções a partir de volumes maiores — esse volume inicial de ${vol} peça${vol === 1 ? "" : "s"} ainda fica fora da nossa régua mínima. Se o projeto crescer, é só me chamar! 😊`;
    }
    return `Entendido! Nosso modelo de produção tem uma estrutura mínima de investimento acima disso por ora. Quando o projeto escalar, pode voltar a conversar com a gente. 😊`;
  }

  // Abaixo do mínimo PRO mas em zona básica razoável (30–71 peças ou R$1k–R$3k)
  return `Entendido! Esse perfil entra na faixa básica da nossa operação — nosso time pode avaliar quando você estiver pronto para avançar. Enquanto isso, é só me chamar se surgir alguma dúvida!`;
}

type ChatMessage = { role: "user" | "assistant"; content: string };
const conversationHistory = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 20;

export interface JoanaClassification {
  nome: string;
  resumo?: string;
  motivo?: string;
  motivo_baixo_fit?: string;
  mensagem_reeducacao?: string;
  razao_reeducacao?: string;
  contexto_parcial?: string;
  motivo_nutricao?: string;
  potencial_futuro?: string;
  volume_estimado?: number;
  investimento_previsto?: number;
  tipo_produto?: string;
  segmento?: string;
  publico_alvo?: string;
  estagio_marca?: string;
  prioridade?: string;
  tem_marca_ativa?: boolean;
  ja_vende?: boolean;
  dor_principal?: string;
  expectativa_parceria?: string;
  passou_por_reeducacao?: boolean;
}

export type JoanaAction = "fit_premium_pro" | "fit_basico" | "reeducar_fit" | "nutricao" | "baixo_fit" | "encaminhar_suporte";

export interface JoanaResult {
  ok: boolean;
  reply: string | null;
  action?: JoanaAction;
  classification?: JoanaClassification;
  error?: string;
}

export async function chamarJoanaDireto(params: {
  phone: string;
  message: string;
  leadName?: string;
  tenantId: string;
  qualificationContext?: string | null;
}): Promise<JoanaResult> {
  try {
    const history = conversationHistory.get(params.phone) ?? [];

    const isFirstMessage = history.length === 0;
    if (isFirstMessage && params.qualificationContext) {
      history.push({
        role: "assistant",
        content: `[Contexto anterior recuperado: ${params.qualificationContext}]`,
      });
    }

    history.push({ role: "user", content: params.message });
    if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);

    const systemContent = JOANA_SYSTEM_PROMPT +
      (params.qualificationContext && isFirstMessage
        ? `\n\n--- CONTEXTO DESTE LEAD (salvo de conversa anterior) ---\n${params.qualificationContext}\nNão repita perguntas já respondidas. Se o fit já foi classificado como premium_pro e o lead volta, encaminhe diretamente.`
        : "");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1024,
      messages: [{ role: "system", content: systemContent }, ...history],
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];

    if (choice?.finish_reason === "tool_calls") {
      const toolCall = choice.message.tool_calls?.[0];
      const fnName = toolCall?.function.name as JoanaAction;

      let classification: JoanaClassification = { nome: params.leadName ?? "Lead" };
      try { classification = JSON.parse(toolCall?.function.arguments ?? "{}"); } catch { /* usa default */ }

      if (!classification.nome || ["Lead", "Cliente"].includes(classification.nome)) {
        classification.nome = params.leadName ?? classification.nome ?? "Lead";
      }

      // Para reeducar_fit, a mensagem é escrita pela própria IA no campo mensagem_reeducacao
      const confirmMsg =
        fnName === "fit_premium_pro"
          ? "Perfeito! Registrei seu contato e o Jackson vai dar continuidade com você em breve pelo WhatsApp."
          : fnName === "fit_basico"
          ? (gerarRespostaFitBasico(classification))
          : fnName === "reeducar_fit"
          ? (classification.mensagem_reeducacao ?? "A R2PB é especializada em produção com valor agregado — qualidade, construção de produto e posicionamento de marca. Você busca só o menor preço, ou também valoriza qualidade e como o produto vai ser percebido pelo seu cliente?")
          : fnName === "nutricao"
          ? "Entendido! Parece que o projeto ainda está se formando, o que é muito normal. Vou guardar seu contato e quando avançar mais, é só me chamar!"
          : fnName === "baixo_fit"
          ? "Entendido! A R2PB é uma operação especializada em produção premium — pode ser que nosso perfil não seja o match ideal pra essa demanda agora. Se o projeto evoluir e quiser conversar de novo, fico à disposição!"
          : "Entendido! Vou acionar nosso time agora e alguém vai falar com você em breve.";

      history.push({ role: "assistant", content: confirmMsg });
      conversationHistory.set(params.phone, history);

      logger.info({ phone: params.phone, tenantId: params.tenantId, action: fnName, classification, replyPreview: confirmMsg.slice(0, 120) }, "[Joana] classificação final acionada");

      return { ok: true, reply: confirmMsg, action: fnName, classification };
    }

    const reply = choice?.message?.content?.trim() ?? null;
    if (reply) {
      history.push({ role: "assistant", content: reply });
      conversationHistory.set(params.phone, history);
    }

    logger.info({ phone: params.phone, tenantId: params.tenantId, replyLength: reply?.length ?? 0, replyPreview: reply?.slice(0, 120) }, "[Joana] resposta OpenAI gerada");
    return { ok: true, reply };
  } catch (err: any) {
    logger.error({ error: err?.message, phone: params.phone }, "[Joana] erro ao chamar OpenAI");
    return { ok: false, reply: null, error: err?.message };
  }
}

export function clearJoanaHistory(phone: string): void {
  conversationHistory.delete(phone);
  logger.info({ phone }, "[Joana] histórico limpo");
}

export function getJoanaHistory(phone: string): ChatMessage[] {
  return conversationHistory.get(phone) ?? [];
}
