import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

interface MeResponse {
  user: {
    id: string;
    email?: string;
    isSuperAdmin: boolean;
  };
  tenants: unknown[];
}

export function useMe() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery<MeResponse>({
    queryKey: ["auth-me"],
    queryFn: () => apiFetch("/auth/me"),
    enabled: isAuthenticated && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isSuperAdmin: data?.user?.isSuperAdmin ?? false,
    email: data?.user?.email,
    isLoading: authLoading || isLoading,
  };
}
