/**
 * CARLA — Roteador / Triagem de Intenção
 *
 * Camada 1 da arquitetura multiagente. Classifica a intenção de entrada
 * do lead e escolhe qual agente especialista deve assumir a conversa.
 *
 * Prioridade de detecção:
 * 1. Keywords por peso (rápido, sem custo de API)
 * 2. Fallback: `outros` quando nenhuma intenção dominante é detectada
 *
 * Intenções suportadas:
 * - fornecedor_parceiro → MARCOS
 * - comercial_cliente   → JOANA
 * - suporte_sac         → LIA
 * - financeiro          → CAIO
 * - outros              → JOANA (fallback padrão)
 */

import { logger } from "./logger";

export type Intent =
  | "comercial_cliente"
  | "fornecedor_parceiro"
  | "suporte_sac"
  | "financeiro"
  | "outros";

export type AgentKey = "joana" | "marcos" | "lia" | "caio";

export interface RoutingDecision {
  intent: Intent;
  agent_key: AgentKey;
  reason: string;
  confidence: "high" | "low";
}

// ── Regras de detecção por keyword ───────────────────────────────────────────

const INTENT_RULES: { intent: Intent; keywords: string[]; weight: number }[] = [
  {
    intent: "fornecedor_parceiro",
    weight: 10,
    keywords: [
      "oficina", "facção", "faccao", "costureira", "costureiro", "ateliê", "ateliere", "atelier",
      "bordado", "bordadora", "estamparia", "estampa", "acabamento", "corte e costura",
      "fornecedor", "fornecedora", "parceiro produtivo", "mão de obra", "terceirizar",
      "subcontrato", "confeccionista", "confecção parceira", "produção terceirizada",
      "presto serviço", "presto servico", "faço roupas", "faco roupas",
      "sou costureira", "tenho oficina", "tenho atelier",
    ],
  },
  {
    intent: "suporte_sac",
    weight: 10,
    keywords: [
      "problema", "reclamação", "reclamacao", "defeito", "defeituoso", "errado", "incorreto",
      "veio errado", "faltando", "falta", "não recebi", "nao recebi", "atraso", "atrasado",
      "entrega", "rastrear", "rastreio", "cancelar", "cancelamento", "devolver",
      "devolução", "reembolso", "troca", "pedido errado", "sumiu", "não chegou", "nao chegou",
    ],
  },
  {
    intent: "financeiro",
    weight: 10,
    keywords: [
      "boleto", "pagamento", "pagar", "cobrança", "cobranca", "nota fiscal", "nf-e", "nfe",
      "fatura", "vencimento", "venceu", "vencido", "pix", "débito", "debito", "crédito", "credito",
      "taxa", "cobraram", "cobrado", "estorno", "reembolso financeiro", "extrato",
    ],
  },
  {
    intent: "comercial_cliente",
    weight: 8,
    keywords: [
      "marca própria", "marca propria", "minha marca", "criar marca", "lançar marca", "lancar marca",
      "coleção", "colecao", "private label", "linha de roupas", "linha de roupa",
      "quero produzir", "preciso produzir", "fabricar", "desenvolver produto",
      "streetwear", "confecção personalizada", "peças personalizadas",
      "orçamento", "orcamento", "preciso de um fornecedor", "preciso de fornecedor",
      "produzir para vender", "vender roupas",
    ],
  },
];

const AGENT_MAP: Record<Intent, AgentKey> = {
  comercial_cliente: "joana",
  fornecedor_parceiro: "marcos",
  suporte_sac: "lia",
  financeiro: "caio",
  outros: "joana",
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
    const matched: string[] = [];
    for (const kw of rule.keywords) {
      if (norm.includes(normalize(kw))) {
        score += rule.weight;
        matched.push(kw);
      }
    }
    if (score > 0) {
      scores.set(rule.intent, (scores.get(rule.intent) ?? 0) + score);
    }
  }

  if (scores.size === 0) {
    return {
      intent: "comercial_cliente",
      agent_key: "joana",
      reason: "nenhuma intenção específica detectada — roteando para JOANA (padrão comercial)",
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
