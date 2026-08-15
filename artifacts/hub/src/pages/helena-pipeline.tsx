import { useState, useMemo } from "react";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Filter, Phone, Calendar,
  RefreshCw, DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// ─── tipos ───────────────────────────────────────────────────────────────────

interface Migration {
  id: string;
  cardId: string;
  cardTitle: string;
  cardKey: string | null;
  outcome: "WON" | "LOST";
  sourceStepTitle: string | null;
  contactName: string | null;
  contactPhone: string | null;
  monetaryAmount: string | null;
  destinationCardId: string | null;
  migratedAt: string;
}

interface StatsRow {
  mes: string;
  outcome: "WON" | "LOST";
  total: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmtMes = (yyyymm: string) => {
  const [y, m] = yyyymm.split("-");
  return `${MONTHS[parseInt(m) - 1].slice(0, 3)}/${y}`;
};

// ─── componente ──────────────────────────────────────────────────────────────

export default function HelenaPipelinePage() {
  const now = new Date();
  const [anoFiltro, setAnoFiltro] = useState(String(now.getFullYear()));
  const [mesFiltro, setMesFiltro] = useState(String(now.getMonth() + 1));
  const [outcomeFiltro, setOutcomeFiltro] = useState("TODOS");

  const params = new URLSearchParams({ ano: anoFiltro });
  if (mesFiltro !== "0") params.set("mes", mesFiltro);
  if (outcomeFiltro !== "TODOS") params.set("outcome", outcomeFiltro);

  const { data: migracoesData, isLoading, refetch } = useQuery<{
    ok: boolean; data: Migration[]; total: number;
  }>({
    queryKey: ["helena-migrations", anoFiltro, mesFiltro, outcomeFiltro],
    queryFn: () => apiFetch(`/helena/migrations?${params}`),
    staleTime: 60_000,
  });

  const { data: statsData } = useQuery<{ ok: boolean; data: StatsRow[] }>({
    queryKey: ["helena-stats"],
    queryFn: () => apiFetch("/helena/migrations/stats"),
    staleTime: 60_000,
  });

  const migracoes = migracoesData?.data ?? [];

  // Totais do período filtrado
  const totalGanho = migracoes.filter((m) => m.outcome === "WON").length;
  const totalPerdido = migracoes.filter((m) => m.outcome === "LOST").length;
  const taxaConversao = migracoes.length
    ? Math.round((totalGanho / migracoes.length) * 100)
    : 0;

  // Gráfico: agrupar stats por mês, combinando WON e LOST
  const chartData = useMemo(() => {
    const rows = statsData?.data ?? [];
    const byMes: Record<string, { mes: string; ganho: number; perdido: number }> = {};
    rows.forEach((r) => {
      if (!byMes[r.mes]) byMes[r.mes] = { mes: r.mes, ganho: 0, perdido: 0 };
      if (r.outcome === "WON") byMes[r.mes].ganho = r.total;
      else byMes[r.mes].perdido = r.total;
    });
    return Object.values(byMes)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-12)
      .map((d) => ({ ...d, mesLabel: fmtMes(d.mes) }));
  }, [statsData]);

  const anos = ["2025", "2026", "2027"];

  return (
    <KanbanLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pipeline Comercial — Helena</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Clientes ganhos e perdidos migrados do PIPELINE COMERCIAL PRO
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={anoFiltro} onValueChange={setAnoFiltro}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={mesFiltro} onValueChange={setMesFiltro}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Todos os meses</SelectItem>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={outcomeFiltro} onValueChange={setOutcomeFiltro}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="WON">Ganhos</SelectItem>
              <SelectItem value="LOST">Perdidos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Ganhos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalGanho}</div>
              <p className="text-xs text-muted-foreground mt-1">no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-500" />
                Perdidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{totalPerdido}</div>
              <p className="text-xs text-muted-foreground mt-1">no período</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" />
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{taxaConversao}%</div>
              <p className="text-xs text-muted-foreground mt-1">ganhos / total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-purple-500" />
                Total Oportunidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{migracoes.length}</div>
              <p className="text-xs text-muted-foreground mt-1">no período</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico por mês */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      [v, name === "ganho" ? "Ganhos" : "Perdidos"]
                    }
                  />
                  <Bar dataKey="ganho" name="Ganhos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="perdido" name="Perdidos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Migrações — {migracoes.length} registros</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : migracoes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhuma migração registrada no período selecionado.
                <br />
                <span className="text-xs">
                  As migrações aparecem aqui quando cards chegam na etapa Final (Ganho/Perdido) no Helena.
                </span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Card</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contato</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Etapa Origem</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resultado</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {migracoes.map((m) => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium">{m.cardTitle}</div>
                          {m.cardKey && (
                            <div className="text-xs text-muted-foreground">{m.cardKey}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {m.contactName ? (
                            <>
                              <div className="text-sm">{m.contactName}</div>
                              {m.contactPhone && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {m.contactPhone}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {m.sourceStepTitle || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant="outline"
                            className={
                              m.outcome === "WON"
                                ? "border-green-300 bg-green-50 text-green-700"
                                : "border-red-300 bg-red-50 text-red-700"
                            }
                          >
                            {m.outcome === "WON" ? "✅ Ganho" : "❌ Perdido"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {fmtDate(m.migratedAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </KanbanLayout>
  );
}
