import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, salesAutomationConfig } from "@workspace/db";
import { supabaseAdmin } from "../../lib/supabase";
import { logger } from "../../lib/logger";

const router = Router();

// ── Slug → tenantId cache ────────────────────────────────────────────────────
const slugToIdCache = new Map<string, { id: string; ts: number }>();

async function resolveSlugToTenantId(slug: string): Promise<string | null> {
  const cached = slugToIdCache.get(slug);
  if (cached && Date.now() - cached.ts < 300_000) return cached.id;

  const { data } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!data?.id) return null;
  slugToIdCache.set(slug, { id: data.id, ts: Date.now() });
  return data.id;
}

// ── Middleware: chave interna ─────────────────────────────────────────────────
function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) {
    res.status(503).json({ error: "Internal API key not configured on server" });
    return;
  }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) {
    res.status(401).json({ error: "Unauthorized — invalid x-internal-key" });
    return;
  }
  next();
}

// ── GET /api/internal/automation/tenant-config ────────────────────────────────
//
// Uso pelo n8n:
//   GET /api/internal/automation/tenant-config?company_slug=r2pb
//   GET /api/internal/automation/tenant-config?company_slug=r2pb&uso=confirmacao
//   GET /api/internal/automation/tenant-config?tenant_id=<uuid>
//
// Headers obrigatórios:
//   x-internal-key: <MARKETING_INTERNAL_API_KEY>
//
// Retorna:
// {
//   tenantId,
//   ativo,
//   whatsappInstances: [...],        // todas as instâncias
//   matchedInstance: {...} | null,   // primeira instância com uso correspondente (se ?uso= fornecido)
//   crmProvider, crmBaseUrl          // campos CRM sem expor crmApiKey
// }
//
// Nunca retorna crmApiKey em texto claro — para integração CRM,
// o n8n deve usar a credencial armazenada diretamente no painel n8n.

router.get(
  "/internal/automation/tenant-config",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const { company_slug, tenant_id, uso } = req.query as Record<string, string | undefined>;

    if (!company_slug && !tenant_id) {
      res.status(400).json({ error: "Informe company_slug ou tenant_id" });
      return;
    }

    try {
      let resolvedTenantId: string | null = null;

      if (tenant_id) {
        resolvedTenantId = tenant_id;
      } else if (company_slug) {
        resolvedTenantId = await resolveSlugToTenantId(company_slug);
        if (!resolvedTenantId) {
          res.status(404).json({ error: `Tenant não encontrado para slug: ${company_slug}` });
          return;
        }
      }

      const rows = await db
        .select()
        .from(salesAutomationConfig)
        .where(eq(salesAutomationConfig.tenantId, resolvedTenantId!))
        .limit(1);

      if (rows.length === 0) {
        // Retorna 200 com matchedInstance null — n8n não deve falhar por falta de config
        res.json({
          tenantId: resolvedTenantId,
          ativo: false,
          crmProvider: null,
          crmBaseUrl: null,
          whatsappInstances: [],
          matchedInstance: null,
        });
        return;
      }

      const config = rows[0];
      const instances = (config.whatsappInstances ?? []) as Array<{
        id: string;
        nome: string;
        canal: string;
        baseUrl?: string;
        instanceId?: string;
        token?: string;
        clientToken?: string;
        usos?: string[];
      }>;

      // Filtra instância por finalidade se ?uso= fornecido
      const matchedInstance = uso
        ? (instances.find((inst) => (inst.usos ?? []).includes(uso)) ?? null)
        : null;

      logger.info(
        { tenantId: resolvedTenantId, uso, matchedFound: !!matchedInstance },
        "internal/automation/tenant-config: requisição n8n"
      );

      res.json({
        tenantId: resolvedTenantId,
        ativo: config.ativo,
        crmProvider: config.crmProvider,
        crmBaseUrl: config.crmBaseUrl,
        whatsappInstances: instances,
        matchedInstance: matchedInstance ?? null,
      });
    } catch (err: any) {
      logger.error({ error: err?.message }, "internal/automation/tenant-config: erro");
      res.status(500).json({ error: err?.message ?? "Erro interno" });
    }
  }
);

export default router;
