import { Router, type IRouter } from "express";
import { supabaseAdmin } from "../lib/supabase";
import {
  clearTenantCache,
  getTenantRole,
  requireAuth,
  requireSuperAdmin,
  requireTenantManager,
  type AuthenticatedRequest,
} from "../middlewares/auth";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ─── /users — usuários do tenant do usuário logado ────────────
router.get("/users", requireAuth, async (req: AuthenticatedRequest, res) => {
  const tenantIds = req.userTenantIds ?? [];
  if (tenantIds.length === 0) { res.json([]); return; }
  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("id, role, created_at, tenant_id, user_id")
    .in("tenant_id", tenantIds)
    .order("created_at");
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

// ─── /admin/tenants ───────────────────────────────────────────
router.get("/admin/tenants", requireAuth, requireSuperAdmin, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .select("*, tenant_apps(app_id, ativo)")
    .order("created_at", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.post("/admin/tenants", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { name, slug, plan, email } = req.body;
  if (!name || !slug) { res.status(400).json({ error: "name e slug são obrigatórios" }); return; }
  const { data, error } = await supabaseAdmin
    .from("tenants")
    .insert({ name, slug, plan: plan ?? "starter", owner_id: req.user!.id })
    .select().single();
  if (error) { res.status(400).json({ error: error.message }); return; }
  res.status(201).json(data);
});

// ─── /admin/usuarios — criar usuário e vincular a tenant ──────
router.post("/admin/usuarios", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { email, senha, nome, tenant_id, role } = req.body;
  if (!email || !senha || !tenant_id) {
    res.status(400).json({ error: "email, senha e tenant_id são obrigatórios" });
    return;
  }

  // Criar usuário no Supabase Auth (admin API)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nome || email.split("@")[0] },
  });

  let userId: string;
  let jaExistia = false;

  if (authError) {
    // E-mail já cadastrado → buscar usuário existente e apenas vincular ao tenant
    if (authError.code === "email_exists") {
      jaExistia = true;
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (listError) {
        req.log.error({ error: listError }, "Failed to list users for email lookup");
        res.status(500).json({ error: "Falha ao buscar usuário existente" });
        return;
      }
      const existingUser = listData.users.find((u) => u.email === email);
      if (!existingUser) {
        res.status(400).json({ error: "E-mail já cadastrado mas usuário não encontrado" });
        return;
      }
      userId = existingUser.id;
    } else {
      req.log.error({ error: authError }, "Failed to create auth user");
      res.status(400).json({ error: authError.message });
      return;
    }
  } else {
    userId = authData.user.id;
  }

  // Vincular ao tenant
  const { error: linkError } = await supabaseAdmin
    .from("tenant_users")
    .upsert(
      { tenant_id, user_id: userId, role: role ?? "member" },
      { onConflict: "tenant_id,user_id" }
    );

  if (linkError) {
    // Usuário foi criado mas link falhou — reportar sem reverter
    res.status(207).json({
      aviso: "Usuário criado mas não foi possível vincular ao tenant",
      error: linkError.message,
      user_id: userId,
    });
    return;
  }

  res.status(201).json({
    user_id: userId,
    email,
    tenant_id,
    role: role ?? "member",
    mensagem: jaExistia
      ? "Usuário existente vinculado ao tenant com sucesso"
      : "Usuário criado e vinculado com sucesso",
  });
});

router.get("/admin/users", requireAuth, requireSuperAdmin, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("id, role, created_at, tenant_id, user_id, tenants(name, slug)")
    .order("created_at", { ascending: false });
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json(data);
});

router.get("/tenants/:tenantId/users", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId } = req.params;
  if (!await requireTenantManager(req, res, tenantId)) return;

  // 1. Busca membros do tenant
  const { data: membros, error } = await supabaseAdmin
    .from("tenant_users")
    .select("id, role, tenant_id, user_id")
    .eq("tenant_id", tenantId);

  if (error) {
    req.log.error({ error }, "Failed to fetch tenant users");
    res.status(500).json({ error: "Failed to fetch users" });
    return;
  }

  if (!membros || membros.length === 0) { res.json([]); return; }

  // 2. Busca dados de auth para cada user_id (auth.users não é acessível via join PostgREST)
  const userIds = membros.map((m) => m.user_id);
  const usersMap: Record<string, { id: string; email: string; nome?: string }> = {};

  await Promise.all(
    userIds.map(async (uid) => {
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (u?.user) {
          usersMap[uid] = {
            id: u.user.id,
            email: u.user.email ?? "",
            nome: u.user.user_metadata?.nome ?? u.user.user_metadata?.full_name,
          };
        }
      } catch { /* ignora erros individuais */ }
    })
  );

  const resultado = membros.map((m) => ({
    ...m,
    user: usersMap[m.user_id] ?? { id: m.user_id, email: m.user_id },
  }));

  res.json(resultado);
});

router.post("/tenants/:tenantId/users", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId } = req.params;
  const { user_id, role } = req.body;
  const actorRole = await requireTenantManager(req, res, tenantId);
  if (!actorRole) return;

  if (!user_id) {
    res.status(400).json({ error: "user_id is required" });
    return;
  }

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
    .insert({ tenant_id: tenantId, user_id, role: requestedRole })
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to add user to tenant");
    res.status(400).json({ error: error.message });
    return;
  }
  clearTenantCache(user_id);

  res.status(201).json(data);
});

router.patch("/tenants/:tenantId/users/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId, userId } = req.params;
  const { role } = req.body;
  const actorRole = await requireTenantManager(req, res, tenantId);
  if (!actorRole) return;
  if (!["owner", "admin", "member"].includes(role)) {
    res.status(400).json({ error: "Role inválida" });
    return;
  }
  const targetRole = await getTenantRole(
    { ...req, user: { ...req.user!, id: userId, isSuperAdmin: false }, userTenantIds: [tenantId] },
    tenantId,
  );
  if (!targetRole) {
    res.status(404).json({ error: "Membro não encontrado neste tenant" });
    return;
  }
  if ((role === "owner" || targetRole === "owner") && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Somente o administrador master pode alterar a propriedade do tenant" });
    return;
  }
  if ((role === "admin" || targetRole === "admin") && actorRole !== "owner") {
    res.status(403).json({ error: "Somente o proprietário pode alterar roles administrativas" });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .update({ role })
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    req.log.error({ error }, "Failed to update user role");
    res.status(400).json({ error: error.message });
    return;
  }
  clearTenantCache(userId);

  res.json(data);
});

router.delete("/tenants/:tenantId/users/:userId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tenantId, userId } = req.params;
  const actorRole = await requireTenantManager(req, res, tenantId);
  if (!actorRole) return;
  const targetRole = await getTenantRole(
    { ...req, user: { ...req.user!, id: userId, isSuperAdmin: false }, userTenantIds: [tenantId] },
    tenantId,
  );
  if (!targetRole) {
    res.status(404).json({ error: "Membro não encontrado neste tenant" });
    return;
  }
  if (targetRole === "owner" && !req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Somente o administrador master pode remover o proprietário do tenant" });
    return;
  }
  if (targetRole === "admin" && actorRole !== "owner") {
    res.status(403).json({ error: "Somente o proprietário pode remover outro administrador" });
    return;
  }

  const { error } = await supabaseAdmin
    .from("tenant_users")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("user_id", userId);

  if (error) {
    req.log.error({ error }, "Failed to remove user from tenant");
    res.status(400).json({ error: error.message });
    return;
  }
  clearTenantCache(userId);

  res.status(204).send();
});

// ─── /admin/fix-cmo-historico ─────────────────────────────────
// Endpoint temporário: zera cmo em movimentações onde fase_origem = fase_destino
// (registros de iniciar-proxima que gravaram cmo incorretamente)
router.post("/admin/fix-cmo-historico", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const preview = await db.execute(sql`
      SELECT COUNT(*) as total, COALESCE(SUM(cmo), 0) as cmo_total
      FROM movimentacoes
      WHERE fase_origem = fase_destino AND cmo > 0
    `);
    const row = preview.rows[0] as any;
    const total = Number(row?.total ?? 0);

    if (total === 0) {
      res.json({ ok: true, message: "Nenhum registro a corrigir.", corrigidos: 0 });
      return;
    }

    await db.execute(sql`
      UPDATE movimentacoes
      SET cmo_previsto = cmo_previsto + cmo,
          cmo = 0
      WHERE fase_origem = fase_destino
        AND cmo > 0
    `);

    res.json({
      ok: true,
      message: `${total} registros corrigidos. CMO movido para cmo_previsto.`,
      corrigidos: total,
      cmo_total_centavos: Number(row?.cmo_total ?? 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
