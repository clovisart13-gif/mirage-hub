import { supabaseAdmin } from "../lib/supabase";
import { hasTrialDemoData } from "./trial-demo-seed";

type Tenant = { id: string; owner_id: string | null; assinatura_status: string | null };
const requiredApps = ["kanban", "orcamento", "plm"];

export function isPublicSignupTenant(tenant: { name: string; owner_id: string | null }, owner: any, ownedCount: number) {
  if (owner?.user_metadata?.account_scope !== "mirage") return false;
  if (ownedCount === 1) return true;
  const registered = String(owner.user_metadata?.company_name ?? "").trim().toLowerCase();
  return !!registered && registered === String(tenant.name ?? "").trim().toLowerCase();
}

// Read-only checks: a tenant row alone does not mean the trial finished provisioning.
export async function trialActivationIssues(tenants: Tenant[], publicSignupTenantIds: Set<string>) {
  const trials = tenants.filter(tenant =>
    tenant.assinatura_status === "trial" && publicSignupTenantIds.has(tenant.id));
  const issues = new Map<string, string>();
  for (const tenant of tenants) {
    if (!tenant.assinatura_status) issues.set(tenant.id, "Assinatura ainda não iniciada");
  }
  for (let offset = 0; offset < trials.length; offset += 500) {
    const batch = trials.slice(offset, offset + 500);
    const ids = batch.map(tenant => tenant.id);
    const memberships = await supabaseAdmin.from("tenant_users").select("tenant_id,user_id,role")
      .in("tenant_id", ids).eq("role", "owner");
    if (memberships.error) throw memberships.error;
    const appRows: { tenant_id: string; app_key: string; active: boolean }[] = [];
    for (let page = 0; page < 100000; page += 1000) {
      const apps = await supabaseAdmin.from("tenant_apps").select("tenant_id,app_key,active")
        .in("tenant_id", ids).eq("active", true)
        .order("tenant_id", { ascending: true }).order("app_key", { ascending: true })
        .range(page, page + 999);
      if (apps.error) throw apps.error;
      appRows.push(...(apps.data ?? []));
      if ((apps.data ?? []).length < 1000) break;
      if (page === 99000) throw new Error("Limite de módulos do trial excedido");
    }
    const membershipKeys = new Set((memberships.data ?? []).map(m => `${m.tenant_id}:${m.user_id}`));
    const appsByTenant = new Map<string, Set<string>>();
    for (const app of appRows) {
      if (!appsByTenant.has(app.tenant_id)) appsByTenant.set(app.tenant_id, new Set());
      appsByTenant.get(app.tenant_id)!.add(app.app_key);
    }
    const seededCandidates: Tenant[] = [];
    for (const tenant of batch) {
      if (!membershipKeys.has(`${tenant.id}:${tenant.owner_id}`)) {
        issues.set(tenant.id, "Acesso do responsável ainda não vinculado à empresa");
      } else if (!requiredApps.every(app => appsByTenant.get(tenant.id)?.has(app))) {
        issues.set(tenant.id, "Módulos do trial não foram ativados completamente");
      } else {
        seededCandidates.push(tenant);
      }
    }
    for (let start = 0; start < seededCandidates.length; start += 10) {
      await Promise.all(seededCandidates.slice(start, start + 10).map(async tenant => {
        if (!await hasTrialDemoData(tenant.id)) {
          issues.set(tenant.id, "Base demonstrativa do trial não está pronta");
        }
      }));
    }
  }
  return issues;
}