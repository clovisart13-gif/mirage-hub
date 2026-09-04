import { Router, type IRouter, type Request, type Response } from "express";
import { supabaseAdmin } from "../../lib/supabase";
import {
  clearTenantCache,
  requireAuth,
  requireTenantAccess,
  requireSuperAdmin,
  requireTenantManager,
  type AuthenticatedRequest,
} from "../../middlewares/auth";
import { logger } from "../../lib/logger";
import { db, pool, configuracoes_empresa } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ensureTrialDemoData, ensureTrialLabDemoData, hasTrialDemoV2Data } from "../../services/trial-demo-seed";

const router: IRouter = Router();

// ─── ASAAS CLIENT ─────────────────────────────────────────────
type AsaasClient = { key: string | null; baseUrl: string; sandbox: boolean };

function productionAsaasClient(): AsaasClient {
  return { key: process.env.ASAAS_API_KEY || null, baseUrl: "https://api.asaas.com/v3", sandbox: false };
}

function sandboxAsaasClient(): AsaasClient {
  return { key: process.env.ASAAS_SANDBOX_API_KEY || null, baseUrl: "https://sandbox.asaas.com/api/v3", sandbox: true };
}

function getAsaasKey(): string | null {
  return productionAsaasClient().key;
}

async function isTrialLabTenant(tenantId: string) {
  const { data: tenant, error } = await supabaseAdmin
    .from("tenants")
    .select("owner_id")
    .eq("id", tenantId)
    .maybeSingle();
  if (error || !(tenant as any)?.owner_id) return false;
  const { data, error: authError } = await supabaseAdmin.auth.admin.getUserById((tenant as any).owner_id);
  return !authError &&
    data.user?.user_metadata?.is_trial_lab === true &&
    data.user?.user_metadata?.trial_lab_tenant_id === tenantId;
}

async function getCheckoutAsaasClient(tenantId: string): Promise<AsaasClient> {
  if (await isTrialLabTenant(tenantId)) {
    const sandbox = sandboxAsaasClient();
    if (!sandbox.key) {
      throw Object.assign(
        new Error("Checkout de teste bloqueado: configure ASAAS_SANDBOX_API_KEY antes de iniciar um pagamento."),
        { status: 503, lab_sandbox_required: true },
      );
    }
    return sandbox;
  }
  return productionAsaasClient();
}

async function asaasFetch<T = any>(path: string, options: RequestInit = {}, client: AsaasClient = productionAsaasClient()): Promise<T> {
  if (!client.key) throw Object.assign(new Error("Asaas não configurado"), { status: 503 });

  const res = await fetch(`${client.baseUrl}${path}`, {
    ...options,
    headers: {
      access_token: client.key,
      "Content-Type": "application/json",
      "User-Agent": "Mirage-Hub/1.0",
      ...(options.headers as Record<string, string> || {}),
    },
  });

  const data = await res.json() as any;
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description || data?.message || JSON.stringify(data);
    throw Object.assign(new Error(msg), { status: res.status, asaas: data });
  }
  return data as T;
}

type CheckoutReference = {
  tenant_id?: string;
  plano_id?: string;
  periodo?: "mensal" | "anual";
};

async function resolveCheckoutReference(payment: any, client: AsaasClient = productionAsaasClient()): Promise<CheckoutReference | null> {
  let rawReference = payment?.externalReference;
  if (!rawReference && payment?.subscription) {
    const subscription = await asaasFetch<any>(`/subscriptions/${payment.subscription}`, {}, client);
    rawReference = subscription.externalReference;
  }
  try {
    const reference = rawReference ? JSON.parse(rawReference) : null;
    return reference && typeof reference.tenant_id === "string" ? reference : null;
  } catch {
    return null;
  }
}

function paymentExpiryDate(payment: any, periodo: "mensal" | "anual"): string {
  const rawDate = payment?.paymentDate || payment?.clientPaymentDate;
  const paidAt = typeof rawDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? new Date(`${rawDate}T12:00:00.000Z`)
    : new Date();
  const days = periodo === "anual" ? 365 : 30;
  return new Date(paidAt.getTime() + days * 86400000).toISOString().slice(0, 10);
}

function normalizeWhatsapp(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  const normalized = digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
  if (!/^55\d{10,11}$/.test(normalized)) {
    throw Object.assign(new Error("Informe um WhatsApp brasileiro válido com DDD"), { status: 400 });
  }
  return normalized;
}

async function saveTenantWhatsapp(
  tenantId: string,
  companyName: string,
  email: string | undefined,
  rawWhatsapp: unknown,
) {
  const whatsapp = normalizeWhatsapp(rawWhatsapp);
  if (!whatsapp) return null;

  const [existing] = await db
    .select({ id: configuracoes_empresa.id })
    .from(configuracoes_empresa)
    .where(eq(configuracoes_empresa.tenant_id, tenantId))
    .limit(1);

  if (existing) {
    await db
      .update(configuracoes_empresa)
      .set({ whatsapp, updated_at: new Date() })
      .where(eq(configuracoes_empresa.tenant_id, tenantId));
  } else {
    await db.insert(configuracoes_empresa).values({
      tenant_id: tenantId,
      nome_empresa: companyName,
      email,
      whatsapp,
    });
  }
  return whatsapp;
}

type TrialCommunicationStatus = "sent" | "not_configured" | "failed";

async function recordTrialLabJourney(userId: string, patch: Record<string, unknown>) {
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  const user = data.user;
  if (error || !user || user.user_metadata?.is_trial_lab !== true) return true;
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...user.user_metadata,
      trial_journey: {
        ...(user.user_metadata?.trial_journey ?? {}),
        ...patch,
        audit_persisted: true,
      },
    },
  });
  if (updateError) {
    logger.error({ err: updateError, userId }, "Falha ao persistir auditoria do Laboratório");
    return false;
  }
  return true;
}

async function sendTrialWelcomeEmail(input: { email: string | undefined; firstName: string; expiresAt: string }): Promise<TrialCommunicationStatus> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !input.email) return "not_configured";
  const welcomeHtml = `
    <div style="font-family:sans-serif;max-width:520px;margin:auto;color:#1a1a1a">
      <h1>Bem-vindo ao Mirage Hub!</h1>
      <p>Olá, <strong>${input.firstName}</strong>! Seu trial de 14 dias foi ativado.</p>
      <p>Você pode explorar Kanban, PLM e Orçamentos até <strong>${input.expiresAt}</strong>.</p>
    </div>
  `;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Mirage Hub <noreply@gestaomirage.com.br>",
        to: input.email,
        subject: "Seu trial de 14 dias começou — Mirage Hub",
        html: welcomeHtml,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? "sent" : "failed";
  } catch (error) {
    logger.warn({ err: error }, "Não foi possível enviar e-mail de boas-vindas do trial");
    return "failed";
  }
}

/** Envia exclusivamente pelo canal Z-API da Mirage; Helena e R2PB não participam deste fluxo. */
async function notifyTrialWelcomeWhatsapp(input: {
  tenantId: string;
  companyName: string;
  whatsapp: string | null;
  expiresAt: string;
}): Promise<TrialCommunicationStatus> {
  const instance = process.env.ZAPI_INSTANCE_MIRAGE;
  const token = process.env.ZAPI_TOKEN_MIRAGE;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN_MIRAGE;
  if (!instance || !token || !clientToken || !input.whatsapp) {
    return "not_configured";
  }

  try {
    const response = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": clientToken,
      },
      body: JSON.stringify({
        phone: input.whatsapp,
        message: `Olá! O trial da ${input.companyName} está ativo no Mirage Hub até ${input.expiresAt}. Bem-vindo(a)!`,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      logger.warn(
        { tenantId: input.tenantId, status: response.status },
        "Canal WhatsApp próprio da Mirage recusou a mensagem de boas-vindas",
      );
      return "failed";
    }

    return "sent";
  } catch (error) {
    logger.warn(
      { err: error, tenantId: input.tenantId },
      "Não foi possível enviar a mensagem de boas-vindas pelo canal Mirage",
    );
    return "failed";
  }
}

// ─── CATÁLOGO DE PLANOS ───────────────────────────────────────
// Planos anuais: 20% de desconto e sem taxa de implantação
export const PLANOS = [
  {
    id: "starter",
    nome: "Starter",
    descricao: "Para confecções que estão começando",
    preco_mensal: 197,
    preco_anual: Math.round(197 * 12 * 0.8), // R$1.891,20/ano
    apps_incluidos: ["kanban", "orcamento", "comunidade"],
    limites: { usuarios: 3, referencias_kanban: 50, orcamentos_mes: 20 },
  },
  {
    id: "pro",
    nome: "Pro",
    descricao: "Para confecções em crescimento",
    preco_mensal: 397,
    preco_anual: Math.round(397 * 12 * 0.8), // R$3.811,20/ano
    apps_incluidos: ["kanban", "orcamento", "comunidade", "plm", "financeiro"],
    limites: { usuarios: 10, referencias_kanban: 300, orcamentos_mes: 100 },
  },
  {
    id: "enterprise",
    nome: "Enterprise",
    descricao: "Para grandes operações e redes de confecção",
    preco_mensal: 797,
    preco_anual: Math.round(797 * 12 * 0.8), // R$7.651,20/ano
    apps_incluidos: ["kanban", "orcamento", "comunidade", "plm", "crm", "erp", "financeiro"],
    limites: { usuarios: -1, referencias_kanban: -1, orcamentos_mes: -1 },
  },
];

// Entitlements do trial não são o plano Starter: são uma experiência própria,
// com módulos operacionais suficientes para o usuário avaliar o Hub.
export const TRIAL_APPS = ["kanban", "orcamento", "plm"] as const;

function effectiveAppsForSubscription(status: string, apps: any[] | null | undefined) {
  const current = apps ?? [];
  if (status !== "trial") return current;

  const byKey = new Map<string, any>(
    current.map((app: any) => [app.app_key, app]),
  );
  for (const appKey of TRIAL_APPS) {
    if (!byKey.has(appKey)) byKey.set(appKey, { app_key: appKey, activated_at: null });
  }
  return Array.from(byKey.values());
}

function effectivePlanId(status: string, storedPlan: string | null | undefined) {
  return status === "trial" ? "trial" : (storedPlan ?? "sem_plano");
}

function calendarDaysUntil(dateValue: string | null | undefined) {
  if (!dateValue) return null;
  const [year, month, day] = dateValue.slice(0, 10).split("-").map(Number);
  const endUtc = Date.UTC(year, month - 1, day);
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endUtc - todayUtc) / 86400000);
}

type SubscriptionSituation = {
  key: "trial_ativo" | "trial_encerrado" | "ativa" | "pagamento_atrasado" | "outro";
  label: string;
  accessAllowed: boolean;
  message: string | null;
};

function subscriptionSituation(
  status: string | null | undefined,
  expiresAt: string | null | undefined,
): SubscriptionSituation {
  const normalizedStatus = status ?? "trial";
  const daysRemaining = calendarDaysUntil(expiresAt);
  const expired = daysRemaining !== null && daysRemaining < 0;

  if (normalizedStatus === "trial") {
    return expired
      ? {
          key: "trial_encerrado",
          label: "Trial encerrado",
          accessAllowed: false,
          message: "Seu trial de 14 dias terminou. Escolha um plano para continuar usando o Mirage Hub.",
        }
      : {
          key: "trial_ativo",
          label: "Trial ativo",
          accessAllowed: true,
          message: null,
        };
  }

  if (
    normalizedStatus === "inadimplente" ||
    normalizedStatus === "vencido" ||
    (normalizedStatus === "ativo" && expired)
  ) {
    return {
      key: "pagamento_atrasado",
      label: "Pagamento atrasado",
      accessAllowed: true,
      message: "Há um pagamento atrasado. O acesso continua liberado até uma decisão manual do administrador.",
    };
  }

  if (normalizedStatus === "ativo") {
    return { key: "ativa", label: "Ativa", accessAllowed: true, message: null };
  }

  return {
    key: "outro",
    label: normalizedStatus === "cancelado" ? "Cancelada" : "Sem acesso",
    accessAllowed: false,
    message: null,
  };
}

// ─── CATÁLOGO DE MÓDULOS AVULSOS ─────────────────────────────
// Módulo avulso: pode ser contratado com ou sem plano ativo.
// Anual: 20% desconto + sem taxa de implantação.
export const MODULOS_AVULSOS = [
  { id: "crm",       nome: "CRM Mirage",          app_key: "crm",       preco_mensal: 297, implantacao: 997, descricao: "Gestão completa de relacionamento com clientes" },
  { id: "plm",       nome: "PLM Mirage",          app_key: "plm",       preco_mensal: 77,  implantacao: 397, descricao: "Product Lifecycle Management — fichas técnicas, materiais & custos, pilotagem" },
  { id: "orcamento", nome: "Orçamento Mirage",    app_key: "orcamento", preco_mensal: 77,  implantacao: 0,   descricao: "Gerador de fichas de custo e orçamentos com envio por e-mail" },
  { id: "kanban",    nome: "Kanban Mirage",        app_key: "kanban",    preco_mensal: 147, implantacao: 997, descricao: "Gestão de ordens de produção em 14 fases" },
  { id: "erp",       nome: "ERP Mirage",           app_key: "erp",       preco_mensal: 197, implantacao: 497, descricao: "ERP integrado para controle financeiro e estoque" },
  { id: "comunidade",  nome: "Moda Conecta",         app_key: "comunidade",  preco_mensal: 47,  implantacao: 0,   descricao: "Rede de fornecedores, vagas, portfólio e comunidade" },
  { id: "financeiro",  nome: "Financeiro Mirage",    app_key: "financeiro",  preco_mensal: 97,  implantacao: 0,   descricao: "Gestão financeira: extrato OFX, classificação automática, fluxo de caixa, conciliação bancária" },
];

// ─── CATÁLOGO DE EXTRAS ──────────────────────────────────────
export const EXTRAS_CATALOGO = [
  { id: "usuario_adicional", nome: "Usuário adicional", preco_mensal: 39,  descricao: "Adicione mais 1 usuário ao seu plano ou pacote" },
  { id: "canal_adicional",   nome: "Canal adicional",   preco_mensal: 49,  descricao: "Adicione 1 canal de comunicação (WhatsApp, etc.)" },
];

// ─── HELPER: ativar plano no banco ───────────────────────────
async function ativarPlano(tenantId: string, planoId: string, expiraEm: string) {
  const plano = PLANOS.find(p => p.id === planoId);
  if (!plano) { console.error("❌ ativarPlano: plano não encontrado:", planoId); return; }

  console.log(`🔄 ativarPlano: tenant=${tenantId} plano=${planoId} expira=${expiraEm}`);

  for (const app_key of plano.apps_incluidos) {
    const { error: appErr } = await supabaseAdmin.from("tenant_apps").upsert({
      tenant_id: tenantId,
      app_key,
      active: true,
      activated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,app_key" });
    if (appErr) console.error(`❌ ativarPlano tenant_apps upsert (${app_key}):`, appErr.message);
  }

  // Colunas: "plan" e "assinatura_status"/"assinatura_expira_em" (estas precisam existir no banco)
  const { error: tenantErr } = await supabaseAdmin.from("tenants").update({
    plan: planoId,
    assinatura_status: "ativo",
    assinatura_expira_em: expiraEm,
  } as any).eq("id", tenantId);

  if (tenantErr) console.error("❌ ativarPlano tenants update:", tenantErr.message);
  else console.log(`✅ ativarPlano: tenant ${tenantId} atualizado com sucesso`);

  // ─── Provisioning VhSys ERP (API real) ───────────────────────────────────
  // Quando o plano inclui "erp", cria o cliente no VhSys automaticamente.
  // Busca dados do tenant (owner_id em vez de email — email não existe na tabela tenants)
  const { data: tenantData } = await supabaseAdmin
    .from("tenants")
    .select("name, slug, owner_id")
    .eq("id", tenantId)
    .single();

  // Resolve email do dono via Supabase Auth (owner_id → auth.users)
  let ownerEmail: string | null = null;
  if (tenantData?.owner_id) {
    const { data: ownerAuth } = await supabaseAdmin.auth.admin.getUserById(tenantData.owner_id as string);
    ownerEmail = ownerAuth?.user?.email ?? null;
  }

  // ─── Provisioning VhSys ERP (API real) ───────────────────────────────────
  if (plano.apps_incluidos.includes("erp")) {
    const vhsysToken = process.env.VHSYS_ACCESS_TOKEN;
    const vhsysSecret = process.env.VHSYS_SECRET_ACCESS_TOKEN;
    if (vhsysToken && vhsysSecret) {
      if (tenantData) {
        await supabaseAdmin.from("provisioning_queue" as any).insert({
          tenant_id: tenantId,
          app: "erp",
          status: "pending",
          tenant_name: (tenantData as any).name,
          tenant_email: ownerEmail,
          plan: planoId,
          expira_em: expiraEm,
          created_at: new Date().toISOString(),
        }).then(() => {}).catch(() => {});

        fetch("https://api.vhsys.com/v2/clientes", {
          method: "POST",
          headers: {
            "access-token": vhsysToken,
            "secret-access-token": vhsysSecret,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            razao_cliente: (tenantData as any).name,
            email_cliente: ownerEmail,
            tipo_pessoa: "PJ",
            tipo_cadastro: "Cliente",
            situacao_cliente: "Ativo",
          }),
        })
          .then(async (r) => {
            const data = await r.json() as any;
            if (data?.data?.id_cliente) {
              console.log(`✅ VhSys: cliente criado id=${data.data.id_cliente} para tenant=${tenantId}`);
              await supabaseAdmin.from("provisioning_queue" as any)
                .update({ status: "done", external_id: String(data.data.id_cliente), done_at: new Date().toISOString() })
                .eq("tenant_id", tenantId).eq("app", "erp");
            } else {
              console.log(`⚠️ VhSys: cliente não criado (provavelmente já existe) para tenant=${tenantId}`, data?.message || "");
            }
          })
          .catch((e: any) => console.error("❌ VhSys provisioning falhou:", e.message));
      }
    } else {
      console.log("⚠️ VHSYS_ACCESS_TOKEN não configurado — provisionamento ERP pulado");
    }
  }

  // ─── Provisionamento CRM Helena (fila manual) ──────────────────────────────
  if (plano.apps_incluidos.includes("crm")) {
    if (tenantData) {
      await supabaseAdmin.from("provisioning_queue" as any).insert({
        tenant_id: tenantId,
        app: "crm",
        status: "pending",
        tenant_name: (tenantData as any).name,
        tenant_email: ownerEmail,
        plan: planoId,
        expira_em: expiraEm,
        created_at: new Date().toISOString(),
      }).then(() => {}).catch(() => {});
      console.log(`📋 CRM Helena: tarefa criada na fila de provisionamento para tenant=${tenantId}`);
    }
  }
}

// ─── HELPER: gerar slug único ────────────────────────────────
function gerarSlug(nome: string): string {
  const base = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

// ─── TRIAL AUTOMÁTICO ────────────────────────────────────────
// Cria tenant + ativa 14 dias de trial para novos cadastros

router.post("/billing/trial/ativar", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const requestedCompanyName = typeof req.body?.company_name === "string"
    ? req.body.company_name.trim()
    : "";
  const requestedWhatsapp = req.body?.whatsapp;

  if (!userId) { res.status(401).json({ error: "Usuário não autenticado" }); return; }
  let normalizedRequestedWhatsapp: string | null = null;
  try {
    normalizedRequestedWhatsapp = normalizeWhatsapp(requestedWhatsapp);
    if (requestedCompanyName && !normalizedRequestedWhatsapp) {
      res.status(400).json({ error: "WhatsApp é obrigatório para criar o workspace Mirage" });
      return;
    }
  } catch (error: any) {
    res.status(error?.status || 400).json({ error: error?.message || "WhatsApp inválido" });
    return;
  }

  // Busca nome completo do usuário via Supabase Auth (user_metadata.full_name)
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
  const userEmail = authUser?.user?.user_metadata?.public_email || req.user?.email;
  const fullName: string = authUser?.user?.user_metadata?.full_name || userEmail?.split("@")[0] || "minha-empresa";
  const companyName: string = requestedCompanyName || authUser?.user?.user_metadata?.company_name || fullName;
  const isTrialLabUser = authUser?.user?.user_metadata?.is_trial_lab === true;
  const expectedLabEmail = process.env.MIRAGE_TRIAL_LAB_EMAIL?.trim().toLowerCase();
  const expectedLabCompany = process.env.MIRAGE_TRIAL_LAB_COMPANY_NAME?.trim().toLowerCase();
  const expectedLabWhatsapp = (process.env.MIRAGE_TRIAL_LAB_WHATSAPP || "").replace(/\D/g, "");
  if (
    isTrialLabUser &&
    (
      userEmail?.trim().toLowerCase() !== expectedLabEmail ||
      companyName.trim().toLowerCase() !== expectedLabCompany ||
      normalizedRequestedWhatsapp !== expectedLabWhatsapp
    )
  ) {
    res.status(409).json({ error: "A identidade reservada do Laboratório exige o e-mail, empresa e WhatsApp configurados." });
    return;
  }
  const reservedLabTenantId = isTrialLabUser
    ? authUser?.user?.user_metadata?.trial_lab_tenant_id
    : undefined;

  // Um login pode participar de várias empresas. A LP só pode reaproveitar um
  // workspace criado pelo próprio fluxo Mirage (slug mirage-*). Nunca usamos
  // um tenant operacional de outro vínculo, como R2PB, mesmo que o nome seja
  // igual.
  let existingTenantQuery = supabaseAdmin
    .from("tenants")
    .select("id, name, slug, plan, assinatura_status, assinatura_expira_em")
    .eq("owner_id", userId);
  const { data: existingTenant } = reservedLabTenantId
    ? await existingTenantQuery.eq("id", reservedLabTenantId).maybeSingle()
    : await existingTenantQuery
        .eq("name", companyName)
        .like("slug", "mirage-%")
        .limit(1)
        .maybeSingle();

  if (existingTenant) {
    const { error: membershipError } = await supabaseAdmin
      .from("tenant_users")
      .upsert(
        { tenant_id: existingTenant.id, user_id: userId, role: "owner" },
        { onConflict: "tenant_id,user_id" },
      );

    if (membershipError) {
      res.status(500).json({ error: "Não foi possível recuperar o acesso à empresa" });
      return;
    }

    try {
      await saveTenantWhatsapp(existingTenant.id, companyName, userEmail, normalizedRequestedWhatsapp);
      if ((existingTenant as any).assinatura_status === "trial") {
        await (isTrialLabUser
          ? ensureTrialLabDemoData((existingTenant as any).id, userId)
          : ensureTrialDemoData((existingTenant as any).id));
      }
    } catch (error: any) {
      res.status(error?.status || 500).json({ error: error?.message || "Não foi possível salvar o WhatsApp da empresa" });
      return;
    }

    clearTenantCache(userId);
    res.json({ ok: true, ja_existia: true, tenant: existingTenant });
    return;
  }

  // Cria uma empresa nova com trial de 14 dias. O usuário pode já pertencer
  // a outros tenants; isso não deve bloquear nem redirecionar este cadastro.
  const slug = gerarSlug(`mirage-${companyName}`);
  const expiraEm = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  const { data: tenant, error: tenantErr } = await supabaseAdmin
    .from("tenants")
    .insert({
      name: companyName,
      slug,
      plan: "starter",
      assinatura_status: "trial",
      assinatura_expira_em: expiraEm,
      owner_id: userId,
    } as any)
    .select()
    .single();

  if (tenantErr || !tenant) {
    res.status(500).json({ error: tenantErr?.message || "Erro ao criar tenant" });
    return;
  }

  // Adiciona o usuário como owner do novo tenant, sem alterar memberships existentes.
  const { error: memErr } = await supabaseAdmin
    .from("tenant_users")
    .upsert(
      { tenant_id: (tenant as any).id, user_id: userId, role: "owner" },
      { onConflict: "tenant_id,user_id" },
    );

  if (memErr) {
    res.status(500).json({ error: "Empresa criada, mas não foi possível conceder o acesso do proprietário" });
    return;
  }

  if (isTrialLabUser) {
    const { error: markerError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...authUser?.user?.user_metadata,
        trial_lab_tenant_id: (tenant as any).id,
      },
    });
    if (markerError) {
      await supabaseAdmin.from("tenant_users").delete().eq("tenant_id", (tenant as any).id).eq("user_id", userId);
      await supabaseAdmin.from("tenants").delete().eq("id", (tenant as any).id).eq("owner_id", userId);
      res.status(500).json({ error: "Não foi possível registrar o vínculo seguro do tenant de teste." });
      return;
    }
  }

  let savedWhatsapp: string | null = null;
  try {
    savedWhatsapp = await saveTenantWhatsapp((tenant as any).id, companyName, userEmail, normalizedRequestedWhatsapp);
  } catch (error: any) {
    await supabaseAdmin.from("tenant_users").delete().eq("tenant_id", (tenant as any).id).eq("user_id", userId);
    await supabaseAdmin.from("tenants").delete().eq("id", (tenant as any).id);
    res.status(error?.status || 500).json({ error: error?.message || "Não foi possível salvar o WhatsApp da empresa" });
    return;
  }

  clearTenantCache(userId);

  // Ativa os módulos próprios do trial, sem transformar o trial em Starter.
  for (const app_key of TRIAL_APPS) {
    await supabaseAdmin.from("tenant_apps").upsert(
      { tenant_id: (tenant as any).id, app_key, active: true, activated_at: new Date().toISOString() },
      { onConflict: "tenant_id,app_key" }
    );
  }

  try {
    await (isTrialLabUser
      ? ensureTrialLabDemoData((tenant as any).id, userId)
      : ensureTrialDemoData((tenant as any).id));
  } catch (error: any) {
    logger.error({ err: error, tenantId: (tenant as any).id }, "Não foi possível criar a base demonstrativa do trial");
    res.status(500).json({
      error: "Sua conta foi criada, mas a base demonstrativa não pôde ser preparada. Tente ativar novamente em alguns instantes.",
    });
    return;
  }

  logger.info({ event: "trial_ativado", tenantId: (tenant as any).id, userId, expiraEm }, "Trial ativado");

  const emailWelcome = await sendTrialWelcomeEmail({
    email: userEmail,
    firstName: (fullName || "").split(/[\s\-_]/)[0] || "Olá",
    expiresAt: expiraEm,
  });

  const whatsappWelcome = await notifyTrialWelcomeWhatsapp({
    tenantId: (tenant as any).id,
    companyName,
    whatsapp: savedWhatsapp,
    expiresAt: expiraEm,
  });
  const auditPersisted = await recordTrialLabJourney(userId, {
    email: { status: emailWelcome, at: new Date().toISOString() },
    whatsapp: { status: whatsappWelcome, at: new Date().toISOString() },
  });

  res.json({
    ok: true,
    ja_existia: false,
    trial_dias: 14,
    expira_em: expiraEm,
    apps_liberados: TRIAL_APPS,
    tenant,
    comunicacoes: {
      email: emailWelcome,
      whatsapp: whatsappWelcome,
      audit_persisted: auditPersisted,
    },
  });
});

// ─── ROTAS PÚBLICAS ──────────────────────────────────────────

router.get("/billing/planos", async (_req, res) => {
  res.json({
    asaas_enabled: !!getAsaasKey(),
    asaas_sandbox: false,
    planos: PLANOS,
    moeda: "BRL",
  });
});

router.get("/billing/planos/:id", async (req, res) => {
  const plano = PLANOS.find(p => p.id === req.params.id);
  if (!plano) { res.status(404).json({ error: "Plano não encontrado" }); return; }
  res.json(plano);
});

// ─── CATÁLOGO COMPLETO (planos + módulos + extras) ─────────
router.get("/billing/catalogo", async (_req, res) => {
  res.json({
    planos: PLANOS.map(p => ({
      ...p,
      preco_anual_mensal: Math.round(p.preco_anual / 12), // valor mensal equivalente no anual
    })),
    modulos: MODULOS_AVULSOS.map(m => ({
      ...m,
      preco_anual: Math.round(m.preco_mensal * 12 * 0.8),
      preco_anual_mensal: Math.round(m.preco_mensal * 0.8),
    })),
    extras: EXTRAS_CATALOGO.map(e => ({
      ...e,
      preco_anual: Math.round(e.preco_mensal * 12 * 0.8),
      preco_anual_mensal: Math.round(e.preco_mensal * 0.8),
    })),
    desconto_anual_pct: 20,
    moeda: "BRL",
  });
});

// ─── ADDON: ativar módulo avulso no tenant ─────────────────
async function ativarAddon(tenantId: string, itemId: string, tipo: "modulo" | "extra", quantidade: number) {
  const modulo = tipo === "modulo" ? MODULOS_AVULSOS.find(m => m.id === itemId) : null;
  const extra  = tipo === "extra"  ? EXTRAS_CATALOGO.find(e => e.id === itemId) : null;
  const precoMensal = modulo?.preco_mensal ?? extra?.preco_mensal ?? 0;
  const appKey = modulo?.app_key ?? null;

  // Registra na tabela addon_subscriptions
  await supabaseAdmin.from("addon_subscriptions" as any).upsert({
    tenant_id: tenantId,
    tipo,
    item_id: itemId,
    app_key: appKey,
    quantidade,
    preco_mensal: precoMensal,
    status: "ativo",
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,tipo,item_id" });

  // Se for módulo, libera acesso no tenant_apps
  if (appKey) {
    await supabaseAdmin.from("tenant_apps").upsert(
      { tenant_id: tenantId, app_key: appKey, active: true, activated_at: new Date().toISOString() },
      { onConflict: "tenant_id,app_key" }
    );
  }

  // Se for usuário extra, incrementa no tenant (graceful: coluna pode ainda não existir)
  if (itemId === "usuario_adicional") {
    const { data: t, error: tErr } = await supabaseAdmin.from("tenants").select("usuarios_extras").eq("id", tenantId).single();
    if (!tErr) {
      const atual = (t as any)?.usuarios_extras ?? 0;
      await supabaseAdmin.from("tenants").update({ usuarios_extras: atual + quantidade } as any).eq("id", tenantId);
    }
    // else: coluna não existe ainda — o addon_subscriptions já registrou, schema migration pendente
  }

  // Se for canal extra, incrementa no tenant (graceful)
  if (itemId === "canal_adicional") {
    const { data: t, error: tErr } = await supabaseAdmin.from("tenants").select("canais_extras").eq("id", tenantId).single();
    if (!tErr) {
      const atual = (t as any)?.canais_extras ?? 0;
      await supabaseAdmin.from("tenants").update({ canais_extras: atual + quantidade } as any).eq("id", tenantId);
    }
  }

  // Provisioning VhSys/Helena se módulo ERP ou CRM
  if (appKey === "erp" || appKey === "crm") {
    await ativarPlano(tenantId, "enterprise", new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0])
      .catch(() => {});
  }
}

// ─── ASSINATURA DO TENANT ─────────────────────────────────────

router.get("/billing/assinatura", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from("tenants")
    .select("id, name, plan, assinatura_status, assinatura_expira_em")
    .eq("id", req.tenantId!)
    .single();

  if (tenantError || !tenant) {
    console.error("❌ /billing/assinatura - tenantId:", req.tenantId, "erro:", tenantError?.message);
    res.status(404).json({ error: "Tenant não encontrado", tenantId: req.tenantId, supabase_error: tenantError?.message });
    return;
  }

  const subscriptionStatus = (tenant as any).assinatura_status ?? "trial";
  const situation = subscriptionSituation(
    subscriptionStatus,
    (tenant as any).assinatura_expira_em,
  );
  if (subscriptionStatus === "trial" && await isTrialLabTenant((tenant as any).id)) {
    try {
      if (!(await hasTrialDemoV2Data((tenant as any).id))) {
        await ensureTrialLabDemoData((tenant as any).id);
        logger.info({ tenantId: (tenant as any).id, version: "v2" }, "Base demonstrativa do Laboratório reparada ao retomar o trial");
      }
    } catch (error) {
      logger.error({ err: error, tenantId: (tenant as any).id }, "Não foi possível reparar a base demonstrativa do Laboratório");
      res.status(500).json({ error: "A base demonstrativa do Laboratório ainda não pôde ser concluída. Tente novamente em alguns instantes." });
      return;
    }
  }
  const planId = effectivePlanId(subscriptionStatus, (tenant as any).plan);
  const planoAtual = PLANOS.find(p => p.id === planId) ?? null;

  const { data: storedApps } = await supabaseAdmin
    .from("tenant_apps")
    .select("app_key, activated_at")
    .eq("tenant_id", req.tenantId!)
    .eq("active", true);
  const appsAtivos = situation.accessAllowed
    ? effectiveAppsForSubscription(subscriptionStatus, storedApps)
    : [];

  res.json({
    tenant_id: tenant.id,
    nome: (tenant as any).name,
    plano: planId,
    status: subscriptionStatus,
    situacao: situation.key,
    situacao_label: situation.label,
    access_allowed: situation.accessAllowed,
    status_message: situation.message,
    expira_em: (tenant as any).assinatura_expira_em ?? null,
    plano_detalhes: planoAtual,
    apps_ativos: appsAtivos ?? [],
    asaas_enabled: !!getAsaasKey(),
    asaas_sandbox: false,
  });
});

// ─── FATURAS / HISTÓRICO ASAAS ───────────────────────────────

router.get("/billing/assinatura/faturas", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { data: tenant } = await supabaseAdmin
    .from("tenants")
    .select("id, name, plan, assinatura_status, assinatura_expira_em")
    .eq("id", req.tenantId!)
    .single();

  if (!tenant) { res.status(404).json({ error: "Tenant não encontrado" }); return; }

  const userEmail = req.user?.email;
  let faturas: any[] = [];
  let customerPortalUrl: string | null = null;
  let assinaturaAsaasId: string | null = null;

  if (getAsaasKey() && userEmail) {
    try {
      const clientes = await asaasFetch<any>(`/customers?email=${encodeURIComponent(userEmail)}&limit=5`);
      const cliente = clientes.data?.[0];

      if (cliente) {
        customerPortalUrl = `https://www.asaas.com/c/${cliente.id}`;
        const pagamentos = await asaasFetch<any>(`/payments?customer=${cliente.id}&limit=12`);
        faturas = (pagamentos.data || []).map((p: any) => ({
          id: p.id,
          descricao: p.description || "Assinatura Mirage Hub",
          valor: p.value,
          vencimento: p.dueDate,
          data_pagamento: p.paymentDate,
          status: p.status,
          forma_pagamento: p.billingType,
          invoice_url: p.invoiceUrl,
          boleto_url: p.bankSlipUrl,
        }));

        const assinaturas = await asaasFetch<any>(`/subscriptions?customer=${cliente.id}&limit=1`);
        assinaturaAsaasId = assinaturas.data?.[0]?.id || null;
      }
    } catch { /* Asaas indisponível — retorna sem histórico */ }
  }

  const subscriptionStatus = (tenant as any).assinatura_status ?? "trial";
  const situation = subscriptionSituation(subscriptionStatus, (tenant as any).assinatura_expira_em);
  const planId = effectivePlanId(subscriptionStatus, (tenant as any).plan);
  const planoAtual = PLANOS.find(p => p.id === planId) ?? null;

  const [{ data: storedApps }, { data: addons }] = await Promise.all([
    supabaseAdmin.from("tenant_apps").select("app_key, activated_at").eq("tenant_id", req.tenantId!).eq("active", true),
    supabaseAdmin.from("addon_subscriptions" as any).select("*").eq("tenant_id", req.tenantId!).eq("status", "ativo"),
  ]);
  const appsAtivos = situation.accessAllowed
    ? effectiveAppsForSubscription(subscriptionStatus, storedApps)
    : [];

  // Separar módulos avulsos de extras
  const modulosAtivos = (addons ?? []).filter((a: any) => a.tipo === "modulo");
  const extrasAtivos  = (addons ?? []).filter((a: any) => a.tipo === "extra");

  const expiraEm = (tenant as any).assinatura_expira_em;
  const diasRestantes = calendarDaysUntil(expiraEm);

  res.json({
    tenant_id: tenant.id,
    nome: (tenant as any).name,
    plano: planId,
    plano_detalhes: planoAtual,
    status: subscriptionStatus,
    situacao: situation.key,
    situacao_label: situation.label,
    access_allowed: situation.accessAllowed,
    status_message: situation.message,
    expira_em: expiraEm,
    dias_restantes: diasRestantes,
    apps_ativos: appsAtivos ?? [],
    modulos_ativos: modulosAtivos,
    extras_ativos: extrasAtivos,
    usuarios_extras: (tenant as any).usuarios_extras ?? 0,
    canais_extras: (tenant as any).canais_extras ?? 0,
    faturas,
    customer_portal_url: customerPortalUrl,
    assinatura_asaas_id: assinaturaAsaasId,
    asaas_enabled: !!getAsaasKey(),
  });
});

// ─── CHECKOUT ASAAS ──────────────────────────────────────────
// Cria cliente + assinatura no Asaas e retorna dados do pagamento

router.post("/billing/checkout/criar-sessao", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { plano_id, modulos, extras, periodo = "mensal", tenant_id, forma_pagamento = "PIX", dados_empresa } = req.body;
  if (!tenant_id) {
    res.status(400).json({ error: "tenant_id é obrigatório" });
    return;
  }
  if (!await requireTenantManager(req, res, tenant_id)) return;
  let asaasClient: AsaasClient;
  try {
    asaasClient = await getCheckoutAsaasClient(tenant_id);
    if (!asaasClient.key) {
      res.status(503).json({ error: "Pagamento online não configurado. Entre em contato via WhatsApp.", asaas_disabled: true });
      return;
    }
  } catch (error: any) {
    res.status(error?.status || 500).json({ error: error?.message, lab_sandbox_required: error?.lab_sandbox_required === true });
    return;
  }

  // ── Modo modular / extras (sem plano_id obrigatório) ─────────────────────
  if (!plano_id && (modulos?.length > 0 || extras)) {
    const cnpjLimpo = (dados_empresa?.cnpj || "").replace(/\D/g, "");
    const hoje = new Date().toISOString().split("T")[0];
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Calcular valor total
    let valorTotal = 0;
    const linhas: string[] = [];
    if (Array.isArray(modulos)) {
      for (const id of modulos) {
        const m = MODULOS_AVULSOS.find(x => x.id === id);
        if (m) {
          const preco = periodo === "anual" ? Math.round(m.preco_mensal * 12 * 0.8) : m.preco_mensal;
          valorTotal += preco;
          linhas.push(`${m.nome} (R$${preco}/${periodo === "anual" ? "ano" : "mês"})`);
        }
      }
    }
    const ADDON_PRECOS: Record<string, number> = { usuario_adicional: 39, canal_adicional: 49 };
    if (extras && typeof extras === "object") {
      for (const [key, qtd] of Object.entries(extras)) {
        if ((qtd as number) > 0 && ADDON_PRECOS[key]) {
          const preco = ADDON_PRECOS[key] * (qtd as number);
          valorTotal += preco;
          linhas.push(`${key} ×${qtd} (R$${preco}/mês)`);
        }
      }
    }
    if (valorTotal <= 0) { res.status(400).json({ error: "Nenhum item com valor calculado" }); return; }

    const externalRef = JSON.stringify({ tenant_id: tenant_id || "", modulos: modulos || [], extras: extras || {}, periodo });

    try {
      // Buscar/criar cliente Asaas
      let asaasCustomerId: string;
      let clienteExistente: any = null;
      if (cnpjLimpo.length >= 11) {
        try {
          const busca = await asaasFetch<any>(`/customers?cpfCnpj=${cnpjLimpo}&limit=1`, {}, asaasClient);
          clienteExistente = busca.data?.[0] || null;
        } catch {}
      }
      if (clienteExistente) {
        asaasCustomerId = clienteExistente.id;
      } else {
        const novoCliente = await asaasFetch<any>("/customers", {
          method: "POST",
          body: JSON.stringify({
            name: dados_empresa?.razao_social || "Cliente Mirage",
            email: dados_empresa?.email || req.user?.email,
            phone: (dados_empresa?.telefone || "").replace(/\D/g, "") || undefined,
            cpfCnpj: cnpjLimpo || undefined,
            notificationDisabled: false,
            externalReference: tenant_id || "",
          }),
        }, asaasClient);
        asaasCustomerId = novoCliente.id;
      }

      const assinatura = await asaasFetch<any>("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: forma_pagamento,
          value: valorTotal,
          nextDueDate: hoje,
          cycle: "MONTHLY",
          description: `Mirage Hub — ${linhas.join(", ")}`,
          externalReference: externalRef,
        }),
      }, asaasClient);

      const pagamentos = await asaasFetch<any>(`/subscriptions/${assinatura.id}/payments?limit=1`, {}, asaasClient);
      const pagamento = pagamentos.data?.[0];
      if (!pagamento) throw new Error("Nenhum pagamento gerado");

      const resposta: any = { tipo: forma_pagamento.toLowerCase(), payment_id: pagamento.id, assinatura_id: assinatura.id, tenant_id: tenant_id || "", modulos, extras, valor: valorTotal };

      if (forma_pagamento === "PIX") {
        resposta.pix = { invoice_url: pagamento.invoiceUrl };
        for (let t = 1; t <= 3; t++) {
          await delay(t * 1500);
          try {
            const pix = await asaasFetch<any>(`/payments/${pagamento.id}/pixQrCode`, {}, asaasClient);
            if (pix.encodedImage) {
              resposta.pix = { qr_code_base64: pix.encodedImage, chave_copia_cola: pix.payload, expiracao: pix.expirationDate, invoice_url: pagamento.invoiceUrl };
              break;
            }
          } catch {}
        }
      } else if (forma_pagamento === "BOLETO") {
        resposta.boleto = { url: pagamento.bankSlipUrl || pagamento.invoiceUrl, codigo_barras: pagamento.nossoNumero || "", vencimento: pagamento.dueDate, invoice_url: pagamento.invoiceUrl };
      } else if (forma_pagamento === "CREDIT_CARD") {
        resposta.redirect_url = pagamento.invoiceUrl;
      }

      res.json(resposta);
      return;
    } catch (err: any) {
      console.error("Asaas checkout modular error:", err?.asaas || err?.message);
      res.status(err?.status || 500).json({ error: err.message });
      return;
    }
  }

  // ── Modo plano fixo (comportamento original) ──────────────────────────────
  const plano = PLANOS.find(p => p.id === plano_id);
  if (!plano) { res.status(400).json({ error: "Plano inválido" }); return; }

  const valor = periodo === "anual" ? plano.preco_anual : plano.preco_mensal;
  const cnpjLimpo = (dados_empresa?.cnpj || "").replace(/\D/g, "");
  const hoje = new Date().toISOString().split("T")[0];

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  try {
    // 1. Buscar ou criar cliente no Asaas
    let asaasCustomerId: string;

    // Só busca por CNPJ se ele for válido (mín. 11 dígitos)
    let clienteExistente: any = null;
    if (cnpjLimpo.length >= 11) {
      try {
        const busca = await asaasFetch<any>(`/customers?cpfCnpj=${cnpjLimpo}&limit=1`, {}, asaasClient);
        clienteExistente = busca.data?.[0] || null;
      } catch {
        // CNPJ inválido no Asaas — ignora e cria novo cliente
      }
    }

    if (clienteExistente) {
      asaasCustomerId = clienteExistente.id;
    } else {
      const novoCliente = await asaasFetch<any>("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: dados_empresa?.nome || req.user?.name || "Cliente Mirage",
          email: dados_empresa?.email || req.user?.email,
          phone: (dados_empresa?.telefone || "").replace(/\D/g, "") || undefined,
          mobilePhone: (dados_empresa?.telefone || "").replace(/\D/g, "") || undefined,
          cpfCnpj: cnpjLimpo || undefined,
          notificationDisabled: false,
          externalReference: tenant_id || "",
        }),
      }, asaasClient);
      asaasCustomerId = novoCliente.id;
    }

    // 2. Criar assinatura no Asaas
    const assinatura = await asaasFetch<any>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: forma_pagamento, // PIX | BOLETO | CREDIT_CARD
        value: valor,
        nextDueDate: hoje,
        cycle: "MONTHLY",
        description: `Mirage Hub — Plano ${plano.nome}`,
        externalReference: JSON.stringify({ tenant_id: tenant_id || "", plano_id, periodo }),
      }),
    }, asaasClient);

    // 3. Buscar primeiro pagamento da assinatura
    const pagamentos = await asaasFetch<any>(`/subscriptions/${assinatura.id}/payments?limit=1`, {}, asaasClient);
    const pagamento = pagamentos.data?.[0];
    if (!pagamento) throw new Error("Nenhum pagamento gerado na assinatura");

    const resposta: any = {
      tipo: forma_pagamento.toLowerCase(),
      payment_id: pagamento.id,
      assinatura_id: assinatura.id,
      tenant_id: tenant_id || "",
      plano_id,
      valor,
    };

    if (forma_pagamento === "PIX") {
      // Asaas precisa de alguns segundos para gerar o QR code PIX — aguarda e tenta 3x
      resposta.pix = { invoice_url: pagamento.invoiceUrl };
      for (let tentativa = 1; tentativa <= 3; tentativa++) {
        await delay(tentativa * 1500); // 1.5s, 3s, 4.5s
        try {
          const pix = await asaasFetch<any>(`/payments/${pagamento.id}/pixQrCode`, {}, asaasClient);
          if (pix.encodedImage) {
            resposta.pix = {
              qr_code_base64: pix.encodedImage,
              chave_copia_cola: pix.payload,
              expiracao: pix.expirationDate,
              invoice_url: pagamento.invoiceUrl,
            };
            break;
          }
        } catch {
          // ainda não disponível — tenta de novo
        }
      }
    } else if (forma_pagamento === "BOLETO") {
      resposta.boleto = {
        url: pagamento.bankSlipUrl || pagamento.invoiceUrl,
        codigo_barras: pagamento.nossoNumero || "",
        vencimento: pagamento.dueDate,
        invoice_url: pagamento.invoiceUrl,
      };
    } else if (forma_pagamento === "CREDIT_CARD") {
      resposta.redirect_url = pagamento.invoiceUrl;
    }

    res.json(resposta);
  } catch (err: any) {
    console.error("Asaas checkout error:", err?.asaas || err?.message);
    const status = err?.status || 500;
    res.status(status).json({ error: err.message || "Erro ao criar sessão de pagamento" });
  }
});

// ─── STATUS DO PAGAMENTO ──────────────────────────────────────

router.get("/billing/checkout/status/:payment_id", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.tenantId || !await requireTenantManager(req, res, req.tenantId)) return;
    const asaasClient = await getCheckoutAsaasClient(req.tenantId);
    const pag = await asaasFetch<any>(`/payments/${req.params.payment_id}`, {}, asaasClient);
    const reference = await resolveCheckoutReference(pag, asaasClient);
    if (!reference?.tenant_id || reference.tenant_id !== req.tenantId) {
      res.status(404).json({ error: "Pagamento não encontrado para o tenant selecionado" });
      return;
    }
    res.json({
      payment_id: pag.id,
      status: pag.status, // PENDING | RECEIVED | CONFIRMED | OVERDUE | REFUNDED | CANCELED
      valor: pag.value,
      forma_pagamento: pag.billingType,
      data_pagamento: pag.paymentDate || null,
    });
  } catch (err: any) {
    res.status(err?.status || 500).json({ error: err.message });
  }
});

// ─── CONFIRMAR MANUALMENTE (pós-redirect) ─────────────────────

router.post("/billing/checkout/confirmar", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { payment_id, tenant_id, plano_id, periodo = "mensal" } = req.body;

  if (!payment_id || !tenant_id || !plano_id) {
    res.status(400).json({ error: "payment_id, tenant_id e plano_id são obrigatórios" });
    return;
  }
  if (!PLANOS.some((plano) => plano.id === plano_id)) {
    res.status(400).json({ error: "Plano inválido" });
    return;
  }
  if (periodo !== "mensal" && periodo !== "anual") {
    res.status(400).json({ error: "Período inválido" });
    return;
  }
  if (!await requireTenantManager(req, res, tenant_id)) return;

  try {
    const asaasClient = await getCheckoutAsaasClient(tenant_id);
    if (!asaasClient.key) {
      res.status(503).json({ error: "Confirmação de pagamento indisponível" });
      return;
    }
    const pag = await asaasFetch<any>(`/payments/${payment_id}`, {}, asaasClient);
    const statusPagamento = pag.status;
    if (!["RECEIVED", "CONFIRMED"].includes(statusPagamento)) {
      res.status(402).json({ error: "Pagamento ainda não confirmado", status: statusPagamento });
      return;
    }

    const reference = await resolveCheckoutReference(pag, asaasClient);
    if (
      !reference ||
      reference.tenant_id !== tenant_id ||
      reference.plano_id !== plano_id ||
      reference.periodo !== periodo
    ) {
      res.status(403).json({ error: "Este pagamento não pertence ao checkout solicitado" });
      return;
    }

    const expiraEm = paymentExpiryDate(pag, periodo);
    const confirmation = await pool.query<{
      payment_id: string;
      tenant_id: string;
      plano_id: string;
      periodo: string;
      expira_em: string;
    }>(
      `INSERT INTO billing_payment_confirmations (payment_id, tenant_id, plano_id, periodo, expira_em)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (payment_id) DO NOTHING
       RETURNING payment_id, tenant_id, plano_id, periodo, expira_em`,
      [payment_id, tenant_id, plano_id, periodo, expiraEm],
    );
    if (confirmation.rowCount === 0) {
      const existing = await pool.query<{
        tenant_id: string;
        plano_id: string;
        periodo: string;
        expira_em: string;
      }>(
        `SELECT tenant_id, plano_id, periodo, expira_em
         FROM billing_payment_confirmations
         WHERE payment_id = $1`,
        [payment_id],
      );
      const previous = existing.rows[0];
      if (
        !previous ||
        previous.tenant_id !== tenant_id ||
        previous.plano_id !== plano_id ||
        previous.periodo !== periodo
      ) {
        res.status(409).json({ error: "Este pagamento já foi utilizado em outro checkout" });
        return;
      }
      const plano = PLANOS.find(p => p.id === plano_id);
      res.json({
        ok: true,
        idempotente: true,
        plano: plano_id,
        plano_nome: plano?.nome || plano_id,
        apps_liberados: plano?.apps_incluidos || [],
        expira_em: previous.expira_em,
      });
      return;
    }
    await ativarPlano(tenant_id, plano_id, expiraEm);

    const plano = PLANOS.find(p => p.id === plano_id);
    res.json({
      ok: true,
      plano: plano_id,
      plano_nome: plano?.nome || plano_id,
      apps_liberados: plano?.apps_incluidos || [],
      expira_em: expiraEm,
    });
  } catch (err: any) {
    res.status(err?.status || 500).json({ error: err.message });
  }
});

// ─── ATIVAÇÃO MANUAL (escape hatch — "já paguei") ────────────
// Ativa o plano diretamente sem verificar status no Asaas.
// Usado quando o usuário já pagou mas o status ainda não atualizou.

router.post("/billing/checkout/ativar-manual", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { tenant_id, plano_id, periodo = "mensal" } = req.body;

  if (!tenant_id || !plano_id) {
    res.status(400).json({ error: "tenant_id e plano_id são obrigatórios" });
    return;
  }

  const plano = PLANOS.find(p => p.id === plano_id);
  if (!plano) { res.status(400).json({ error: "Plano inválido" }); return; }

  const diasExpiracao = periodo === "anual" ? 365 : 30;
  const expiraEm = new Date(Date.now() + diasExpiracao * 86400000).toISOString().split("T")[0];
  await ativarPlano(tenant_id, plano_id, expiraEm);

  res.json({
    ok: true,
    plano: plano_id,
    plano_nome: plano.nome,
    apps_liberados: plano.apps_incluidos,
    expira_em: expiraEm,
    aviso: "Ativado manualmente — confirme o pagamento no painel Asaas se necessário",
  });
});

// ─── WEBHOOK ASAAS ───────────────────────────────────────────

async function recordTrialLabPaymentWebhook(tenantId: string, eventName: string) {
  const { data: tenant } = await supabaseAdmin.from("tenants").select("owner_id").eq("id", tenantId).maybeSingle();
  if ((tenant as any)?.owner_id) {
    await recordTrialLabJourney((tenant as any).owner_id, {
      payment_webhook: { status: "received", event: eventName, at: new Date().toISOString() },
    });
  }
}

const asaasWebhookHandler = async (
  req: Request,
  res: Response,
  asaasClient: AsaasClient = productionAsaasClient(),
  expectedWebhookToken: string | undefined = process.env.ASAAS_WEBHOOK_TOKEN,
  webhookEnvironment: "production" | "sandbox" = "production",
) => {
  // Verificar token de autenticação do Asaas
  const webhookToken = expectedWebhookToken;
  // Log todos os headers recebidos para debug
  logger.info({ headers: Object.keys(req.headers), bodyKeys: Object.keys(req.body || {}) }, "Asaas webhook headers recebidos");

  if (!webhookToken) {
    res.status(503).json({ error: "Webhook bloqueado: token de autenticação não configurado." });
    return;
  }
  // Asaas pode enviar o token em diferentes headers ou no body. Ausência também é inválida.
  const rawReceivedToken = (
    req.headers["asaas-access-token"] ||
    req.headers["access-token"] ||
    req.headers["authorization"] ||
    req.body?.accessToken ||
    ""
  ) as string;
  const receivedToken = rawReceivedToken.replace(/^Bearer\s+/i, "").trim();
  if (!receivedToken || receivedToken !== webhookToken.trim()) {
    logger.warn({ hasToken: Boolean(receivedToken) }, "Webhook Asaas rejeitado — token inválido ou ausente");
    res.status(401).json({ error: "Token inválido" });
    return;
  }

  const event = req.body;
  logger.info({ event: event?.event, paymentId: event?.payment?.id, subscriptionId: event?.subscription?.id }, "Asaas webhook recebido");

  // ── helpers ──────────────────────────────────────────────
  async function resolverRef(ev: any): Promise<any | null> {
    try {
      // Assinatura recorrente → pega externalReference da assinatura
      if (ev.payment?.subscription) {
        const sub = await asaasFetch<any>(`/subscriptions/${ev.payment.subscription}`, {}, asaasClient);
        if (sub.externalReference) return JSON.parse(sub.externalReference);
      }
      // Pagamento avulso
      if (ev.payment?.externalReference) return JSON.parse(ev.payment.externalReference);
      // Evento de assinatura direto
      if (ev.subscription?.externalReference) return JSON.parse(ev.subscription.externalReference);
    } catch { /* JSON inválido ou Asaas indisponível */ }
    return null;
  }

  const scopeReference = await resolverRef(event);
  if (!scopeReference?.tenant_id) {
    logger.warn({ event: event?.event, paymentId: event?.payment?.id }, "Webhook Asaas ignorado: referência de tenant indisponível");
    res.status(202).json({ received: true, ignored: "tenant_reference_unavailable" });
    return;
  }
  if (scopeReference?.tenant_id) {
    const isLabTenant = await isTrialLabTenant(scopeReference.tenant_id);
    if (webhookEnvironment === "production" && isLabTenant) {
      logger.warn({ tenantId: scopeReference.tenant_id, event: event?.event }, "Webhook de produção recusado para tenant do Laboratório");
      res.status(202).json({ received: true, ignored: "trial_lab_requires_sandbox" });
      return;
    }
    if (webhookEnvironment === "sandbox" && !isLabTenant) {
      logger.warn({ tenantId: scopeReference.tenant_id, event: event?.event }, "Webhook Sandbox recusado para tenant fora do Laboratório");
      res.status(202).json({ received: true, ignored: "sandbox_accepts_trial_lab_only" });
      return;
    }
  }

  // ── PAGAMENTO CONFIRMADO ─────────────────────────────────
  if (["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"].includes(event?.event)) {
    try {
      const { tenant_id, plano_id, modulos, extras, periodo = "mensal" } = scopeReference;
        const diasExpiracao = periodo === "anual" ? 365 : 30;
        const expiraEm = new Date(Date.now() + diasExpiracao * 86400000).toISOString().split("T")[0];

        if (plano_id) {
          await ativarPlano(tenant_id, plano_id, expiraEm);
          logger.info({ event: "subscription_confirmed", tenantId: tenant_id, planoId: plano_id, expiraEm }, "Webhook: plano ativado");
        }
        if (await isTrialLabTenant(tenant_id)) {
          await recordTrialLabPaymentWebhook(tenant_id, event.event);
        }

        if (Array.isArray(modulos) && modulos.length > 0) {
          for (const itemId of modulos) {
            await ativarAddon(tenant_id, itemId, "modulo", 1);
          }
          logger.info({ event: "modulos_ativados", tenantId: tenant_id, modulos }, "Webhook: módulos ativados");
        }

        if (extras && typeof extras === "object") {
          for (const [itemId, qtd] of Object.entries(extras)) {
            if ((qtd as number) > 0) await ativarAddon(tenant_id, itemId, "extra", qtd as number);
          }
          logger.info({ event: "extras_ativados", tenantId: tenant_id, extras }, "Webhook: extras ativados");
        }

        // Registra na fila de provisionamento para auditoria
        await supabaseAdmin.from("provisioning_queue" as any).insert({
          tenant_id,
          tipo: plano_id ? "plano" : "modulo",
          payload: scopeReference,
          status: "concluido",
          processado_em: new Date().toISOString(),
        }).then(() => {}).catch(() => {});
    } catch (e: any) {
      console.error("❌ Webhook PAYMENT_CONFIRMED erro:", e?.message || e);
    }
  }

  // ── PAGAMENTO VENCIDO (inadimplência) ───────────────────
  if (event?.event === "PAYMENT_OVERDUE") {
    try {
      await supabaseAdmin
        .from("tenants")
        .update({ assinatura_status: "inadimplente" } as any)
        .eq("id", scopeReference.tenant_id);
      logger.warn({ event: "conta_inadimplente", tenantId: scopeReference.tenant_id }, "Webhook: conta marcada como inadimplente");
    } catch {}
  }

  // ── CANCELAMENTOS / REEMBOLSO ────────────────────────────
  const cancelados = [
    "PAYMENT_DELETED", "PAYMENT_REFUNDED", "PAYMENT_CHARGEBACK_REQUESTED",
    "SUBSCRIPTION_DELETED", "SUBSCRIPTION_CANCELLED",
  ];

  if (cancelados.includes(event?.event)) {
    try {
      await supabaseAdmin.from("tenant_apps").update({ active: false }).eq("tenant_id", scopeReference.tenant_id);
      await supabaseAdmin.from("tenants").update({ assinatura_status: "cancelado" } as any).eq("id", scopeReference.tenant_id);
      logger.warn({ event: "subscription_cancelled", tenantId: scopeReference.tenant_id, webhookEvent: event.event }, "Webhook: assinatura cancelada");
    } catch (e: any) {
      logger.error({ err: e }, "Webhook cancelamento erro");
    }
  }

  res.json({ received: true });
};

// Registra em ambas as URLs (a configurada no Asaas e a canônica)
router.post("/billing/webhook", (req, res) => void asaasWebhookHandler(req, res, productionAsaasClient(), process.env.ASAAS_WEBHOOK_TOKEN, "production"));
router.post("/billing/webhooks/asaas", (req, res) => void asaasWebhookHandler(req, res, productionAsaasClient(), process.env.ASAAS_WEBHOOK_TOKEN, "production"));
router.post("/billing/webhooks/asaas-sandbox", async (req, res) => {
  const client = sandboxAsaasClient();
  if (!client.key) {
    res.status(503).json({ error: "Webhook sandbox indisponível: configure ASAAS_SANDBOX_API_KEY." });
    return;
  }
  await asaasWebhookHandler(req, res, client, process.env.ASAAS_SANDBOX_WEBHOOK_TOKEN, "sandbox");
});

// ─── CHECKOUT SIMULADO (fallback sem Asaas) ──────────────────

router.post("/billing/checkout/simular", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { plano_id, modulos, extras, periodo = "mensal" } = req.body as {
    plano_id?: string; modulos?: string[]; extras?: Record<string, number>; periodo?: string;
  };
  const tenantId = req.tenantId!;
  if (await isTrialLabTenant(tenantId)) {
    res.status(403).json({ error: "Checkout simulado é bloqueado para a jornada do Laboratório." });
    return;
  }

  const diasExpiracao = periodo === "anual" ? 365 : 30;
  const expiraEm = new Date(Date.now() + diasExpiracao * 86400000).toISOString().split("T")[0];

  let apps_liberados: string[] = [];

  if (modulos && modulos.length > 0) {
    // Modo modular: ativa cada módulo avulso
    for (const itemId of modulos) {
      await ativarAddon(tenantId, itemId, "modulo", 1);
      const m = MODULOS_AVULSOS.find(x => x.id === itemId);
      if (m?.app_key) apps_liberados.push(m.app_key);
    }
  } else if (extras) {
    // Modo extras: ativa usuários/canais adicionais
    for (const [itemId, qtd] of Object.entries(extras)) {
      if (qtd > 0) await ativarAddon(tenantId, itemId, "extra", qtd);
    }
  } else if (plano_id) {
    // Modo plano tradicional
    const plano = PLANOS.find(p => p.id === plano_id);
    if (!plano) { res.status(400).json({ error: "Plano inválido" }); return; }
    await ativarPlano(tenantId, plano_id, expiraEm);
    apps_liberados = plano.apps_incluidos;
  } else {
    res.status(400).json({ error: "Informe plano_id, modulos ou extras" });
    return;
  }

  res.json({
    simulado: true,
    aviso: "Pagamento SIMULADO — nenhuma cobrança real",
    checkout_id: `SIM-${Date.now()}`,
    tenant_id: tenantId,
    plano: plano_id,
    modulos,
    extras,
    periodo,
    apps_liberados,
    status_pagamento: "aprovado",
    proximo_vencimento: expiraEm,
  });
});

// ─── CANCELAR ─────────────────────────────────────────────────

router.post("/billing/cancelar", requireAuth, requireTenantAccess, async (req: AuthenticatedRequest, res) => {
  const { app_key } = req.body;

  if (app_key) {
    await supabaseAdmin.from("tenant_apps").update({ active: false }).eq("tenant_id", req.tenantId!).eq("app_key", app_key);
  } else {
    await supabaseAdmin.from("tenant_apps").update({ active: false }).eq("tenant_id", req.tenantId!);
    await supabaseAdmin.from("tenants").update({ plan: null, assinatura_status: "cancelado" } as any).eq("id", req.tenantId!);
  }

  res.json({ status: "cancelado", app_key: app_key ?? "todos" });
});

// ─── ADMIN ───────────────────────────────────────────────────

router.get("/billing/admin/assinaturas", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { data: tenants, error } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, plan, assinatura_status, assinatura_expira_em, owner_id, created_at");

  if (error) {
    req.log.error({ error: error.message }, "Supabase error fetching tenants");
    res.status(500).json({ error: "Falha ao carregar empresas: " + error.message });
    return;
  }

  // Buscar emails dos donos via Supabase Auth (owner_id → auth.users)
  const emailMap: Record<string, string> = {};
  try {
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of authUsers?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }
  } catch (authErr: any) {
    req.log.warn({ error: authErr.message }, "Não foi possível buscar emails dos donos via Auth");
  }

  const resultado = (tenants ?? []).map(t => {
    const status = (t as any).assinatura_status ?? "trial";
    const situacao = subscriptionSituation(status, (t as any).assinatura_expira_em);
    return {
      ...t,
      nome: (t as any).name,
      email: emailMap[(t as any).owner_id] ?? null,
      plano: (t as any).plan,
      plano_detalhes: PLANOS.find(p => p.id === (t as any).plan) ?? null,
      status_operacional: situacao.key,
      status_operacional_label: situacao.label,
      access_allowed: situacao.accessAllowed,
      status_message: situacao.message,
      dias_restantes: calendarDaysUntil((t as any).assinatura_expira_em),
    };
  });

  const resumo = {
    trial_ativo: resultado.filter(t => t.status_operacional === "trial_ativo").length,
    trial_encerrado: resultado.filter(t => t.status_operacional === "trial_encerrado").length,
    ativa: resultado.filter(t => t.status_operacional === "ativa").length,
    pagamento_atrasado: resultado.filter(t => t.status_operacional === "pagamento_atrasado").length,
  };

  res.json({ asaas_enabled: !!getAsaasKey(), asaas_sandbox: false, tenants: resultado, resumo });
});

// ─── LEMBRETES DE COBRANÇA ────────────────────────────────────
// Retorna tenants agrupados por urgência de contato

router.get("/billing/admin/lembretes", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { data: tenants } = await supabaseAdmin
    .from("tenants")
    .select("id, name, slug, plan, assinatura_status, assinatura_expira_em, owner_id, created_at")
    .not("assinatura_expira_em", "is", null)
    .order("assinatura_expira_em", { ascending: true });

  // Buscar emails dos donos via Supabase Auth
  const emailMap: Record<string, string> = {};
  try {
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    for (const u of authUsers?.users ?? []) {
      if (u.email) emailMap[u.id] = u.email;
    }
  } catch (authErr: any) {
    req.log.warn({ error: authErr.message }, "Não foi possível buscar emails dos donos via Auth");
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const grupos: Record<string, any[]> = {
    ja_vencido: [],
    vence_hoje: [],
    vence_3dias: [],
    vence_7dias: [],
  };

  for (const t of tenants ?? []) {
    const expira = new Date((t as any).assinatura_expira_em + "T00:00:00");
    const diff = Math.ceil((expira.getTime() - hoje.getTime()) / 86400000);
    const item = {
      id: t.id,
      nome: (t as any).name,
      email: emailMap[(t as any).owner_id] ?? null,
      plano: (t as any).plan ?? "sem_plano",
      status: (t as any).assinatura_status ?? "trial",
      expira_em: (t as any).assinatura_expira_em,
      dias_restantes: diff,
    };
    if (diff < 0) grupos.ja_vencido.push(item);
    else if (diff === 0) grupos.vence_hoje.push(item);
    else if (diff <= 3) grupos.vence_3dias.push(item);
    else if (diff <= 7) grupos.vence_7dias.push(item);
  }

  const total_urgentes = grupos.ja_vencido.length + grupos.vence_hoje.length + grupos.vence_3dias.length;

  res.json({ grupos, total_urgentes });
});

// ─── FILA DE PROVISIONAMENTO ERP/CRM ────────────────────────
// SQL para criar a tabela (rodar no Supabase SQL Editor uma vez):
// CREATE TABLE IF NOT EXISTS provisioning_queue (
//   id SERIAL PRIMARY KEY,
//   tenant_id TEXT NOT NULL,
//   app TEXT NOT NULL,
//   status TEXT DEFAULT 'pending',
//   tenant_name TEXT,
//   tenant_email TEXT,
//   plan TEXT,
//   expira_em TEXT,
//   external_id TEXT,
//   done_at TIMESTAMPTZ,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
router.get("/billing/admin/provisioning", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("provisioning_queue" as any)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ items: data || [] });
});

router.patch("/billing/admin/provisioning/:id", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { status, external_id } = req.body as { status?: string; external_id?: string };

  const updates: any = {};
  if (status) updates.status = status;
  if (external_id) updates.external_id = external_id;
  if (status === "done") updates.done_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("provisioning_queue" as any)
    .update(updates)
    .eq("id", id);

  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ ok: true });
});

// ─── NPS: salvar resposta ─────────────────────────────────────
// SQL para criar a tabela (rodar no Supabase SQL Editor uma vez):
// CREATE TABLE IF NOT EXISTS nps_responses (
//   id SERIAL PRIMARY KEY,
//   user_id TEXT NOT NULL,
//   tenant_id TEXT,
//   nota INTEGER NOT NULL CHECK (nota >= 0 AND nota <= 10),
//   comentario TEXT,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
router.post("/billing/nps", requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { nota, comentario } = req.body as { nota: number; comentario?: string };

  if (typeof nota !== "number" || nota < 0 || nota > 10) {
    res.status(400).json({ error: "Nota deve ser um número entre 0 e 10" });
    return;
  }

  // Pega tenant do usuário
  const { data: membership } = await supabaseAdmin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const { error } = await supabaseAdmin.from("nps_responses" as any).insert({
    user_id: userId,
    tenant_id: membership?.tenant_id || null,
    nota,
    comentario: comentario?.trim() || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    // Tabela pode não existir ainda — guarda em log para não bloquear o usuário
    req.log.warn({ err: error.message }, "nps_responses insert falhou (tabela pode não existir)");
    res.json({ ok: true, warning: "Resposta registrada em log (tabela nps_responses pendente de criação)" });
    return;
  }

  req.log.info({ userId, nota }, "NPS registrado");
  res.json({ ok: true });
});

// ─── NPS: resultados para admin ───────────────────────────────
router.get("/billing/admin/nps", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("nps_responses" as any)
    .select("id, user_id, tenant_id, nota, comentario, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const respostas = (data || []) as Array<{ nota: number; comentario?: string; created_at: string; tenant_id?: string }>;
  const total = respostas.length;
  const media = total > 0 ? (respostas.reduce((s, r) => s + r.nota, 0) / total).toFixed(1) : null;
  const promotores = respostas.filter(r => r.nota >= 9).length;
  const detratores = respostas.filter(r => r.nota <= 6).length;
  const nps = total > 0 ? Math.round(((promotores - detratores) / total) * 100) : null;

  res.json({ total, media: media ? Number(media) : null, nps, respostas });
});

// Admin: forçar ativação de um tenant (corrige plano + apps sem passar pelo checkout)
router.post("/billing/admin/reativar", requireAuth, requireSuperAdmin, async (req: AuthenticatedRequest, res) => {
  const { tenant_id, plano_id, dias = 30 } = req.body;
  if (!tenant_id || !plano_id) {
    res.status(400).json({ error: "tenant_id e plano_id são obrigatórios" });
    return;
  }
  const plano = PLANOS.find(p => p.id === plano_id);
  if (!plano) { res.status(400).json({ error: "Plano inválido" }); return; }

  const expiraEm = new Date(Date.now() + dias * 86400000).toISOString().split("T")[0];
  await ativarPlano(tenant_id, plano_id, expiraEm);

  res.json({ ok: true, tenant_id, plano_id, expira_em: expiraEm, apps: plano.apps_incluidos });
});

export default router;
