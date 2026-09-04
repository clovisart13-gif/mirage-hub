import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { ensureTrialLabDemoData, upgradeTrialLabDemoData, deleteTrialDemoData, hasTrialDemoData } from "../services/trial-demo-seed";
import { clearTenantCache, requireAuth, requireSuperAdmin } from "../middlewares/auth";

const router = Router();
const TRIAL_DAYS = 14;

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function trialLabIdentity() {
  const email = normalize(process.env.MIRAGE_TRIAL_LAB_EMAIL);
  const whatsapp = String(process.env.MIRAGE_TRIAL_LAB_WHATSAPP ?? "").replace(/\D/g, "");
  const companyName = String(process.env.MIRAGE_TRIAL_LAB_COMPANY_NAME ?? "").trim();
  return {
    email,
    whatsapp,
    companyName,
    configured: Boolean(email && whatsapp && companyName),
  };
}

async function findTrialLabUser(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`Não foi possível consultar a identidade de teste: ${error.message}`);
  return (data.users ?? []).find((user) =>
    user.user_metadata?.is_trial_lab === true &&
    normalize(user.user_metadata?.public_email) === email &&
    normalize(user.user_metadata?.company_name) === normalize(process.env.MIRAGE_TRIAL_LAB_COMPANY_NAME) &&
    String(user.user_metadata?.whatsapp ?? "").replace(/\D/g, "") === identityWhatsapp(),
  ) ?? null;
}

function identityWhatsapp() {
  return String(process.env.MIRAGE_TRIAL_LAB_WHATSAPP ?? "").replace(/\D/g, "");
}

async function getTrialLabContext() {
  const identity = trialLabIdentity();
  if (!identity.configured) return { identity, user: null, tenant: null, membership: null, apps: [] as any[] };

  const user = await findTrialLabUser(identity.email);
  if (!user) return { identity, user: null, tenant: null, membership: null, apps: [] as any[] };

  const markedTenantId = user.user_metadata?.trial_lab_tenant_id;
  const { data: tenant, error: tenantError } = markedTenantId
    ? await supabaseAdmin
        .from("tenants")
        .select("id, name, slug, plan, assinatura_status, assinatura_expira_em, created_at, owner_id")
        .eq("id", markedTenantId)
        .eq("owner_id", user.id)
        .maybeSingle()
    : { data: null, error: null };
  if (tenantError) throw new Error(`Não foi possível consultar o tenant de teste: ${tenantError.message}`);

  const { data: membership, error: membershipError } = tenant
    ? await supabaseAdmin
        .from("tenant_users")
        .select("id, role, created_at")
        .eq("tenant_id", tenant.id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null, error: null };
  if (membershipError) throw new Error(`Não foi possível consultar a membership de teste: ${membershipError.message}`);

  const { data: apps, error: appsError } = tenant
    ? await supabaseAdmin
        .from("tenant_apps")
        .select("app_key, active")
        .eq("tenant_id", tenant.id)
    : { data: [], error: null };
  if (appsError) throw new Error(`Não foi possível consultar os apps do trial: ${appsError.message}`);

  return { identity, user, tenant: (tenant as any) ?? null, membership, apps: apps ?? [] };
}

async function deleteTrialLabAccount(context: Awaited<ReturnType<typeof getTrialLabContext>>) {
  if (!context.user) return;
  if (context.tenant) {
    await deleteTrialDemoData(context.tenant.id, context.user.id);
    const { error: membershipError } = await supabaseAdmin.from("tenant_users").delete().eq("tenant_id", context.tenant.id);
    if (membershipError) throw new Error(`Não foi possível remover memberships do laboratório: ${membershipError.message}`);
    const { error: tenantError } = await supabaseAdmin.from("tenants").delete().eq("id", context.tenant.id).eq("owner_id", context.user.id);
    if (tenantError) throw new Error(`Não foi possível remover o tenant de teste: ${tenantError.message}`);
    clearTenantCache(context.user.id);
  }
  const { error: userError } = await supabaseAdmin.auth.admin.deleteUser(context.user.id);
  if (userError) throw new Error(`Não foi possível remover a conta de teste: ${userError.message}`);
}

function journeyResponse(context: Awaited<ReturnType<typeof getTrialLabContext>>, seeded: boolean) {
  const metadata = (context.user?.user_metadata ?? {}) as Record<string, any>;
  const audit = metadata.trial_journey ?? {};
  const activeApps = context.apps.filter((app: any) => app.active).map((app: any) => app.app_key);
  const trialActive = context.tenant?.assinatura_status === "trial" &&
    (!context.tenant?.assinatura_expira_em || new Date(context.tenant.assinatura_expira_em) > new Date());

  return {
    identity: {
      configured: context.identity.configured,
      email: context.identity.email || null,
      whatsapp_configured: Boolean(context.identity.whatsapp),
      company_name: context.identity.companyName || null,
      signup_url: "/criar-conta?source=trial-lab",
    },
    account: context.user ? {
      exists: true,
      public_email: metadata.public_email ?? null,
      created_at: context.user.created_at,
    } : { exists: false },
    tenant: context.tenant,
    demo_seed_ready: seeded,
    checklist: [
      { id: "public-signup", label: "Cadastro feito pela Landing Page pública", status: context.user ? "ok" : "pending" },
      { id: "tenant", label: "Tenant próprio criado para a conta de teste", status: context.tenant ? "ok" : "pending" },
      { id: "membership", label: "Acesso da conta ao próprio tenant", status: context.membership ? "ok" : "pending" },
      { id: "trial", label: "Trial de 14 dias ativo", status: trialActive ? "ok" : "pending" },
      { id: "seed", label: "Dados demonstrativos tenant-scoped", status: seeded ? "ok" : "pending" },
      { id: "apps", label: "Kanban, PLM e Orçamento habilitados", status: ["kanban", "plm", "orcamento"].every((key) => activeApps.includes(key)) ? "ok" : "pending" },
      { id: "email", label: "E-mail de boas-vindas aceito pelo provedor", status: audit.email?.status ?? (audit.audit_persisted === false ? "failed" : "not_attempted"), updated_at: audit.email?.at ?? null },
      { id: "whatsapp", label: "WhatsApp enviado pelo canal próprio da Mirage", status: audit.whatsapp?.status ?? (audit.audit_persisted === false ? "failed" : "not_attempted"), updated_at: audit.whatsapp?.at ?? null },
      { id: "checkout", label: "Checkout em sandbox Asaas separado", status: process.env.ASAAS_SANDBOX_API_KEY ? "ready" : "blocked" },
      { id: "webhook", label: "Webhook de pagamento de sandbox recebido", status: audit.payment_webhook?.status ?? "not_attempted", updated_at: audit.payment_webhook?.at ?? null },
    ],
    communications: audit,
    checkout: {
      sandbox_configured: Boolean(process.env.ASAAS_SANDBOX_API_KEY),
      sandbox_webhook_configured: Boolean(process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN),
      simulated_checkout_allowed: false,
    },
  };
}

router.get("/admin/trial-lab", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const context = await getTrialLabContext();
    const seeded = context.tenant ? await hasTrialDemoData(context.tenant.id) : false;
    return res.json(journeyResponse(context, seeded));
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Falha ao consultar o Laboratório" });
  }
});

/** Prepara o ambiente para um novo cadastro público; nunca cria a conta do cliente. */
router.post("/admin/trial-lab/prepare", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const context = await getTrialLabContext();
    if (!context.identity.configured) {
      return res.status(409).json({ error: "Configure a identidade reservada do Laboratório antes de preparar a jornada." });
    }
    await deleteTrialLabAccount(context);
    return res.json({
      success: true,
      message: "Ambiente preparado. Abra a Landing Page em uma sessão separada e conclua o cadastro público.",
      signup_url: "/criar-conta?source=trial-lab",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Falha ao preparar o Laboratório" });
  }
});

/** Recria somente a base demonstrativa da conta que veio pela Landing Page. */
router.post("/admin/trial-lab/reset-data", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const context = await getTrialLabContext();
    if (!context.user || !context.tenant) {
      return res.status(409).json({ error: "A conta de teste ainda precisa ser criada pela Landing Page pública." });
    }
    await deleteTrialDemoData(context.tenant.id, context.user.id);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { error: tenantError } = await supabaseAdmin
      .from("tenants")
      .update({ plan: "starter", assinatura_status: "trial", assinatura_expira_em: trialEndsAt } as any)
      .eq("id", context.tenant.id)
      .eq("owner_id", context.user.id);
    if (tenantError) throw new Error(`Não foi possível reativar o trial: ${tenantError.message}`);

    const { error: configError } = await supabaseAdmin
      .from("configuracoes_empresa")
      .upsert({ tenant_id: context.tenant.id, whatsapp: context.identity.whatsapp } as any, { onConflict: "tenant_id" });
    if (configError) throw new Error(`Não foi possível preservar o WhatsApp de teste: ${configError.message}`);
    const { error: appsError } = await supabaseAdmin
      .from("tenant_apps")
      .update({ active: false } as any)
      .eq("tenant_id", context.tenant.id);
    if (appsError) throw new Error(`Não foi possível resetar os apps do trial: ${appsError.message}`);
    for (const app_key of ["kanban", "orcamento", "plm"]) {
      const { error } = await supabaseAdmin
        .from("tenant_apps")
        .upsert({ tenant_id: context.tenant.id, app_key, active: true, activated_at: new Date().toISOString() } as any, { onConflict: "tenant_id,app_key" });
      if (error) throw new Error(`Não foi possível reativar o app ${app_key}: ${error.message}`);
    }
    const { error: addonsError } = await supabaseAdmin.from("addon_subscriptions").delete().eq("tenant_id", context.tenant.id);
    if (addonsError) throw new Error(`Não foi possível resetar os complementos do trial: ${addonsError.message}`);

    const seeded = await ensureTrialLabDemoData(context.tenant.id, context.user.id);
    clearTenantCache(context.user.id);
    return res.json({ success: true, seeded, message: "Dados demonstrativos restaurados somente para o tenant de teste." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Falha ao resetar a base demonstrativa" });
  }
});

/** Atualiza a base da conta reservada sem remover registros existentes. */
router.post("/admin/trial-lab/upgrade-data", requireAuth, requireSuperAdmin, async (_req, res) => {
  try {
    const context = await getTrialLabContext();
    if (!context.user || !context.tenant) {
      return res.status(409).json({ error: "A conta de teste ainda precisa ser criada pela Landing Page pública." });
    }
    if (!(await hasTrialDemoData(context.tenant.id))) {
      return res.status(409).json({ error: "A base demonstrativa atual não está pronta. Use o reset explícito para recriá-la antes de aplicar a v2." });
    }
    const { seeded, summary } = await upgradeTrialLabDemoData(context.tenant.id, context.user.id);
    clearTenantCache(context.user.id);
    return res.json({
      success: true,
      seeded,
      summary,
      message: seeded
        ? "Base Demonstrativa v2 adicionada ao tenant de teste sem apagar os registros existentes."
        : "A Base Demonstrativa v2 já está atualizada neste tenant.",
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message ?? "Falha ao atualizar a base demonstrativa" });
  }
});

export default router;