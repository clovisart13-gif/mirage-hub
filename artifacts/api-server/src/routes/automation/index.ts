import { Router } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, salesAutomationConfig } from "@workspace/db";
import {
  requireAuth,
  requireTenantAccess,
  type AuthenticatedRequest,
} from "../../middlewares/auth";
import { logger } from "../../lib/logger";
import { supabaseAdmin } from "../../lib/supabase";

const router = Router();

// ── Resolve company_slug → tenantId (super admin bypass) ──────────────────────
const slugCache = new Map<string, { id: string; ts: number }>();
async function resolveCompanySlug(slug: string): Promise<string | null> {
  const cached = slugCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;
  const { data } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).single();
  if (!data?.id) return null;
  slugCache.set(slug, { id: data.id, ts: Date.now() });
  return data.id;
}

// ── Schemas de validação ───────────────────────────────────────────────────────

const estagioSchema = z.object({
  id:   z.string(),
  nome: z.string(),
  tipo: z.enum(["ganho", "perdido", "inicio", "outro"]),
});

const configSchema = z.object({
  crmProvider:       z.string().max(50).optional(),
  crmBaseUrl:        z.string().url().optional(),
  crmApiKey:         z.string().max(500).optional().nullable(),

  pipelineVendasId:     z.string().max(100).optional().nullable(),
  pipelineVendasNome:   z.string().max(255).optional().nullable(),
  pipelineNutricaoId:   z.string().max(100).optional().nullable(),
  pipelineNutricaoNome: z.string().max(255).optional().nullable(),
  pipelineStarterId:    z.string().max(100).optional().nullable(),
  pipelineStarterNome:  z.string().max(255).optional().nullable(),
  pipelinePosVendasId:    z.string().max(100).optional().nullable(),
  pipelinePosVendasNome:  z.string().max(255).optional().nullable(),

  estagios: z.array(estagioSchema).optional().nullable(),

  whatsappInstances: z.array(z.object({
    id:          z.string(),
    nome:        z.string().max(100),
    canal:       z.enum(["zapi", "oficial", "wts"]),
    baseUrl:     z.string().max(500).optional(),
    instanceId:  z.string().max(200).optional(),
    token:       z.string().max(200).optional(),
    clientToken: z.string().max(200).optional(),
    usos:        z.array(z.string()).optional(),
  })).optional().nullable(),

  msgConfirmacao:   z.string().optional().nullable(),
  msgLembrete:      z.string().optional().nullable(),
  msgReengajamento: z.string().optional().nullable(),
  msgResgate:       z.string().optional().nullable(),

  ativo: z.boolean().optional(),
});

// ── GET /api/automation/sales-config ──────────────────────────────────────────
router.get(
  "/automation/sales-config",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    let tenantId = req.tenantId!;
    // Super admin: se veio company_slug, resolve para o tenant correto
    const companySlug = req.query.company_slug as string | undefined;
    if (companySlug && req.user?.isSuperAdmin) {
      const resolved = await resolveCompanySlug(companySlug);
      if (!resolved) {
        res.status(404).json({ error: `Tenant não encontrado: ${companySlug}` });
        return;
      }
      tenantId = resolved;
    }
    try {
      const rows = await db
        .select()
        .from(salesAutomationConfig)
        .where(eq(salesAutomationConfig.tenantId, tenantId))
        .limit(1);

      if (rows.length === 0) {
        res.json({ config: null });
        return;
      }
      res.json({ config: rows[0] });
    } catch (err: any) {
      logger.error({ tenantId, error: err?.message }, "automation/sales-config GET: erro");
      res.status(500).json({ error: err?.message ?? "Erro desconhecido" });
    }
  }
);

// ── POST /api/automation/sales-config ─────────────────────────────────────────
router.post(
  "/automation/sales-config",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    const tenantId = req.tenantId!;

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    try {
      const existing = await db
        .select({ id: salesAutomationConfig.id })
        .from(salesAutomationConfig)
        .where(eq(salesAutomationConfig.tenantId, tenantId))
        .limit(1);

      if (existing.length > 0) {
        res.status(409).json({ error: "Configuração já existe para este tenant. Use PATCH para atualizar." });
        return;
      }

      const [created] = await db
        .insert(salesAutomationConfig)
        .values({ tenantId, ...data })
        .returning();

      logger.info({ tenantId }, "automation/sales-config POST: criado");
      res.status(201).json({ config: created });
    } catch (err: any) {
      logger.error({ tenantId, error: err?.message }, "automation/sales-config POST: erro");
      res.status(500).json({ error: err?.message ?? "Erro desconhecido" });
    }
  }
);

// ── PATCH /api/automation/sales-config ────────────────────────────────────────
router.patch(
  "/automation/sales-config",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    let tenantId = req.tenantId!;
    // Super admin: se veio company_slug, resolve para o tenant correto
    const companySlug = req.query.company_slug as string | undefined;
    if (companySlug && req.user?.isSuperAdmin) {
      const resolved = await resolveCompanySlug(companySlug);
      if (!resolved) {
        res.status(404).json({ error: `Tenant não encontrado: ${companySlug}` });
        return;
      }
      tenantId = resolved;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const data = parsed.data;

    try {
      const existing = await db
        .select({ id: salesAutomationConfig.id })
        .from(salesAutomationConfig)
        .where(eq(salesAutomationConfig.tenantId, tenantId))
        .limit(1);

      if (existing.length === 0) {
        // Upsert: se não existe, cria
        const [created] = await db
          .insert(salesAutomationConfig)
          .values({ tenantId, ...data })
          .returning();

        logger.info({ tenantId }, "automation/sales-config PATCH: criado via upsert");
        res.status(201).json({ config: created });
        return;
      }

      const [updated] = await db
        .update(salesAutomationConfig)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(salesAutomationConfig.tenantId, tenantId))
        .returning();

      logger.info({ tenantId }, "automation/sales-config PATCH: atualizado");
      res.json({ config: updated });
    } catch (err: any) {
      logger.error({ tenantId, error: err?.message }, "automation/sales-config PATCH: erro");
      res.status(500).json({ error: err?.message ?? "Erro desconhecido" });
    }
  }
);

// ── Schemas SDR Config ────────────────────────────────────────────────────────

const sdrConfigSchema = z.object({
  personaNome:      z.string().max(100).default("SDR"),
  personaTom:       z.string().max(1000).default("consultivo, casual, direto"),
  contextoNegocio:  z.string().max(20000).default(""),
  maxTurns:         z.number().int().min(1).max(20).default(5),
});

type SdrConfigInput = z.infer<typeof sdrConfigSchema>;

// ── GET /api/automation/sdr-config ────────────────────────────────────────────
router.get(
  "/automation/sdr-config",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    let tenantId = req.tenantId!;
    const companySlug = req.query.company_slug as string | undefined;
    if (companySlug && req.user?.isSuperAdmin) {
      const resolved = await resolveCompanySlug(companySlug);
      if (!resolved) { res.status(404).json({ error: `Tenant não encontrado: ${companySlug}` }); return; }
      tenantId = resolved;
    }
    try {
      const rows = await db.execute(
        sql`SELECT ai_sdr_config FROM sales_automation_config WHERE tenant_id = ${tenantId} LIMIT 1`
      );
      const row = (rows as any).rows?.[0] ?? (rows as any)[0];
      res.json({ sdrConfig: row?.ai_sdr_config ?? null });
    } catch (err: any) {
      logger.error({ tenantId, error: err?.message }, "automation/sdr-config GET: erro");
      res.status(500).json({ error: err?.message ?? "Erro desconhecido" });
    }
  }
);

// ── PATCH /api/automation/sdr-config ──────────────────────────────────────────
router.patch(
  "/automation/sdr-config",
  requireAuth,
  requireTenantAccess,
  async (req: AuthenticatedRequest, res) => {
    let tenantId = req.tenantId!;
    const companySlug = req.query.company_slug as string | undefined;
    if (companySlug && req.user?.isSuperAdmin) {
      const resolved = await resolveCompanySlug(companySlug);
      if (!resolved) { res.status(404).json({ error: `Tenant não encontrado: ${companySlug}` }); return; }
      tenantId = resolved;
    }
    const parsed = sdrConfigSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

    const cfgJson = JSON.stringify(parsed.data);
    try {
      await db.execute(sql`
        INSERT INTO sales_automation_config (tenant_id, crm_provider, crm_base_url, ai_sdr_config)
        VALUES (${tenantId}, 'helena', 'https://api.wts.chat', ${cfgJson}::jsonb)
        ON CONFLICT (tenant_id) DO UPDATE
          SET ai_sdr_config = ${cfgJson}::jsonb, updated_at = NOW()
      `);
      logger.info({ tenantId }, "automation/sdr-config PATCH: salvo");
      res.json({ sdrConfig: parsed.data });
    } catch (err: any) {
      logger.error({ tenantId, error: err?.message }, "automation/sdr-config PATCH: erro");
      res.status(500).json({ error: err?.message ?? "Erro desconhecido" });
    }
  }
);

export default router;
