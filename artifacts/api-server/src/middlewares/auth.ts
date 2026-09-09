import { type Request, type Response, type NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
    isSuperAdmin?: boolean;
  };
  userTenantIds?: string[];
  tenantId?: string;
}

// Cache simples de tenants por userId (TTL 60s)
const tenantCache = new Map<string, { ids: string[]; ts: number }>();

async function getUserTenants(userId: string): Promise<string[]> {
  const cached = tenantCache.get(userId);
  if (cached && Date.now() - cached.ts < 60_000) return cached.ids;

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Falha ao consultar memberships: ${error.message}`);
  }

  const ids = (data ?? []).map((r) => r.tenant_id);
  tenantCache.set(userId, { ids, ts: Date.now() });
  return ids;
}

export function clearTenantCache(userId: string) {
  tenantCache.delete(userId);
}

export type TenantRole = "owner" | "admin" | "member";

const MANAGER_ROLES = new Set<TenantRole>(["owner", "admin"]);

/**
 * Confere a role real do usuário no tenant. A identidade master pode operar
 * qualquer tenant, mas nunca por consequência de um membership comum.
 */
export async function getTenantRole(
  req: AuthenticatedRequest,
  tenantId: string,
): Promise<TenantRole | null> {
  if (req.user?.isSuperAdmin) return "owner";
  if (!req.user?.id || !req.userTenantIds?.includes(tenantId)) return null;

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error || !data) return null;
  return data.role === "owner" || data.role === "admin" ? data.role : "member";
}

export async function requireTenantManager(
  req: AuthenticatedRequest,
  res: Response,
  tenantId: string,
): Promise<TenantRole | null> {
  const role = await getTenantRole(req, tenantId);
  if (!role) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return null;
  }
  if (!MANAGER_ROLES.has(role)) {
    res.status(403).json({ error: "Ação restrita a administradores da empresa" });
    return null;
  }
  return role;
}

/**
 * Exige uma função administrativa atribuída explicitamente dentro do tenant.
 * Diferente de requireTenantManager, a autoridade master da plataforma não
 * recebe acesso operacional implícito aos dados do tenant.
 */
export async function requireTenantMembershipManager(
  req: AuthenticatedRequest,
  res: Response,
  tenantId: string,
): Promise<TenantRole | null> {
  if (!req.user?.id || !req.userTenantIds?.includes(tenantId)) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("tenant_users")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", req.user.id)
    .maybeSingle();

  if (error || !data) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return null;
  }

  const role: TenantRole = data.role === "owner" || data.role === "admin"
    ? data.role
    : "member";
  if (!MANAGER_ROLES.has(role)) {
    res.status(403).json({ error: "Ação restrita a administradores da empresa" });
    return null;
  }
  return role;
}

export async function requireTenantOwner(
  req: AuthenticatedRequest,
  res: Response,
  tenantId: string,
): Promise<TenantRole | null> {
  const role = await getTenantRole(req, tenantId);
  if (!role) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return null;
  }
  if (role !== "owner") {
    res.status(403).json({ error: "Ação restrita ao proprietário da empresa" });
    return null;
  }
  return role;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization header ausente ou inválido" });
    return;
  }

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Token inválido ou expirado" });
    return;
  }

  let tenantIds: string[];
  try {
    tenantIds = await getUserTenants(data.user.id);
  } catch (tenantError) {
    req.log.error({ error: tenantError, userId: data.user.id }, "Failed to resolve user tenants");
    res.status(500).json({ error: "Não foi possível carregar os workspaces da conta" });
    return;
  }

  // Admin master da plataforma = somente a identidade master designada.
  // Pertencer ao tenant Mirage concede acesso ao tenant Mirage, não ao controle
  // global da plataforma.
  const SUPER_ADMIN_EMAIL = "clovisart13@gmail.com";
  const isSuperAdminByEmail = data.user.email === SUPER_ADMIN_EMAIL;

  const isSuperAdmin = isSuperAdminByEmail;

  req.user = {
    id: data.user.id,
    email: data.user.email,
    role: data.user.role,
    isSuperAdmin,
  };
  req.userTenantIds = tenantIds;

  next();
}

/**
 * Valida que o tenant_id requisitado pertence ao usuário logado.
 * Lê tenant_id de: query params ou route params APENAS (nunca do body/headers do cliente).
 * Super admins podem acessar qualquer tenant.
 */
export function requireTenantAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  const tenantId =
    (req.query.tenant_id as string) ||
    (req.params.tenantId as string);

  // Admin master também precisa declarar o tenant quando há múltiplos contextos.
  // Nunca escolher o primeiro tenant automaticamente, porque isso pode abrir
  // R2PB quando a intenção era operar Mirage (ou o contrário).
  if (req.user?.isSuperAdmin) {
    if (tenantId) {
      req.tenantId = tenantId;
      return next();
    }
    const ids = req.userTenantIds ?? [];
    if (ids.length === 1) {
      req.tenantId = ids[0]!;
      return next();
    }
    res.status(400).json({ error: "tenant_id é obrigatório para o administrador master" });
    return;
  }

  // Usuário sem tenant_id explícito: auto-resolve pelo único tenant do usuário
  if (!tenantId) {
    const ids = req.userTenantIds ?? [];
    if (ids.length === 1) {
      req.tenantId = ids[0]!;
      return next();
    }
    if (ids.length === 0) {
      res.status(400).json({ error: "Usuário sem tenant associado" });
      return;
    }
    res.status(400).json({ error: "tenant_id é obrigatório para usuários com múltiplos tenants" });
    return;
  }

  // Usuário comum só acessa seus próprios tenants
  if (!req.userTenantIds?.includes(tenantId)) {
    res.status(403).json({ error: "Acesso negado a este tenant" });
    return;
  }

  req.tenantId = tenantId;
  next();
}

/**
 * Garante que apenas super admins (Mirage) acessem a rota.
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user?.isSuperAdmin) {
    res.status(403).json({ error: "Acesso restrito a administradores Mirage" });
    return;
  }
  next();
}
