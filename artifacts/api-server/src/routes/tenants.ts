import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import {
  clearTenantCache,
  getTenantRole,
  requireAuth,
  requireTenantAccess,
  requireTenantManager,
  requireTenantOwner,
  type AuthenticatedRequest,
} from "../middlewares/auth";
import { db, configuracoes_empresa } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

// ─── EMPRESA — fonte única de verdade para todos os apps Mirage ──────────────

// GET /tenants/empresa — dados da empresa (mesclado: local DB + Supabase tenant)
router.get("/tenants/empresa", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;

  // Busca dados detalhados (CNPJ, endereço, etc.) da DB local
  const [local] = await db.select().from(configuracoes_empresa)
    .where(eq(configuracoes_empresa.tenant_id, tenantId))
    .limit(1);

  // Busca nome e logo do tenant no Supabase (fonte de verdade para identidade)
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("name, logo_url, slug")
    .eq("id", tenantId)
    .single();

  // Mescla: logo/nome do Supabase têm prioridade, demais campos vêm da DB local
  res.json({
    tenant_id: tenantId,
    slug: tenant?.slug ?? "",
    nome_empresa: local?.nome_empresa ?? tenant?.name ?? "",
    logo_url: tenant?.logo_url ?? local?.logo_url ?? "",
    endereco: local?.endereco ?? "",
    cidade_estado_cep: local?.cidade_estado_cep ?? "",
    cnpj: local?.cnpj ?? "",
    pix: local?.pix ?? "",
    email: local?.email ?? "",
    site: local?.site ?? "",
    telefone: local?.telefone ?? "",
    whatsapp: local?.whatsapp ?? "",
  });
});

// PUT /tenants/empresa — salva em ambos os lugares de forma síncrona
router.put("/tenants/empresa", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  if (!await requireTenantManager(req, res, tenantId)) return;
  const { nome_empresa, logo_url, endereco, cidade_estado_cep, cnpj, pix, email, site, telefone, whatsapp } = req.body;

  // 1. Atualiza Supabase tenant (logo + nome — identidade centralizada)
  if (nome_empresa !== undefined || logo_url !== undefined) {
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (nome_empresa !== undefined) updates.name = nome_empresa;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    await supabaseAdmin.from("tenants").update(updates).eq("id", tenantId);
  }

  // 2. Upsert na DB local (detalhes fiscais + cópia dos campos de identidade)
  const [existing] = await db.select({ id: configuracoes_empresa.id })
    .from(configuracoes_empresa).where(eq(configuracoes_empresa.tenant_id, tenantId)).limit(1);

  let saved;
  if (existing) {
    [saved] = await db.update(configuracoes_empresa)
      .set({ nome_empresa, logo_url, endereco, cidade_estado_cep, cnpj, pix, email, site, telefone, whatsapp, updated_at: new Date() })
      .where(eq(configuracoes_empresa.tenant_id, tenantId))
      .returning();
  } else {
    [saved] = await db.insert(configuracoes_empresa)
      .values({ tenant_id: tenantId, nome_empresa, logo_url, endereco, cidade_estado_cep, cnpj, pix, email, site, telefone, whatsapp })
      .returning();
  }

  res.json({
    tenant_id: tenantId,
    nome_empresa: saved?.nome_empresa ?? nome_empresa ?? "",
    logo_url: logo_url ?? saved?.logo_url ?? "",
    endereco: saved?.endereco ?? "",
    cidade_estado_cep: saved?.cidade_estado_cep ?? "",
    cnpj: saved?.cnpj ?? "",
    pix: saved?.pix ?? "",
    email: saved?.email ?? "",
    site: saved?.site ?? "",
    telefone: saved?.telefone ?? "",
    whatsapp: saved?.whatsapp ?? "",
  });
});

// ─── TENANTS ─────────────────────────────────────────────────────────────────

router.get("/tenants", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantIds = req.userTenantIds ?? [];
  if (tenantIds.length === 0) {
    res.json([]);
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*")
    .in("id", tenantIds)
    .order("created_at", { ascending: false });

  if (error) {
    req.log.error({ error }, "Failed to fetch tenants");
    res.status(500).json({ error: "Failed to fetch tenants" });
    return;
  }

  res.json(data);
});

// Rota especial: retorna o tenant do usuário logado
router.get("/tenants/meu-tenant", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantIds = req.userTenantIds ?? [];
  if (tenantIds.length === 0) {
    res.status(404).json({ error: "Usuário sem tenant associado" });
    return;
  }
  const requestedTenantId = typeof req.query.tenant_id === "string" ? req.query.tenant_id : "";

  // O tenant Mirage só é ocultado do seletor padrão do admin master. Um
  // operador/admin do próprio tenant Mirage deve continuar podendo selecioná-lo.
  const { data: mirageTenant } = await supabaseAdmin
    .from("tenants")
    .select("id")
    .eq("slug", "mirage")
    .single();

  const filteredIds = req.user?.isSuperAdmin && mirageTenant
    ? tenantIds.filter(id => id !== mirageTenant.id)
    : tenantIds;

  const idsToQuery = filteredIds.length > 0 ? filteredIds : tenantIds;
  if (requestedTenantId && !idsToQuery.includes(requestedTenantId)) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return;
  }

  if (!requestedTenantId && idsToQuery.length > 1) {
    res.status(400).json({ error: "Selecione a empresa que deseja acessar" });
    return;
  }

  const tenantId = requestedTenantId || idsToQuery[0]!;

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*, tenant_apps(*, apps(*))")
    .eq("id", tenantId)
    .single();

  if (error) {
    res.status(404).json({ error: "Tenant não encontrado" });
    return;
  }
  res.json(data);
});

router.get("/tenants/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!await getTenantRole(req, id)) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*, tenant_apps(*, apps(*))")
    .eq("id", id)
    .single();

  if (error) {
    req.log.error({ error }, "Failed to fetch tenant");
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  res.json(data);
});

router.post("/tenants", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { name, slug, plan, logo_url, primary_color, secondary_color, domain } = req.body;

  if (!name || !slug) {
    res.status(400).json({ error: "name and slug are required" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({
      name,
      slug,
      plan: plan ?? "free",
      logo_url,
      primary_color: primary_color ?? "#7C3AED",
      secondary_color: secondary_color ?? "#4F46E5",
      domain,
      owner_id: req.user!.id,
    })
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to create tenant");
    res.status(400).json({ error: error.message });
    return;
  }

  const { error: membershipError } = await supabaseAdmin
    .from("tenant_users")
    .upsert(
      { tenant_id: data.id, user_id: req.user!.id, role: "owner" },
      { onConflict: "tenant_id,user_id" },
    );
  if (membershipError) {
    await supabaseAdmin.from("tenants").delete().eq("id", data.id);
    res.status(500).json({ error: "Não foi possível vincular o proprietário ao tenant" });
    return;
  }
  clearTenantCache(req.user!.id);

  res.status(201).json(data);
});

router.patch("/tenants/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!await requireTenantManager(req, res, id)) return;
  const { name, logo_url, primary_color, secondary_color, domain, plan } = req.body;
  if (plan !== undefined && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Somente o administrador master pode alterar o plano" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update({ name, logo_url, primary_color, secondary_color, domain, plan, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to update tenant");
    res.status(400).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Vincular usuário logado como membro de um tenant (usado no checkout quando criando o próprio tenant)
router.post("/tenants/:id/membros", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const actorRole = await requireTenantManager(req, res, id);
  if (!actorRole) return;
  const { role } = req.body;
  const userId = req.user!.id;
  const requestedRole = role ?? "member";
  if (!["owner", "admin", "member"].includes(requestedRole)) {
    res.status(400).json({ error: "Role inválida" });
    return;
  }
  if (requestedRole !== "member" && actorRole !== "owner") {
    res.status(403).json({ error: "Somente o proprietário pode atribuir roles administrativas" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .upsert(
      { tenant_id: id, user_id: userId, role: requestedRole },
      { onConflict: "tenant_id,user_id" }
    )
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

// Admin: listar todos os tenants registrados
router.get("/admin/tenants", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Acesso restrito a administradores Mirage" });
    return;
  }
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ tenants: data ?? [] });
});

// Admin: atualizar plano e status de um tenant
router.patch("/admin/tenants/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Acesso restrito a administradores Mirage" });
    return;
  }
  const { id } = req.params;
  const { plano, assinatura_status, nome } = req.body;

  const updates: any = {};
  if (plano !== undefined) updates.plan = plano;
  if (assinatura_status !== undefined) updates.assinatura_status = assinatura_status;
  if (nome !== undefined) updates.name = nome;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("tenants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json(data);
});

router.delete("/tenants/:id", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  if (!await requireTenantOwner(req, res, id)) return;

  const { error } = await supabaseAdmin
    .from("tenants")
    .delete()
    .eq("id", id);

  if (error) {
    req.log.error({ error }, "Failed to delete tenant");
    res.status(400).json({ error: error.message });
    return;
  }

  res.status(204).send();
});

export default router;
