import { supabase } from './supabase';

// Em produção no Replit: VITE_API_URL não definido → usa /api (mesmo host)
// No Vercel (mirror paralelo): VITE_API_URL aponta para o backend Replit/Hetzner
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
const ACTIVE_TENANT_STORAGE_KEY = 'mirage-active-tenant-id';

export function getActiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ACTIVE_TENANT_STORAGE_KEY);
}

export function setActiveTenantId(tenantId: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ACTIVE_TENANT_STORAGE_KEY, tenantId);
}

export function clearActiveTenantId() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ACTIVE_TENANT_STORAGE_KEY);
}

type TenantMembership = {
  tenant_id?: string;
  tenants?: {
    name?: string;
    slug?: string;
  } | null;
};

export function findMirageTenantId(memberships: TenantMembership[]): string | null {
  const mirage = memberships.find((membership) => {
    const slug = membership.tenants?.slug?.trim().toLowerCase();
    const name = membership.tenants?.name?.trim().toLowerCase();
    return slug === 'mirage' || name === 'mirage';
  });
  return mirage?.tenant_id ?? null;
}

function withActiveTenant(path: string): string {
  const tenantId = getActiveTenantId();
  if (!tenantId || /^https?:\/\//.test(path)) return path;

  const [pathWithoutHash, hash = ''] = path.split('#', 2);
  const [pathname, query = ''] = pathWithoutHash.split('?', 2);
  const params = new URLSearchParams(query);

  if (params.has('tenant_id')) return path;

  params.set('tenant_id', tenantId);
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ''}`;
}

async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

async function doFetch(path: string, options: RequestInit, token: string | null): Promise<Response> {
  return fetch(API_BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(options.headers || {}),
    },
  });
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  let token = await getToken();
  const requestPath = withActiveTenant(path);
  let res = await doFetch(requestPath, options, token);

  // Se 401, tenta renovar o token e repetir uma vez
  if (res.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      token = data.session.access_token;
      res = await doFetch(requestPath, options, token);
    } else if (error) {
      // Refresh falhou com erro do Supabase (token genuinamente expirado/inválido)
      // Só faz signOut se o erro for de autenticação real (não de rede)
      const isAuthError = error.message?.toLowerCase().includes('invalid') ||
        error.message?.toLowerCase().includes('expired') ||
        error.message?.toLowerCase().includes('not found') ||
        error.status === 400 || error.status === 401;

      if (isAuthError) {
        await supabase.auth.signOut();
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      // Erro de rede/servidor — não faz signOut, deixa o usuário tentar de novo
      throw new Error('Erro de conexão. Tente novamente em instantes.');
    }

    // Retry após refresh: se ainda 401, token definitivamente inválido
    if (res.status === 401) {
      // Verifica se o usuário tem sessão ativa antes de deslogar
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Só redireciona se de fato não há mais sessão
        window.location.href = '/login';
        throw new Error('Sessão expirada. Faça login novamente.');
      }
      // Se ainda tem sessão mas a API retorna 401, pode ser problema do servidor
      // Não faz signOut para não prejudicar o usuário
      throw new Error('Erro de autenticação. Recarregue a página.');
    }
  }

  if (!res.ok) {
    const text = await res.text();
    const err = new Error(text) as Error & { status: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return null;
  const text = await res.text();
  if (!text) return null;
  return JSON.parse(text);
}
