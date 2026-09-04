import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import {
  getTenantRole,
  requireAuth,
  requireTenantManager,
  type AuthenticatedRequest,
} from "../middlewares/auth";

const router: IRouter = Router();

const MIRAGE_APPS = [
  {
    key: "helena_crm",
    name: "CRM Mirage",
    description: "Gestão de clientes e relacionamentos",
    icon: "users",
    category: "crm",
    plans: ["starter", "pro", "enterprise"],
    subdomain: "crm",
  },
  {
    key: "vhsys_erp",
    name: "ERP Contábil",
    description: "Emissão de notas, controle financeiro e contabilidade",
    icon: "file-text",
    category: "erp",
    plans: ["pro", "enterprise"],
    subdomain: "erp",
  },
  {
    key: "comunidade",
    name: "Comunidade Vestuário",
    description: "Rede da indústria do vestuário",
    icon: "users-round",
    category: "community",
    plans: ["starter", "pro", "enterprise"],
    subdomain: "comunidade",
  },
  {
    key: "orcamento",
    name: "Gerador de Orçamento",
    description: "Criação e gestão de orçamentos para confecções",
    icon: "calculator",
    category: "productivity",
    plans: ["starter", "pro", "enterprise"],
    subdomain: "orcamento",
  },
  {
    key: "kanban",
    name: "Kanban",
    description: "Gestão visual de projetos e produção",
    icon: "layout-dashboard",
    category: "productivity",
    plans: ["starter", "pro", "enterprise"],
    subdomain: "kanban",
  },
];

router.get("/apps", async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("apps")
    .select("*")
    .order("name");

  if (error) {
    req.log.error({ error }, "Failed to fetch apps");
    res.status(500).json({ error: "Failed to fetch apps" });
    return;
  }

  res.json(data ?? MIRAGE_APPS);
});

router.get("/apps/catalog", (_req, res) => {
  res.json(MIRAGE_APPS);
});

router.get("/tenants/:tenantId/apps", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId } = req.params;
  if (!await getTenantRole(req, tenantId)) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_apps")
    .select("*, apps(*)")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  if (error) {
    req.log.error({ error }, "Failed to fetch tenant apps");
    res.status(500).json({ error: "Failed to fetch tenant apps" });
    return;
  }

  res.json(data);
});

router.post("/tenants/:tenantId/apps", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId } = req.params;
  if (!await requireTenantManager(req, res, tenantId)) return;
  const { app_key } = req.body;

  if (!app_key) {
    res.status(400).json({ error: "app_key is required" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_apps")
    .upsert({
      tenant_id: tenantId,
      app_key,
      active: true,
      activated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to activate app for tenant");
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(201).json(data);
});

router.delete("/tenants/:tenantId/apps/:appKey", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId, appKey } = req.params;
  if (!await requireTenantManager(req, res, tenantId)) return;

  const { error } = await supabaseAdmin
    .from("tenant_apps")
    .update({ active: false })
    .eq("tenant_id", tenantId)
    .eq("app_key", appKey);

  if (error) {
    req.log.error({ error }, "Failed to deactivate app");
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(204).send();
});

export default router;
