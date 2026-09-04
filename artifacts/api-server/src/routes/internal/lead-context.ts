import { Router } from "express";
import type { Request, Response } from "express";
import { eq, and, or } from "drizzle-orm";
import { db, comercialLeads, leadsEspelho } from "@workspace/db";
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

// ── Normalização de telefone ──────────────────────────────────────────────────
// Gera variações para comparação resiliente: com DDI 55, sem DDI, com/sem 9 extra.
function phoneVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const variants = new Set<string>([digits]);

  // remove DDI 55 se presente
  if (digits.startsWith("55") && digits.length >= 12) {
    variants.add(digits.slice(2));
  }
  // adiciona DDI 55 se ausente
  if (!digits.startsWith("55") && digits.length <= 11) {
    variants.add("55" + digits);
  }
  // adiciona 9 extra (celular SP/RJ pós-2012)
  const withoutDDI = digits.startsWith("55") ? digits.slice(2) : digits;
  if (withoutDDI.length === 10) {
    const with9 = withoutDDI.slice(0, 2) + "9" + withoutDDI.slice(2);
    variants.add(with9);
    variants.add("55" + with9);
  }
  // remove 9 extra
  if (withoutDDI.length === 11 && withoutDDI[2] === "9") {
    const without9 = withoutDDI.slice(0, 2) + withoutDDI.slice(3);
    variants.add(without9);
    variants.add("55" + without9);
  }
  return Array.from(variants);
}

// ── Classificação operacional ─────────────────────────────────────────────────
type StatusClassification =
  | "human_active"
  | "awaiting_human"
  | "dormant"
  | "abandoned_before_human"
  | "reactivated"
  | "unknown";

type RecommendedRoute = "hold_human" | "sales" | "support" | "reactivation" | "manual_review";

interface Classification {
  status_classification: StatusClassification;
  should_trigger_rescue: boolean;
  should_trigger_nurture: boolean;
  should_route_to_attendant: boolean;
  recommended_route: RecommendedRoute;
  summary: string;
}

function classify(
  cl: typeof comercialLeads.$inferSelect | null,
  espelho: typeof leadsEspelho.$inferSelect | null
): Classification {
  const now = Date.now();
  const DORMANT_THRESHOLD_MS = 72 * 60 * 60 * 1000; // 72h sem interação = dormente

  // Humano ativo — atendimento aberto em comercial_leads
  if (cl && cl.status === "aberto") {
    const hoursSinceHandoff = cl.lastHandoffAt
      ? (now - new Date(cl.lastHandoffAt).getTime()) / 3_600_000
      : 0;
    return {
      status_classification: "human_active",
      should_trigger_rescue: false,
      should_trigger_nurture: false,
      should_route_to_attendant: true,
      recommended_route: "hold_human",
      summary: `Lead em atendimento humano ativo${cl.responsavelNome ? ` com ${cl.responsavelNome}` : ""}${hoursSinceHandoff > 0 ? ` (handoff há ${Math.round(hoursSinceHandoff)}h)` : ""}. Nenhuma automação deve ser disparada.`,
    };
  }

  // Reativado — estava fechado (humano concluiu), elegível para automação
  if (cl && cl.status === "fechado") {
    const msSinceClosed = cl.closedAt ? now - new Date(cl.closedAt).getTime() : 0;
    const dormant = msSinceClosed > DORMANT_THRESHOLD_MS;
    return {
      status_classification: dormant ? "dormant" : "reactivated",
      should_trigger_rescue: false,
      should_trigger_nurture: true,
      should_route_to_attendant: false,
      recommended_route: dormant ? "reactivation" : "sales",
      summary: dormant
        ? `Lead dormente. Atendimento humano encerrado há ${Math.round(msSinceClosed / 3_600_000)}h. Elegível para nurture de reativação.`
        : `Lead reativado. Atendimento humano recentemente encerrado. Elegível para nurture comercial.`,
    };
  }

  // Sem registro em comercial_leads — verificar espelho (funil de agendamento)
  if (espelho) {
    if (!espelho.agendou) {
      // Recebeu link mas nunca agendou → candidato a rescue
      return {
        status_classification: "abandoned_before_human",
        should_trigger_rescue: true,
        should_trigger_nurture: false,
        should_route_to_attendant: false,
        recommended_route: "reactivation",
        summary: `Lead ${espelho.nome} recebeu link de agendamento mas não agendou. Candidato ao fluxo de rescue.`,
      };
    }
    // Agendou mas nunca chegou ao pipeline humano
    return {
      status_classification: "dormant",
      should_trigger_rescue: false,
      should_trigger_nurture: true,
      should_route_to_attendant: false,
      recommended_route: "sales",
      summary: `Lead ${espelho.nome} agendou reunião mas não avançou para o pipeline comercial. Candidato a nurture.`,
    };
  }

  // Lead completamente desconhecido
  return {
    status_classification: "unknown",
    should_trigger_rescue: false,
    should_trigger_nurture: false,
    should_route_to_attendant: false,
    recommended_route: "manual_review",
    summary: "Lead não encontrado nas fontes internas disponíveis. Revisão manual recomendada.",
  };
}

// ── GET /api/internal/lead-context ────────────────────────────────────────────
//
// Consulta consolidada do estado de um lead por telefone.
// Usado pelo n8n (MIRAGE_ZAPI_POSTFUNNEL_ROUTER) para decidir:
//   - manter silêncio por humano ativo
//   - rotear atendimento
//   - disparar rescue
//   - disparar nurture
//
// Query: company_slug=r2pb&phone=+5511999999999
// Header: x-internal-key: <MARKETING_INTERNAL_API_KEY>

router.get(
  "/internal/lead-context",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, phone } = req.query as Record<string, string>;

    if (!phone) {
      res.status(400).json({ error: "Parâmetro 'phone' é obrigatório" });
      return;
    }
    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe 'company_slug' ou 'tenant_id'" });
      return;
    }

    try {
      // Resolve tenant
      let resolvedTenantId: string | null = tenant_id ?? null;
      const resolvedSlug = company_slug ?? null;
      if (!resolvedTenantId && resolvedSlug) {
        resolvedTenantId = await resolveSlug(resolvedSlug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado: ${resolvedSlug}` });
          return;
        }
      }

      const variants = phoneVariants(phone);

      // Busca paralela nas duas fontes
      const [clRows, espelhoRows] = await Promise.all([
        // comercial_leads: busca por qualquer variação do telefone
        db.select().from(comercialLeads).where(
          and(
            eq(comercialLeads.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(comercialLeads.phone, v)))
          )
        ).limit(1),

        // leads_espelho: busca pelo campo whatsapp
        db.select().from(leadsEspelho).where(
          and(
            eq(leadsEspelho.tenantId, resolvedTenantId!),
            or(...variants.map(v => eq(leadsEspelho.whatsapp, v)))
          )
        ).limit(1),
      ]);

      const cl = clRows[0] ?? null;
      const espelho = espelhoRows[0] ?? null;
      const found = cl !== null || espelho !== null;

      const classification = classify(cl, espelho);

      const response = {
        found,
        company_slug: resolvedSlug,
        phone,
        lead: {
          // Identificação — melhor fonte disponível
          id:    cl?.id ?? null,
          name:  cl?.leadName ?? espelho?.nome ?? null,
          email: cl?.email ?? espelho?.email ?? null,
          origin: cl?.canal ?? (espelho ? "meta_oficial" : "desconhecida"),

          // Pipeline
          current_pipeline:  cl?.pipelineKey ?? null,
          current_stage:     cl?.stageKey ?? null,

          // Temporalidade
          last_message_at:           cl?.updatedAt?.toISOString() ?? espelho?.updatedAt?.toISOString() ?? null,
          last_human_interaction_at: cl?.lastHandoffAt?.toISOString() ?? null,

          // Atendente
          assigned_attendant: {
            id:    cl?.responsavelId ?? null,
            name:  cl?.responsavelNome ?? null,
            email: null,
          },

          // Estado humano
          human_active: cl?.status === "aberto",

          // Classificação operacional
          ...classification,
        },
      };

      logger.info(
        {
          tenantId: resolvedTenantId,
          phone,
          found,
          classification: classification.status_classification,
          recommended_route: classification.recommended_route,
        },
        "internal/lead-context: consulta"
      );

      res.json(response);
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/lead-context: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

export default router;
