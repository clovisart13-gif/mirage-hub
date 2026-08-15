import { useState } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp, TrendingDown, Activity, Percent, Lock,
  CreditCard, Wallet, AlertCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const varPct = (atual: number, ant: number) => ant === 0 ? (atual > 0 ? 100 : 0) : ((atual - ant) / Math.abs(ant)) * 100;

const CORES = ["#10b981","#6366f1","#f59e0b","#ec4899","#14b8a6","#8b5cf6","#f87171","#3b82f6","#84cc16","#fb923c"];

function mesLabel(mesAno: string) {
  const [m, a] = mesAno.split("/");
  const d = new Date(Number(a), Number(m) - 1, 1);
  return d.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function prevMes(mesAno: string) {
  const [m, a] = mesAno.split("/");
  const d = new Date(Number(a), Number(m) - 2, 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function nextMes(mesAno: string) {
  const [m, a] = mesAno.split("/");
  const d = new Date(Number(a), Number(m), 1);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function mesAtualStr() {
  const h = new Date();
  return `${String(h.getMonth() + 1).padStart(2, "0")}/${h.getFullYear()}`;
}

export default function FinanceiroDashboard() {
  const [mes, setMes] = useState(mesAtualStr);

  const { data, isLoading } = useQuery({
    queryKey: ["financeiro-dashboard", mes],
    queryFn: () => apiFetch(`/financeiro/dashboard?mes=${mes}`),
  });

  if (isLoading || !data) {
    return (
      <FinanceiroLayout>
        <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>
      </FinanceiroLayout>
    );
  }

  const d = data as any;
  const varReceita   = varPct(d.atual.receita,   d.anterior.receita);
  const varDespesa   = varPct(d.atual.despesa,   d.anterior.despesa);
  const varResultado = varPct(d.atual.resultado, d.anterior.resultado);
  const isCurrentMes = mes === mesAtualStr();

  const barData = [
    { mes: "Anterior", Receita: d.anterior.receita, Despesa: d.anterior.despesa },
    { mes: "Atual",    Receita: d.atual.receita,    Despesa: d.atual.despesa    },
  ];

  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-6">

        {/* Header com seletor de mês */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard Financeiro</h1>
            <p className="text-sm text-muted-foreground">
              Visão Geral De Performance:{" "}
              <span className="text-teal-600 font-medium capitalize">{mesLabel(mes)}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setMes(prevMes(mes))}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium min-w-[90px] text-center">{mes}</span>
            <button onClick={() => setMes(nextMes(mes))}
              disabled={isCurrentMes}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {d.pendentes > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span><strong>{d.pendentes}</strong> transação(ões) pendente(s) de classificação</span>
          </div>
        )}

        {/* Saldos e Contas */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saldos e Contas</h2>
            <span className="text-sm font-bold">
              Saldo Consolidado: <span className={cn(d.saldoConsolidado >= 0 ? "text-teal-600" : "text-red-500")}>{fmt(d.saldoConsolidado)}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {d.saldosBancarios.map((c: any) => (
              <ContaCard key={c.id} conta={c} />
            ))}
          </div>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KPICard label="RECEITA TOTAL"        value={d.atual.receita}   var={varReceita}   positive icon={TrendingUp}   color="emerald" />
          <KPICard label="CUSTOS + DESPESAS"    value={d.atual.despesa}   var={varDespesa}   positive={false} icon={TrendingDown} color="red" />
          <KPICard label="RESULTADO OPERACIONAL" value={d.atual.resultado} var={varResultado} positive={d.atual.resultado >= 0} icon={Activity} color={d.atual.resultado >= 0 ? "emerald" : "red"} />
          <KPICardPct label="MARGEM LÍQUIDA"   value={d.atual.margemLiquida} positive={d.atual.margemLiquida >= 0} icon={Percent} color={d.atual.margemLiquida >= 0 ? "teal" : "red"} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ranking de Gastos (Pareto) */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold mb-3">
                Ranking de Gastos (Pareto) — <span className="text-muted-foreground font-normal capitalize">{mesLabel(mes)}</span>
              </h3>
              {d.rankingGastos.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum gasto no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={d.rankingGastos} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="categoria" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                      {d.rankingGastos.map((_: any, i: number) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Gastos por Natureza */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="text-sm font-semibold mb-3">
                Gastos por Natureza — <span className="text-muted-foreground font-normal capitalize">{mesLabel(mes)}</span>
              </h3>
              {d.gastosPorNatureza.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum dado no período</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={d.gastosPorNatureza} dataKey="valor" nameKey="natureza"
                      cx="40%" cy="50%" outerRadius={85} innerRadius={40}>
                      {d.gastosPorNatureza.map((_: any, i: number) => (
                        <Cell key={i} fill={CORES[i % CORES.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comparativo mensal */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-sm font-semibold mb-3">Comparativo Mensal — Atual vs Anterior</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData}>
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend />
                <Bar dataKey="Receita" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="Despesa" fill="#f87171" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </FinanceiroLayout>
  );
}

function ContaCard({ conta }: { conta: any }) {
  const isCartao = conta.tipo === "Cartão de Crédito";
  const isCaixa  = conta.tipo === "Caixa";
  const saldo = conta.saldoAtual;

  return (
    <Card className={cn(
      "relative overflow-hidden",
      isCartao && saldo < 0 ? "border-red-200 dark:border-red-800" : "",
    )}>
      <CardContent className="pt-3 pb-3 px-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground truncate font-medium">{conta.nome}</p>
          {isCartao
            ? <CreditCard className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            : isCaixa
              ? <Wallet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              : <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          }
        </div>
        <p className={cn(
          "text-lg font-bold leading-tight",
          saldo < 0 ? "text-red-500" : "text-foreground",
        )}>
          {fmt(saldo)}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{conta.tipo}</p>
        {isCartao && conta.limite && (
          <div className="mt-2 space-y-1">
            {conta.diaVencimento && (
              <p className="text-[10px] text-amber-600 font-medium">Vence dia {conta.diaVencimento}</p>
            )}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Disponível {fmt(conta.limite + saldo)}</span>
            </div>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-red-400 rounded-full"
                style={{ width: `${Math.min(100, Math.abs(saldo) / conta.limite * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">Limite {fmt(conta.limite)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KPICard({ label, value, var: varP, positive, icon: Icon, color }: {
  label: string; value: number; var: number; positive: boolean; icon: any; color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600",
    red:     "text-red-500",
    teal:    "text-teal-600",
  };
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          <Icon className={cn("w-3.5 h-3.5", colorMap[color])} />
        </div>
        <p className={cn("text-xl font-bold", value < 0 ? "text-red-500" : "")}>
          {fmt(value)}
        </p>
        <p className={cn("text-xs mt-0.5", positive ? "text-emerald-600" : "text-red-500")}>
          {fmtPct(varP)} vs. mês anterior
        </p>
      </CardContent>
    </Card>
  );
}

function KPICardPct({ label, value, positive, icon: Icon, color }: {
  label: string; value: number; positive: boolean; icon: any; color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-600",
    red:     "text-red-500",
    teal:    "text-teal-600",
  };
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
          <Icon className={cn("w-3.5 h-3.5", colorMap[color])} />
        </div>
        <p className={cn("text-xl font-bold", positive ? "" : "text-red-500")}>
          {value.toFixed(1)}%
        </p>
        <p className={cn("text-xs mt-0.5", positive ? "text-emerald-600" : "text-red-500")}>
          {positive ? "Lucrativo" : "Prejuízo"}
        </p>
      </CardContent>
    </Card>
  );
}
