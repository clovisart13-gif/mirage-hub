import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { BarChart2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const FASES_ORDEM = [
  "inicio", "espera", "modelagem", "tecido", "risco",
  "corte", "beneficiamento", "costura", "lavanderia",
  "acabamento", "passadoria", "expedicao", "faturamento", "concluido",
];

const FASES_PRODUTIVAS = new Set(["corte", "beneficiamento", "costura", "lavanderia", "acabamento", "passadoria"]);

const MES_LABELS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmtPecas(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function KanbanRelatórioFases() {
  const hoje = new Date();
  const [mes, setMes] = useState(String(hoje.getMonth() + 1));
  const [ano, setAno] = useState(String(hoje.getFullYear()));

  const { data, isLoading } = useQuery<{
    mes: number; ano: number; todos?: boolean;
    fases: Array<{ fase: string; label: string; iniciadas: number; concluidas: number; saldo: number }>;
  }>({
    queryKey: ["relatorio-fases", mes, ano],
    queryFn: () => apiFetch(`/kanban/relatorio-fases?mes=${mes}&ano=${ano}`),
    staleTime: 60_000,
  });

  const anosDisponiveis = Array.from({ length: 4 }, (_, i) => String(hoje.getFullYear() - i));

  const fases = data?.fases ?? [];
  const totalIniciadas = fases.reduce((s, f) => s + f.iniciadas, 0);
  const totalConcluidas = fases.reduce((s, f) => s + f.concluidas, 0);
  const fasesMaisAtivas = [...fases].sort((a, b) => b.iniciadas - a.iniciadas).slice(0, 3);

  const chartData = fases
    .filter(f => f.iniciadas > 0 || f.concluidas > 0)
    .map(f => ({
      name: f.label.length > 10 ? f.label.substring(0, 10) + "…" : f.label,
      labelFull: f.label,
      Iniciadas: f.iniciadas,
      Concluídas: f.concluidas,
    }));

  return (
    <KanbanLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-violet-600" />
              Produção por Fase
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data?.todos
                ? `Acumulado do ano ${ano} — todas as fases`
                : "Peças iniciadas e concluídas em cada fase do mês selecionado"}
            </p>
          </div>

          <div className="flex gap-2">
            <Select value={mes} onValueChange={setMes}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">📅 Todos (Acumulado)</SelectItem>
                {MES_LABELS.map((label, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ano} onValueChange={setAno}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map(a => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        ) : (
          <>
            {/* KPI cards de resumo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Iniciadas</p>
                    <p className="text-2xl font-bold text-blue-700">{fmtPecas(totalIniciadas)}</p>
                    <p className="text-xs text-muted-foreground">{data?.todos ? "peças no ano" : "peças no mês"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Concluídas</p>
                    <p className="text-2xl font-bold text-green-700">{fmtPecas(totalConcluidas)}</p>
                    <p className="text-xs text-muted-foreground">{data?.todos ? "peças no ano" : "peças no mês"}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Minus className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Geral</p>
                    <p className={`text-2xl font-bold ${totalIniciadas - totalConcluidas >= 0 ? "text-violet-700" : "text-red-600"}`}>
                      {totalIniciadas - totalConcluidas >= 0 ? "+" : ""}{fmtPecas(totalIniciadas - totalConcluidas)}
                    </p>
                    <p className="text-xs text-muted-foreground">em processamento</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico */}
            {chartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Iniciadas vs Concluídas por Fase</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number, name: string) => [fmtPecas(v) + " peças", name]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.labelFull ?? ""}
                      />
                      <Legend />
                      <Bar dataKey="Iniciadas" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Concluídas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Tabela detalhada */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Detalhamento — {MES_LABELS[Number(mes) - 1]} {ano}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {fases.every(f => f.iniciadas === 0 && f.concluidas === 0) ? (
                  <div className="text-center py-16 text-muted-foreground text-sm">
                    Nenhuma movimentação registrada neste período
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40">
                          <th className="text-left px-4 py-3 font-medium text-muted-foreground">Fase</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                          <th className="text-right px-4 py-3 font-medium text-blue-600">Iniciadas</th>
                          <th className="text-right px-4 py-3 font-medium text-green-600">Concluídas</th>
                          <th className="text-right px-4 py-3 font-medium text-violet-600">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fases.map((f, idx) => (
                          <tr
                            key={f.fase}
                            className={`border-b transition-colors hover:bg-muted/30 ${
                              f.iniciadas === 0 && f.concluidas === 0 ? "opacity-40" : ""
                            } ${FASES_PRODUTIVAS.has(f.fase) ? "bg-violet-50/30" : ""}`}
                          >
                            <td className="px-4 py-3 font-medium">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground font-mono">
                                  {idx + 1}
                                </span>
                                {f.label}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {FASES_PRODUTIVAS.has(f.fase) ? (
                                <Badge variant="secondary" className="text-xs bg-violet-100 text-violet-700 border-violet-200">
                                  Produtiva
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              <span className={f.iniciadas > 0 ? "text-blue-700 font-semibold" : "text-muted-foreground"}>
                                {fmtPecas(f.iniciadas)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              <span className={f.concluidas > 0 ? "text-green-700 font-semibold" : "text-muted-foreground"}>
                                {fmtPecas(f.concluidas)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">
                              <span className={
                                f.saldo > 0 ? "text-blue-600 font-semibold"
                                : f.saldo < 0 ? "text-red-600 font-semibold"
                                : "text-muted-foreground"
                              }>
                                {f.saldo > 0 ? "+" : ""}{fmtPecas(f.saldo)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top fases mais ativas */}
            {fasesMaisAtivas.some(f => f.iniciadas > 0) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Fases Mais Ativas no Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fasesMaisAtivas.filter(f => f.iniciadas > 0).map((f, i) => (
                      <div key={f.fase} className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-5 text-center ${
                          i === 0 ? "text-yellow-600" : i === 1 ? "text-gray-500" : "text-orange-700"
                        }`}>{i + 1}º</span>
                        <span className="flex-1 text-sm font-medium">{f.label}</span>
                        <div className="flex gap-4 text-xs">
                          <span className="text-blue-600 font-semibold">{fmtPecas(f.iniciadas)} iniciadas</span>
                          <span className="text-green-600 font-semibold">{fmtPecas(f.concluidas)} concluídas</span>
                        </div>
                        <div className="w-32 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-violet-500 rounded-full"
                            style={{ width: `${Math.min(100, (f.iniciadas / (fasesMaisAtivas[0]?.iniciadas || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </KanbanLayout>
  );
}
