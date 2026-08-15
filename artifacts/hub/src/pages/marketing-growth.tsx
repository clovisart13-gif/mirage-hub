import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

/**
 * Legacy route — Growth OS foi promovido a página-pai em /hub/growth.
 * Mantido apenas para compatibilidade com links antigos.
 */
export default function MarketingGrowthPage() {
  const [, nav] = useLocation();

  useEffect(() => {
    nav("/hub/growth", { replace: true });
  }, [nav]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Redirecionando para o Growth OS...</span>
    </div>
  );
}
