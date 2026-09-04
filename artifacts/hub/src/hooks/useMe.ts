import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, getActiveTenantId, setActiveTenantId } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface MeResponse {
  user: {
    id: string;
    email?: string;
    isSuperAdmin: boolean;
  };
  tenants: Array<{
    tenant_id: string;
    role: string;
    tenants?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  }>;
}

export function useMe() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetch("/auth/me"),
    enabled: isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!isAuthenticated || !data?.tenants?.length || getActiveTenantId()) return;
    if (data.tenants.length === 1 && data.tenants[0]?.tenant_id) {
      setActiveTenantId(data.tenants[0].tenant_id);
    }
  }, [data, isAuthenticated]);

  return {
    isSuperAdmin: data?.user?.isSuperAdmin ?? false,
    email: data?.user?.email,
    tenants: data?.tenants ?? [],
    isLoading: authLoading || isLoading,
  };
}
