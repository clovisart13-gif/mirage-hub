import { useState, useMemo } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtCompact = (v: number) => {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1000) return `${sign}R$${(abs / 1000).toFixed(1).replace(".", ",")}k`;
  return `${sign}R$${abs.toFixed(0)}`;
};
const CORES = ["#10b981","#6366f1","#f59e0b","#ec4899","#14b8a6","#8b5cf6","#f87171","#3b82f6","#84cc16","#fb923c"];

// Converte "MM/YYYY" → "mmm/yy" (ex: "07/2025" → "jul/25")
function labelMes(chave: string): string {
  const [m, a] = chave.split("/");
  const d = new Date(parseInt(a), parseInt(m) - 1, 1);
  return d.toLocaleString("pt-BR", { month: "short" }).replace(".", "") + "/" + a.slice(2);
}

type Aba = "periodo" | "comparativo";
type Periodo = 3 | 6 | 12;

export default function FinanceiroAnalises() {
  const [aba, setAba] = useState<Aba>("periodo");
  const [meses, setMeses] = useState<Periodo>(12);
  const [filNatureza, setFilNatureza]   = useState("todas");
  const [filCentro, setFilCentro]       = useState("todos");
  const [filCategoria, setFilCategoria] = useState("todas");

  // ── Dados gerais (aba período) ─────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["financeiro-analises"],
    queryFn: () => apiFetch("/financeiro/analises"),
  });

  // ── Dados evolução mensal (aba comparativo) ────────────────────────────────
  const params = new URLSearchParams({ meses: String(meses) });
  if (filNatureza  !== "todas") params.set("natureza",    filNatureza);
  if (filCentro    !== "todos") params.set("centroCusto", filCentro);
  if (filCategoria !== "todas") params.set("categoriaId", filCategoria);

  const { data: evolData, isLoading: evolLoading } = useQuery<{
    colunas: string[];
    linhas: { categoriaId: string; categoria: string; totais: Record<string, number> }[];
  }>({
    queryKey: ["fin-evolucao-mensal", meses, filNatureza, filCentro, filCategoria],
    queryFn: () => apiFetch(`/financeiro/evolucao-mensal?${params}`),
    enabled: aba === "comparativo",
  });

  // ── Filtros disponíveis ────────────────────────────────────────────────────
  const { data: naturezas = [] } = useQuery<string[]>({
    queryKey: ["fin-naturezas"],
    queryFn: () => apiFetch("/financeiro/naturezas"),
  });
  const { data: centros = [] } = useQuery<string[]>({
    queryKey: ["fin-centros-custo"],
    queryFn: () => apiFetch("/financeiro/centros-custo"),
  });
  const { data: categorias = [] } = useQuery<{ id: string; nome: string }[]>({
    queryKey: ["fin-categorias"],
    queryFn: () => apiFetch("/financeiro/categorias"),
  });
  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [categorias]
  );

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const d = data as any;
  const totalReceita   = d?.evolucaoMensal?.reduce((s: number, m: any) => s + m.receita,  0) ?? 0;
  const totalDespesa   = d?.evolucaoMensal?.reduce((s: number, m: any) => s + m.despesa,  0) ?? 0;
  const totalResultado = totalReceita - totalDespesa;
  const margemMedia    = totalReceita > 0 ? (totalResultado / totalReceita) * 100 : 0;

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-5">

        {/* Header + filtros globais */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Análises Gerenciais</h1>
            <p className="text-sm text-muted-foreground">Visão detalhada do fluxo financeiro e comportamento de custos.</p>
          </div>

          {aba === "comparativo" && (
            <div className="flex flex-wrap gap-2">
              <Select value={filNatureza} onValueChange={setFilNatureza}>
                <SelectTrigger className="w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="todas">Todas Naturezas</SelectItem>
                  {naturezas.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filCentro} onValueChange={setFilCentro}>
                <SelectTrigger className="w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="todos">Todos Centros de Custo</SelectItem>
                  {centros.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filCategoria} onValueChange={setFilCategoria}>
                <SelectTrigger className="w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  <SelectItem value="todas">Todas Categorias</SelectItem>
                  {categoriasOrdenadas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Abas */}
        <div className="flex gap-1 border-b">
          {([["periodo", "Análise por Período"], ["comparativo", "Evolução Mensal (Comparativo)"]] as [Aba, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                aba === id
                  ? "border-teal-600 text-teal-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >{label}</button>
          ))}
        </div>

        {/* ── ABA: ANÁLISE POR PERÍODO ── */}
        {aba === "periodo" && (
          <>
            {isLoading || !d ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">Carregando...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                  {[
                    { label: "Receita Total (12m)",  value: fmt(totalReceita),   color: "text-emerald-600" },
                    { label: "Despesas Total (12m)", value: fmt(totalDespesa),   color: "text-red-500" },
                    { label: "Resultado (12m)",      value: fmt(totalResultado), color: totalResultado >= 0 ? "text-emerald-600" : "text-red-500" },
                    { label: "Margem Média",         value: `${margemMedia.toFixed(1)}%`, color: margemMedia >= 0 ? "text-teal-600" : "text-red-500" },
                  ].map(kpi => (
                    <Card key={kpi.label}>
                      <CardContent className="pt-4 pb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{kpi.label}</p>
                        <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-sm font-semibold mb-4">Evolução Receita vs Despesa (12 meses)</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={d.evolucaoMensal} margin={{ right: 16 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Legend />
                        <Line type="monotone" dataKey="receita"   name="Receita"   stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="despesa"   name="Despesa"   stroke="#f87171" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="text-sm font-semibold mb-3">Top Categorias de Despesa</h3>
                      {d.topCategorias.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">Sem dados</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={d.topCategorias} layout="vertical" margin={{ left: 8, right: 16 }}>
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10 }} width={110} />
                            <Tooltip formatter={(v: number) => fmt(v)} />
                            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                              {d.topCategorias.map((_: any, i: number) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="text-sm font-semibold mb-3">Receita por Categoria</h3>
                      {d.receitaPorCategoria.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-6 text-center">Sem dados</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={d.receitaPorCategoria} dataKey="valor" nameKey="categoria"
                              cx="40%" cy="50%" outerRadius={100} innerRadius={50}>
                              {d.receitaPorCategoria.map((_: any, i: number) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                            </Pie>
                            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                            <Tooltip formatter={(v: number) => fmt(v)} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-sm font-semibold mb-4">Gasto por Centro de Custo (acumulado)</h3>
                    {d.gastoPorCentro.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">Sem dados</p>
                    ) : (
                      <div className="space-y-2">
                        {(() => {
                          const max = d.gastoPorCentro[0]?.valor || 1;
                          return d.gastoPorCentro.map((item: any, i: number) => (
                            <div key={item.centro} className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-32 shrink-0">{item.centro}</span>
                              <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all"
                                  style={{ width: `${(item.valor / max) * 100}%`, backgroundColor: CORES[i % CORES.length] }} />
                              </div>
                              <span className="text-sm font-medium w-28 text-right shrink-0">{fmt(item.valor)}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="text-sm font-semibold mb-4">Resultado Mensal (últimos 12 meses)</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={d.evolucaoMensal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="resultado" name="Resultado" radius={[4,4,0,0]}>
                          {d.evolucaoMensal.map((m: any, i: number) => (
                            <Cell key={i} fill={m.resultado >= 0 ? "#10b981" : "#f87171"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}

        {/* ── ABA: EVOLUÇÃO MENSAL (COMPARATIVO) ── */}
        {aba === "comparativo" && (
          <>
            {/* Seletor de período */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Período de Análise:</span>
              {([3, 6, 12] as Periodo[]).map(p => (
                <Button
                  key={p}
                  size="sm"
                  variant={meses === p ? "default" : "outline"}
                  className="text-xs h-7 px-3"
                  onClick={() => setMeses(p)}
                >
                  Últimos {p} Meses
                </Button>
              ))}
            </div>

            <Card>
              <CardContent className="pt-4">
                <h3 className="text-sm font-semibold mb-4 text-teal-700 border-l-4 border-teal-500 pl-3">
                  Evolução por Categoria (Mês a Mês)
                </h3>

                {evolLoading ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Carregando...</div>
                ) : !evolData || evolData.linhas.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    Nenhum dado para os filtros selecionados.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 font-semibold sticky left-0 bg-card min-w-[160px]">Categoria</th>
                          {evolData.colunas.map(col => (
                            <th key={col} className="text-right py-2 px-3 font-semibold whitespace-nowrap min-w-[100px]">
                              {labelMes(col)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {evolData.linhas.map((linha, i) => {
                          const total = Object.values(linha.totais).reduce((s, v) => s + v, 0);
                          return (
                            <tr key={linha.categoriaId} className={cn("border-b hover:bg-muted/30 transition-colors", i % 2 === 1 && "bg-muted/10")}>
                              <td className="py-2 px-3 font-medium sticky left-0 bg-inherit">{linha.categoria}</td>
                              {evolData.colunas.map(col => {
                                const v = linha.totais[col];
                                if (v === undefined || v === 0) {
                                  return <td key={col} className="py-2 px-3 text-right text-muted-foreground">-</td>;
                                }
                                return (
                                  <td key={col} className={cn("py-2 px-3 text-right font-medium whitespace-nowrap tabular-nums", v > 0 ? "text-emerald-600" : "text-red-500")}>
                                    {v > 0 ? "" : "-"}R$ {Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                        {/* Linha de totais */}
                        <tr className="border-t-2 font-bold bg-muted/30">
                          <td className="py-2 px-3 sticky left-0 bg-muted/30">TOTAL</td>
                          {evolData.colunas.map(col => {
                            const total = evolData.linhas.reduce((s, l) => s + (l.totais[col] ?? 0), 0);
                            if (total === 0) return <td key={col} className="py-2 px-3 text-right text-muted-foreground">-</td>;
                            return (
                              <td key={col} className={cn("py-2 px-3 text-right whitespace-nowrap tabular-nums", total > 0 ? "text-emerald-700" : "text-red-600")}>
                                {total > 0 ? "" : "-"}R$ {Math.abs(total).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </FinanceiroLayout>
  );
}
