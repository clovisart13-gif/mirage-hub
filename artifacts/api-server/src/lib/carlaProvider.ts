/**
 * CARLA — Roteador / Triagem de Intenção
 *
 * Camada 1 da arquitetura multiagente. Classifica a intenção de entrada
 * do lead e escolhe qual agente especialista deve assumir a conversa.
 *
 * Fluxo:
 * 1. Mensagem chega → CARLA verifica keywords por peso
 * 2. Se clara intenção → roteia diretamente para o especialista
 * 3. Se mensagem genérica (oi, olá, bom dia…) → CARLA envia saudação própria
 *    e aguarda a próxima mensagem para rotear com mais contexto
 *
 * Intenções suportadas:
 * - fornecedor_parceiro → MARCOS
 * - comercial_cliente   → JOANA
 * - suporte_sac         → LIA
 * - financeiro          → ADMIN
 * - rh_curriculo        → ADMIN
 * - outros              → JOANA (fallback padrão)
 */

import { logger } from "./logger";

export type Intent =
  | "comercial_cliente"
  | "fornecedor_parceiro"
  | "suporte_sac"
  | "financeiro"
  | "rh_curriculo"
  | "outros";

export type AgentKey = "joana" | "marcos" | "lia" | "admin";

export interface RoutingDecision {
  intent: Intent;
  agent_key: AgentKey;
  reason: string;
  confidence: "high" | "low";
}

// ── Mensagem de saudação da CARLA (para mensagens genéricas) ─────────────────

export const CARLA_GREETING_MSG =
  `Oi! 😊 Sou a CARLA, assistente da R2PB.\n\n` +
  `Me conta: você é uma *marca* querendo produzir peças, ` +
  `um *parceiro produtivo* (oficina, facção, bordado…), ` +
  `está *buscando uma vaga* na R2PB, ` +
  `ou tem alguma dúvida sobre pedido/pagamento? ` +
  `Assim te direciono certinho!`;

// ── Padrão para detectar saudações genéricas sem intenção clara ──────────────

const GENERIC_GREETING_RE = /^[\s\p{P}]*(oi+|ol[aá]|e+[aeiou]*|bom dia|boa tarde|boa noite|hey|ola+|hi|hello|tudo bem|tudo bom|bom|bl[z]+|bom dia pra voc[eê]|boa|ae|eai|e ai|opa|salve)[\s\p{P}!?]*$/iu;

export function ehSaudacaoGenerica(message: string): boolean {
  const trimmed = message.trim();
  return GENERIC_GREETING_RE.test(trimmed) || trimmed.length <= 4;
}

// ── Regras de detecção por keyword ───────────────────────────────────────────

const INTENT_RULES: { intent: Intent; keywords: string[]; weight: number }[] = [
  {
    intent: "fornecedor_parceiro",
    weight: 10,
    keywords: [
      "oficina", "faccao", "facção", "costureira", "costureiro", "costurando",
      "atelie", "atelier", "ateliê", "bordado", "bordadora", "bordadeira", "bordadeiro",
      "estamparia", "estampa", "estampando", "acabamento", "corte e costura",
      "modelista", "modelagem", "pilotista", "pilotagem",
      "confeccionista", "confeccao parceira", "confecção parceira",
      "fornecedor", "fornecedora", "parceiro produtivo", "parceria produtiva",
      "mao de obra", "mão de obra", "terceirizar", "terceirizado", "terceirização",
      "subcontrato", "subcontratado", "producao terceirizada", "produção terceirizada",
      "presto servico", "presto serviço", "faco roupas", "faço roupas",
      "sou costureira", "sou costureiro", "tenho oficina", "tenho atelier",
      "tenho atelie", "tenho faccao", "tenho facção",
      "trabalho com costura", "trabalho com bordado", "trabalho com estampa",
      "quero me cadastrar", "quero cadastrar minha", "quero ser parceiro",
      "quero ser fornecedor", "como me cadastro", "como faço para fornece",
      "posso ser fornecedor", "posso ser parceiro", "ofereço servico",
      "ofereço serviço", "ofereço producao", "ofereço produção",
      "produzir para voces", "produzir para vocês",
    ],
  },
  {
    intent: "rh_curriculo",
    weight: 10,
    keywords: [
      "curriculo", "currículo", "vaga", "vagas", "emprego", "trabalhar na r2pb",
      "trabalhar com voces", "trabalhar com vocês", "oportunidade de emprego",
      "oportunidade de trabalho", "processo seletivo", "selecao", "seleção",
      "quero trabalhar", "quero uma vaga", "busco emprego", "busco vaga",
      "estou procurando emprego", "procurando emprego", "procurando vaga",
      "tenho experiencia", "tenho experiência", "sou candidato", "candidatura",
      "estagio", "estágio", "trainee", "aprendiz", "jovem aprendiz",
      "enviar curriculo", "enviar currículo", "mandar curriculo", "mandar currículo",
      "rh", "recursos humanos", "contratacao", "contratação",
      "quero trabalhar na empresa", "trabalho na area", "trabalho na área",
      "tenho interesse em trabalhar",
    ],
  },
  {
    intent: "suporte_sac",
    weight: 10,
    keywords: [
      "problema", "reclamacao", "reclamação", "defeito", "defeituoso",
      "errado", "incorreto", "veio errado", "faltando", "falta",
      "nao recebi", "não recebi", "atraso", "atrasado",
      "rastrear", "rastreio", "rastreamento", "codigo de rastreio",
      "cancelar", "cancelamento", "devolver", "devolucao", "devolução",
      "reembolso", "troca", "trocar", "pedido errado", "sumiu",
      "nao chegou", "não chegou", "entrega atrasada", "prazo estourado",
      "produto com defeito", "produto errado", "faltou peca", "faltou peça",
      "nao funcionou", "não funcionou", "nao esta funcionando",
      "suporte", "sac", "ajuda com pedido", "quero reclamar",
      "quero cancelar", "quero devolver", "quero trocar",
    ],
  },
  {
    intent: "financeiro",
    weight: 10,
    keywords: [
      "boleto", "pagamento", "pagar", "cobranca", "cobrança",
      "nota fiscal", "nf-e", "nfe", "fatura", "vencimento",
      "venceu", "vencido", "pix", "debito", "débito", "credito", "crédito",
      "taxa", "cobraram", "cobrado", "estorno", "extrato",
      "reembolso financeiro", "pagamento pendente", "conta em aberto",
      "nao paguei", "não paguei", "nao consegui pagar", "não consegui pagar",
      "segunda via", "segunda via do boleto", "boleto vencido",
      "mensalidade", "assinatura atrasada", "plano", "renovacao", "renovação",
      "cancelar assinatura", "cancelar plano", "cancelar mensalidade",
      "preciso do boleto", "preciso do comprovante",
    ],
  },
  {
    intent: "comercial_cliente",
    weight: 8,
    keywords: [
      "marca propria", "marca própria", "minha marca", "criar marca",
      "lancar marca", "lançar marca", "criar minha marca",
      "colecao", "coleção", "private label", "linha de roupas", "linha de roupa",
      "quero produzir", "preciso produzir", "fabricar", "desenvolver produto",
      "fazer roupas", "fazer peca", "fazer peça", "fazer pecas", "fazer peças",
      "produzir roupas", "produzir pecas", "produzir peças",
      "streetwear", "moda urbana", "moda fitness", "fitness wear", "athleisure",
      "confeccao personalizada", "confecção personalizada",
      "pecas personalizadas", "peças personalizadas",
      "uniforme", "uniformes", "bordado personalizado",
      "orcamento", "orçamento", "preciso de um fornecedor", "preciso de fornecedor",
      "produzir para vender", "vender roupas", "vender minhas pecas",
      "quero vender", "abrir marca", "abrir minha marca",
      "quanto custa produzir", "quanto custa fazer",
      "qual o preco", "qual o preço", "como funciona a producao",
    ],
  },
];

const AGENT_MAP: Record<Intent, AgentKey> = {
  comercial_cliente:   "joana",
  fornecedor_parceiro: "marcos",
  suporte_sac:         "lia",
  financeiro:          "admin",
  rh_curriculo:        "admin",
  outros:              "joana",
};

// ── Normaliza texto para comparação ──────────────────────────────────────────

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");
}

// ── Função principal de roteamento ────────────────────────────────────────────

export function detectarIntencao(message: string): RoutingDecision {
  const norm = normalize(message);
  const scores = new Map<Intent, number>();

  for (const rule of INTENT_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (norm.includes(normalize(kw))) {
        score += rule.weight;
      }
    }
    if (score > 0) {
      scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + score);
    }
  }

  if (scores.size === 0) {
    return {
      intent: "outros",
      agent_key: "joana",
      reason: "nenhuma intenção específica detectada — fallback Joana",
      confidence: "low",
    };
  }

  const [topIntent, topScore] = Array.from(scores.entries())
    .sort(([, a], [, b]) => b - a)[0];

  const agent_key = AGENT_MAP[topIntent];

  logger.debug(
    { message: message.slice(0, 80), scores: Object.fromEntries(scores), topIntent, topScore, agent_key },
    "[CARLA] routing decision"
  );

  return {
    intent: topIntent,
    agent_key,
    reason: `keyword match — intent="${topIntent}" score=${topScore}`,
    confidence: topScore >= 10 ? "high" : "low",
  };
}
