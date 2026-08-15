import { useState, useMemo, useEffect } from "react";
import KanbanLayout from "@/components/kanban/KanbanLayout";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustosNav from "@/components/orcamento/CustosNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Plus, Eye, Trash2, Copy, Search, RefreshCw } from "lucide-react";
import {
  listFichas, getFichasDistinctValues, criarFicha, atualizarFicha, deletarFicha, getCodigoProximo,
} from "@/lib/custos-api";
import CriarOrcamentoDaFichaForm from "@/components/orcamento/CriarOrcamentoDaFichaForm";
import DuplicarFichaModal from "@/components/orcamento/DuplicarFichaModal";

function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Modal: Nova Ficha de Custo (igual ao CustoPlus) ───────────────────────────
const EMPTY_FORM = {
  referencia: "", tipo: "", familia: "", cliente: "", observacoes: "", fotoUrl: "",
  modelagem: 0, piloto: 0, corte: 0, beneficiamento: 0,
  costura: 0, lavanderia: 0, acabamento: 0, passadoria: 0,
  tecido: 0, aviamento: 0,
};

function NovaFichaModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [fetchingRef, setFetchingRef] = useState(false);

  const set = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

  // Reseta o form toda vez que o modal abre (referência gerada só após digitar a família)
  useEffect(() => {
    if (!open) return;
    setFormData({ ...EMPTY_FORM });
  }, [open]);

  const handleGerarReferencia = async () => {
    setFetchingRef(true);
    try {
      const res = await getCodigoProximo(formData.familia || "");
      setFormData(prev => ({ ...prev, referencia: res?.codigo ?? prev.referencia }));
    } catch {
      toast.error("Não foi possível gerar a referência. Digite manualmente.");
    } finally {
      setFetchingRef(false);
    }
  };

  const handleFamiliaChange = async (val: string) => {
    const upper = val.toUpperCase();
    setFormData(prev => ({ ...prev, familia: upper }));
    if (upper.length >= 3) {
      setFetchingRef(true);
      try {
        const res = await getCodigoProximo(upper);
        setFormData(prev => ({ ...prev, familia: upper, referencia: res?.codigo ?? prev.referencia }));
      } catch { /* silently ignore */ }
      finally { setFetchingRef(false); }
    }
  };

  const calculateTotal = () =>
    formData.modelagem + formData.piloto + formData.corte + formData.beneficiamento +
    formData.costura + formData.lavanderia + formData.acabamento + formData.passadoria +
    formData.tecido + formData.aviamento;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.referencia.trim() || !formData.tipo.trim() || !formData.familia.trim() || !formData.cliente.trim()) {
      toast.error("Preencha todos os campos obrigatórios"); return;
    }
    setSaving(true);
    try {
      await criarFicha({
        referencia: formData.referencia.trim(),
        tipo: formData.tipo.trim().toUpperCase(),
        familia: formData.familia.trim().toUpperCase(),
        cliente: formData.cliente.trim(),
        observacoes: formData.observacoes || undefined,
        fotoUrl: formData.fotoUrl || undefined,
        modelagem: formData.modelagem,
        piloto: formData.piloto,
        corte: formData.corte,
        beneficiamento: formData.beneficiamento,
        costura: formData.costura,
        lavanderia: formData.lavanderia,
        acabamento: formData.acabamento,
        passadoria: formData.passadoria,
        tecido: formData.tecido,
        aviamento: formData.aviamento,
      });
      toast.success("Ficha criada com sucesso!");
      setFormData({ ...EMPTY_FORM });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar ficha");
    } finally { setSaving(false); }
  };

  const numInput = (field: string, label: string) => (
    <div>
      <Label htmlFor={field}>{label}</Label>
      <Input
        id={field}
        type="number"
        step="0.01"
        value={(formData as any)[field]}
        onChange={(e) => set(field, parseFloat(e.target.value) || 0)}
      />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ficha de Custo</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Informações Básicas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="familia">Família *</Label>
                <Input
                  id="familia"
                  value={formData.familia}
                  onChange={(e) => handleFamiliaChange(e.target.value)}
                  placeholder="Ex: CAMISETA, BERMUDA"
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo *</Label>
                <Input
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => set("tipo", e.target.value.toUpperCase())}
                  placeholder="Ex: MALHA, PLANO"
                  required
                />
              </div>
              <div>
                <Label htmlFor="referencia">Referência *</Label>
                <div className="flex gap-1.5">
                  <Input
                    id="referencia"
                    value={formData.referencia}
                    onChange={(e) => set("referencia", e.target.value.toUpperCase())}
                    placeholder={fetchingRef ? "Gerando..." : "Digite a família para gerar"}
                    required
                    className="flex-1"
                    disabled={fetchingRef}
                  />
                  <button
                    type="button"
                    onClick={handleGerarReferencia}
                    disabled={fetchingRef}
                    title="Gerar referência automaticamente"
                    className="shrink-0 h-10 w-10 flex items-center justify-center border border-gray-200 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    {fetchingRef ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-gray-500" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Gerada automaticamente ao digitar a família (ou clique em ↺ para regenerar)</p>
              </div>
              <div>
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={formData.cliente}
                  onChange={(e) => set("cliente", e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Custos de Mão-de-Obra */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Custos de Mão-de-Obra</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {numInput("modelagem", "Modelagem")}
              {numInput("piloto", "Piloto")}
              {numInput("corte", "Corte")}
              {numInput("beneficiamento", "Beneficiamento")}
              {numInput("costura", "Costura")}
              {numInput("lavanderia", "Lavanderia")}
              {numInput("acabamento", "Acabamento")}
              {numInput("passadoria", "Passadoria")}
            </div>
          </div>

          {/* Custos de Matéria-Prima */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Custos de Matéria-Prima</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numInput("tecido", "Tecido")}
              {numInput("aviamento", "Aviamento")}
            </div>
          </div>

          {/* Custo Total */}
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">CUSTO TOTAL</span>
              <span className="text-2xl font-bold text-primary">
                R$ {calculateTotal().toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ─── Célula Editável ───────────────────────────────────────────────────────────
function CelulaEditavel({ value, onSave }: { value: number; onSave: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState(String(value));
  const [saving, setSaving] = useState(false);

  const commit = async () => {
    const n = parseFloat(tmp.replace(",", "."));
    if (isNaN(n)) { setTmp(String(value)); setEditing(false); return; }
    setSaving(true);
    try { await onSave(n); } finally { setSaving(false); setEditing(false); }
  };

  if (!editing) {
    return (
      <button
        className="text-sm text-right w-full hover:underline hover:text-blue-600 cursor-pointer"
        onClick={() => { setTmp(String(value)); setEditing(true); }}
      >
        {fmt(value)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      type="number"
      step="0.01"
      className="w-20 text-right border rounded px-1 text-sm"
      value={tmp}
      onChange={(e) => setTmp(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setTmp(String(value)); setEditing(false); } }}
      disabled={saving}
    />
  );
}

// ─── Página Principal ──────────────────────────────────────────────────────────
export default function CustosFichas() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroFamilia, setFiltroFamilia] = useState("todos");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [modalNova, setModalNova] = useState(false);
  const [fichaParaOrcamento, setFichaParaOrcamento] = useState<any>(null);
  const [fichaParaDuplicar, setFichaParaDuplicar] = useState<any>(null);

  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ["custos-fichas", busca, filtroTipo, filtroFamilia, filtroCliente],
    queryFn: () => listFichas({
      busca: busca || undefined,
      tipo: filtroTipo !== "todos" ? filtroTipo : undefined,
      familia: filtroFamilia !== "todos" ? filtroFamilia : undefined,
      cliente: filtroCliente !== "todos" ? filtroCliente : undefined,
    }),
  });

  const { data: distinct } = useQuery({
    queryKey: ["custos-fichas-distinct"],
    queryFn: getFichasDistinctValues,
  });

  const patchFicha = async (id: string, campo: string, valor: number) => {
    await atualizarFicha(id, { [campo]: valor });
    qc.invalidateQueries({ queryKey: ["custos-fichas"] });
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Deletar a ficha ${ref}?`)) return;
    await deletarFicha(id);
    toast.success("Ficha deletada");
    qc.invalidateQueries({ queryKey: ["custos-fichas"] });
  };

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["custos-fichas"] });
    qc.invalidateQueries({ queryKey: ["custos-fichas-distinct"] });
  };

  const lista = fichas as any[];
  const tipos = (distinct as any)?.tipos ?? [];
  const familias = (distinct as any)?.familias ?? [];
  const clientes = (distinct as any)?.clientes ?? [];

  return (
    <KanbanLayout>
    <CustosNav />
    <div className="px-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Fichas de Custo</h1>
          <p className="text-muted-foreground text-sm">Gerencie os custos de produção por referência</p>
        </div>
        <Button onClick={() => setModalNova(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Referência
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar referência..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="todos">Tipo</SelectItem>
            {(tipos as string[]).filter(Boolean).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Família" />
          </SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="todos">Família</SelectItem>
            {(familias as string[]).filter(Boolean).map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroCliente} onValueChange={setFiltroCliente}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent className="max-h-72 overflow-y-auto">
            <SelectItem value="todos">Cliente</SelectItem>
            {(clientes as string[]).filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="border-b">
              <th className="text-left py-2 px-3 font-semibold whitespace-nowrap">Referência</th>
              <th className="text-left py-2 px-2 font-semibold">Tipo</th>
              <th className="text-left py-2 px-2 font-semibold">Família</th>
              <th className="text-left py-2 px-2 font-semibold">Cliente</th>
              <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">Modelagem</th>
              <th className="text-right py-2 px-2 font-semibold">Piloto</th>
              <th className="text-right py-2 px-2 font-semibold">Corte</th>
              <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">Benefic.</th>
              <th className="text-right py-2 px-2 font-semibold">Costura</th>
              <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">Lavand.</th>
              <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">Acabam.</th>
              <th className="text-right py-2 px-2 font-semibold whitespace-nowrap">Passad.</th>
              <th className="text-right py-2 px-2 font-semibold">Tecido</th>
              <th className="text-right py-2 px-2 font-semibold">Aviam.</th>
              <th className="text-right py-2 px-2 font-semibold font-bold">Total</th>
              <th className="text-center py-2 px-2 font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={16} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={16} className="text-center py-8 text-muted-foreground">Nenhuma ficha encontrada</td></tr>
            ) : lista.map((f: any) => (
              <tr key={f.id} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3 font-semibold whitespace-nowrap">{f.referencia}</td>
                <td className="py-2 px-2 whitespace-nowrap">{f.tipo}</td>
                <td className="py-2 px-2 whitespace-nowrap">{f.familia}</td>
                <td className="py-2 px-2 max-w-32 truncate" title={f.cliente}>{f.cliente}</td>
                {(["modelagem","piloto","corte","beneficiamento","costura","lavanderia","acabamento","passadoria","tecido","aviamento"] as const).map((campo) => (
                  <td key={campo} className="py-2 px-2">
                    <CelulaEditavel
                      value={f[campo]}
                      onSave={(v) => patchFicha(f.id, campo, v)}
                    />
                  </td>
                ))}
                <td className="py-2 px-2 text-right font-bold whitespace-nowrap">{fmt(f.custoTotal)}</td>
                <td className="py-2 px-2">
                  <div className="flex gap-1 justify-center">
                    <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => setFichaParaOrcamento(f)}>
                      Orçamento
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => navigate(`/hub/custos/fichas/${f.id}`)} title="Ver">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setFichaParaDuplicar(f)} title="Duplicar">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => handleDelete(f.id, f.referencia)} title="Deletar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NovaFichaModal open={modalNova} onClose={() => setModalNova(false)} onSuccess={() => { setModalNova(false); refetch(); }} />

      {/* Modal: Criar Orçamento da Ficha */}
      {fichaParaOrcamento && (
        <Dialog open={!!fichaParaOrcamento} onOpenChange={() => setFichaParaOrcamento(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Orçamento — {fichaParaOrcamento.referencia}</DialogTitle>
            </DialogHeader>
            <CriarOrcamentoDaFichaForm
              ficha={fichaParaOrcamento}
              onSuccess={() => setFichaParaOrcamento(null)}
              onCancel={() => setFichaParaOrcamento(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Modal: Duplicar Ficha (completo) */}
      {fichaParaDuplicar && (
        <DuplicarFichaModal
          isOpen={!!fichaParaDuplicar}
          onClose={() => { setFichaParaDuplicar(null); refetch(); }}
          fichaOriginal={fichaParaDuplicar}
        />
      )}
    </div>
    </KanbanLayout>
  );
}
