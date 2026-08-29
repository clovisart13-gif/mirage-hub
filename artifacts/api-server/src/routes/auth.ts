import { Router, type IRouter } from "express";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "../lib/supabase";
import {
  requireAuth,
  clearTenantCache,
  requireTenantManager,
  type AuthenticatedRequest,
} from "../middlewares/auth";

const router: IRouter = Router();

const HUB_URL = process.env.HUB_URL ?? "https://www.gestaomirage.com.br";

function normalizeLabWhatsapp(value: unknown) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

function isConfiguredTrialLabIdentity(publicEmail: string, companyName: unknown, whatsapp: unknown) {
  const labEmail = process.env.MIRAGE_TRIAL_LAB_EMAIL?.trim().toLowerCase();
  const labCompany = process.env.MIRAGE_TRIAL_LAB_COMPANY_NAME?.trim().toLowerCase();
  const labWhatsapp = normalizeLabWhatsapp(process.env.MIRAGE_TRIAL_LAB_WHATSAPP);
  return Boolean(
    labEmail &&
    labCompany &&
    labWhatsapp &&
    publicEmail === labEmail &&
    String(companyName ?? "").trim().toLowerCase() === labCompany &&
    normalizeLabWhatsapp(whatsapp) === labWhatsapp,
  );
}

function mirageLoginEmail(email: string, companyName: string) {
  const accountKey = createHash("sha256")
    .update(`${email.trim().toLowerCase()}|${companyName.trim().toLowerCase()}`)
    .digest("hex")
    .slice(0, 24);
  return `mirage-${accountKey}@auth.gestaomirage.local`;
}

async function findMirageUsersByPublicEmail(publicEmail: string) {
  const matches: Array<{ id: string; email?: string }> = [];
  const perPage = 1000;

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Não foi possível resolver o acesso Mirage: ${error.message}`);

    for (const user of data.users ?? []) {
      if (
        user.user_metadata?.account_scope === "mirage" &&
        String(user.user_metadata?.public_email ?? "").trim().toLowerCase() === publicEmail
      ) {
        matches.push({ id: user.id, email: user.email });
      }
    }

    if ((data.users ?? []).length < perPage) break;
  }

  return matches;
}

router.post("/auth/mirage-login-email", async (req, res) => {
  const { email, company_name } = req.body;
  if (!email?.trim() || !company_name?.trim()) {
    res.status(400).json({ error: "email e company_name são obrigatórios" });
    return;
  }
  res.json({
    login_email: mirageLoginEmail(String(email), String(company_name)),
  });
});

// Resolve o e-mail público para o identificador técnico da conta Mirage.
// O cliente nunca precisa conhecer o nome da empresa ou o e-mail interno.
router.post("/auth/resolve-login-email", async (req, res) => {
  const publicEmail = String(req.body?.email ?? "").trim().toLowerCase();
  if (!publicEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(publicEmail)) {
    res.status(400).json({ error: "Informe um e-mail válido" });
    return;
  }

  try {
    const mirageUsers = await findMirageUsersByPublicEmail(publicEmail);
    // Uma mesma pessoa pode ter criado mais de uma empresa Mirage com o mesmo
    // e-mail público. O e-mail técnico é diferente por empresa, então não
    // podemos bloquear o login antes de verificar a senha correspondente.
    // Limitamos as tentativas para não transformar o login em um enumerador
    // ilimitado de identidades.
    if (mirageUsers.length > 5) {
      res.status(409).json({
        error: "Há muitas empresas Mirage vinculadas a este e-mail. Entre em contato com o suporte para escolher o acesso correto.",
        code: "MIRAGE_ACCOUNT_AMBIGUOUS",
      });
      return;
    }

    const loginEmails = mirageUsers
      .map((user) => user.email)
      .filter((email): email is string => Boolean(email));

    res.json({
      login_email: loginEmails[0] ?? publicEmail,
      login_emails: loginEmails.length > 1 ? loginEmails : undefined,
      account_scope: mirageUsers.length > 0 ? "mirage" : "default",
    });
  } catch (error: any) {
    req.log.error({ error: error?.message }, "Falha ao resolver e-mail público de login");
    res.status(500).json({ error: "Não foi possível preparar o login. Tente novamente." });
  }
});

router.post("/auth/register", async (req, res) => {
  const { email, password, full_name, company_name, requested_modules, whatsapp, account_scope } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const publicEmail = String(email).trim().toLowerCase();
  const isMirageAccount = account_scope === "mirage";
  const isTrialLab = isMirageAccount && isConfiguredTrialLabIdentity(publicEmail, company_name, whatsapp);
  if (isMirageAccount && !company_name?.trim()) {
    res.status(400).json({ error: "company_name is required for a Mirage account" });
    return;
  }

  const loginEmail = isMirageAccount
    ? mirageLoginEmail(publicEmail, company_name)
    : publicEmail;
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: loginEmail,
    password,
    user_metadata: {
      full_name,
      company_name,
      requested_modules,
      whatsapp,
      public_email: isMirageAccount ? publicEmail : undefined,
      account_scope: isMirageAccount ? "mirage" : undefined,
      is_trial_lab: isTrialLab || undefined,
      trial_lab_identity: isTrialLab ? {
        public_email: publicEmail,
        company_name: String(company_name).trim(),
        whatsapp: normalizeLabWhatsapp(whatsapp),
      } : undefined,
    },
    email_confirm: true,
  });

  if (authError || !authData.user) {
    if (isMirageAccount && authError?.message.toLowerCase().includes("already been registered")) {
      res.status(409).json({
        error: "Já existe um cadastro Mirage para este e-mail e empresa",
        code: "MIRAGE_ACCOUNT_EXISTS",
        login_email: loginEmail,
      });
      return;
    }
    req.log.error({ error: authError }, "Failed to create user");
    res.status(400).json({ error: authError?.message ?? "Failed to create user" });
    return;
  }

  res.status(201).json({
    user: {
      id: authData.user.id,
      email: publicEmail,
      full_name,
    },
    login_email: loginEmail,
  });
});

// ─── CONVITE POR E-MAIL ──────────────────────────────────────
// Envia invite do Supabase com tenant_id embutido nos metadados.
// Se o usuário já existir, vincula diretamente ao tenant.
router.post("/auth/invite", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { email, tenant_id, role } = req.body;

  if (!email || !tenant_id) {
    res.status(400).json({ error: "email e tenant_id são obrigatórios" });
    return;
  }
  const actorRole = await requireTenantManager(req, res, tenant_id);
  if (!actorRole) return;
  const requestedRole = role ?? "member";
  if (!["owner", "admin", "member"].includes(requestedRole)) {
    res.status(400).json({ error: "Role inválida" });
    return;
  }
  if (requestedRole !== "member" && actorRole !== "owner") {
    res.status(403).json({ error: "Somente o proprietário pode atribuir roles administrativas" });
    return;
  }

  // Verificar se usuário já existe no Supabase
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const users = (existingUsers?.users ?? []) as Array<{ id: string; email?: string }>;
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    const { data: existingMembership, error: membershipLookupError } = await supabaseAdmin
      .from("tenant_users")
      .select("role")
      .eq("tenant_id", tenant_id)
      .eq("user_id", existingUser.id)
      .maybeSingle();
    if (membershipLookupError) {
      res.status(500).json({ error: membershipLookupError.message });
      return;
    }
    if (existingMembership) {
      res.status(409).json({
        error: "Este usuário já pertence à empresa. Altere o papel pela gestão de membros.",
      });
      return;
    }

    // Usuário já existe — vincular sem sobrescrever qualquer membership anterior.
    const { error: linkError } = await supabaseAdmin
      .from("tenant_users")
      .insert({ tenant_id, user_id: existingUser.id, role: requestedRole });

    if (linkError) {
      res.status(400).json({ error: linkError.message });
      return;
    }

    clearTenantCache(existingUser.id);
    res.status(200).json({
      message: "Usuário existente vinculado à empresa com sucesso",
      user_id: existingUser.id,
      tipo: "vinculo_direto",
    });
    return;
  }

  // Novo usuário — enviar e-mail de convite do Supabase
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { pending_tenant_id: tenant_id, pending_role: requestedRole },
    redirectTo: `${HUB_URL}/onboarding`,
  });

  if (error) {
    req.log.error({ error }, "Failed to invite user");
    res.status(400).json({ error: error.message });
    return;
  }
  await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
    app_metadata: {
      ...data.user.app_metadata,
      pending_tenant_id: tenant_id,
      pending_role: requestedRole,
    },
  });

  res.status(201).json({
    message: "Convite enviado por e-mail",
    user_id: data.user.id,
    tipo: "convite_email",
  });
});

// ─── APLICAR CONVITE PENDENTE ────────────────────────────────
// Chamado após o usuário clicar no link do convite e ser autenticado.
  // Lê app_metadata.pending_tenant_id e vincula o usuário ao tenant.
router.post("/auth/aplicar-convite", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  // Buscar metadados do usuário
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    res.status(400).json({ error: "Usuário não encontrado" });
    return;
  }

  const meta = userData.user.app_metadata ?? {};
  const tenantId = meta.pending_tenant_id;
  const role = meta.pending_role ?? "member";

  if (!tenantId) {
    res.status(200).json({ aplicado: false, motivo: "Nenhum convite pendente" });
    return;
  }

  // Vincular ao tenant
  const { error: linkError } = await supabaseAdmin
    .from("tenant_users")
    .upsert(
      { tenant_id: tenantId, user_id: userId, role },
      { onConflict: "tenant_id,user_id" }
    );

  if (linkError) {
    res.status(400).json({ error: linkError.message });
    return;
  }

  // Limpar metadados de convite para não reaplicar
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...meta, pending_tenant_id: null, pending_role: null },
  });

  clearTenantCache(userId);

  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, nome, slug")
    .eq("id", tenantId)
    .single();

  res.status(200).json({
    aplicado: true,
    tenant_id: tenantId,
    role,
    tenant: tenant ?? null,
  });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const userId = req.user!.id;
  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (authUserError) {
    req.log.error({ error: authUserError, userId }, "Failed to load authenticated user profile");
    res.status(500).json({ error: "Não foi possível carregar o perfil da conta" });
    return;
  }
  const publicEmail = authUser?.user?.user_metadata?.public_email || req.user!.email;

  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("tenant_users")
    .select("*, tenants(*)")
    .eq("user_id", userId);

  if (membershipsError) {
    req.log.error({ error: membershipsError, userId }, "Failed to load user memberships");
    res.status(500).json({ error: "Não foi possível carregar os workspaces da conta" });
    return;
  }

  const tenantIds = (memberships ?? []).map((membership) => membership.tenant_id);
  let tenantApps: Array<Record<string, any>> = [];

  if (tenantIds.length > 0) {
    const { data, error } = await supabaseAdmin
      .from("tenant_apps")
      .select("*")
      .in("tenant_id", tenantIds);

    if (error) {
      req.log.error({ error, userId, tenantIds }, "Failed to load tenant apps for user memberships");
      res.status(500).json({ error: "Não foi possível carregar os aplicativos dos workspaces" });
      return;
    }
    tenantApps = data ?? [];
  }

  const tenants = (memberships ?? []).map((membership) => ({
    ...membership,
    tenant_apps: tenantApps.filter((app) => app.tenant_id === membership.tenant_id),
  }));

  res.json({
    user: {
      id: req.user!.id,
      email: publicEmail,
      isSuperAdmin: req.user!.isSuperAdmin ?? false,
    },
    tenants: tenants ?? [],
  });
});

export default router;
