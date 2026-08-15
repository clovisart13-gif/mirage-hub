import { useLocation } from "wouter";
import { FileSpreadsheet, FileText, ArrowLeft, Settings } from "lucide-react";

export default function CustosNav() {
  const [location, navigate] = useLocation();
  const isFichas = location.startsWith("/hub/custos/fichas");
  const isOrcamentos = location.startsWith("/hub/custos/orcamentos");
  const isConfiguracoes = location.startsWith("/hub/custos/configuracoes");

  return (
    <div className="border-b bg-white mb-0">
      <div className="container flex items-center gap-1 pt-2">
        <button
          onClick={() => navigate("/hub")}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border-b-2 border-transparent transition-colors mr-2"
          title="Voltar ao Hub"
        >
          <ArrowLeft className="h-4 w-4" />
          Hub
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <button
          onClick={() => navigate("/hub/custos/fichas")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            isFichas
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Fichas de Custo
        </button>
        <button
          onClick={() => navigate("/hub/custos/orcamentos")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            isOrcamentos
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Orçamentos
        </button>
        <button
          onClick={() => navigate("/hub/custos/configuracoes")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ml-auto ${
            isConfiguracoes
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="h-4 w-4" />
          Configurações
        </button>
      </div>
    </div>
  );
}
