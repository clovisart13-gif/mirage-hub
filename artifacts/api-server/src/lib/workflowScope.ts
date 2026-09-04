export type WorkflowScope = "r2pb" | "mirage" | "platform";

export const WORKFLOW_SCOPES: WorkflowScope[] = ["r2pb", "mirage", "platform"];

export interface WorkflowTenantScope {
  scope: WorkflowScope;
  tenant: string | undefined;
}

export function requireWorkflowScope(args: Record<string, unknown>, action: string): WorkflowScope {
  const raw = String(args.scope ?? args.workflow_scope ?? "").trim().toLowerCase() as WorkflowScope;
  if (!WORKFLOW_SCOPES.includes(raw)) {
    throw new Error(`${action}: scope obrigatório (r2pb, mirage ou platform)`);
  }
  return raw;
}

export function inferWorkflowScope(identifier: string): WorkflowScope | null {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.startsWith("r2pb_") || normalized.startsWith("r2pb-") || normalized.startsWith("r2pb ")) return "r2pb";
  if (normalized.startsWith("mirage_") || normalized.startsWith("mirage-") || normalized.startsWith("mirage ")) return "mirage";
  if (normalized.startsWith("wf_") || normalized.startsWith("atos_") || normalized.startsWith("atos-") || normalized.startsWith("platform_")) return "platform";
  return null;
}

export function assertWorkflowScope(identifier: string, scope: WorkflowScope, label = "workflow"): void {
  const inferred = inferWorkflowScope(identifier);
  if (!inferred) {
    throw new Error(`${label} "${identifier}" não tem prefixo de escopo válido; use R2PB_, MIRAGE_, ATOS_, WF_ ou PLATFORM_`);
  }
  if (inferred !== scope) {
    throw new Error(`${label} "${identifier}" pertence ao escopo ${inferred}, não pode ser operado no escopo ${scope}`);
  }
}

export function assertTenantScope(value: unknown, scope: WorkflowScope, label: string): void {
  const tenant = String(value ?? "").trim().toLowerCase().replace(/-/g, "_");
  if (!tenant) throw new Error(`${label}: tenant_id/company_slug obrigatório para o escopo ${scope}`);
  if (scope === "platform") {
    throw new Error(`${label}: ações específicas de tenant não podem usar o escopo platform; declare r2pb ou mirage`);
  }
  if (tenant !== scope) {
    throw new Error(`${label}: tenant "${tenant}" não pertence ao escopo ${scope}`);
  }
}

/**
 * Exige um escopo explícito e, para ações de empresa, um tenant compatível.
 * Plataforma compartilhada não carrega tenant.
 */
export function requireWorkflowTenantScope(
  args: Record<string, unknown>,
  action: string,
): WorkflowTenantScope {
  const scope = requireWorkflowScope(args, action);
  const tenant = String(args.tenant_id ?? args.company_slug ?? "").trim() || undefined;

  if (scope === "platform") {
    if (tenant) throw new Error(`${action}: platform não aceita tenant_id/company_slug`);
    return { scope, tenant: undefined };
  }

  assertTenantScope(tenant, scope, action);
  return { scope, tenant };
}