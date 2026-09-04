import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { db, comercialLeads } from "@workspace/db";
import { supabaseAdmin } from "../../lib/supabase";
import { logger } from "../../lib/logger";

const router = Router();

// ── Slug → tenantId cache ────────────────────────────────────────────────────
const slugToIdCache = new Map<string, { id: string; ts: number }>();

async function resolveSlugToTenantId(slug: string): Promise<string | null> {
  const cached = slugToIdCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  if (!data?.id) return null;
  slugToIdCache.set(slug, { id: data.id, ts: Date.now() });
  return data.id;
}

// ── Middleware: chave interna ─────────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) { res.status(503).json({ error: "Internal API key not configured" }); return; }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) { res.status(401).json({ error: "Unauthorized — invalid x-internal-key" }); return; }
  next();
}

// ── Schema de validação do payload ───────────────────────────────────────────
const handoffSchema = z.object({
  company_slug:     z.string().optional(),
  tenant_id:        z.string().optional(),
  lead_name:        z.string().max(255).optional(),
  phone:            z.string().min(8).max(50),
  email:            z.string().email().optional().nullable(),
  canal:            z.string().max(50).optional(),
  origem:           z.string().max(100).optional(),
  mensagem_recebida: z.string().optional().nullable(),
  handoff_reason:   z.string().max(100).optional(),
  pipeline_key:     z.string().max(100).optional(),
  stage_key:        z.string().max(100).optional(),
  responsavel_id:   z.string().max(100).optional().nullable(),
  responsavel_nome: z.string().max(255).optional().nullable(),
}).refine((d) => d.company_slug || d.tenant_id, {
  message: "Informe company_slug ou tenant_id",
});

// ── POST /api/internal/automation/lead-handoff ────────────────────────────────
//
// Uso pelo n8n:
//   POST /api/internal/automation/lead-handoff
//   Headers: x-internal-key: <MARKETING_INTERNAL_API_KEY>
//   Body: { company_slug, phone, lead_name, canal, origem, mensagem_recebida,
//            handoff_reason, pipeline_key, stage_key }
//
// Upsert por (tenant_id, phone). Retorna:
//   { success, tenantId, leadId, pipeline_key, stage_key, action: 'created'|'updated' }

router.post(
  "/internal/automation/lead-handoff",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const parsed = handoffSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const {
      company_slug, tenant_id, lead_name, phone, email,
      canal, origem, mensagem_recebida, handoff_reason,
      pipeline_key, stage_key, responsavel_id, responsavel_nome,
    } = parsed.data;

    try {
      // Resolve tenant
      let resolvedTenantId: string | null = tenant_id ?? null;
      if (!resolvedTenantId && company_slug) {
        resolvedTenantId = await resolveSlugToTenantId(company_slug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado: ${company_slug}` });
          return;
        }
      }

      const now = new Date();

      // Verifica se lead já existe (por phone + tenant)
      const existing = await db
        .select({ id: comercialLeads.id })
        .from(comercialLeads)
        .where(
          and(
            eq(comercialLeads.tenantId, resolvedTenantId!),
            eq(comercialLeads.phone, phone)
          )
        )
        .limit(1);

      let leadId: string;
      let action: "created" | "updated";

      if (existing.length > 0) {
        // Atualiza lead existente — todo novo handoff REABRE o atendimento
        // (mesmo que estivesse "fechado" de uma conversa anterior), pois um
        // novo evento de handoff significa que o humano está envolvido de novo.
        leadId = existing[0].id;
        action = "updated";
        await db
          .update(comercialLeads)
          .set({
            ...(lead_name && { leadName: lead_name }),
            ...(email !== undefined && { email }),
            ...(canal && { canal }),
            ...(origem && { origem }),
            ...(mensagem_recebida !== undefined && { mensagemRecebida: mensagem_recebida }),
            ...(handoff_reason && { handoffReason: handoff_reason }),
            ...(pipeline_key && { pipelineKey: pipeline_key }),
            ...(stage_key && { stageKey: stage_key }),
            ...(responsavel_id !== undefined && { responsavelId: responsavel_id }),
            ...(responsavel_nome !== undefined && { responsavelNome: responsavel_nome }),
            status: "aberto",
            closedAt: null,
            closedBy: null,
            lastHandoffAt: now,
            updatedAt: now,
          })
          .where(eq(comercialLeads.id, leadId));
      } else {
        // Cria novo lead
        action = "created";
        const [created] = await db
          .insert(comercialLeads)
          .values({
            tenantId: resolvedTenantId!,
            leadName: lead_name,
            phone,
            email: email ?? null,
            canal,
            origem,
            mensagemRecebida: mensagem_recebida ?? null,
            handoffReason: handoff_reason,
            pipelineKey: pipeline_key,
            stageKey: stage_key,
            responsavelId: responsavel_id ?? null,
            responsavelNome: responsavel_nome ?? null,
            status: "aberto",
            lastHandoffAt: now,
          })
          .returning({ id: comercialLeads.id });
        leadId = created.id;
      }

      logger.info(
        { tenantId: resolvedTenantId, leadId, phone, pipeline_key, stage_key, action },
        "internal/automation/lead-handoff: handoff registrado"
      );

      res.status(action === "created" ? 201 : 200).json({
        success: true,
        tenantId: resolvedTenantId,
        leadId,
        pipeline_key: pipeline_key ?? null,
        stage_key: stage_key ?? null,
        action,
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/automation/lead-handoff: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

// ── POST /api/internal/automation/lead-handoff-close ─────────────────────────
//
// Chamado quando o humano CONCLUI o atendimento (ex.: card movido para etapa
// final no Helena, ou atendente marca a conversa como resolvida). A partir
// desse momento o lead volta a ficar elegível para automação — até que um
// novo handoff (POST /lead-handoff) o reabra.
//
// Body: { company_slug|tenant_id, phone, closed_by? }

const closeSchema = z.object({
  company_slug: z.string().optional(),
  tenant_id:    z.string().optional(),
  phone:        z.string().min(8).max(50),
  closed_by:    z.string().max(100).optional(),
}).refine((d) => d.company_slug || d.tenant_id, {
  message: "Informe company_slug ou tenant_id",
});

router.post(
  "/internal/automation/lead-handoff-close",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const parsed = closeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { company_slug, tenant_id, phone, closed_by } = parsed.data;

    try {
      let resolvedTenantId: string | null = tenant_id ?? null;
      if (!resolvedTenantId && company_slug) {
        resolvedTenantId = await resolveSlugToTenantId(company_slug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado: ${company_slug}` });
          return;
        }
      }

      const now = new Date();
      const result = await db
        .update(comercialLeads)
        .set({ status: "fechado", closedAt: now, closedBy: closed_by ?? null, updatedAt: now })
        .where(and(eq(comercialLeads.tenantId, resolvedTenantId!), eq(comercialLeads.phone, phone)))
        .returning({ id: comercialLeads.id });

      if (result.length === 0) {
        res.status(404).json({ success: false, error: "Lead não encontrado para esse telefone" });
        return;
      }

      logger.info(
        { tenantId: resolvedTenantId, phone, closed_by },
        "internal/automation/lead-handoff-close: atendimento encerrado, lead elegível para automação"
      );
      res.json({ success: true, elegivel_automacao: true });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/automation/lead-handoff-close: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

// ── GET /api/internal/automation/lead-handoff-status ─────────────────────────
//
// Auditoria: busca o estado atual de um lead no pipeline comercial humano.
//
// Query params:
//   company_slug  — slug do tenant (ex: r2pb)   OU
//   tenant_id     — UUID direto do tenant
//   phone         — telefone do lead (obrigatório)
//
// Retorna:
//   { found: true,  tenant_id, lead: { id, leadName, phone, email, canal, origem,
//                                      pipelineKey, stageKey, handoffReason,
//                                      mensagemRecebida, responsavelId, responsavelNome,
//                                      lastHandoffAt, createdAt, updatedAt } }
//   { found: false, tenant_id }

router.get(
  "/internal/automation/lead-handoff-status",
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
      let resolvedTenantId: string | null = tenant_id ?? null;
      if (!resolvedTenantId && company_slug) {
        resolvedTenantId = await resolveSlugToTenantId(company_slug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado: ${company_slug}` });
          return;
        }
      }

      const rows = await db
        .select()
        .from(comercialLeads)
        .where(
          and(
            eq(comercialLeads.tenantId, resolvedTenantId!),
            eq(comercialLeads.phone, phone)
          )
        )
        .orderBy(desc(comercialLeads.updatedAt))
        .limit(1);

      if (rows.length === 0) {
        res.json({ found: false, tenant_id: resolvedTenantId });
        return;
      }

      const lead = rows[0];
      // elegivel_automacao=false enquanto status="aberto" (humano ainda atendendo).
      // É este campo que o n8n deve checar ANTES de qualquer disparo automático.
      const elegivelAutomacao = lead.status === "fechado";
      res.json({
        found: true,
        tenant_id: resolvedTenantId,
        elegivel_automacao: elegivelAutomacao,
        lead: {
          id:               lead.id,
          leadName:         lead.leadName,
          phone:            lead.phone,
          email:            lead.email,
          canal:            lead.canal,
          origem:           lead.origem,
          pipelineKey:      lead.pipelineKey,
          stageKey:         lead.stageKey,
          handoffReason:    lead.handoffReason,
          mensagemRecebida: lead.mensagemRecebida,
          responsavelId:    lead.responsavelId,
          responsavelNome:  lead.responsavelNome,
          status:           lead.status,
          closedAt:         lead.closedAt,
          closedBy:         lead.closedBy,
          lastHandoffAt:    lead.lastHandoffAt,
          createdAt:        lead.createdAt,
          updatedAt:        lead.updatedAt,
        },
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/automation/lead-handoff-status: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

export default router;
