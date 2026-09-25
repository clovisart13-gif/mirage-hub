import { Router, type IRouter } from "express";
import { db, configuracoes_empresa, hubCustomerTracking } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";
import { requireAuth, requireSuperAdmin, type AuthenticatedRequest } from "../middlewares/auth";
import { createHubCustomerTrackingTableIfNeeded } from "../migrate";
import { isPublicSignupTenant, trialActivationIssues } from "../services/trial-activation-status";
import { customerTracking } from "../services/customer-tracking";

const router: IRouter = Router();
const technicalEmail = /@auth\.gestaomirage\.local$/i;
const contactSchema = z.object({
  contact_status: z.enum(["novo", "em_contato", "retornar", "concluido"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  next_action_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  is_test: z.boolean().optional(),
}).strict();

function publicEmail(user: any): string | null {
  const email = String(user?.user_metadata?.public_email || user?.email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !technicalEmail.test(email) ? email : null;
}

function contactWhatsapp(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  return /^55\d{10,11}$/.test(normalized) ? normalized : null;
}

function operationalStatus(status: string | null, expiresAt: string | null) {
  const expired = Boolean(expiresAt && new Date(`${expiresAt.slice(0, 10)}T23:59:59`).getTime() < Date.now());
  if (!status) return "cadastro_pendente";
  if (status === "trial") return expired ? "trial_encerrado" : "trial_ativo";
  if (status === "inadimplente" || status === "vencido" || (status === "ativo" && expired)) return "pagamento_atrasado";
  if (status === "ativo") return "ativa";
  return "outro";
}

async function allAuthUsers() {
  const users: any[] = [];
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...(data.users ?? []));
    if ((data.users ?? []).length < 1000) return users;
  }
  throw new Error("O diretório de contas excede o limite da consulta administrativa");
}

async function allTenants() {
  const tenants: any[] = [];
  for (let start = 0; start < 100000; start += 1000) {
    const { data, error } = await supabaseAdmin.from("tenants")
      .select("id, name, slug, plan, assinatura_status, assinatura_expira_em, owner_id, created_at")
      .order("created_at", { ascending: false })
      .range(start, start + 999);
    if (error) throw error;
    tenants.push(...(data ?? []));
    if ((data ?? []).length < 1000) return tenants;
  }
  throw new Error("O diretório de empresas excede o limite da consulta administrativa");
}

async function allCompanyContacts(tenantIds: string[]) {
  const result = new Map<string, { whatsapp: string | null; email: string | null }>();
  for (let start = 0; start < tenantIds.length; start += 500) {
    const rows = await db.select({
      tenant_id: configuracoes_empresa.tenant_id,
      whatsapp: configuracoes_empresa.whatsapp,
      email: configuracoes_empresa.email,
    }).from(configuracoes_empresa)
      .where(inArray(configuracoes_empresa.tenant_id, tenantIds.slice(start, start + 500)));
    for (const row of rows) result.set(row.tenant_id, row);
  }
  return result;
}

function followup(entry?: typeof hubCustomerTracking.$inferSelect) {
  return {
    is_test: entry?.isTest === true,
    contact_status: entry?.contactStatus ?? "novo",
    notes: entry?.notes ?? null,
    next_action_at: entry?.nextActionAt ?? null,
  };
}

router.get("/billing/admin/cadastros", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  try {
    const [tenants, users] = await Promise.all([allTenants(), allAuthUsers()]);
    const usersById = new Map(users.map(user => [user.id, user]));
    const ownerCounts = new Map<string, number>();
    for (const tenant of tenants) if (tenant.owner_id) ownerCounts.set(tenant.owner_id, (ownerCounts.get(tenant.owner_id) ?? 0) + 1);
    const publicSignupIds = new Set(tenants.filter(tenant =>
      isPublicSignupTenant(tenant, usersById.get(tenant.owner_id), ownerCounts.get(tenant.owner_id) ?? 0))
      .map(tenant => tenant.id));
    const [contacts, tracking, activationIssues] = await Promise.all([
      allCompanyContacts(tenants.map(tenant => tenant.id)),
      customerTracking([...tenants.map(tenant => tenant.id), ...users.map(user => `account:${user.id}`)]),
      trialActivationIssues(tenants, publicSignupIds),
    ]);
    const ownedIds = new Set(tenants.map(tenant => tenant.owner_id));
    const items: any[] = tenants.map(tenant => {
      const owner = usersById.get(tenant.owner_id);
      const companyContact = contacts.get(tenant.id);
      const registeredCompany = String(owner?.user_metadata?.company_name ?? "").trim().toLowerCase();
      const matchesCompany = !!registeredCompany && registeredCompany === String(tenant.name ?? "").trim().toLowerCase();
      const ownerContactIsSafe = !!owner && (ownerCounts.get(owner.id) === 1 || matchesCompany);
      const companyEmail = companyContact?.email && !technicalEmail.test(companyContact.email) &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyContact.email) ? companyContact.email : null;
      const isLab = owner?.user_metadata?.is_trial_lab === true &&
        owner?.user_metadata?.trial_lab_tenant_id === tenant.id;
      const saved = followup(tracking.get(tenant.id) ??
        (ownerContactIsSafe ? tracking.get(`account:${tenant.owner_id}`) : undefined));
      return {
        id: tenant.id,
        tenant_id: tenant.id,
        user_id: tenant.owner_id,
        company_name: tenant.name,
        contact_name: owner?.user_metadata?.full_name ?? null,
        email: companyEmail ?? (ownerContactIsSafe ? publicEmail(owner) : null),
        whatsapp: contactWhatsapp(companyContact?.whatsapp) ??
          (ownerContactIsSafe ? contactWhatsapp(owner?.user_metadata?.whatsapp) : null),
        source: ownerContactIsSafe ? owner?.user_metadata?.signup_source ?? null : null,
        created_at: tenant.created_at,
        plan: tenant.plan,
        assinatura_status: tenant.assinatura_status,
        status_operacional: activationIssues.has(tenant.id) ? "cadastro_pendente" :
          operationalStatus(tenant.assinatura_status, tenant.assinatura_expira_em),
        activation_issue: activationIssues.get(tenant.id) ?? null,
        assinatura_expira_em: tenant.assinatura_expira_em,
        ...saved,
        is_trial_lab: isLab,
        is_test: isLab || saved.is_test,
      };
    });

    // Cadastro público concluído sem tenant: a ativação pode ter sido interrompida.
    for (const user of users) {
      if (user.user_metadata?.account_scope !== "mirage" || ownedIds.has(user.id)) continue;
      const saved = followup(tracking.get(`account:${user.id}`));
      items.push({
        id: user.id,
        tenant_id: null,
        user_id: user.id,
        company_name: user.user_metadata?.company_name ?? "Empresa não informada",
        contact_name: user.user_metadata?.full_name ?? null,
        email: publicEmail(user),
        whatsapp: contactWhatsapp(user.user_metadata?.whatsapp),
        source: user.user_metadata?.signup_source ?? null,
        created_at: user.created_at,
        plan: null,
        assinatura_status: null,
        status_operacional: "cadastro_pendente",
        assinatura_expira_em: null,
        ...saved,
        is_trial_lab: user.user_metadata?.is_trial_lab === true,
        is_test: user.user_metadata?.is_trial_lab === true || saved.is_test,
      });
    }
    items.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    res.json({ items });
  } catch (error: any) {
    req.log.error({ error }, "Falha ao consultar cadastros Mirage");
    res.status(500).json({ error: "Não foi possível carregar os cadastros e contatos" });
  }
});

router.patch("/billing/admin/cadastros/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    res.status(400).json({ error: "Dados de acompanhamento inválidos" });
    return;
  }
  const id = String(req.params.id ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)) {
    res.status(400).json({ error: "Identificador inválido" });
    return;
  }
  try {
    const { data: tenant, error: tenantError } = await supabaseAdmin.from("tenants")
      .select("id, owner_id").eq("id", id).maybeSingle();
    if (tenantError) throw tenantError;
    const userId = tenant?.owner_id ?? id;
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    const user = data.user;
    if (!user || (!tenant && user.user_metadata?.account_scope !== "mirage")) {
      res.status(404).json({ error: "Cadastro não encontrado" });
      return;
    }
    const key = tenant?.id ?? `account:${id}`;
    const labTenant = user.user_metadata?.is_trial_lab === true &&
      (!tenant || user.user_metadata?.trial_lab_tenant_id === tenant.id);
    const updates: Partial<typeof hubCustomerTracking.$inferInsert> = {
      updatedAt: new Date(),
      userId,
      tenantId: tenant?.id ?? null,
    };
    if (parsed.data.contact_status !== undefined) updates.contactStatus = parsed.data.contact_status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.next_action_at !== undefined) updates.nextActionAt = parsed.data.next_action_at;
    if (parsed.data.is_test !== undefined) updates.isTest = labTenant || parsed.data.is_test;
    await createHubCustomerTrackingTableIfNeeded();
    await db.insert(hubCustomerTracking).values({ scopeId: key, userId, tenantId: tenant?.id ?? null, ...updates })
      .onConflictDoUpdate({ target: hubCustomerTracking.scopeId, set: updates });
    res.json({ success: true });
  } catch (error: any) {
    req.log.error({ error, id }, "Falha ao salvar acompanhamento Mirage");
    res.status(500).json({ error: "Não foi possível salvar o acompanhamento" });
  }
});

export default router;