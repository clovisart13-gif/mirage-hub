import { useState } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ChevronLeft, ChevronRight, Settings, TrendingUp,
  Percent, DollarSign, Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function mesAtualStr() {
  const h = new Date();
  return `${String(h.getMonth() + 1).padStart(2, "0")}/${h.getFullYear()}`;
}
function prevMes(m: string) {
  const [mm, aa] = m.split("/");
  const d = new Date(Number(aa), Number(mm) - 2, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function nextMes(m: string) {
  const [mm, aa] = m.split("/");
  const d = new Date(Number(aa), Number(mm), 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function mesLabel(m: string) {
  const [mm, aa] = m.split("/");
  return new Date(Number(aa), Number(mm) - 1, 1).toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

export default function FinanceiroMarkup() {
  const [mes, setMes]   = useState(mesAtualStr);
  const [modo, setModo] = useState<"caixa" | "competencia">("caixa");
  const [showMetas, setShowMetas] = useState(false);
  const [metaFat, setMetaFat] = useState("");
  const [metaCusto, setMetaCusto] = useState("");
  const qc = useQueryClient();
  const isCurrentMes = mes === mesAtualStr();

  const { data, isLoading } = useQuery({
    queryKey: ["financeiro-markup", mes, modo],
    queryFn: () => apiFetch(`/financeiro/markup?mes=${mes}&modo=${modo}`),
  });

  const metaMutation = useMutation({
    mutationFn: () => apiFetch("/financeiro/metas-mensais", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mes: mes.substring(3) + "-" + mes.substring(0, 2), // YYYY-MM
        faturamentoPrevisto: parseFloat(metaFat.replace(",", ".")) || 0,
        custoFixoPrevisto: parseFloat(metaCusto.replace(",", ".")) || 0,
      }),
    }),
    onSuccess: () => {
      toast.success("Metas salvas!");
      qc.invalidateQueries({ queryKey: ["financeiro-markup"] });
      setShowMetas(false);
    },
    onError: () => toast.error("Erro ao salvar metas"),
  });

  if (isLoading || !data) {
    return (
      <FinanceiroLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>
      </FinanceiroLayout>
    );
  }

  const d = data as any;

  const TIPO_STYLE: Record<string, string> = {
    receita:  "font-semibold text-emerald-700",
    variavel: "text-orange-600",
    direto:   "text-blue-600",
    margem:   "font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20",
    fixo:     "text-red-500",
    lucro:    "font-bold text-teal-700 bg-teal-50 dark:bg-teal-900/20",
  };
  const TIPO_STATUS: Record<string, string> = {
    variavel: "Variável",
    direto:   "Direto",
    fixo:     "Fixo",
    margem:   "Ok",
    lucro:    "Lucro",
  };

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Relatório de Markup e Precificação</h1>
            <p className="text-sm text-muted-foreground">Analise se o seu preço de venda está cobrindo todos os seus custos e gerando lucro.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Modo toggle */}
            <div className="flex rounded-lg border overflow-hidden text-sm">
              <button
                className={cn("px-3 py-1.5 transition-colors", modo === "caixa" ? "bg-teal-600 text-white" : "hover:bg-muted")}
                onClick={() => setModo("caixa")}>Caixa (Recebido)</button>
              <button
                className={cn("px-3 py-1.5 transition-colors", modo === "competencia" ? "bg-teal-600 text-white" : "hover:bg-muted")}
                onClick={() => setModo("competencia")}>Competência (Vendido)</button>
            </div>
            {/* Mês */}
            <div className="flex items-center gap-1">
              <button onClick={() => setMes(prevMes(mes))} className="p-1.5 rounded hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm font-medium min-w-[90px] text-center capitalize">{mesLabel(mes)}</span>
              <button onClick={() => setMes(nextMes(mes))} disabled={isCurrentMes} className="p-1.5 rounded hover:bg-muted disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setMetaFat(d.metaFaturamento ? String(d.metaFaturamento) : "");
              setMetaCusto(d.metaCustoFixo ? String(d.metaCustoFixo) : "");
              setShowMetas(true);
            }}>
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Definir Metas
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KPIMarkup
            label="Markup Realizado"
            value={`${d.markupRealizado.toFixed(2)}x`}
            sub={`Ponto de Equilíbrio: — | Meta: —`}
            icon={TrendingUp}
            color="teal"
          />
          <KPIMarkup
            label="Margem de Contribuição"
            value={`${d.margemContribuicaoPct.toFixed(1)}%`}
            sub="Sobre após pagar custos variáveis e diretos"
            icon={Percent}
            color={d.margemContribuicaoPct >= 0 ? "emerald" : "red"}
          />
          <KPIMarkup
            label="Custo Fixo Real"
            value={fmt(d.despesasFixas)}
            sub={d.metaCustoFixo ? `Meta ${fmt(d.metaCustoFixo)} (${d.despesasFixas <= d.metaCustoFixo ? "Abaixo" : "Acima"})` : "Meta não definida"}
            icon={DollarSign}
            color="amber"
          />
          <KPIMarkup
            label="Faturamento"
            value={fmt(d.faturamentoBruto)}
            sub={d.metaFaturamento ? `Meta ${fmt(d.metaFaturamento)} (${d.faturamentoBruto >= d.metaFaturamento ? "Acima" : "Abaixo"})` : "Meta não definida"}
            icon={Target}
            color={!d.metaFaturamento || d.faturamentoBruto >= d.metaFaturamento ? "emerald" : "red"}
          />
        </div>

        {/* Estrutura de custos */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-1">Estrutura de Custos e Markup</h3>
            <p className="text-xs text-muted-foreground mb-4">Entenda para onde está indo cada centavo do seu faturamento.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-2 font-medium">Componente</th>
                    <th className="text-right py-2 font-medium">Valor Real (R$)</th>
                    <th className="text-right py-2 font-medium">% do Faturamento</th>
                    <th className="text-right py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.estrutura.map((row: any) => (
                    <tr key={row.label} className={cn(
                      "border-b last:border-0",
                      (row.tipo === "margem" || row.tipo === "lucro") ? "rounded" : "",
                    )}>
                      <td className={cn("py-2.5 px-1", TIPO_STYLE[row.tipo] || "")}>
                        {row.label}
                      </td>
                      <td className={cn("py-2.5 px-1 text-right tabular-nums",
                        row.tipo === "receita" ? "text-emerald-700 font-semibold" :
                        row.tipo === "lucro" ? "text-teal-700 font-bold" :
                        row.tipo === "margem" ? "text-emerald-700 font-bold" :
                        row.valor < 0 ? "text-red-500" : ""
                      )}>
                        {fmt(row.valor)}
                      </td>
                      <td className="py-2.5 px-1 text-right tabular-nums text-muted-foreground">
                        {row.pct.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-1 text-right">
                        {TIPO_STATUS[row.tipo] && (
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full font-medium",
                            row.tipo === "margem" ? "bg-emerald-100 text-emerald-700" :
                            row.tipo === "lucro"  ? "bg-teal-100 text-teal-700" :
                            row.tipo === "variavel" ? "bg-orange-100 text-orange-700" :
                            row.tipo === "fixo" ? "bg-red-100 text-red-600" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {TIPO_STATUS[row.tipo]}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Modal metas */}
        <Dialog open={showMetas} onOpenChange={setShowMetas}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Definir Metas — {mesLabel(mes)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium">Meta de Faturamento (R$)</label>
                <Input className="mt-1" placeholder="Ex: 50000" value={metaFat}
                  onChange={e => setMetaFat(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Meta de Custo Fixo (R$)</label>
                <Input className="mt-1" placeholder="Ex: 15000" value={metaCusto}
                  onChange={e => setMetaCusto(e.target.value)} />
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700"
                onClick={() => metaMutation.mutate()}
                disabled={metaMutation.isPending}>
                {metaMutation.isPending ? "Salvando..." : "Salvar Metas"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </FinanceiroLayout>
  );
}

function KPIMarkup({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: any; color: string;
}) {
  const colorMap: Record<string, string> = {
    teal:    "text-teal-600 bg-teal-50 dark:bg-teal-900/20",
    emerald: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
    amber:   "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
    red:     "text-red-500 bg-red-50 dark:bg-red-900/20",
  };
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", colorMap[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{sub}</p>
      </CardContent>
    </Card>
  );
}
