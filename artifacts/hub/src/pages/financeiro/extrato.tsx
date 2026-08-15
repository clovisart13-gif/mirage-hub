import { useState, useMemo, useRef } from "react";
import FinanceiroLayout from "@/components/financeiro/FinanceiroLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Trash2, ArrowLeftRight, ScanSearch, RotateCcw,
  ArrowUp, ArrowDown, ArrowUpDown, X, CheckCircle2, Undo2,
  Clock, CircleDot, PlusCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Transacao {
  id: number; data: string; descricao: string; valor: string; tipo: "CREDITO" | "DEBITO";
  categoriaId?: string; natureza?: string; centroCusto?: string; status: string; contaId?: number;
}
interface Conta { id: number; nome: string; }
interface Categoria { id: string; nome: string; naturezaPadrao?: string; centroCustoPadrao?: string; }
interface RegraDialog { descricao: string; categoriaId: string; natureza: string; centroCusto: string; }
interface AuditItem { id: number; data: string; descricao: string; valor: string | null; tipo: "CREDITO" | "DEBITO"; padrao: string; }
interface AjusteForm { contaId: string; data: string; tipo: "CREDITO" | "DEBITO"; valor: string; descricao: string; }
type SortField = "data" | "valor";
type SortDir = "asc" | "desc";

const fmt = (v: string | number | null | undefined) =>
  parseFloat(String(v ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function extrairTermo(desc: string): string {
  const noise = /^(PIX\s+CRED\s+|PIX\s+DEB\s+|PIX\s+|TED\s+|DOC\s+|PAGAMENTO\s+|PAGTO\s+|DEBITO\s+|CREDITO\s+|CRED\s+|DEB\s+|TRANSF\s+|TRANSFERENCIA\s+|SAQUE\s+|DEPOSITO\s+)/i;
  return desc.replace(noise, "").trim().split(/\s+/).slice(0, 3).join(" ").substring(0, 30).toUpperCase();
}
function parseDateBR(d: string): number {
  const [dd, mm, yyyy] = d.split("/");
  return new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd)).getTime();
}
function brToISO(d: string): string {
  const [dd, mm, yyyy] = d.split("/");
  return `${yyyy}-${mm}-${dd}`;
}
function isoToday() { return new Date().toISOString().split("T")[0]; }
function isoYesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split("T")[0]; }
function isoStartOfWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split("T")[0]; }
function isoStartOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; }

// Status visual helpers
const STATUS_CONFIG = {
  pendente:    { label: "Pendente",           icon: CircleDot,    color: "text-slate-500",  bg: "" },
  classificado:{ label: "Ag. Validação",      icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50/40" },
  validado:    { label: "Validado",           icon: CheckCircle2, color: "text-emerald-600",bg: "bg-emerald-50/30" },
} as const;

export default function Extrato() {
  const qc = useQueryClient();

  // Filtros
  const [search, setSearch]           = useState("");
  const [dataInicio, setDataInicio]   = useState("");
  const [dataFim, setDataFim]         = useState("");
  const [filtroConta, setFiltroConta] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Ordenação
  const [sortField, setSortField] = useState<SortField>("data");
  const [sortDir, setSortDir]     = useState<SortDir>("desc");

  // UI
  const [pagina, setPagina]       = useState(1);
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [catMassa, setCatMassa]   = useState("");
  const [regraDialog, setRegraDialog]   = useState<RegraDialog | null>(null);
  const [termoInput, setTermoInput]     = useState("");
  const [auditModal, setAuditModal]     = useState<{ sugestoes: AuditItem[]; confirmados: number[] } | null>(null);
  const [ajusteModal, setAjusteModal]   = useState(false);
  const [ajuste, setAjuste]             = useState<AjusteForm>({
    contaId: "", data: isoToday(), tipo: "DEBITO", valor: "", descricao: "Ajuste de Saldo",
  });
  const skipDialog = useRef(false);
  const POR_PAGINA = 50;

  const { data: transacoes = [] } = useQuery<Transacao[]>({ queryKey: ["fin-transacoes"], queryFn: () => apiFetch("/financeiro/transacoes") });
  const { data: contas = [] }     = useQuery<Conta[]>({ queryKey: ["fin-contas"], queryFn: () => apiFetch("/financeiro/contas") });
  const { data: categorias = [] } = useQuery<Categoria[]>({ queryKey: ["fin-categorias"], queryFn: () => apiFetch("/financeiro/categorias") });

  const resetPagina = () => { setPagina(1); setSelecionados([]); };
  const invalidate  = () => {
    qc.invalidateQueries({ queryKey: ["fin-transacoes"] });
    qc.invalidateQueries({ queryKey: ["financeiro-dashboard"] });
  };

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/financeiro/transacoes/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidate(); toast.success("Removido"); },
  });

  const resetarMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/financeiro/transacoes/${id}/resetar`, { method: "POST", body: "{}" }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao desfazer"),
  });

  const classifMut = useMutation({
    mutationFn: ({ id, categoriaId, descricao }: { id: number; categoriaId: string; descricao: string }) => {
      const cat = categorias.find(c => c.id === categoriaId);
      return apiFetch(`/financeiro/transacoes/${id}`, {
        method: "PUT",
        body: JSON.stringify({ categoriaId, natureza: cat?.naturezaPadrao, centroCusto: cat?.centroCustoPadrao }),
      });
    },
    onSuccess: (_, vars) => {
      invalidate();
      if (!skipDialog.current) {
        const cat = categorias.find(c => c.id === vars.categoriaId);
        setTermoInput(extrairTermo(vars.descricao));
        setRegraDialog({ descricao: vars.descricao, categoriaId: vars.categoriaId, natureza: cat?.naturezaPadrao ?? "", centroCusto: cat?.centroCustoPadrao ?? "" });
      }
    },
    onError: () => toast.error("Erro ao classificar"),
  });

  const movMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/financeiro/transacoes/${id}`, { method: "PUT", body: JSON.stringify({ natureza: "Movimentação Financeira" }) }),
    onSuccess: () => invalidate(),
    onError: () => toast.error("Erro ao marcar"),
  });

  // Validar (bulk ou individual)
  const validarMut = useMutation({
    mutationFn: (ids: number[]) => apiFetch("/financeiro/transacoes/validar", { method: "POST", body: JSON.stringify({ ids }) }),
    onSuccess: (res: any) => { invalidate(); toast.success(`${res.validadas} transação(ões) validada(s) ✓`); setSelecionados([]); },
    onError: () => toast.error("Erro ao validar"),
  });

  // Reverter validação
  const reverterMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/financeiro/transacoes/${id}/reverter-validacao`, { method: "POST", body: "{}" }),
    onSuccess: () => { invalidate(); toast.success("Validação revertida — transação voltou para 'Ag. Validação'"); },
    onError: () => toast.error("Erro ao reverter"),
  });

  // Detectar transferências (dry run)
  const detectarMut = useMutation({
    mutationFn: () => apiFetch("/financeiro/transacoes/detectar-transferencias", { method: "POST", body: "{}" }),
    onSuccess: (res: any) => {
      if (!res.sugestoes?.length) { toast.info("Nenhuma transferência detectada."); return; }
      setAuditModal({ sugestoes: res.sugestoes, confirmados: res.sugestoes.map((s: AuditItem) => s.id) });
    },
    onError: () => toast.error("Erro na detecção"),
  });

  const confirmarMut = useMutation({
    mutationFn: (ids: number[]) => apiFetch("/financeiro/transacoes/confirmar-movimentacao", { method: "POST", body: JSON.stringify({ ids }) }),
    onSuccess: (res: any) => { invalidate(); setAuditModal(null); toast.success(`${res.marcadas} marcados como Movimentação Financeira`); },
    onError: () => toast.error("Erro ao confirmar"),
  });

  const criarRegraMut = useMutation({
    mutationFn: (d: object) => apiFetch("/financeiro/regras", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => { toast.success("Regra criada!"); setRegraDialog(null); },
    onError: () => toast.error("Erro ao criar regra"),
  });

  const ajusteMut = useMutation({
    mutationFn: (d: object) => apiFetch("/financeiro/ajuste-saldo", { method: "POST", body: JSON.stringify(d) }),
    onSuccess: () => {
      invalidate(); setAjusteModal(false);
      setAjuste({ contaId: "", data: isoToday(), tipo: "DEBITO", valor: "", descricao: "Ajuste de Saldo" });
      toast.success("Ajuste de saldo criado e validado ✓");
    },
    onError: () => toast.error("Erro ao criar ajuste"),
  });

  // ── Ações em massa ────────────────────────────────────────────────────────
  const aplicarMassa = async () => {
    if (!catMassa || !selecionados.length) return;
    skipDialog.current = true;
    const itens = transacoes.filter(t => selecionados.includes(t.id));
    await Promise.all(itens.map(t => classifMut.mutateAsync({ id: t.id, categoriaId: catMassa, descricao: t.descricao })));
    skipDialog.current = false;
    toast.success(`${selecionados.length} classificadas`);
    setSelecionados([]); setCatMassa("");
  };
  const marcarMassaTransf = async () => {
    if (!selecionados.length) return;
    await Promise.all(selecionados.map(id => movMut.mutateAsync(id)));
    toast.success(`${selecionados.length} marcadas como Movimentação Financeira`);
    setSelecionados([]);
  };

  // ── Atalhos de data ────────────────────────────────────────────────────────
  function aplicarAtalho(tipo: "hoje" | "ontem" | "semana" | "mes") {
    if (tipo === "ontem")  { setDataInicio(isoYesterday()); setDataFim(isoYesterday()); }
    else if (tipo === "hoje")   { setDataInicio(isoToday()); setDataFim(isoToday()); }
    else if (tipo === "semana") { setDataInicio(isoStartOfWeek()); setDataFim(isoToday()); }
    else                        { setDataInicio(isoStartOfMonth()); setDataFim(isoToday()); }
    resetPagina();
  }

  // ── Ordenação ──────────────────────────────────────────────────────────────
  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    resetPagina();
  }
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 ml-1 text-primary" /> : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  }

  // ── Filtro ─────────────────────────────────────────────────────────────────
  const filtradas = useMemo(() => transacoes.filter(t => {
    if (search && !t.descricao.toLowerCase().includes(search.toLowerCase())) return false;
    if (dataInicio || dataFim) {
      const iso = brToISO(t.data);
      if (dataInicio && iso < dataInicio) return false;
      if (dataFim && iso > dataFim) return false;
    }
    if (filtroConta !== "todas" && String(t.contaId) !== filtroConta) return false;
    if (filtroStatus === "pendente"     && t.status !== "pendente")     return false;
    if (filtroStatus === "classificado" && t.status !== "classificado") return false;
    if (filtroStatus === "validado"     && t.status !== "validado")     return false;
    if (filtroStatus === "nao_validado" && t.status === "validado")     return false;
    return true;
  }), [transacoes, search, dataInicio, dataFim, filtroConta, filtroStatus]);

  // Ordenação
  const filtradasOrdenadas = useMemo(() => {
    const arr = [...filtradas];
    arr.sort((a, b) => {
      const cmp = sortField === "data"
        ? parseDateBR(a.data) - parseDateBR(b.data)
        : parseFloat(a.valor) - parseFloat(b.valor);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [filtradas, sortField, sortDir]);

  // Saldo por conta: calculado em ordem cronológica, apenas VALIDADAS
  const filtroContaAtivo = filtroConta !== "todas";
  const saldoPorId = useMemo(() => {
    if (!filtroContaAtivo) return new Map<number, number>();
    const sorted = [...filtradas].sort((a, b) => parseDateBR(a.data) - parseDateBR(b.data));
    const map = new Map<number, number>();
    let acc = 0;
    for (const t of sorted) {
      if (t.status === "validado") {
        acc += t.tipo === "CREDITO" ? parseFloat(t.valor) : -parseFloat(t.valor);
      }
      map.set(t.id, acc);
    }
    return map;
  }, [filtradas, filtroContaAtivo]);

  const totalPaginas = Math.ceil(filtradasOrdenadas.length / POR_PAGINA);
  const paginadas    = filtradasOrdenadas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  // Totais do filtro
  const totValEntr = filtradas.filter(t => t.tipo === "CREDITO").reduce((s, t) => s + parseFloat(t.valor), 0);
  const totValSaid = filtradas.filter(t => t.tipo === "DEBITO").reduce((s, t)  => s + parseFloat(t.valor), 0);
  const saldoTotal = totValEntr - totValSaid;

  // Contagem global de aguardando validação
  const totalAguardando = transacoes.filter(t => t.status === "classificado").length;
  const totalPendentes  = transacoes.filter(t => t.status === "pendente").length;

  const contaNome = (id?: number) => contas.find(c => c.id === id)?.nome ?? "—";
  const toggleAll = () =>
    setSelecionados(selecionados.length === paginadas.length ? [] : paginadas.map(t => t.id));

  const categoriasOrdenadas = useMemo(
    () => [...categorias].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [categorias]
  );

  const isMovFin      = (t: Transacao) => t.natureza === "Movimentação Financeira" || t.natureza === "Transferência";
  const temFiltro     = !!(search || dataInicio || dataFim || filtroConta !== "todas" || filtroStatus !== "todos");

  // IDs dos selecionados que estão "classificado" (podem ser validados em massa)
  const selecionadosClassif = selecionados.filter(id => transacoes.find(t => t.id === id)?.status === "classificado");

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <FinanceiroLayout>
      <div className="p-6 space-y-4">

        {/* ── Cabeçalho ── */}
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold">Extrato de Lançamentos</h1>
            <p className="text-sm text-muted-foreground">
              Importe, classifique, valide e ajuste. Saldo e relatórios só atualizam após validação.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setAjusteModal(true)}>
              <PlusCircle className="w-4 h-4 mr-1" /> Ajuste de Saldo
            </Button>
            <Button variant="outline" size="sm" onClick={() => detectarMut.mutate()} disabled={detectarMut.isPending}>
              <ScanSearch className="w-4 h-4 mr-1" />
              {detectarMut.isPending ? "Detectando..." : "Detectar Transferências"}
            </Button>
          </div>
        </div>

        {/* ── Banner: aguardando validação ── */}
        {(totalAguardando > 0 || totalPendentes > 0) && (
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="text-amber-800 flex-1">
              {totalPendentes > 0 && <><strong>{totalPendentes}</strong> sem categoria · </>}
              {totalAguardando > 0 && <><strong>{totalAguardando}</strong> classificados aguardando validação</>}
              {" — "}saldo e relatórios mostram apenas transações validadas.
            </span>
            {totalAguardando > 0 && (
              <Button size="sm" variant="outline" className="border-amber-400 text-amber-800 hover:bg-amber-100 h-7"
                onClick={() => {
                  const ids = transacoes.filter(t => t.status === "classificado").map(t => t.id);
                  validarMut.mutate(ids);
                }}
                disabled={validarMut.isPending}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Validar todos os classificados
              </Button>
            )}
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar descrição..." value={search}
                onChange={e => { setSearch(e.target.value); resetPagina(); }} />
            </div>
            <Select value={filtroConta} onValueChange={v => { setFiltroConta(v); resetPagina(); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Contas</SelectItem>
                {contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={v => { setFiltroStatus(v); resetPagina(); }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Status</SelectItem>
                <SelectItem value="pendente">Pendentes (sem categoria)</SelectItem>
                <SelectItem value="classificado">Ag. Validação</SelectItem>
                <SelectItem value="validado">Validados ✓</SelectItem>
                <SelectItem value="nao_validado">Não Validados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Datas + atalhos */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input type="date" className="w-36 h-8 text-sm" value={dataInicio}
                onChange={e => { setDataInicio(e.target.value); resetPagina(); }} />
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input type="date" className="w-36 h-8 text-sm" value={dataFim}
                onChange={e => { setDataFim(e.target.value); resetPagina(); }} />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-0.5">Atalho:</span>
              {(["Hoje", "Ontem", "Esta semana", "Este mês"] as const).map(label => {
                const key = label === "Hoje" ? "hoje" : label === "Ontem" ? "ontem" : label === "Esta semana" ? "semana" : "mes";
                return (
                  <Button key={key} variant="outline" size="sm" className="h-7 px-2 text-xs"
                    onClick={() => aplicarAtalho(key as any)}>{label}</Button>
                );
              })}
            </div>
            {temFiltro && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                onClick={() => { setSearch(""); setDataInicio(""); setDataFim(""); setFiltroConta("todas"); setFiltroStatus("todos"); resetPagina(); }}>
                <X className="w-3.5 h-3.5 mr-1" /> Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Banner saldo por conta */}
        {filtroContaAtivo && (
          <div className="flex items-center gap-3 px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm">
            <ArrowLeftRight className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="text-teal-800">
              Saldo corrente de <strong>{contaNome(parseInt(filtroConta))}</strong> — coluna "Saldo" mostra apenas transações <strong>validadas</strong>, em ordem cronológica.
            </span>
          </div>
        )}

        {/* ── Barra de ação em massa ── */}
        {selecionados.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-700">{selecionados.length} selecionado(s)</span>
            <Select value={catMassa} onValueChange={setCatMassa}>
              <SelectTrigger className="flex-1 max-w-[240px] h-8 text-sm"><SelectValue placeholder="Categoria para todos..." /></SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto">
                {categoriasOrdenadas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!catMassa || classifMut.isPending} onClick={aplicarMassa}>Classificar</Button>
            <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
              disabled={movMut.isPending} onClick={marcarMassaTransf}>
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1" /> Movimentação Fin.
            </Button>
            {selecionadosClassif.length > 0 && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={validarMut.isPending}
                onClick={() => validarMut.mutate(selecionadosClassif)}>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Validar {selecionadosClassif.length} classificado(s)
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { setSelecionados([]); setCatMassa(""); }}>Cancelar</Button>
          </div>
        )}

        {/* Contador + totais */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="rounded"
            checked={paginadas.length > 0 && selecionados.length === paginadas.length}
            onChange={toggleAll} />
          <span>
            <span className="font-semibold text-foreground">{filtradasOrdenadas.length}</span> lançamento(s)
            {temFiltro && <span className="ml-1 text-xs">(de {transacoes.length})</span>}
          </span>
          <span className="ml-auto flex items-center gap-3 text-xs">
            {totValEntr > 0 && <span className="text-emerald-600">↑ {fmt(totValEntr)}</span>}
            {totValSaid > 0 && <span className="text-red-500">↓ {fmt(totValSaid)}</span>}
            <span className={cn("font-semibold", saldoTotal >= 0 ? "text-slate-700" : "text-red-500")}>
              = {fmt(saldoTotal)}
            </span>
          </span>
        </div>

        {/* ── Tabela ── */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-2 w-8"></th>
                <th className="px-3 py-2 w-5"></th>{/* status dot */}
                <th className="text-left px-3 py-2 cursor-pointer select-none hover:text-foreground"
                  onClick={() => toggleSort("data")}>
                  <span className="inline-flex items-center">Data <SortIcon field="data" /></span>
                </th>
                <th className="text-left px-3 py-2">Descrição / Conta</th>
                <th className="text-right px-3 py-2 cursor-pointer select-none hover:text-foreground"
                  onClick={() => toggleSort("valor")}>
                  <span className="inline-flex items-center justify-end w-full">Valor <SortIcon field="valor" /></span>
                </th>
                {filtroContaAtivo && <th className="text-right px-3 py-2 text-teal-600">Saldo ✓</th>}
                <th className="text-left px-3 py-2 w-52">Classificação</th>
                <th className="px-3 py-2 w-24 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginadas.length === 0 && (
                <tr><td colSpan={filtroContaAtivo ? 8 : 7} className="text-center py-14 text-muted-foreground">
                  {temFiltro ? "Nenhum lançamento neste filtro/período." : "Nenhum lançamento encontrado."}
                </td></tr>
              )}
              {paginadas.map(t => {
                const movFin = isMovFin(t);
                const cfg    = STATUS_CONFIG[t.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendente;
                const IconStatus = cfg.icon;
                return (
                  <tr key={t.id} className={cn(
                    "border-t hover:bg-muted/20 transition-colors",
                    cfg.bg,
                    selecionados.includes(t.id) && "bg-blue-50/60"
                  )}>
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input type="checkbox" className="rounded"
                        checked={selecionados.includes(t.id)}
                        onChange={() => setSelecionados(p => p.includes(t.id) ? p.filter(i => i !== t.id) : [...p, t.id])} />
                    </td>

                    {/* Status dot */}
                    <td className="py-2 pl-1">
                      <span title={cfg.label}><IconStatus className={cn("w-3.5 h-3.5", cfg.color)} /></span>
                    </td>

                    {/* Data */}
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap tabular-nums text-xs">{t.data}</td>

                    {/* Descrição */}
                    <td className="px-3 py-2 max-w-[240px]">
                      <span className="block truncate" title={t.descricao}>{t.descricao}</span>
                      <span className="text-xs text-muted-foreground">{contaNome(t.contaId)}</span>
                    </td>

                    {/* Valor */}
                    <td className={cn("px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums",
                      t.tipo === "CREDITO" ? "text-emerald-600" : "text-red-500")}>
                      {t.tipo === "CREDITO" ? "+" : "-"}{fmt(t.valor)}
                    </td>

                    {/* Saldo validado (por conta) */}
                    {filtroContaAtivo && (
                      <td className={cn("px-3 py-2 text-right font-semibold whitespace-nowrap tabular-nums text-xs",
                        (saldoPorId.get(t.id) ?? 0) >= 0 ? "text-teal-700" : "text-red-500")}>
                        {t.status === "validado" ? fmt(saldoPorId.get(t.id) ?? 0) : <span className="text-muted-foreground/60">—</span>}
                      </td>
                    )}

                    {/* Classificação */}
                    <td className="px-3 py-2">
                      {movFin ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <ArrowLeftRight className="w-3 h-3" /> Movimentação Fin.
                        </span>
                      ) : (
                        <Select
                          value={t.categoriaId ?? ""}
                          onValueChange={catId => classifMut.mutate({ id: t.id, categoriaId: catId, descricao: t.descricao })}
                        >
                          <SelectTrigger className={cn("h-7 text-xs w-full",
                            !t.categoriaId ? "text-muted-foreground border-dashed" :
                            t.status === "validado" ? "border-emerald-300 bg-emerald-50/50" : "")}>
                            <SelectValue placeholder="Escolher categoria..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-64 overflow-y-auto">
                            {categoriasOrdenadas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5 justify-center">

                        {/* ✓ Validar — apenas para "classificado" */}
                        {t.status === "classificado" && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-emerald-600 hover:bg-emerald-50"
                            title="Validar — confirma categoria e atualiza saldo/relatórios"
                            onClick={() => validarMut.mutate([t.id])}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* ↩ Reverter validação — apenas para "validado" */}
                        {t.status === "validado" && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:text-amber-600"
                            title="Reverter validação — volta para 'Ag. Validação' para corrigir"
                            onClick={() => reverterMut.mutate(t.id)}>
                            <Undo2 className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* ⇄ Marcar como Movimentação — para pendente/classificado sem movFin */}
                        {!movFin && t.status !== "validado" && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-amber-600"
                            title="Marcar como Movimentação Financeira / Transferência"
                            onClick={() => movMut.mutate(t.id)}>
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* ↺ Resetar — para classificado/movFin (volta a pendente) */}
                        {(t.status === "classificado" || (movFin && t.status !== "validado")) && (
                          <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-orange-500"
                            title="Desfazer — apaga categoria e volta para pendente"
                            onClick={() => resetarMut.mutate(t.id)}>
                            <RotateCcw className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* 🗑 Excluir */}
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMut.mutate(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{filtradasOrdenadas.length} lançamentos · pág. {pagina}/{totalPaginas}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={pagina === 1}
                onClick={() => { setPagina(p => p - 1); setSelecionados([]); }}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={pagina === totalPaginas}
                onClick={() => { setPagina(p => p + 1); setSelecionados([]); }}>Próxima</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Dialog: Ajuste de Saldo ──────────────────────────────────────────── */}
      <Dialog open={ajusteModal} onOpenChange={setAjusteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-teal-600" /> Ajuste de Saldo
            </DialogTitle>
            <DialogDescription>
              Cria um lançamento manual já validado para corrigir diferenças entre o sistema e o extrato real do banco.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs mb-1 block">Conta</Label>
              <Select value={ajuste.contaId} onValueChange={v => setAjuste(a => ({ ...a, contaId: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar conta..." /></SelectTrigger>
                <SelectContent>{contas.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Data</Label>
                <Input type="date" value={ajuste.data}
                  onChange={e => setAjuste(a => ({ ...a, data: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Tipo</Label>
                <Select value={ajuste.tipo} onValueChange={(v: "CREDITO" | "DEBITO") => setAjuste(a => ({ ...a, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREDITO">Entrada (+)</SelectItem>
                    <SelectItem value="DEBITO">Saída (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1 block">Valor (R$)</Label>
              <Input type="number" min="0.01" step="0.01" placeholder="0,00"
                value={ajuste.valor} onChange={e => setAjuste(a => ({ ...a, valor: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Descrição</Label>
              <Input value={ajuste.descricao}
                onChange={e => setAjuste(a => ({ ...a, descricao: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded">
              Este ajuste entra diretamente como <strong>validado</strong> e reflete imediatamente no saldo da conta.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAjusteModal(false)}>Cancelar</Button>
            <Button
              disabled={!ajuste.contaId || !ajuste.valor || parseFloat(ajuste.valor) <= 0 || ajusteMut.isPending}
              onClick={() => {
                const [yyyy, mm, dd] = ajuste.data.split("-");
                ajusteMut.mutate({
                  contaId: parseInt(ajuste.contaId),
                  data: `${dd}/${mm}/${yyyy}`,
                  tipo: ajuste.tipo,
                  valor: parseFloat(ajuste.valor),
                  descricao: ajuste.descricao || "Ajuste de Saldo",
                });
              }}>
              {ajusteMut.isPending ? "Criando..." : "Criar Ajuste"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Auditoria de transferências detectadas ───────────────────── */}
      <Dialog open={!!auditModal} onOpenChange={open => !open && setAuditModal(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanSearch className="w-5 h-5 text-amber-600" /> Revisar Transferências Detectadas
            </DialogTitle>
            <DialogDescription>
              {auditModal?.sugestoes.length ?? 0} lançamento(s) com padrão de transferência ou pagamento de fatura.
              <strong className="block mt-1 text-foreground">
                Desmarque os que NÃO são transferências antes de confirmar.
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" className="rounded"
                      checked={auditModal?.confirmados.length === auditModal?.sugestoes.length}
                      onChange={() => setAuditModal(p => p ? {
                        ...p, confirmados: p.confirmados.length === p.sugestoes.length ? [] : p.sugestoes.map(s => s.id),
                      } : null)} />
                  </th>
                  <th className="text-left px-3 py-2">Data</th>
                  <th className="text-left px-3 py-2">Descrição</th>
                  <th className="text-right px-3 py-2">Valor</th>
                  <th className="text-left px-3 py-2">Padrão</th>
                </tr>
              </thead>
              <tbody>
                {auditModal?.sugestoes.map(s => (
                  <tr key={s.id} className={cn("border-t hover:bg-muted/20",
                    !auditModal.confirmados.includes(s.id) && "opacity-40")}>
                    <td className="px-3 py-2">
                      <input type="checkbox" className="rounded"
                        checked={auditModal.confirmados.includes(s.id)}
                        onChange={() => setAuditModal(p => p ? {
                          ...p, confirmados: p.confirmados.includes(s.id)
                            ? p.confirmados.filter(i => i !== s.id)
                            : [...p.confirmados, s.id],
                        } : null)} />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-muted-foreground tabular-nums">{s.data}</td>
                    <td className="px-3 py-2 max-w-[240px] truncate" title={s.descricao}>{s.descricao}</td>
                    <td className={cn("px-3 py-2 text-right font-semibold tabular-nums whitespace-nowrap",
                      s.tipo === "CREDITO" ? "text-emerald-600" : "text-red-500")}>
                      {s.tipo === "CREDITO" ? "+" : "-"}{fmt(s.valor)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-xs text-amber-700 border-amber-300 bg-amber-50">{s.padrao}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <span className="text-sm text-muted-foreground mr-auto">
              {auditModal?.confirmados.length ?? 0} de {auditModal?.sugestoes.length ?? 0} selecionados
            </span>
            <Button variant="outline" onClick={() => setAuditModal(null)}>Cancelar</Button>
            <Button disabled={!auditModal?.confirmados.length || confirmarMut.isPending}
              onClick={() => auditModal && confirmarMut.mutate(auditModal.confirmados)}>
              {confirmarMut.isPending ? "Aplicando..." : `Confirmar ${auditModal?.confirmados.length ?? 0}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Criar regra automática ──────────────────────────────────── */}
      <Dialog open={!!regraDialog} onOpenChange={open => !open && setRegraDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar regra automática?</DialogTitle>
            <DialogDescription>Futuras transações com esse termo serão classificadas automaticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded font-mono truncate">{regraDialog?.descricao}</div>
            <div>
              <Label className="text-xs mb-1 block">Termo de identificação</Label>
              <Input value={termoInput} onChange={e => setTermoInput(e.target.value.toUpperCase())}
                placeholder="Ex: POSTO, CORREIOS, AVIAMENTOS..." maxLength={50} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegraDialog(null)}>Não, obrigado</Button>
            <Button disabled={termoInput.trim().length < 3 || criarRegraMut.isPending}
              onClick={() => criarRegraMut.mutate({ termo: termoInput.trim(), categoriaId: regraDialog!.categoriaId, natureza: regraDialog!.natureza, centroCusto: regraDialog!.centroCusto })}>
              Criar regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FinanceiroLayout>
  );
}
