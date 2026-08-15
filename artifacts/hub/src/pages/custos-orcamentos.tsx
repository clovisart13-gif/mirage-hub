import { useState, useMemo, useEffect } from "react";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import CustosNav from "@/components/orcamento/CustosNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

import {
  AlertCircle, AlertTriangle, CheckCircle, Clock, Eye, FileText, Loader2, Plus, Search, Send, Trash2, XCircle,
} from "lucide-react";
import {
  listOrcamentos, criarOrcamento, atualizarStatus, deletarOrcamento, listFichas, criarOrcamentoDasFichas,
  enviarParaKanban,
} from "@/lib/custos-api";

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type StatusType = "todos" | "pendente" | "aprovado" | "reprovado";
type FilterType = "todos" | "pendente_envio";
type SortType = "recente" | "cliente";

function getStatusBadge(status: string) {
  const map: Record<string, { cls: string; label: string; Icon: any }> = {
    pendente:  { cls: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Pendente",  Icon: Clock },
    aprovado:  { cls: "bg-green-100  text-green-800  border-green-200",  label: "Aprovado",  Icon: CheckCircle },
    reprovado: { cls: "bg-red-100    text-red-800    border-red-200",    label: "Reprovado", Icon: AlertCircle },
  };
  const { cls, label, Icon } = map[status] ?? map.pendente;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

function isVencido(dataEmissao: string | Date, validadeDias: number, status: string) {
  if (status !== "pendente") return false;
  const venc = new Date(dataEmissao);
  venc.setDate(venc.getDate() + validadeDias);
  return new Date() > venc;
}

function diasParaVencer(dataEmissao: string | Date, validadeDias: number, status: string) {
  if (status !== "pendente") return Infinity;
  const venc = new Date(dataEmissao);
  venc.setDate(venc.getDate() + validadeDias);
  return Math.ceil((venc.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getRowClass(status: string, dataEmissao: string | Date, validadeDias: number) {
  if (isVencido(dataEmissao, validadeDias, status)) {
    return "border-l-4 border-l-red-600 bg-red-50 hover:bg-red-100";
  }
  const dias = diasParaVencer(dataEmissao, validadeDias, status);
  if (dias <= 3 && dias > 0 && status === "pendente") {
    return "border-l-4 border-l-orange-500 bg-orange-50 hover:bg-orange-100";
  }
  const classes: Record<string, string> = {
    pendente:  "border-l-4 border-l-yellow-400 hover:bg-yellow-50",
    aprovado:  "border-l-4 border-l-green-400  hover:bg-green-50",
    reprovado: "border-l-4 border-l-red-400    hover:bg-red-50",
  };
  return classes[status] ?? classes.pendente;
}

// ─── Modal: Novo Orçamento Manual ────────────────────────────────────────────
function NovoOrcamentoModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (id: string) => void;
}) {
  const [nomeCliente, setNomeCliente] = useState("");
  const [marca, setMarca] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    setSaving(true);
    try {
      const orc = await criarOrcamento({ nomeCliente: nomeCliente.trim(), marca: marca.trim() || undefined, validadeDias: 7 });
      toast.success("Orçamento criado!");
      setNomeCliente(""); setMarca("");
      onSuccess(orc.id);
    } catch (err: any) { toast.error(err.message ?? "Erro ao criar orçamento"); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Orçamento Manual</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Nome do Cliente *</Label><Input value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} placeholder="Acme Corp" required /></div>
          <div><Label>Marca (Opcional)</Label><Input value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Ex: Nike" /></div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? "Criando..." : "Criar Orçamento"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const OBS_STORAGE_KEY = "mirage:obs_padrao";
function loadObsSalvas(): string[] {
  try { return JSON.parse(localStorage.getItem(OBS_STORAGE_KEY) ?? "[]"); } catch { return []; }
}
function saveObsSalvas(list: string[]) {
  localStorage.setItem(OBS_STORAGE_KEY, JSON.stringify(list.slice(0, 15)));
}

// ─── Modal: Criar de Fichas ───────────────────────────────────────────────────
function CriarDasFichasModal({ open, onClose, onSuccess }: {
  open: boolean; onClose: () => void; onSuccess: (id: string) => void;
}) {
  const [nomeCliente, setNomeCliente] = useState("");
  const [marca, setMarca] = useState("");
  const [descricao, setDescricao] = useState("");
  const [markup, setMarkup] = useState("0.5");
  const [observacoes, setObservacoes] = useState("");
  const [descontoTipo, setDescontoTipo] = useState<"percentual" | "valor">("percentual");
  const [descontoValor, setDescontoValor] = useState("");
  const [selectedFichas, setSelectedFichas] = useState<string[]>([]);
  const [filtroCliente, setFiltroCliente] = useState("__all__");
  const [buscaFicha, setBuscaFicha] = useState("");
  const [saving, setSaving] = useState(false);
  const [obsSalvas, setObsSalvas] = useState<string[]>([]);
  const [showObsDropdown, setShowObsDropdown] = useState(false);

  const { data: fichasData = [] } = useQuery({ queryKey: ["custos-fichas-modal"], queryFn: () => listFichas(), enabled: open });
  const fichas = fichasData as any[];

  // Carrega observações salvas quando abre o modal
  useEffect(() => {
    if (open) setObsSalvas(loadObsSalvas());
  }, [open]);

  const clientesUnicos = useMemo(() => {
    const clientes = new Set<string>();
    fichas.forEach((f: any) => { if (f.cliente) clientes.add(f.cliente); });
    return Array.from(clientes).sort();
  }, [fichas]);

  const fichasFiltradas = useMemo(() => {
    let list = fichas;
    if (filtroCliente && filtroCliente !== "__all__") list = list.filter((f: any) => f.cliente === filtroCliente);
    if (buscaFicha.trim()) {
      const q = buscaFicha.trim().toLowerCase();
      list = list.filter((f: any) => f.referencia?.toLowerCase().includes(q) || f.tipo?.toLowerCase().includes(q) || f.familia?.toLowerCase().includes(q));
    }
    return list;
  }, [fichas, filtroCliente, buscaFicha]);

  const handleFiltroClienteChange = (cliente: string) => {
    setFiltroCliente(cliente);
    setSelectedFichas([]);
    if (cliente && cliente !== "__all__") setNomeCliente(cliente);
  };

  const handleSelectFicha = (fichaId: string) => {
    setSelectedFichas((prev) =>
      prev.includes(fichaId) ? prev.filter((id) => id !== fichaId) : [...prev, fichaId]
    );
  };

  const handleSelectAll = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const ids: string[] = fichasFiltradas.map((f: any) => String(f.id));
    const allSelected = ids.length > 0 && ids.every((id) => selectedFichas.includes(id));
    if (allSelected) {
      setSelectedFichas(selectedFichas.filter((id) => !ids.includes(id)));
    } else {
      const merged = [...selectedFichas];
      for (const id of ids) { if (!merged.includes(id)) merged.push(id); }
      setSelectedFichas(merged);
    }
  };

  const handleSalvarObs = () => {
    const texto = observacoes.trim();
    if (!texto) { toast.error("Escreva uma observação primeiro"); return; }
    if (obsSalvas.includes(texto)) { toast.error("Essa observação já está salva"); return; }
    const nova = [texto, ...obsSalvas];
    saveObsSalvas(nova);
    setObsSalvas(nova);
    toast.success("Observação salva!");
  };

  const handleRemoverObs = (texto: string) => {
    const nova = obsSalvas.filter((o) => o !== texto);
    saveObsSalvas(nova);
    setObsSalvas(nova);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeCliente.trim()) { toast.error("Preencha nome do cliente!"); return; }
    if (selectedFichas.length === 0) { toast.error("Selecione pelo menos uma ficha de custo!"); return; }
    const markupNum = parseFloat(markup);
    if (isNaN(markupNum) || markupNum <= 0 || markupNum >= 1) {
      toast.error("Markup inválido. Use um valor entre 0 e 1 (ex: 0.50 para 100% de margem)");
      return;
    }
    setSaving(true);
    try {
      const orc = await criarOrcamentoDasFichas({
        nomeCliente: nomeCliente.trim(),
        marca: marca.trim() || undefined,
        descricao: descricao.trim() || undefined,
        markup: markupNum,
        observacoes: observacoes.trim() || undefined,
        descontoTipo: descontoValor ? descontoTipo : undefined,
        descontoValor: descontoValor ? parseFloat(descontoValor) : undefined,
        fichaIds: selectedFichas,
      });
      toast.success(`Orçamento criado com ${selectedFichas.length} ficha(s)!`);
      setNomeCliente(""); setMarca(""); setDescricao(""); setMarkup("0.5");
      setObservacoes(""); setDescontoValor(""); setSelectedFichas([]); setBuscaFicha("");
      setFiltroCliente("__all__"); setShowObsDropdown(false);
      onSuccess(orc.id);
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar orçamento!");
    } finally { setSaving(false); }
  };

  const markupNum = parseFloat(markup);
  const pvCalc = (custo: number) => isNaN(markupNum) || markupNum <= 0 ? 0 : custo / markupNum;

  const liveTotals = useMemo(() => {
    const sel = fichas.filter((f: any) => selectedFichas.includes(f.id));
    const totalCusto = sel.reduce((s: number, f: any) => s + (f.custoTotal ?? 0), 0);
    const totalPV = isNaN(markupNum) || markupNum <= 0 ? 0 : totalCusto / markupNum;
    return { count: sel.length, totalCusto, totalPV, totalLucro: totalPV - totalCusto };
  }, [fichas, selectedFichas, markupNum]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl flex flex-col" style={{ maxHeight: "92vh", padding: 0, gap: 0 }}>
        {/* Header fixo */}
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Criar Orçamento a partir de Fichas de Custo</DialogTitle>
          </DialogHeader>
        </div>

        {/* Body — form envolve TUDO; Enter bloqueado no input de busca */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Linha 1: Cliente + Marca + Markup */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Cliente *</Label>
                <Input placeholder="Ex: Acme Corp" value={nomeCliente} onChange={(e) => setNomeCliente(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">Marca</Label>
                <Input placeholder="Ex: Nike" value={marca} onChange={(e) => setMarca(e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1 block">
                  Markup (divisor)
                  {!isNaN(markupNum) && markupNum > 0 && (
                    <span className="ml-1 text-blue-600 font-semibold">= {((1 / markupNum - 1) * 100).toFixed(0)}% margem</span>
                  )}
                </Label>
                <Input
                  type="number"
                  placeholder="0.50"
                  step="0.01"
                  min="0.01"
                  max="0.99"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-gray-400 mt-0.5">PV = Custo ÷ Markup (0.5 = 100% margem)</p>
              </div>
            </div>

            {/* Linha 2: Descrição */}
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Descrição do Orçamento</Label>
              <Input placeholder="Ex: Coleção Verão 2026" value={descricao} onChange={(e) => setDescricao(e.target.value)} className="h-9 text-sm" />
            </div>

            {/* Linha 3: Observações + Desconto */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-gray-500">Observações</Label>
                  <div className="flex gap-1">
                    {observacoes.trim() && (
                      <button
                        type="button"
                        onClick={handleSalvarObs}
                        className="text-[10px] text-blue-600 hover:text-blue-800 px-1.5 py-0.5 rounded border border-blue-200 hover:bg-blue-50"
                        title="Salvar esta observação"
                      >
                        + Salvar
                      </button>
                    )}
                    {obsSalvas.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowObsDropdown((v) => !v)}
                          className="text-[10px] text-gray-600 hover:text-gray-800 px-1.5 py-0.5 rounded border border-gray-200 hover:bg-gray-50"
                        >
                          Salvas ({obsSalvas.length})
                        </button>
                        {showObsDropdown && (
                          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-72 max-h-48 overflow-y-auto">
                            {obsSalvas.map((obs, i) => (
                              <div key={i} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 border-b last:border-b-0">
                                <button
                                  type="button"
                                  className="flex-1 text-left text-xs text-gray-700 leading-relaxed"
                                  onClick={() => { setObservacoes(obs); setShowObsDropdown(false); }}
                                >
                                  {obs}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoverObs(obs)}
                                  className="text-gray-400 hover:text-red-500 text-xs shrink-0 mt-0.5"
                                  title="Remover"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <textarea
                  placeholder="Notas adicionais..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Desconto</Label>
                  <select
                    value={descontoTipo}
                    onChange={(e) => setDescontoTipo(e.target.value as "percentual" | "valor")}
                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-white text-sm h-9"
                  >
                    <option value="percentual">Percentual (%)</option>
                    <option value="valor">Valor Fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Valor do Desconto</Label>
                  <Input type="number" placeholder="0.00" step="0.01" value={descontoValor} onChange={(e) => setDescontoValor(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Seção de fichas */}
            <div className="border-t pt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">
                  Fichas de Custo
                  {selectedFichas.length > 0 && <span className="ml-2 text-blue-600 font-normal text-xs">{selectedFichas.length} selecionada(s)</span>}
                </span>
                <button type="button" onClick={handleSelectAll} className="text-xs h-7 px-3 border border-gray-200 rounded-md bg-white hover:bg-gray-50">
                  {fichasFiltradas.length > 0 && fichasFiltradas.every((f: any) => selectedFichas.includes(f.id)) ? "Desmarcar Todas" : "Selecionar Todas"}
                </button>
              </div>

              {/* Filtros: busca + cliente — Enter bloqueado para não submeter o form */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    placeholder="Buscar referência, tipo, família..."
                    value={buscaFicha}
                    onChange={(e) => setBuscaFicha(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    className="h-8 text-sm pl-8"
                  />
                </div>
                <select
                  value={filtroCliente}
                  onChange={(e) => handleFiltroClienteChange(e.target.value)}
                  className="px-3 py-1.5 border border-gray-200 rounded-md bg-white text-sm h-8 min-w-[140px]"
                >
                  <option value="__all__">Todos os clientes</option>
                  {clientesUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <p className="text-xs text-gray-400">{fichasFiltradas.length} ficha(s) disponível(is)</p>

              {/* Lista de fichas */}
              <div className="border rounded-lg overflow-hidden" style={{ maxHeight: 260, overflowY: "auto" }}>
                {fichasFiltradas.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-400">Nenhuma ficha encontrada</div>
                ) : fichasFiltradas.map((f: any) => {
                  const custo = f.custoTotal ?? 0;
                  const pv = pvCalc(custo);
                  const lucro = pv - custo;
                  const sel = selectedFichas.includes(f.id);
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleSelectFicha(f.id)}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 cursor-pointer transition-colors ${sel ? "bg-blue-50 border-l-2 border-l-blue-500" : "hover:bg-gray-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={sel}
                        onChange={() => {}}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 h-4 w-4 accent-blue-600 cursor-pointer"
                        readOnly
                      />
                      <div className="flex-1 min-w-0 pointer-events-none select-none">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${sel ? "text-blue-700" : "text-gray-800"}`}>{f.referencia}</span>
                          {f.tipo && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{f.tipo}</span>}
                          {f.cliente && <span className="text-xs text-gray-400">{f.cliente}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Custo: <span className="font-medium text-gray-700">{fmt(custo)}</span>
                          <span className="mx-1 text-gray-300">·</span>
                          PV: <span className="font-medium text-gray-700">{fmt(pv)}</span>
                          <span className="mx-1 text-gray-300">·</span>
                          Lucro: <span className="font-semibold text-green-600">{fmt(lucro)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer fixo */}
          <div className="border-t px-6 py-4 bg-gray-50 shrink-0">
            {liveTotals.count > 0 && (
              <div className="flex items-center gap-4 mb-3 p-3 bg-white border border-blue-100 rounded-lg flex-wrap">
                <div className="text-xs text-gray-500">
                  <span className="font-semibold text-blue-700 text-sm">{liveTotals.count}</span> ficha(s)
                </div>
                <div className="h-4 border-l border-gray-200" />
                <div className="text-xs text-gray-500">Custo: <span className="font-semibold text-gray-800">{fmt(liveTotals.totalCusto)}</span></div>
                <div className="text-xs text-gray-500">PV: <span className="font-semibold text-gray-800">{fmt(liveTotals.totalPV)}</span></div>
                <div className="text-xs text-gray-500">Margem: <span className="font-semibold text-green-600">{fmt(liveTotals.totalLucro)}</span></div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={saving || selectedFichas.length === 0}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando...</> : `Criar Orçamento${selectedFichas.length > 0 ? ` (${selectedFichas.length})` : ""}`}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function CustosOrcamentos() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const [busca, setBusca] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusType>("todos");
  const [filterType, setFilterType] = useState<FilterType>("todos");
  const [sortBy, setSortBy] = useState<SortType>("recente");
  const [modalNovo, setModalNovo] = useState(false);
  const [modalDasFichas, setModalDasFichas] = useState(false);
  const [sendingKanbanId, setSendingKanbanId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["custos-orcamentos"],
    queryFn: () => listOrcamentos(),
    refetchInterval: 30000,
  });

  const orcamentos: any[] = (data as any)?.orcamentos ?? [];
  const kpis: any = (data as any)?.kpis ?? {};

  const filtrados = useMemo(() => {
    let list = [...orcamentos];

    if (filterType === "pendente_envio") {
      list = list.filter((o: any) => o.status === "aprovado" && !o.enviado && !o.enviadoParaKanban);
    } else if (statusFilter !== "todos") {
      list = list.filter((o: any) => o.status === statusFilter);
    }

    if (busca.trim()) {
      const q = busca.trim().toLowerCase();
      list = list.filter((o: any) =>
        o.nomeCliente.toLowerCase().includes(q) ||
        (o.numero ?? o.numeroOrcamento ?? "").toLowerCase().includes(q)
      );
    }

    if (sortBy === "cliente") list.sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
    else list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return list;
  }, [orcamentos, statusFilter, filterType, busca, sortBy]);

  const handleAprovar = async (id: string) => {
    await atualizarStatus(id, "aprovado");
    qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
    toast.success("Orçamento aprovado!");
  };

  const handleReprovar = async (id: string) => {
    await atualizarStatus(id, "reprovado");
    qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
    toast.success("Orçamento reprovado");
  };

  const handleDeletar = async (id: string, num: string) => {
    if (!confirm(`Deletar orçamento ${num}?`)) return;
    await deletarOrcamento(id);
    qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
    toast.success("Orçamento deletado");
  };

  const handleEnviarKanban = async (id: string) => {
    setSendingKanbanId(id);
    try {
      await enviarParaKanban(id);
      toast.success("Enviado para Kanban!");
      qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar para Kanban");
    } finally {
      setSendingKanbanId(null);
    }
  };

  const onCriadoComSucesso = (id: string) => {
    setModalNovo(false);
    setModalDasFichas(false);
    qc.invalidateQueries({ queryKey: ["custos-orcamentos"] });
    navigate(`/hub/custos/orcamentos/${id}`);
  };

  return (
    <KanbanLayout>
    <CustosNav />
    <div className="px-6 py-8">

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold">Resumo de Orçamentos</h1>
          <p className="text-muted-foreground">Gerencie e aprove seus orçamentos</p>
        </div>
        <div className="flex gap-2">
          <Button size="lg" className="gap-2" onClick={() => setModalNovo(true)}>
            <Plus className="w-5 h-5" /> Novo Orçamento Manual
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => setModalDasFichas(true)}>
            <Plus className="w-5 h-5" /> Criar de Fichas
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card className="cursor-pointer" onClick={() => { setStatusFilter("pendente"); setFilterType("todos"); }}>
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold">{kpis.pendente ?? 0}</p>
            {kpis.totalPendente > 0 && <p className="text-sm text-yellow-600">{fmt(kpis.totalPendente)}</p>}
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => { setStatusFilter("aprovado"); setFilterType("todos"); }}>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aprovados</p>
            <p className="text-2xl font-bold">{kpis.aprovado ?? 0}</p>
            {kpis.totalAprovado > 0 && <p className="text-sm text-green-600">{fmt(kpis.totalAprovado)}</p>}
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => { setStatusFilter("reprovado"); setFilterType("todos"); }}>
          <CardContent className="pt-6 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Reprovados</p>
            <p className="text-2xl font-bold">{kpis.reprovado ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente ou número do orçamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === "todos" && filterType === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("todos"); setFilterType("todos"); }}
            >
              Todos ({orcamentos.length})
            </Button>
            <Button
              variant={statusFilter === "pendente" && filterType === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("pendente"); setFilterType("todos"); }}
              className={statusFilter === "pendente" && filterType === "todos" ? "bg-yellow-500 hover:bg-yellow-600" : ""}
            >
              Pendentes ({kpis.pendente ?? 0})
            </Button>
            <Button
              variant={statusFilter === "aprovado" && filterType === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("aprovado"); setFilterType("todos"); }}
              className={statusFilter === "aprovado" && filterType === "todos" ? "bg-green-500 hover:bg-green-600" : ""}
            >
              Aprovados ({kpis.aprovado ?? 0})
            </Button>
            <Button
              variant={statusFilter === "reprovado" && filterType === "todos" ? "default" : "outline"}
              size="sm"
              onClick={() => { setStatusFilter("reprovado"); setFilterType("todos"); }}
              className={statusFilter === "reprovado" && filterType === "todos" ? "bg-red-500 hover:bg-red-600" : ""}
            >
              Reprovados ({kpis.reprovado ?? 0})
            </Button>
            <Button
              size="sm"
              variant={filterType === "pendente_envio" ? "default" : "outline"}
              onClick={() => { setFilterType("pendente_envio"); setStatusFilter("todos"); }}
              className={filterType === "pendente_envio" ? "bg-blue-500 hover:bg-blue-600" : ""}
            >
              <Send className="w-4 h-4 mr-1" /> Pendente de Envio
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant={sortBy === "recente" ? "default" : "outline"} size="sm" onClick={() => setSortBy("recente")}>Mais Recente</Button>
              <Button variant={sortBy === "cliente" ? "default" : "outline"} size="sm" onClick={() => setSortBy("cliente")}>Por Cliente</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda de Alertas */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-1 h-12 bg-red-600 rounded"></div>
              <div>
                <h4 className="font-semibold text-red-700 mb-1">Orçamento Vencido</h4>
                <p className="text-sm text-gray-600">Orçamento pendente que já ultrapassou a data de validade. Requer ação imediata.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-1 h-12 bg-orange-500 rounded"></div>
              <div>
                <h4 className="font-semibold text-orange-700 mb-1">Vencendo em Breve</h4>
                <p className="text-sm text-gray-600">Orçamento pendente que vence nos próximos 3 dias. Aprove ou reprove em breve.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-1 h-12 bg-yellow-400 rounded"></div>
              <div>
                <h4 className="font-semibold text-yellow-700 mb-1">Pendente</h4>
                <p className="text-sm text-gray-600">Orçamento aguardando aprovação ou reprovação.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {isLoading ? "Carregando..." : `${filtrados.length} orçamento(s)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 text-lg">Carregando orçamentos...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-gray-500 text-lg">Nenhum orçamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtrados.map((orc: any) => {
                const validade = Number(orc.validade ?? orc.validadeDias ?? 30);
                const dataEmissao = orc.dataEmissao ?? orc.createdAt;
                const vencido = isVencido(dataEmissao, validade, orc.status);
                const dias = diasParaVencer(dataEmissao, validade, orc.status);
                return (
                  <div
                    key={orc.id}
                    className={`flex items-center justify-between p-4 bg-white border rounded-lg transition-colors ${getRowClass(orc.status, dataEmissao, validade)}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {vencido && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />}
                        {!vencido && dias <= 3 && dias > 0 && orc.status === "pendente" && (
                          <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />
                        )}
                        <h3 className="font-semibold text-gray-900 truncate">{orc.nomeCliente}</h3>
                        {getStatusBadge(orc.status)}
                        {(orc.enviado || orc.enviadoParaKanban) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            <Send className="w-3 h-3" /> Enviado
                          </span>
                        )}
                      </div>
                      <div className="flex gap-6 text-sm text-gray-600">
                        <span><span className="font-medium">Ref:</span> {orc.numero ?? orc.numeroOrcamento}</span>
                        <span><span className="font-medium">Marca:</span> {orc.marca || "—"}</span>
                        <span><span className="font-medium">Peças:</span> {orc.totalPecas ?? 0}</span>
                      </div>
                    </div>

                    <div className="text-right mr-6">
                      <p className="text-lg font-bold text-gray-900">{fmt(Number(orc.total ?? 0))}</p>
                      <p className="text-xs text-gray-500">{orc.totalPecas ?? 0} peças</p>
                    </div>

                    <div className="flex gap-2">
                      {orc.status === "pendente" && (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleAprovar(orc.id)}>
                            ✓ Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleReprovar(orc.id)}>
                            ✗ Reprovar
                          </Button>
                        </>
                      )}
                      {orc.status === "aprovado" && !orc.enviado && !orc.enviadoParaKanban && (
                        <Button
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600 text-white"
                          onClick={() => handleEnviarKanban(orc.id)}
                          disabled={sendingKanbanId === orc.id}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          {sendingKanbanId === orc.id ? "Enviando..." : "Enviar Kanban"}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => navigate(`/hub/custos/orcamentos/${orc.id}`)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleDeletar(orc.id, orc.numero ?? orc.numeroOrcamento)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <NovoOrcamentoModal open={modalNovo} onClose={() => setModalNovo(false)} onSuccess={onCriadoComSucesso} />
      <CriarDasFichasModal open={modalDasFichas} onClose={() => setModalDasFichas(false)} onSuccess={onCriadoComSucesso} />
    </div>
    </KanbanLayout>
  );
}
