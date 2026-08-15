import { useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import {
  getResumo, getFaturamentoMensal, getKanbanFases,
  getOrcamentosStatus, getMargemFichas, getMixProducao,
  getPedidosRecentes, getVendasBI, getPCP,
  getPorCliente, getHistorico, getContasReceber,
  postFaturarPedido, postDesfaturarPedido, putValorFaturado,
  getMovimentacoesPorCodigo, getMovimentacoesReferencias,
  putEditarCMO, putEditarObservacao, deleteMovimentacao,
  getMovimentacoesHorizontal, putCMOFase,
} from "@/lib/relatorios-api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Package, FileText, BarChart3,
  Clock, CheckCircle2, AlertCircle, Download, ChevronDown, ChevronUp, ChevronRight,
  Layers, Search, Users, History, Wallet, Check, X, Edit2, Filter,
  Pencil, Save, Trash2, MessageSquare, AlertTriangle, FileDown, Activity,
  Phone, Calendar, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── helpers ──────────────────────────────────────────────────────────────
const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtR = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtData = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR") : "—";

const STATUS_COLOR: Record<string, string> = {
  pendente: "#f59e0b", em_producao: "#3b82f6",
  concluido: "#22c55e", cancelado: "#ef4444",
};
const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente", em_producao: "Em produção",
  concluido: "Concluído", cancelado: "Cancelado",
};
const PIE_COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6","#a78bfa","#fb923c","#34d399","#f472b6","#60a5fa"];
const FASE_COR: Record<string, string> = {
  inicio:"bg-slate-100 text-slate-600", espera:"bg-gray-100 text-gray-600",
  modelagem:"bg-violet-100 text-violet-700", tecido:"bg-blue-100 text-blue-700",
  risco:"bg-indigo-100 text-indigo-700", corte:"bg-cyan-100 text-cyan-700",
  beneficiamento:"bg-teal-100 text-teal-700", costura:"bg-green-100 text-green-700",
  lavanderia:"bg-emerald-100 text-emerald-700", acabamento:"bg-lime-100 text-lime-700",
  passadoria:"bg-yellow-100 text-yellow-700", expedicao:"bg-orange-100 text-orange-700",
  faturamento:"bg-red-100 text-red-700", concluido:"bg-green-100 text-green-700",
};
const FASE_LABEL: Record<string, string> = {
  inicio:"Início", espera:"Espera", modelagem:"Modelagem", tecido:"Tecido",
  risco:"Risco", corte:"Corte", beneficiamento:"Beneficiamento", costura:"Costura",
  lavanderia:"Lavanderia", acabamento:"Acabamento", passadoria:"Passadoria",
  expedicao:"Expedição", faturamento:"Faturamento", concluido:"Concluído",
};

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

function KpiCard({ icon: Icon, title, value, sub, color }: {
  icon: React.ElementType; title: string; value: string; sub?: string; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground">{title}</span>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
            <Icon size={18} />
          </div>
        </div>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── TAB: VISÃO GERAL ─────────────────────────────────────────────────────
function TabVisaoGeral() {
  const [resumo, setResumo] = useState<any>(null);
  const [faturamento, setFaturamento] = useState<any[]>([]);
  const [fases, setFases] = useState<any[]>([]);
  const [orcStatus, setOrcStatus] = useState<any>(null);
  const [margens, setMargens] = useState<any[]>([]);
  const [mix, setMix] = useState<any[]>([]);
  const [pedidosRecentes, setPedidosRecentes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getResumo(), getFaturamentoMensal(), getKanbanFases(),
      getOrcamentosStatus(), getMargemFichas(), getMixProducao(), getPedidosRecentes(),
    ]).then(([r, f, fa, os, m, mx, pr]) => {
      setResumo(r); setFaturamento(f); setFases(fa);
      setOrcStatus(os); setMargens(m); setMix(mx); setPedidosRecentes(pr);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const ticketMedio = resumo?.totalPedidos > 0
    ? fmtBRL(Math.round(resumo.faturamentoBruto / resumo.totalPedidos))
    : "R$ 0,00";

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} title="Faturamento Bruto" value={resumo ? fmtBRL(resumo.faturamentoBruto) : "—"} sub="pedidos não cancelados" color="bg-green-100 text-green-700" />
        <KpiCard icon={TrendingUp} title="Ticket Médio" value={ticketMedio} sub={`${resumo?.totalPedidos ?? 0} pedidos`} color="bg-blue-100 text-blue-700" />
        <KpiCard icon={FileText} title="Taxa de Conversão" value={`${resumo?.taxaConversao ?? 0}%`} sub={`${resumo?.orcamentosAprovados ?? 0} de ${resumo?.totalOrcamentos ?? 0} orçamentos`} color="bg-violet-100 text-violet-700" />
        <KpiCard icon={Package} title="Em Produção" value={String(resumo?.pedidosEmProducao ?? 0)} sub={`${resumo?.pedidosConcluidos ?? 0} concluídos · ${resumo?.pedidosPendentes ?? 0} pendentes`} color="bg-orange-100 text-orange-700" />
      </div>

      {/* Aviamentos separados da produção principal */}
      {resumo?.aviamentos && (resumo.aviamentos.totalItens > 0 || resumo.aviamentos.pecas > 0) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-md bg-amber-200 flex items-center justify-center">
              <Package size={14} className="text-amber-700" />
            </div>
            <span className="text-sm font-semibold text-amber-800">Aviamentos / Acessórios</span>
            <span className="text-xs text-amber-600 ml-1">(separados da produção principal)</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xl font-bold text-amber-700">{resumo.aviamentos.totalItens}</p>
              <p className="text-xs text-amber-600">itens de aviamento</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700">{resumo.aviamentos.pecas.toLocaleString("pt-BR")}</p>
              <p className="text-xs text-amber-600">peças de aviamento</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-700">{fmtBRL(resumo.aviamentos.valorCents)}</p>
              <p className="text-xs text-amber-600">valor total (aviamentos)</p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp size={18} className="text-green-600" />Faturamento por mês (12 meses)</CardTitle></CardHeader>
        <CardContent>
          {faturamento.every(f => f.totalCents === 0)
            ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhum pedido registrado ainda</div>
            : <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={faturamento} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
                  <defs><linearGradient id="cFat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={v => `R$${(v/100).toLocaleString("pt-BR",{notation:"compact"})}`} tick={{ fontSize: 11 }} width={60} />
                  <Tooltip formatter={(v: number) => [fmtBRL(v), "Faturamento"]} />
                  <Area type="monotone" dataKey="totalCents" stroke="#22c55e" fill="url(#cFat)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
          }
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText size={18} className="text-violet-600" />Orçamentos por mês</CardTitle></CardHeader>
          <CardContent>
            {!orcStatus || orcStatus.porMes.every((m: any) => m.pendente + m.aprovado + m.reprovado === 0)
              ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhum orçamento registrado</div>
              : <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center"><p className="text-lg font-bold text-amber-700">{orcStatus.contagem.pendente}</p><p className="text-xs text-amber-600">Pendentes</p><p className="text-xs text-muted-foreground">{fmtR(orcStatus.valor.pendente)}</p></div>
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center"><p className="text-lg font-bold text-green-700">{orcStatus.contagem.aprovado}</p><p className="text-xs text-green-600">Aprovados</p><p className="text-xs text-muted-foreground">{fmtR(orcStatus.valor.aprovado)}</p></div>
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-center"><p className="text-lg font-bold text-red-700">{orcStatus.contagem.reprovado}</p><p className="text-xs text-red-600">Reprovados</p><p className="text-xs text-muted-foreground">{fmtR(orcStatus.valor.reprovado)}</p></div>
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={orcStatus.porMes} margin={{ top: 0, right: 4, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="aprovado" stackId="a" fill="#22c55e" name="Aprovados" />
                      <Bar dataKey="pendente" stackId="a" fill="#f59e0b" name="Pendentes" />
                      <Bar dataKey="reprovado" stackId="a" fill="#ef4444" name="Reprovados" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Package size={18} className="text-blue-600" />Cartões por fase do Kanban</CardTitle></CardHeader>
          <CardContent>
            {fases.length === 0
              ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhum cartão no Kanban ainda</div>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={fases.filter((f: any) => f.fase !== "concluido")} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => [v, "Peças"]} />
                    <Bar dataKey="totalPecas" name="Peças" fill="#6366f1" radius={[0,4,4,0]}>
                      {fases.filter((f: any) => f.fase !== "concluido").map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            }
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><BarChart3 size={18} className="text-orange-600" />Mix de Produção (top referências)</CardTitle></CardHeader>
          <CardContent>
            {mix.length === 0
              ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma produção registrada</div>
              : <div className="flex gap-4 items-center">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie data={mix.slice(0,7)} dataKey="qtdTotal" nameKey="referencia" cx="50%" cy="50%" outerRadius={80} label={({ participacao }) => `${participacao}%`} labelLine={false}>
                        {mix.slice(0,7).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number, n: string) => [v + " peças", n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    {mix.slice(0,7).map((m: any, i: number) => (
                      <div key={m.referencia} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <div className="min-w-0"><p className="text-xs font-medium truncate">{m.referencia}</p><p className="text-xs text-muted-foreground">{m.qtdTotal} peças</p></div>
                      </div>
                    ))}
                  </div>
                </div>
            }
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DollarSign size={18} className="text-green-600" />Custo vs. Preço — Fichas de Custo</CardTitle></CardHeader>
          <CardContent>
            {margens.length === 0
              ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhuma ficha de custo cadastrada</div>
              : <div className="overflow-auto max-h-[220px]">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left py-1.5 pr-2 font-medium text-muted-foreground">Referência</th>
                        <th className="text-right py-1.5 pr-2 font-medium text-muted-foreground">Custo</th>
                        <th className="text-right py-1.5 pr-2 font-medium text-muted-foreground">Preço Méd.</th>
                        <th className="text-right py-1.5 font-medium text-muted-foreground">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {margens.map((f: any) => (
                        <tr key={f.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-1.5 pr-2 font-medium">{f.referencia}</td>
                          <td className="text-right py-1.5 pr-2">{fmtR(f.custoTotal)}</td>
                          <td className="text-right py-1.5 pr-2">{f.precoMedio > 0 ? fmtR(f.precoMedio) : <span className="text-muted-foreground">—</span>}</td>
                          <td className="text-right py-1.5">
                            {f.margem !== null
                              ? <span className={`font-bold ${f.margem >= 30 ? "text-green-600" : f.margem >= 15 ? "text-amber-600" : "text-red-600"}`}>{f.margem}%</span>
                              : <span className="text-muted-foreground">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            }
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock size={18} className="text-slate-600" />Pedidos Recentes</CardTitle></CardHeader>
        <CardContent>
          {pedidosRecentes.length === 0
            ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhum pedido ainda</div>
            : <div className="space-y-2">
                {pedidosRecentes.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-b last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: STATUS_COLOR[p.status] + "22", color: STATUS_COLOR[p.status] }}>
                        {p.status === "concluido" ? <CheckCircle2 size={14} /> : p.status === "cancelado" ? <AlertCircle size={14} /> : <Clock size={14} />}
                      </div>
                      <div className="min-w-0"><p className="text-sm font-medium truncate">{p.nomeCliente}</p><p className="text-xs text-muted-foreground">{p.numeroPedido}</p></div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs" style={{ borderColor: STATUS_COLOR[p.status] + "66", color: STATUS_COLOR[p.status] }}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                      <span className="text-sm font-semibold">{fmtBRL(p.valorTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}

// ─── TAB: VENDAS BI ───────────────────────────────────────────────────────
// Por referência (OP), CMO Acumulado de movimentações
function TabVendasBI() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("TODOS");
  const [filtroPedido, setFiltroPedido] = useState("TODOS");

  useEffect(() => {
    getVendasBI().then(setData).finally(() => setLoading(false));
  }, []);

  const handleClienteChange = (v: string) => { setFiltroCliente(v); setFiltroPedido("TODOS"); };

  const clientesFiltrados: any[] = useMemo(() => {
    if (!data?.clientes) return [];
    if (filtroCliente === "TODOS") return data.clientes;
    return data.clientes.filter((c: any) => c.nomeCliente === filtroCliente);
  }, [data, filtroCliente]);

  const pedidosDisponiveis: string[] = useMemo(() => {
    const set = new Set<string>();
    for (const c of clientesFiltrados) for (const p of c.pedidos) set.add(p.numeroPedido);
    return Array.from(set).sort();
  }, [clientesFiltrados]);

  const clientesExibidos: any[] = useMemo(() => {
    if (filtroPedido === "TODOS") return clientesFiltrados;
    return clientesFiltrados
      .map((c: any) => ({ ...c, pedidos: c.pedidos.filter((p: any) => p.numeroPedido === filtroPedido) }))
      .filter((c: any) => c.pedidos.length > 0);
  }, [clientesFiltrados, filtroPedido]);

  const exportarExcel = () => {
    if (!data) return;
    const rows: any[] = [["Cliente","Pedido","Referência","Qtd","CMP Unit (R$)","CMO Acum Unit (R$)","CT Unit (R$)","Venda Unit (R$)","CT Total (R$)","Venda Total (R$)","Margem (R$)","Margem %"]];
    for (const c of clientesExibidos) {
      for (const p of c.pedidos) {
        for (const r of p.refs) {
          rows.push([c.nomeCliente, p.numeroPedido, r.codigo, r.quantidade,
            (r.cmpUnit/100).toFixed(2),(r.cmoUnit/100).toFixed(2),(r.ctUnit/100).toFixed(2),
            (r.vendaUnit/100).toFixed(2),(r.ctTotal/100).toFixed(2),(r.vendaTotal/100).toFixed(2),
            (r.margem/100).toFixed(2),r.margemPct.toFixed(1)+"%"]);
        }
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendas BI");
    XLSX.writeFile(wb, "relatorio-vendas-bi.xlsx");
    toast.success("Excel exportado!");
  };

  if (loading) return <Spinner />;

  if (!data || data.clientes?.length === 0) return (
    <div className="text-center py-20 text-muted-foreground">
      <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Nenhum dado de vendas</p>
      <p className="text-sm mt-1">Crie referências no Kanban para ver o relatório</p>
    </div>
  );

  const nomeClientes: string[] = data.clientes.map((c: any) => c.nomeCliente).sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
  const topClientes = [...data.clientes].sort((a: any, b: any) => b.vendaTotal - a.vendaTotal).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header + filtros */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>
          <Select value={filtroCliente} onValueChange={handleClienteChange}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="TODOS">Todos os Clientes</SelectItem>
              {nomeClientes.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroPedido} onValueChange={setFiltroPedido}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="TODOS">Todos os Pedidos</SelectItem>
              {pedidosDisponiveis.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {(filtroCliente !== "TODOS" || filtroPedido !== "TODOS") && (
            <Button variant="outline" size="sm" onClick={() => { setFiltroCliente("TODOS"); setFiltroPedido("TODOS"); }}>
              Limpar
            </Button>
          )}
          <div className="ml-auto">
            <Button onClick={exportarExcel} size="sm" className="gap-2 bg-green-700 hover:bg-green-800">
              <Download size={14} /> Exportar Excel
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Total Vendas</p><p className="text-xl font-bold text-green-600">{fmtBRL(data.totalVendas)}</p><DollarSign size={16} className="text-green-400 mt-1" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Total Custos</p><p className="text-xl font-bold text-red-600">{fmtBRL(data.totalCusto)}</p><TrendingUp size={16} className="text-red-400 mt-1" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Margem de Lucro</p><p className="text-xl font-bold text-blue-600">{fmtBRL(data.totalMargem)}</p><DollarSign size={16} className="text-blue-400 mt-1" /></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">% de Lucro</p><p className={`text-xl font-bold ${data.margemPctGeral >= 30 ? "text-green-700" : data.margemPctGeral >= 15 ? "text-amber-600" : "text-red-600"}`}>{data.margemPctGeral.toFixed(1)}%</p><FileText size={16} className="text-muted-foreground mt-1" /></CardContent></Card>
      </div>

      {/* Gráficos */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Top 10 Clientes por Valor de Venda</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topClientes.map((c: any) => ({ name: c.nomeCliente.split(" ")[0], valor: c.vendaTotal / 100 }))} margin={{ top: 4, right: 8, bottom: 60, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
                <YAxis tickFormatter={v => `R$${Number(v).toLocaleString("pt-BR",{notation:"compact"})}`} tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v: number) => [`R$ ${Number(v).toFixed(2)}`, "Venda"]} />
                <Bar dataKey="valor" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Vendas por Cliente</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 items-center">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={topClientes.slice(0,8).map((c: any) => ({ name: c.nomeCliente, value: c.vendaTotal / 100 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
                    {topClientes.slice(0,8).map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`R$ ${Number(v).toFixed(2)}`, ""]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1 min-w-0">
                {topClientes.slice(0,8).map((c: any, i: number) => (
                  <div key={c.nomeCliente} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs truncate">{c.nomeCliente.split(" ").slice(0,2).join(" ")}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela agrupada — sem expand/collapse, layout fixo */}
      <Card className="overflow-hidden">
        <div className="p-4 bg-muted/50 border-b">
          <h3 className="text-sm font-semibold">Detalhamento por Cliente e Pedido</h3>
        </div>
        <div className="overflow-x-auto">
          {clientesExibidos.length === 0
            ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhum resultado para os filtros</div>
            : clientesExibidos.map((c: any) => (
              <div key={c.nomeCliente} className="border-b last:border-b-0">
                {/* Cabeçalho do cliente */}
                <div className="px-4 py-3 bg-blue-50 border-b flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-base text-blue-900">{c.nomeCliente}</span>
                  <div className="flex gap-4 text-sm text-blue-800">
                    <span>Qtd: {c.qtdTotal}</span>
                    <span>Custo: {fmtBRL(c.custoTotal)}</span>
                    <span className="font-semibold">Venda: {fmtBRL(c.vendaTotal)}</span>
                    <span className={`font-bold ${c.margemPct >= 30 ? "text-green-700" : c.margemPct >= 15 ? "text-amber-600" : "text-red-600"}`}>Margem: {c.margemPct.toFixed(1)}%</span>
                  </div>
                </div>
                {/* Pedidos do cliente */}
                {c.pedidos.map((p: any) => (
                  <div key={p.numeroPedido} className="ml-4 border-l-2 border-blue-200">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between flex-wrap gap-2">
                      <span className="font-medium text-sm">Pedido: {p.numeroPedido}</span>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Qtd: {p.qtdTotal}</span>
                        <span>Custo: {fmtBRL(p.custoTotal)}</span>
                        <span className="text-blue-700 font-semibold">Venda: {fmtBRL(p.vendaTotal)}</span>
                        <span className={`font-bold ${p.margemPct >= 30 ? "text-green-600" : p.margemPct >= 15 ? "text-amber-600" : "text-red-600"}`}>
                          Margem: {fmtBRL(p.margem)}
                        </span>
                      </div>
                    </div>
                    {/* Tabela de referências */}
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/20 border-b">
                          <th className="text-left py-1.5 px-3 font-medium text-muted-foreground">Referência</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Qtd</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">CMP Unit</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">CMO Acum</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">CT Unit</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Venda Unit</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">CT Total</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Venda Total</th>
                          <th className="text-right py-1.5 px-3 font-medium text-muted-foreground">Margem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {p.refs.map((r: any) => (
                          <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                            <td className="py-1.5 px-3 font-medium font-mono">{r.codigo}</td>
                            <td className="text-right py-1.5 px-2">{r.quantidade}</td>
                            <td className="text-right py-1.5 px-2">{fmtBRL(r.cmpUnit)}</td>
                            <td className="text-right py-1.5 px-2">{fmtBRL(r.cmoUnit)}</td>
                            <td className="text-right py-1.5 px-2">{fmtBRL(r.ctUnit)}</td>
                            <td className="text-right py-1.5 px-2">{fmtBRL(r.vendaUnit)}</td>
                            <td className="text-right py-1.5 px-2 text-red-600">{fmtBRL(r.ctTotal)}</td>
                            <td className="text-right py-1.5 px-2 text-blue-700 font-semibold">{fmtBRL(r.vendaTotal)}</td>
                            <td className={`text-right py-1.5 px-3 font-bold ${r.margemPct >= 30 ? "text-green-600" : r.margemPct >= 15 ? "text-amber-600" : "text-red-600"}`}>
                              {fmtBRL(r.margem)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))
          }
        </div>
      </Card>
    </div>
  );
}

// ─── TAB: PCP ────────────────────────────────────────────────────────────
function TabPCP() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    getPCP().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (!data || data.fases?.length === 0) return (
    <div className="text-center py-20 text-muted-foreground">
      <Layers size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Nenhum cartão em produção</p>
    </div>
  );

  const q = busca.toLowerCase().trim();
  const fasesFiltradas = q
    ? data.fases.map((f: any) => ({ ...f, cards: f.cards.filter((c: any) => c.referencia?.toLowerCase().includes(q) || c.nomeCliente?.toLowerCase().includes(q) || c.numeroPedido?.toLowerCase().includes(q) || c.numeroOp?.toLowerCase().includes(q)) })).filter((f: any) => f.cards.length > 0)
    : data.fases;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">PCP — Controle de Produção</h2>
          <p className="text-sm text-muted-foreground">{data.totalCards} cartões · {data.totalPecas} peças em andamento</p>
        </div>
        <div className="flex items-center gap-2 border rounded-lg px-3 bg-background">
          <Search size={14} className="text-muted-foreground" />
          <Input className="border-0 p-0 h-8 text-sm focus-visible:ring-0 w-48" placeholder="Buscar OP, cliente, ref..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {data.fases.map((f: any) => (
          <div key={f.fase} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${FASE_COR[f.fase] ?? "bg-slate-100 text-slate-600"}`}>
            <span>{f.label}</span>
            <span className="bg-white/60 rounded-full px-1.5 font-bold">{f.cards.length}</span>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {fasesFiltradas.map((f: any) => (
          <Card key={f.fase}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${FASE_COR[f.fase] ?? "bg-slate-100 text-slate-600"}`}>{f.label}</span>
                <span className="text-xs text-muted-foreground font-normal">{f.cards.length} cartão(ns) · {f.totalPecas} peças</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-y">
                      <th className="text-left py-1.5 px-4 font-medium text-muted-foreground">OP</th>
                      <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Referência</th>
                      <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Cliente</th>
                      <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Pedido</th>
                      <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Qtd</th>
                      <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Fornecedor</th>
                      <th className="text-left py-1.5 px-4 font-medium text-muted-foreground">Prev. Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.cards.map((c: any) => {
                      const vencida = c.dataPrevista && new Date(c.dataPrevista) < new Date();
                      return (
                        <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="py-1.5 px-4 font-mono font-medium text-violet-700">{c.numeroOp ?? "—"}</td>
                          <td className="py-1.5 px-2 font-medium">{c.referencia}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{c.nomeCliente ?? "—"}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{c.numeroPedido ?? "—"}</td>
                          <td className="text-right py-1.5 px-2 font-bold">{c.quantidade}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{c.fornecedor ?? "—"}</td>
                          <td className={`py-1.5 px-4 ${vencida ? "text-red-600 font-bold" : "text-muted-foreground"}`}>{fmtData(c.dataPrevista)}{vencida ? " ⚠️" : ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── TAB: POR CLIENTE ─────────────────────────────────────────────────────
function TabPorCliente() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos"|"no-prazo"|"atrasados">("todos");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getPorCliente().then(setData).finally(() => setLoading(false));
  }, []);

  const clientes = useMemo(() => {
    if (!data?.clientes) return [];
    let list: any[] = data.clientes;
    if (busca.trim()) {
      const q = busca.toLowerCase();
      list = list.filter((c: any) =>
        c.nomeCliente.toLowerCase().includes(q) ||
        c.cards.some((r: any) => r.referencia?.toLowerCase().includes(q) || r.numeroPedido?.toLowerCase().includes(q))
      );
    }
    if (filtro === "atrasados") {
      list = list.map((c: any) => ({ ...c, cards: c.cards.filter((r: any) => r.atrasado) })).filter((c: any) => c.cards.length > 0);
    } else if (filtro === "no-prazo") {
      list = list.map((c: any) => ({ ...c, cards: c.cards.filter((r: any) => !r.atrasado && !r.concluido) })).filter((c: any) => c.cards.length > 0);
    }
    return list;
  }, [data, busca, filtro]);

  const toggle = (k: string) => setExpanded(e => ({ ...e, [k]: !e[k] }));

  const diasAtraso = (d: string | null) => {
    if (!d) return 0;
    const diff = Date.now() - new Date(d).getTime();
    return Math.max(0, Math.floor(diff / 86400000));
  };

  if (loading) return <Spinner />;
  if (!data || data.clientes?.length === 0) return (
    <div className="text-center py-20 text-muted-foreground">
      <Users size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Nenhum cartão cadastrado</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-bold">Relatório por Cliente</h2>
        <div className="flex items-center gap-2 border rounded-lg px-3 bg-background">
          <Search size={14} className="text-muted-foreground" />
          <Input className="border-0 p-0 h-8 text-sm focus-visible:ring-0 w-52" placeholder="Buscar por nome do cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-1.5">
        {(["todos","no-prazo","atrasados"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${filtro === f ? (f === "atrasados" ? "bg-red-600 text-white" : "bg-primary text-primary-foreground") : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            {f === "todos" ? "Todos" : f === "no-prazo" ? "No Prazo" : "Atrasados"}
          </button>
        ))}
      </div>

      {/* Clientes */}
      <div className="space-y-4">
        {clientes.map((c: any) => {
          const isOpen = expanded[c.nomeCliente] !== false;
          const numPedidos = new Set(c.cards.map((r: any) => r.numeroPedido)).size;
          return (
            <Card key={c.nomeCliente}>
              <CardHeader className="pb-0">
                <button className="w-full flex items-center justify-between" onClick={() => toggle(c.nomeCliente)}>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base">{c.nomeCliente}</span>
                    {c.atrasados > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                        <AlertCircle size={11} /> {c.atrasados} atrasado{c.atrasados !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{numPedidos} pedido{numPedidos !== 1 ? "s" : ""}</span>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </button>
              </CardHeader>
              {isOpen && (
                <CardContent className="p-0 mt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30 border-y">
                          <th className="text-left py-1.5 px-4 font-medium text-muted-foreground">Código</th>
                          <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Pedido</th>
                          <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Fase Atual</th>
                          <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Fornecedor</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Quantidade</th>
                          <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">Valor de Venda</th>
                          <th className="text-left py-1.5 px-4 font-medium text-muted-foreground">Previsão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {c.cards.map((r: any) => {
                          const atraso = r.atrasado ? diasAtraso(r.dataPrevista) : 0;
                          return (
                            <tr key={r.id} className={`border-b last:border-0 hover:bg-muted/20 ${r.atrasado ? "bg-red-50/30" : ""}`}>
                              <td className="py-1.5 px-4 font-medium text-xs font-mono">{r.referencia}</td>
                              <td className="py-1.5 px-2 text-muted-foreground">{r.numeroPedido ?? "—"}</td>
                              <td className="py-1.5 px-2">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${FASE_COR[r.faseAtual] ?? "bg-slate-100 text-slate-600"}`}>
                                  {FASE_LABEL[r.faseAtual] ?? r.faseAtual}
                                </span>
                              </td>
                              <td className="py-1.5 px-2 text-muted-foreground">{r.fornecedor ?? "—"}</td>
                              <td className="text-right py-1.5 px-2 font-bold">{r.quantidade}</td>
                              <td className="text-right py-1.5 px-2">{r.valorVenda != null ? fmtR(r.valorVenda) : <span className="text-muted-foreground">—</span>}</td>
                              <td className="py-1.5 px-4">
                                {r.concluido
                                  ? <span className="text-green-600 font-medium">Concluído {fmtData(r.dataTerminoReal)}</span>
                                  : r.atrasado
                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white rounded-full text-xs font-bold">{atraso} dia{atraso !== 1 ? "s" : ""} de atraso</span>
                                    : <span className="text-muted-foreground">{fmtData(r.dataPrevista)}</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB: HISTÓRICO ───────────────────────────────────────────────────────
// Busca por código, chips de referências, editar CMO/obs, excluir movimentação
function MovimentacoesTabela({ movimentacoes, onEditCMO, editCMO, setEditCMO, salvando, confirmarEditCMO, setEditObs, setDeletando }: any) {
  const fmtDate = (dt: string) => dt ? new Date(dt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/20 border-b">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Data/Hora</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Origem</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Destino</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">CMP (R$)</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">CMO (R$)</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Qtd</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Perda</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Observações</th>
            <th className="text-center py-2 px-3 font-medium text-muted-foreground">Ações</th>
          </tr>
        </thead>
        <tbody>
          {movimentacoes.map((m: any) => {
            const suspeito = (m.cmo ?? 0) > 0 && (m.cmo ?? 0) < 100;
            return (
              <tr key={m.id} className={`border-b last:border-0 ${suspeito ? "bg-yellow-50/70" : "hover:bg-muted/10"}`}>
                <td className="py-2 px-3 whitespace-nowrap">{fmtDate(m.createdAt)}</td>
                <td className="py-2 px-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${FASE_COR[m.faseOrigem] ?? "bg-slate-100 text-slate-600"}`}>
                    {FASE_LABEL[m.faseOrigem] ?? m.faseOrigem ?? "—"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${FASE_COR[m.faseDestino] ?? "bg-slate-100 text-slate-600"}`}>
                    {FASE_LABEL[m.faseDestino] ?? m.faseDestino ?? "—"}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">{fmtBRL(m.cmp ?? 0)}</td>
                <td className="py-2 px-3 text-right">
                  {editCMO?.id === m.id ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input
                        className="w-20 h-6 text-xs text-right py-0 px-1"
                        value={editCMO.valor}
                        onChange={e => setEditCMO({ id: m.id, valor: e.target.value })}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && confirmarEditCMO(m.id)}
                        autoFocus
                      />
                      <button onClick={() => confirmarEditCMO(m.id)} disabled={salvando === m.id} className="text-green-600 hover:text-green-700"><Save size={12} /></button>
                      <button onClick={() => setEditCMO(null)} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end group">
                      <span className={suspeito ? "text-yellow-700 font-medium" : ""}>{fmtBRL(m.cmo ?? 0)}</span>
                      {suspeito && <AlertTriangle size={11} className="text-yellow-500" />}
                      <button onClick={() => setEditCMO({ id: m.id, valor: ((m.cmo ?? 0) / 100).toFixed(2) })}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-violet-600 transition-opacity">
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                </td>
                <td className="py-2 px-3 text-right">{m.quantidade ?? "—"}</td>
                <td className="py-2 px-3 text-right">{m.perda ?? "—"}</td>
                <td className="py-2 px-3 max-w-[180px]">
                  <div className="flex items-start gap-1 group">
                    <span className="text-xs text-muted-foreground line-clamp-2">{m.observacoes || <span className="italic opacity-40">—</span>}</span>
                    <button onClick={() => setEditObs({ id: m.id, texto: m.observacoes ?? "" })}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-violet-600 transition-opacity shrink-0 mt-0.5">
                      <MessageSquare size={11} />
                    </button>
                  </div>
                </td>
                <td className="py-2 px-3 text-center">
                  <button onClick={() => setDeletando(m.id)} className="text-muted-foreground hover:text-red-600 transition-colors" title="Excluir movimentação">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TabHistorico() {
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroPedido, setFiltroPedido]   = useState("todos");
  const [clientesUnicos, setClientesUnicos] = useState<string[]>([]);
  const [pedidosPorCliente, setPedidosPorCliente] = useState<Record<string, string[]>>({});
  const [referencias, setReferencias] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [movsLocais, setMovsLocais] = useState<Record<string, any[]>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [editCMO, setEditCMO] = useState<{ id: string; valor: string } | null>(null);
  const [editObs, setEditObs] = useState<{ id: string; texto: string } | null>(null);
  const [deletando, setDeletando] = useState<string | null>(null);

  const carregar = useCallback(async (cliente: string, pedido: string) => {
    setLoading(true);
    try {
      const res = await getHistorico(
        cliente !== "todos" ? cliente : undefined,
        pedido  !== "todos" ? pedido  : undefined,
      );
      setClientesUnicos((res?.clientesUnicos ?? []).sort((a: string, b: string) => a.localeCompare(b, 'pt-BR')));
      setPedidosPorCliente(res?.pedidosPorCliente ?? {});
      const refs = res?.referencias ?? [];
      setReferencias(refs);
      // Inicializa movs locais para edição
      const m: Record<string, any[]> = {};
      for (const r of refs) m[r.id] = r.movimentacoes ?? [];
      setMovsLocais(m);
      // Abre tudo se houver pedido selecionado
      if (pedido !== "todos") setAbertos(new Set(refs.map((r: any) => r.id)));
    } catch { toast.error("Erro ao carregar histórico"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar("todos", "todos"); }, [carregar]);

  const handleCliente = (v: string) => {
    setFiltroCliente(v);
    setFiltroPedido("todos");
    carregar(v, "todos");
  };
  const handlePedido = (v: string) => {
    setFiltroPedido(v);
    carregar(filtroCliente, v);
  };

  const toggleAberto = (id: string) => setAbertos(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const pedidosDisponiveis = filtroCliente !== "todos"
    ? (pedidosPorCliente[filtroCliente] ?? [])
    : Array.from(new Set(Object.values(pedidosPorCliente).flat())).sort();

  const confirmarEditCMO = async (movId: string) => {
    if (!editCMO || editCMO.id !== movId) return;
    const cents = Math.round(parseFloat(editCMO.valor.replace(",", ".")) * 100);
    if (isNaN(cents)) { toast.error("Valor inválido"); return; }
    setSalvando(movId);
    try {
      await putEditarCMO(movId, cents);
      setMovsLocais(prev => {
        const next = { ...prev };
        for (const k in next) next[k] = next[k].map(m => m.id === movId ? { ...m, cmo: cents } : m);
        return next;
      });
      setEditCMO(null);
      toast.success("CMO atualizado");
    } catch { toast.error("Erro ao salvar CMO"); }
    finally { setSalvando(null); }
  };

  const confirmarEditObs = async () => {
    if (!editObs) return;
    setSalvando(editObs.id);
    try {
      await putEditarObservacao(editObs.id, editObs.texto);
      setMovsLocais(prev => {
        const next = { ...prev };
        for (const k in next) next[k] = next[k].map(m => m.id === editObs.id ? { ...m, observacoes: editObs.texto } : m);
        return next;
      });
      setEditObs(null);
      toast.success("Observação atualizada");
    } catch { toast.error("Erro ao salvar observação"); }
    finally { setSalvando(null); }
  };

  const confirmarDeletar = async (id: string) => {
    setSalvando(id);
    try {
      await deleteMovimentacao(id);
      setMovsLocais(prev => {
        const next = { ...prev };
        for (const k in next) next[k] = next[k].filter(m => m.id !== id);
        return next;
      });
      setDeletando(null);
      toast.success("Movimentação excluída");
    } catch { toast.error("Erro ao excluir"); }
    finally { setSalvando(null); }
  };

  const totalPecas = referencias.reduce((s, r) => s + r.quantidade, 0);
  const totalRefs  = referencias.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center">
          <Activity size={16} />
        </div>
        <h2 className="text-lg font-bold">Histórico de Movimentações</h2>
      </div>

      {/* Filtros */}
      <Card className="p-4">
        <div className="flex gap-3 flex-wrap items-center">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filtros:</span>

          <Select value={filtroCliente} onValueChange={handleCliente}>
            <SelectTrigger className="w-64"><SelectValue placeholder="Todos os Clientes" /></SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="todos">Todos os Clientes</SelectItem>
              {clientesUnicos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filtroPedido} onValueChange={handlePedido} disabled={pedidosDisponiveis.length === 0}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Todos os Pedidos" /></SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="todos">Todos os Pedidos</SelectItem>
              {pedidosDisponiveis.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>

          {(filtroCliente !== "todos" || filtroPedido !== "todos") && (
            <button onClick={() => { setFiltroCliente("todos"); setFiltroPedido("todos"); carregar("todos", "todos"); }}
              className="text-xs text-violet-600 hover:underline flex items-center gap-1">
              <X size={12} /> Limpar filtros
            </button>
          )}

          {totalRefs > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {totalRefs} referência{totalRefs !== 1 ? "s" : ""} · {totalPecas} peças
            </span>
          )}
        </div>
      </Card>

      {/* Lista de referências */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Carregando...</div>
      ) : referencias.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          <Activity size={32} className="mx-auto mb-2 opacity-30" />
          <p>Nenhuma referência encontrada para os filtros selecionados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {referencias.map((ref: any) => {
            const movs = movsLocais[ref.id] ?? ref.movimentacoes ?? [];
            const isAberto = abertos.has(ref.id);
            return (
              <Card key={ref.id} className="overflow-hidden">
                <button
                  onClick={() => toggleAberto(ref.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-sm text-violet-700">{ref.codigo}</span>
                    {ref.descricao && <span className="text-xs text-muted-foreground">{ref.descricao}</span>}
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${FASE_COR[ref.faseAtual] ?? "bg-slate-100 text-slate-600"}`}>
                      {FASE_LABEL[ref.faseAtual] ?? ref.faseAtual ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    <span>{ref.numeroPedido ?? "—"}</span>
                    <span>{ref.quantidade} pç</span>
                    <span className="font-medium">{fmtBRL(ref.cmp)}/pç CMP</span>
                    <span>{movs.length} mov.</span>
                    {isAberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isAberto && (
                  movs.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-muted-foreground border-t">
                      Nenhuma movimentação registrada para esta referência
                    </div>
                  ) : (
                    <div className="border-t">
                      <MovimentacoesTabela
                        movimentacoes={movs}
                        editCMO={editCMO}
                        setEditCMO={setEditCMO}
                        salvando={salvando}
                        confirmarEditCMO={confirmarEditCMO}
                        setEditObs={setEditObs}
                        setDeletando={setDeletando}
                        onEditCMO={() => {}}
                      />
                    </div>
                  )
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog editar observação */}
      <Dialog open={!!editObs} onOpenChange={open => !open && setEditObs(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Observação</DialogTitle>
            <DialogDescription>Altere a observação desta movimentação</DialogDescription>
          </DialogHeader>
          <Textarea
            value={editObs?.texto ?? ""}
            onChange={e => setEditObs(prev => prev ? { ...prev, texto: e.target.value } : prev)}
            rows={4}
            placeholder="Digite a observação..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditObs(null)}>Cancelar</Button>
            <Button onClick={confirmarEditObs} disabled={salvando === editObs?.id}>
              {salvando === editObs?.id ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog excluir movimentação */}
      <AlertDialog open={!!deletando} onOpenChange={open => !open && setDeletando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Movimentação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá excluir a movimentação permanentemente e recalcular o CMO da referência.
              O cartão voltará para a fase de Espera. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletando && confirmarDeletar(deletando)}
              disabled={salvando === deletando}
            >
              {salvando === deletando ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── TAB: CONTAS A RECEBER ────────────────────────────────────────────────
function TabContasReceber() {
  const [data, setData]           = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState("");
  const [filtroCliente, setFiltroCliente] = useState<string>("TODOS");
  const [filtroStatus, setFiltroStatus]   = useState<string>("TODOS");

  // Dialog de faturar
  const [dialogFaturar, setDialogFaturar] = useState<{ open: boolean; conta: any | null }>({ open: false, conta: null });
  const [valorFaturadoInput, setValorFaturadoInput] = useState<string>("");

  // Edição inline do valor faturado
  const [editandoValor, setEditandoValor] = useState<string | null>(null);
  const [valorEditando, setValorEditando] = useState<string>("");

  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => {
    setLoading(true);
    getContasReceber().then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const clientes = useMemo(() => {
    if (!data?.pedidos) return [];
    return Array.from(new Set(data.pedidos.map((p: any) => p.nomeCliente).filter(Boolean))).sort() as string[];
  }, [data]);

  const pedidosFiltrados = useMemo(() => {
    if (!data?.pedidos) return [];
    let lista = data.pedidos;
    if (filtroCliente !== "TODOS") lista = lista.filter((p: any) => p.nomeCliente === filtroCliente);
    if (filtroStatus !== "TODOS")  lista = lista.filter((p: any) => p.statusFaturamento === filtroStatus);
    if (busca.trim()) {
      const q = busca.toLowerCase();
      lista = lista.filter((p: any) =>
        p.numeroPedido?.toLowerCase().includes(q) || p.nomeCliente?.toLowerCase().includes(q)
      );
    }
    return lista;
  }, [data, filtroCliente, filtroStatus, busca]);

  // ── Ação: abrir dialog de faturar ─────────────────────────────────────────
  const abrirFaturar = (conta: any) => {
    setDialogFaturar({ open: true, conta });
    setValorFaturadoInput((conta.saldoReal / 100).toFixed(2).replace(".", ","));
  };

  // ── Ação: confirmar faturamento ────────────────────────────────────────────
  const confirmarFaturar = async () => {
    if (!dialogFaturar.conta) return;
    const valorEmReais = parseFloat(valorFaturadoInput.replace(",", "."));
    if (isNaN(valorEmReais) || valorEmReais < 0) { toast.error("Valor inválido"); return; }
    const valorEmCentavos = Math.round(valorEmReais * 100);
    setSalvando(true);
    try {
      await postFaturarPedido(dialogFaturar.conta.id, valorEmCentavos);
      toast.success("Pedido faturado com sucesso!");
      setDialogFaturar({ open: false, conta: null });
      carregar();
    } catch { toast.error("Erro ao faturar pedido"); }
    finally { setSalvando(false); }
  };

  // ── Ação: desfaturar ──────────────────────────────────────────────────────
  const handleDesfaturar = async (conta: any) => {
    if (!confirm(`Desfaturar o pedido ${conta.numeroPedido}?`)) return;
    try {
      await postDesfaturarPedido(conta.id);
      toast.success("Pedido voltou para 'Faturar'");
      carregar();
    } catch { toast.error("Erro ao desfaturar"); }
  };

  // ── Ação: salvar edição de valor faturado ─────────────────────────────────
  const handleSalvarEdicao = async (conta: any) => {
    const valorEmReais = parseFloat(valorEditando.replace(",", "."));
    if (isNaN(valorEmReais) || valorEmReais < 0) { toast.error("Valor inválido"); return; }
    const valorEmCentavos = Math.round(valorEmReais * 100);
    try {
      await putValorFaturado(conta.id, valorEmCentavos);
      toast.success("Valor atualizado!");
      setEditandoValor(null);
      carregar();
    } catch { toast.error("Erro ao atualizar valor"); }
  };

  if (loading) return <Spinner />;

  const t = data?.totais;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Contas a Receber</h2>
        <p className="text-sm text-muted-foreground">Gerenciamento de faturamento por pedido</p>
      </div>

      {/* KPIs — Quantidades */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Total Pedidos</p><p className="text-2xl font-bold">{data?.pedidos?.length ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Total Itens</p><p className="text-2xl font-bold">{t?.totalItens ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Qtd Prevista</p><p className="text-2xl font-bold text-blue-700">{t?.totalQtdPrev ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Qtd Real</p><p className="text-2xl font-bold text-green-700">{t?.totalQtdReal ?? 0}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Variação Qtd</p><p className={`text-2xl font-bold ${(t?.totalPerdasQtd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{(t?.totalPerdasQtd ?? 0) > 0 ? "+" : ""}{t?.totalPerdasQtd ?? 0}</p></CardContent></Card>
      </div>

      {/* KPIs — Financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Valor Total</p><p className="text-lg font-bold">{fmtBRL(t?.totalValor ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Total Sinais</p><p className="text-lg font-bold text-amber-600">{fmtBRL(t?.totalSinal ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Saldo Previsto</p><p className="text-lg font-bold text-blue-700">{fmtBRL(t?.totalSaldoPrev ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Saldo Real</p><p className="text-lg font-bold text-green-700">{fmtBRL(t?.totalSaldoReal ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Total Faturado</p><p className="text-lg font-bold text-emerald-600">{fmtBRL(t?.totalFaturado ?? 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground mb-1">Var. Faturamento</p>
          <p className={`text-lg font-bold ${(t?.totalPerdaFaturamento ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
            {(t?.totalPerdaFaturamento ?? 0) > 0 ? "+" : ""}{fmtBRL(t?.totalPerdaFaturamento ?? 0)}
          </p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Filter size={14} /> Filtros:
            </div>
            <div className="w-56">
              <Label className="text-xs text-muted-foreground mb-1 block">Cliente</Label>
              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  <SelectItem value="TODOS">Todos os Clientes</SelectItem>
                  {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-44">
              <Label className="text-xs text-muted-foreground mb-1 block">Status Faturamento</Label>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  <SelectItem value="TODOS">Todos</SelectItem>
                  <SelectItem value="faturar">Faturar</SelectItem>
                  <SelectItem value="faturado">Faturado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 border rounded-md px-2 bg-background h-8 w-52">
              <Search size={12} className="text-muted-foreground" />
              <input className="border-0 p-0 h-8 text-sm bg-transparent outline-none w-full" placeholder="Buscar pedido / cliente..." value={busca} onChange={e => setBusca(e.target.value)} />
            </div>
            {(filtroCliente !== "TODOS" || filtroStatus !== "TODOS" || busca) && (
              <Button variant="outline" size="sm" onClick={() => { setFiltroCliente("TODOS"); setFiltroStatus("TODOS"); setBusca(""); }}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Contas a Receber ({pedidosFiltrados.length} pedidos)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pedidosFiltrados.length === 0
            ? <div className="text-center py-10 text-muted-foreground text-sm">Nenhum pedido encontrado</div>
            : <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-y">
                      <th className="text-left py-2 px-3 font-medium text-muted-foreground">Pedido</th>
                      <th className="text-left py-2 px-2 font-medium text-muted-foreground">Cliente</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Itens</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Qtd Prev</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Qtd Real</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor Total</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Sinal</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Saldo Prev</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Saldo Real</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Valor Faturado</th>
                      <th className="text-right py-2 px-2 font-medium text-muted-foreground">Var. Faturamento</th>
                      <th className="text-center py-2 px-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosFiltrados.map((p: any) => (
                      <tr key={p.id} className={`border-b last:border-0 hover:bg-muted/20 ${p.statusFaturamento === "faturado" ? "bg-green-50/50" : ""}`}>
                        <td className="py-2 px-3 font-medium whitespace-nowrap">{p.numeroPedido}</td>
                        <td className="py-2 px-2 text-muted-foreground max-w-[150px] truncate">{p.nomeCliente}</td>
                        <td className="text-right py-2 px-2">{p.qtdItens}</td>
                        <td className="text-right py-2 px-2 text-blue-700">{p.estoquePrevisto}</td>
                        <td className="text-right py-2 px-2 text-green-700">{p.estoqueReal}</td>
                        <td className="text-right py-2 px-2 font-semibold">{fmtBRL(p.valorTotal)}</td>
                        <td className="text-right py-2 px-2 text-amber-600">{fmtBRL(p.sinal)}</td>
                        <td className="text-right py-2 px-2 text-blue-700 font-semibold">{fmtBRL(p.saldoPrev)}</td>
                        <td className="text-right py-2 px-2 text-green-700 font-semibold">{fmtBRL(p.saldoReal)}</td>
                        {/* Valor Faturado — editável inline */}
                        <td className="text-right py-2 px-2">
                          {p.statusFaturamento === "faturado" ? (
                            editandoValor === p.id ? (
                              <div className="flex items-center gap-1 justify-end">
                                <input
                                  type="text"
                                  value={valorEditando}
                                  onChange={e => setValorEditando(e.target.value)}
                                  className="w-20 h-6 text-right border rounded px-1 text-xs"
                                  placeholder="0,00"
                                />
                                <button className="text-green-600 hover:text-green-700" onClick={() => handleSalvarEdicao(p)}>
                                  <Check size={12} />
                                </button>
                                <button className="text-red-600 hover:text-red-700" onClick={() => setEditandoValor(null)}>
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 justify-end">
                                <span className="font-semibold text-emerald-600">{fmtBRL(p.valorFaturado)}</span>
                                <button className="text-muted-foreground hover:text-foreground" onClick={() => { setEditandoValor(p.id); setValorEditando((p.valorFaturado / 100).toFixed(2).replace(".", ",")); }}>
                                  <Edit2 size={11} />
                                </button>
                              </div>
                            )
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Variação de faturamento */}
                        <td className="text-right py-2 px-2">
                          {p.statusFaturamento === "faturado" ? (
                            <span className={`font-semibold ${p.perdaFaturamento > 0 ? "text-green-600" : p.perdaFaturamento < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                              {p.perdaFaturamento > 0 ? "+" : ""}{fmtBRL(p.perdaFaturamento)}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        {/* Badge de status faturamento */}
                        <td className="text-center py-2 px-3">
                          {p.statusFaturamento === "faturado" ? (
                            <Badge
                              className="bg-green-600 hover:bg-green-700 cursor-pointer text-xs"
                              onClick={() => handleDesfaturar(p)}
                              title="Clique para desfaturar"
                            >
                              Faturado
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50 cursor-pointer text-xs"
                              onClick={() => abrirFaturar(p)}
                            >
                              Faturar
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}

                    {/* Linha totalizadora */}
                    {pedidosFiltrados.length > 0 && (() => {
                      const filt = pedidosFiltrados;
                      const totItens    = filt.reduce((s: number, p: any) => s + p.qtdItens, 0);
                      const totPrev     = filt.reduce((s: number, p: any) => s + p.estoquePrevisto, 0);
                      const totReal     = filt.reduce((s: number, p: any) => s + p.estoqueReal, 0);
                      const totValor    = filt.reduce((s: number, p: any) => s + p.valorTotal, 0);
                      const totSinal    = filt.reduce((s: number, p: any) => s + p.sinal, 0);
                      const totSaldoPrev= filt.reduce((s: number, p: any) => s + p.saldoPrev, 0);
                      const totSaldoReal= filt.reduce((s: number, p: any) => s + p.saldoReal, 0);
                      const totFaturado = filt.filter((p: any) => p.statusFaturamento === "faturado").reduce((s: number, p: any) => s + p.valorFaturado, 0);
                      const totPerdaFat = filt.reduce((s: number, p: any) => s + p.perdaFaturamento, 0);
                      return (
                        <tr className="bg-muted/40 font-bold border-t-2 text-xs">
                          <td className="py-2 px-3" colSpan={2}>TOTAL ({filt.length} pedidos)</td>
                          <td className="text-right py-2 px-2">{totItens}</td>
                          <td className="text-right py-2 px-2 text-blue-700">{totPrev}</td>
                          <td className="text-right py-2 px-2 text-green-700">{totReal}</td>
                          <td className="text-right py-2 px-2">{fmtBRL(totValor)}</td>
                          <td className="text-right py-2 px-2 text-amber-600">{fmtBRL(totSinal)}</td>
                          <td className="text-right py-2 px-2 text-blue-700">{fmtBRL(totSaldoPrev)}</td>
                          <td className="text-right py-2 px-2 text-green-700">{fmtBRL(totSaldoReal)}</td>
                          <td className="text-right py-2 px-2 text-emerald-600">{fmtBRL(totFaturado)}</td>
                          <td className={`text-right py-2 px-2 ${totPerdaFat >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {totPerdaFat > 0 ? "+" : ""}{fmtBRL(totPerdaFat)}
                          </td>
                          <td></td>
                        </tr>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
          }
        </CardContent>
      </Card>

      {/* Dialog: Faturar Pedido */}
      <Dialog open={dialogFaturar.open} onOpenChange={open => setDialogFaturar({ open, conta: dialogFaturar.conta })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Faturar Pedido {dialogFaturar.conta?.numeroPedido}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground text-xs">Cliente</span>
                <p className="font-medium">{dialogFaturar.conta?.nomeCliente || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-xs">Saldo Real a Receber</span>
                <p className="font-semibold text-green-600">{fmtBRL(dialogFaturar.conta?.saldoReal || 0)}</p>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="valorFaturado">Valor Faturado (R$)</Label>
              <Input
                id="valorFaturado"
                type="text"
                value={valorFaturadoInput}
                onChange={e => setValorFaturadoInput(e.target.value)}
                placeholder="0,00"
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">
                Se menor que o Saldo Real, a diferença será registrada como perda.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFaturar({ open: false, conta: null })}>
              Cancelar
            </Button>
            <Button onClick={confirmarFaturar} disabled={salvando} className="bg-green-600 hover:bg-green-700">
              {salvando ? "Faturando..." : "Confirmar Faturamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB: MOVIMENTAÇÕES (HORIZONTAL) ──────────────────────────────────────
// Uma linha por referência, CMO por fase editável inline, exportar Excel
const FASES_HORIZONTAL = [
  { key: "tecido",         label: "Tecido"        },
  { key: "corte",          label: "Corte"         },
  { key: "beneficiamento", label: "Benef."        },
  { key: "costura",        label: "Costura"       },
  { key: "lavanderia",     label: "Lavanderia"    },
  { key: "acabamento",     label: "Acabamento"    },
  { key: "passadoria",     label: "Passadoria"    },
];

function TabMovimentacoes() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [editCell, setEditCell] = useState<{ refId: string; fase: string; valor: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMovimentacoesHorizontal(filtroCliente !== "todos" ? filtroCliente : undefined);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [filtroCliente]);

  useEffect(() => { carregar(); }, [carregar]);

  const confirmarEditCMOFase = async () => {
    if (!editCell) return;
    const cents = Math.round(parseFloat(editCell.valor.replace(",", ".")) * 100);
    if (isNaN(cents)) { toast.error("Valor inválido"); return; }
    setSalvando(true);
    try {
      await putCMOFase(editCell.refId, editCell.fase, cents);
      setData((prev: any) => ({
        ...prev,
        data: prev.data.map((r: any) =>
          r.id === editCell.refId ? { ...r, [editCell.fase]: cents, cmoAcumulado: prev.data.find((x: any) => x.id === editCell.refId)?.cmoAcumulado - (prev.data.find((x: any) => x.id === editCell.refId)?.[editCell.fase] ?? 0) + cents } : r
        ),
      }));
      setEditCell(null);
      toast.success("CMO atualizado");
    } catch { toast.error("Erro ao salvar CMO"); }
    finally { setSalvando(false); }
  };

  const exportarExcel = () => {
    if (!data?.data) return;
    const header = ["Referência","Cliente","Pedido","Qtd","Qtd Cortada","CMP (R$)",
      ...FASES_HORIZONTAL.map(f => `CMO ${f.label} (R$)`),"CMO Acum (R$)","Custo Total (R$)"];
    const rows: any[] = [header];
    for (const r of data.data) {
      rows.push([
        r.codigo, r.nomeCliente, r.numeroPedido, r.quantidade, r.quantidadeCortada,
        (r.cmp/100).toFixed(2),
        ...FASES_HORIZONTAL.map(f => ((r[f.key] ?? 0)/100).toFixed(2)),
        (r.cmoAcumulado/100).toFixed(2),(r.custoTotal/100).toFixed(2),
      ]);
    }
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Movimentações");
    XLSX.writeFile(wb, "relatorio-movimentacoes.xlsx");
    toast.success("Excel exportado!");
  };

  if (loading) return <Spinner />;

  const rows = data?.data ?? [];
  const clientes: string[] = data?.clientesUnicos ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <FileDown size={16} />
        </div>
        <h2 className="text-lg font-bold">Relatório de Movimentações</h2>
      </div>

      {/* Filtros + exportar */}
      <Card className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-72 overflow-y-auto">
                <SelectItem value="todos">Todos os Clientes</SelectItem>
                {clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto">
            <Button onClick={exportarExcel} size="sm" className="gap-2 bg-green-700 hover:bg-green-800">
              <FileDown size={14} /> Exportar Excel
            </Button>
          </div>
        </div>
      </Card>

      {rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Activity size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma referência encontrada</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed" style={{ minWidth: 900 }}>
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground w-[120px]">Referência</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[120px]">Cliente</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[80px]">Pedido</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-[40px]">Qtd</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-[60px]">CMP</th>
                  {FASES_HORIZONTAL.map(f => (
                    <th key={f.key} className="text-right py-2 px-2 font-medium text-muted-foreground w-[72px]">{f.label}</th>
                  ))}
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground w-[72px] bg-blue-50">CMO Acum</th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground w-[80px] bg-green-50">Custo Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="py-1.5 px-3 font-mono font-medium text-violet-700 truncate">{r.codigo}</td>
                    <td className="py-1.5 px-2 truncate">{r.nomeCliente ?? "—"}</td>
                    <td className="py-1.5 px-2 truncate text-muted-foreground">{r.numeroPedido ?? "—"}</td>
                    <td className="py-1.5 px-2 text-right">{r.quantidade}</td>
                    <td className="py-1.5 px-2 text-right">{fmtBRL(r.cmp)}</td>
                    {FASES_HORIZONTAL.map(f => {
                      const isEditing = editCell?.refId === r.id && editCell?.fase === f.key;
                      return (
                        <td key={f.key} className="py-1 px-1 text-right">
                          {isEditing ? (
                            <div className="flex items-center gap-0.5 justify-end">
                              <Input
                                className="w-[56px] h-6 text-xs text-right py-0 px-1"
                                value={editCell!.valor}
                                onChange={e => setEditCell(prev => prev ? { ...prev, valor: e.target.value } : prev)}
                                onKeyDown={e => e.key === "Enter" && confirmarEditCMOFase()}
                                autoFocus
                              />
                              <button onClick={confirmarEditCMOFase} disabled={salvando} className="text-green-600 hover:text-green-700 ml-0.5">
                                <Save size={11} />
                              </button>
                              <button onClick={() => setEditCell(null)} className="text-muted-foreground hover:text-foreground">
                                <X size={11} />
                              </button>
                            </div>
                          ) : (
                            <div
                              className="group flex items-center justify-end gap-0.5 cursor-pointer"
                              onClick={() => setEditCell({ refId: r.id, fase: f.key, valor: ((r[f.key] ?? 0) / 100).toFixed(2) })}
                            >
                              <span className={(r[f.key] ?? 0) === 0 ? "text-muted-foreground/40" : ""}>
                                {fmtBRL(r[f.key] ?? 0)}
                              </span>
                              <Pencil size={9} className="opacity-0 group-hover:opacity-60 text-violet-600 ml-0.5" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1.5 px-2 text-right font-semibold text-blue-700 bg-blue-50/40">{fmtBRL(r.cmoAcumulado)}</td>
                    <td className="py-1.5 px-3 text-right font-bold text-green-700 bg-green-50/40">{fmtBRL(r.custoTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/30 border-t-2 font-bold">
                  <td className="py-2 px-3" colSpan={4}>TOTAL ({rows.length} refs)</td>
                  <td className="py-2 px-2 text-right">{fmtBRL(rows.reduce((s: number, r: any) => s + r.cmp, 0))}</td>
                  {FASES_HORIZONTAL.map(f => (
                    <td key={f.key} className="py-2 px-2 text-right">{fmtBRL(rows.reduce((s: number, r: any) => s + (r[f.key] ?? 0), 0))}</td>
                  ))}
                  <td className="py-2 px-2 text-right text-blue-700 bg-blue-50/40">{fmtBRL(rows.reduce((s: number, r: any) => s + r.cmoAcumulado, 0))}</td>
                  <td className="py-2 px-3 text-right text-green-700 bg-green-50/40">{fmtBRL(rows.reduce((s: number, r: any) => s + r.custoTotal, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── TAB: PIPELINE MIRAGE ─────────────────────────────────────────────────

interface PipelineMigration {
  id: string; cardId: string; cardTitle: string; cardKey: string | null;
  outcome: "WON" | "LOST"; sourceStepTitle: string | null;
  contactName: string | null; contactPhone: string | null;
  monetaryAmount: string | null; destinationCardId: string | null;
  migratedAt: string;
}
interface PipelineStatsRow { mes: string; outcome: "WON" | "LOST"; total: number; }

const PM_MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const fmtMesPipeline = (yyyymm: string) => { const [y,m] = yyyymm.split("-"); return `${PM_MONTHS[parseInt(m)-1].slice(0,3)}/${y}`; };
const fmtDatePipeline = (d: string) => new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

function TabPipelineMirage() {
  const now = new Date();
  const [anoFiltro, setAnoFiltro] = useState(String(now.getFullYear()));
  const [mesFiltro, setMesFiltro] = useState("0");
  const [outcomeFiltro, setOutcomeFiltro] = useState("TODOS");

  const params = new URLSearchParams({ ano: anoFiltro });
  if (mesFiltro !== "0") params.set("mes", mesFiltro);
  if (outcomeFiltro !== "TODOS") params.set("outcome", outcomeFiltro);

  const [syncing, setSyncing] = useState<"ganho" | "perdido" | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: migracoesData, isLoading, refetch } = useQuery<{ ok: boolean; data: PipelineMigration[]; total: number }>({
    queryKey: ["pipeline-mirage-migrations", anoFiltro, mesFiltro, outcomeFiltro],
    queryFn: () => apiFetch(`/helena/migrations?${params}`),
    staleTime: 60_000,
  });
  const { data: statsData } = useQuery<{ ok: boolean; data: PipelineStatsRow[] }>({
    queryKey: ["pipeline-mirage-stats"],
    queryFn: () => apiFetch("/helena/migrations/stats"),
    staleTime: 60_000,
  });

  async function handleSync(tipo: "ganho" | "perdido") {
    setSyncing(tipo);
    setSyncMsg(null);
    try {
      const endpoint = tipo === "ganho" ? "/helena/sync-ganho?tenant=r2pb" : "/helena/sync-perdido?tenant=r2pb";
      const res = await apiFetch(endpoint, { method: "POST" });
      setSyncMsg(res.message ?? `${res.inserted} cards sincronizados`);
      queryClient.invalidateQueries({ queryKey: ["pipeline-mirage-migrations"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-mirage-stats"] });
    } catch (e) {
      setSyncMsg("Erro ao sincronizar — tente novamente");
    } finally {
      setSyncing(null);
    }
  }

  const migracoes = migracoesData?.data ?? [];
  const totalGanho = migracoes.filter(m => m.outcome === "WON").length;
  const totalPerdido = migracoes.filter(m => m.outcome === "LOST").length;
  const taxaConversao = migracoes.length ? Math.round((totalGanho / migracoes.length) * 100) : 0;
  const totalValorGanho = migracoes
    .filter(m => m.outcome === "WON" && m.monetaryAmount)
    .reduce((acc, m) => acc + parseFloat(m.monetaryAmount!), 0);
  const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const chartData = useMemo(() => {
    const rows = statsData?.data ?? [];
    const byMes: Record<string, { mes: string; ganho: number; perdido: number }> = {};
    rows.forEach(r => {
      if (!byMes[r.mes]) byMes[r.mes] = { mes: r.mes, ganho: 0, perdido: 0 };
      if (r.outcome === "WON") byMes[r.mes].ganho = r.total;
      else byMes[r.mes].perdido = r.total;
    });
    return Object.values(byMes).sort((a,b) => a.mes.localeCompare(b.mes)).slice(-12)
      .map(d => ({ ...d, mesLabel: fmtMesPipeline(d.mes) }));
  }, [statsData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Pipeline Comercial — Helena</h2>
          <p className="text-sm text-muted-foreground">Clientes ganhos e perdidos migrados do PIPELINE COMERCIAL PRO</p>
        </div>
        <div className="flex items-center gap-2">
          {syncMsg && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{syncMsg}</span>
          )}
          <Button variant="default" size="sm" onClick={() => handleSync("ganho")} disabled={!!syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing === "ganho" ? "animate-spin" : ""}`} />
            {syncing === "ganho" ? "Sincronizando..." : "Sincronizar GANHO"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleSync("perdido")} disabled={!!syncing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing === "perdido" ? "animate-spin" : ""}`} />
            {syncing === "perdido" ? "Sincronizando..." : "Sincronizar PERDIDO"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["pipeline-mirage-migrations"] });
            queryClient.invalidateQueries({ queryKey: ["pipeline-mirage-stats"] });
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={anoFiltro} onValueChange={setAnoFiltro}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            {["2025","2026","2027"].map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mesFiltro} onValueChange={setMesFiltro}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="0">Todos os meses</SelectItem>
            {PM_MONTHS.map((m,i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={outcomeFiltro} onValueChange={setOutcomeFiltro}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="WON">Ganhos</SelectItem>
            <SelectItem value="LOST">Perdidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-500" />Ganhos</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-green-600">{totalGanho}</div><p className="text-xs text-muted-foreground mt-1">no período</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-500" />Perdidos</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-500">{totalPerdido}</div><p className="text-xs text-muted-foreground mt-1">no período</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" />Taxa de Conversão</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-blue-600">{taxaConversao}%</div><p className="text-xs text-muted-foreground mt-1">ganhos / total</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4 text-purple-500" />Valor Ganho</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-purple-700">{totalValorGanho > 0 ? fmtBRL(totalValorGanho) : "—"}</div><p className="text-xs text-muted-foreground mt-1">total em R$</p></CardContent></Card>
      </div>

      {/* Gráfico por mês */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Histórico Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v: number, name: string) => [v, name === "ganho" ? "Ganhos" : "Perdidos"]} />
                <Bar dataKey="ganho" name="Ganhos" fill="#22c55e" radius={[4,4,0,0]} />
                <Bar dataKey="perdido" name="Perdidos" fill="#ef4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Migrações — {migracoes.length} registros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : migracoes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma migração registrada no período selecionado.<br />
              <span className="text-xs">As migrações aparecem aqui quando cards chegam na etapa Final (Ganho/Perdido) no Helena.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Card</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Contato</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Resultado</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {migracoes.map(m => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{m.cardTitle}</div>
                        {m.cardKey && <div className="text-xs text-muted-foreground">{m.cardKey}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {m.contactName ? (
                          <>
                            <div className="text-sm">{m.contactName}</div>
                            {m.contactPhone && <div className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{m.contactPhone}</div>}
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {m.monetaryAmount ? (
                          <span className={m.outcome === "WON" ? "text-green-700" : "text-muted-foreground"}>
                            {fmtBRL(parseFloat(m.monetaryAmount))}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={m.outcome === "WON" ? "border-green-300 bg-green-50 text-green-700" : "border-red-300 bg-red-50 text-red-700"}>
                          {m.outcome === "WON" ? "✅ Ganho" : "❌ Perdido"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDatePipeline(m.migratedAt)}</div>
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
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────
type Tab = "visao-geral" | "vendas-bi" | "pcp" | "por-cliente" | "historico" | "contas-receber" | "movimentacoes" | "pipeline-mirage";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "visao-geral",       label: "Visão Geral",            icon: BarChart3   },
  { id: "vendas-bi",         label: "Vendas BI",               icon: DollarSign  },
  { id: "pcp",               label: "PCP",                     icon: Layers      },
  { id: "por-cliente",       label: "Por Cliente",             icon: Users       },
  { id: "historico",         label: "Histórico",               icon: History     },
  { id: "movimentacoes",     label: "Rel. Movimentações",      icon: Activity    },
  { id: "contas-receber",    label: "Contas a Receber",        icon: Wallet      },
  { id: "pipeline-mirage",   label: "Pipeline Mirage",         icon: TrendingUp  },
];

export default function RelatoriosApp() {
  const [tab, setTab] = useState<Tab>("visao-geral");

  return (
    <KanbanLayout>
      <div className="px-6 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
            <BarChart3 size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-sm text-muted-foreground">Inteligência de negócio em tempo real</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                tab === t.id ? "border-violet-600 text-violet-700" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <t.icon size={15} />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "visao-geral"    && <TabVisaoGeral />}
        {tab === "vendas-bi"      && <TabVendasBI />}
        {tab === "pcp"            && <TabPCP />}
        {tab === "por-cliente"    && <TabPorCliente />}
        {tab === "historico"      && <TabHistorico />}
        {tab === "movimentacoes"   && <TabMovimentacoes />}
        {tab === "contas-receber"  && <TabContasReceber />}
        {tab === "pipeline-mirage" && <TabPipelineMirage />}
      </div>
    </KanbanLayout>
  );
}
