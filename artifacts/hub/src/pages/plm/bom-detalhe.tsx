import { useState, useRef } from 'react';
import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ChevronsUpDown, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Trash2, Pencil, Calculator, Package, DollarSign,
  Percent, ShoppingCart, ChevronRight, Wrench, Filter, CheckCircle2,
  Edit2, Check, X, Printer, FileText,
} from 'lucide-react';
import { Link } from 'wouter';

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MARKUPS = [
  { pct: 40, label: '40%', colorCard: 'border-blue-400 bg-blue-50 text-blue-900', colorBadge: 'bg-blue-100 text-blue-700', ring: 'ring-blue-400' },
  { pct: 50, label: '50%', colorCard: 'border-indigo-400 bg-indigo-50 text-indigo-900', colorBadge: 'bg-indigo-100 text-indigo-700', ring: 'ring-indigo-400' },
  { pct: 60, label: '60%', colorCard: 'border-purple-400 bg-purple-50 text-purple-900', colorBadge: 'bg-purple-100 text-purple-700', ring: 'ring-purple-400' },
];

type CostRow = { id: number; label: string; value: string };

let _id = 1;
function newId() { return _id++; }

function mkDefaultMO(): CostRow[] {
  return [
    { id: newId(), label: 'Personalização', value: '0' },
    { id: newId(), label: 'Costura', value: '0' },
    { id: newId(), label: 'Lavanderia', value: '0' },
    { id: newId(), label: 'Acabamento', value: '0' },
    { id: newId(), label: 'Passadoria', value: '0' },
  ];
}

function mkDefaultInd(): CostRow[] {
  return [
    { id: newId(), label: 'Modelagem', value: '0' },
    { id: newId(), label: 'Piloto', value: '0' },
    { id: newId(), label: 'Corte', value: '0' },
    { id: newId(), label: 'PLM', value: '0' },
  ];
}

/* ── Componente de seção de custo reutilizável ────────────────────── */
interface CostSectionProps {
  accentColor: string; // ex: 'orange' | 'yellow'
  icon: React.ReactNode;
  rows: CostRow[];
  onRowsChange: (rows: CostRow[]) => void;
  title: string;
  onTitleChange: (t: string) => void;
  extra?: React.ReactNode;
}

function CostSection({ accentColor, icon, rows, onRowsChange, title, onTitleChange, extra }: CostSectionProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [rowDraft, setRowDraft] = useState<{ label: string; value: string }>({ label: '', value: '' });
  const [addingRow, setAddingRow] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('0');

  const total = rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
  const accentBorder = accentColor === 'orange' ? 'border-orange-200' : 'border-yellow-200';
  const accentText = accentColor === 'orange' ? 'text-orange-600' : 'text-yellow-600';

  function startEditRow(row: CostRow) {
    setEditingRowId(row.id);
    setRowDraft({ label: row.label, value: row.value });
  }

  function saveEditRow(id: number) {
    onRowsChange(rows.map(r => r.id === id ? { ...r, ...rowDraft } : r));
    setEditingRowId(null);
  }

  function deleteRow(id: number) {
    onRowsChange(rows.filter(r => r.id !== id));
  }

  function addRow() {
    if (!newLabel.trim()) return;
    onRowsChange([...rows, { id: newId(), label: newLabel.trim(), value: newValue }]);
    setNewLabel('');
    setNewValue('0');
    setAddingRow(false);
  }

  function saveTitle() {
    if (titleDraft.trim()) onTitleChange(titleDraft.trim());
    setEditingTitle(false);
  }

  return (
    <Card className={`border ${accentBorder}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          {icon}
          {editingTitle ? (
            <div className="flex items-center gap-1">
              <Input
                className="h-7 text-sm font-semibold w-48"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
              />
              <button onClick={saveTitle} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
              <button onClick={() => setEditingTitle(false)} className="text-muted-foreground hover:text-foreground"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => { setTitleDraft(title); setEditingTitle(true); }}
              className="flex items-center gap-1.5 group"
            >
              <CardTitle className="text-base">{title}</CardTitle>
              <Edit2 size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => setAddingRow(true)}>
          <Plus size={12} /> Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-1 pb-4">
        {rows.map(row => (
          <div key={row.id} className="group flex items-center gap-2 py-1.5 border-b border-dashed border-muted last:border-0">
            {editingRowId === row.id ? (
              <>
                <Input
                  className="h-7 text-xs flex-1"
                  value={rowDraft.label}
                  onChange={e => setRowDraft(d => ({ ...d, label: e.target.value }))}
                  placeholder="Nome do item"
                />
                <div className="relative w-28">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number" step="0.01" min="0"
                    className="h-7 text-xs pl-6"
                    value={rowDraft.value}
                    onChange={e => setRowDraft(d => ({ ...d, value: e.target.value }))}
                  />
                </div>
                <button onClick={() => saveEditRow(row.id)} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
                <button onClick={() => setEditingRowId(null)} className="text-muted-foreground"><X size={14} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-medium">{fmt(parseFloat(row.value) || 0)}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEditRow(row)} className="p-0.5 text-muted-foreground hover:text-foreground"><Edit2 size={12} /></button>
                  <button onClick={() => deleteRow(row.id)} className="p-0.5 text-muted-foreground hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </>
            )}
          </div>
        ))}

        {addingRow && (
          <div className="flex items-center gap-2 py-2 bg-muted/30 rounded-lg px-2 mt-2">
            <Input
              className="h-7 text-xs flex-1"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              placeholder="Nome do item (ex: Estamparia)"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') addRow(); if (e.key === 'Escape') setAddingRow(false); }}
            />
            <div className="relative w-28">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
              <Input
                type="number" step="0.01" min="0"
                className="h-7 text-xs pl-6"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
              />
            </div>
            <button onClick={addRow} className="text-green-600 hover:text-green-700"><Check size={14} /></button>
            <button onClick={() => setAddingRow(false)} className="text-muted-foreground"><X size={14} /></button>
          </div>
        )}

        {extra}

        <div className="flex justify-between items-center pt-2 mt-1 border-t">
          <span className="text-sm font-semibold">Total {title}</span>
          <span className={`text-sm font-bold ${accentText}`}>{fmt(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════ */

export default function PLMBomDetalhe() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  // Modal linha
  const [modalLinha, setModalLinha] = useState(false);
  const [editingLinha, setEditingLinha] = useState<any>(null);
  const [materialId, setMaterialId] = useState('');
  const [quantidade, setQuantidade] = useState('1');
  const [precoUnitario, setPrecoUnitario] = useState('0');
  const [obsLinha, setObsLinha] = useState('');

  // Combobox material
  const [matOpen, setMatOpen] = useState(false);
  const [matSearch, setMatSearch] = useState('');
  const [criarMode, setCriarMode] = useState(false);
  const [novoMatTipo, setNovoMatTipo] = useState('tecido');
  const [novoMatUnidade, setNovoMatUnidade] = useState('m');

  // Filtro família
  const [familiaFiltro, setFamiliaFiltro] = useState('');
  const [showFamiliaFilter, setShowFamiliaFilter] = useState(false);
  const [carregandoFamilia, setCarregandoFamilia] = useState(false);
  const [materiaisFamilia, setMateriaisFamilia] = useState<any[]>([]);
  const [buscandoFamilia, setBuscandoFamilia] = useState(false);

  // Modal BOM header
  const [modalBom, setModalBom] = useState(false);
  const [custoMdo, setCustoMdo] = useState('');
  const [custosIndiretos, setCustosIndiretos] = useState('');
  const [margemLucro, setMargemLucro] = useState('');
  const [obsBom, setObsBom] = useState('');

  // Seções dinâmicas MO e Indiretos
  const [moTitle, setMoTitle] = useState('Mão de Obra');
  const [moRows, setMoRows] = useState<CostRow[]>(mkDefaultMO);
  const [indTitle, setIndTitle] = useState('Custos Indiretos');
  const [indRows, setIndRows] = useState<CostRow[]>(mkDefaultInd);

  // Quantidade de peças (indiretos ÷ peças = custo/peça)
  const [qtdePecas, setQtdePecas] = useState('72');
  const [editingQtde, setEditingQtde] = useState(false);
  const [qtdeDraft, setQtdeDraft] = useState('72');

  // Markup selecionado
  const [markupSel, setMarkupSel] = useState(40);

  const { data, isLoading } = useQuery({
    queryKey: ['plm-bom', id],
    queryFn: () => apiFetch(`/plm/bom/${id}`),
    enabled: !!id,
  });

  const { data: materiais } = useQuery({
    queryKey: ['plm-materiais'],
    queryFn: () => apiFetch('/plm/materiais'),
  });

  const { data: produtos } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  // Famílias distintas das fichas técnicas PLM (para chips do filtro)
  const { data: fichasTecnicas } = useQuery({
    queryKey: ['plm-fichas'],
    queryFn: () => apiFetch('/plm/fichas'),
  });

  const saveLinha = useMutation({
    mutationFn: (payload: any) => {
      if (editingLinha) {
        return apiFetch(`/plm/bom/linhas/${editingLinha.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      return apiFetch(`/plm/bom/${id}/linhas`, { method: 'POST', body: JSON.stringify({ ...payload, bom_id: Number(id) }) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-bom', id] });
      toast.success(editingLinha ? 'Linha atualizada!' : 'Material adicionado!');
      closeModalLinha();
    },
    onError: () => toast.error('Erro ao salvar linha'),
  });

  const deleteLinha = useMutation({
    mutationFn: (linhaId: number) => apiFetch(`/plm/bom/linhas/${linhaId}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plm-bom', id] }); toast.success('Material removido'); },
    onError: () => toast.error('Erro ao remover material'),
  });

  const saveBom = useMutation({
    mutationFn: (payload: any) => apiFetch(`/plm/bom/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-bom', id] });
      toast.success('Materiais & Custos atualizado!');
      setModalBom(false);
    },
    onError: () => toast.error('Erro ao atualizar ficha de custo'),
  });

  const criarMaterial = useMutation({
    mutationFn: (payload: any) => apiFetch('/plm/materiais', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: (novo: any) => {
      qc.invalidateQueries({ queryKey: ['plm-materiais'] });
      setMaterialId(String(novo.id));
      setMatSearch(novo.descricao);
      if (novo.preco_unitario) setPrecoUnitario(String(novo.preco_unitario));
      setCriarMode(false);
      setMatOpen(false);
      toast.success(`Material "${novo.descricao}" criado com código ${novo.codigo}`);
    },
    onError: () => toast.error('Erro ao criar material'),
  });

  function openModalLinha(linha?: any) {
    if (linha) {
      setEditingLinha(linha);
      setMaterialId(String(linha.material_id));
      const mat = (materiais ?? []).find((m: any) => String(m.material.id) === String(linha.material_id));
      setMatSearch(mat?.material?.descricao ?? '');
      setQuantidade(String(linha.quantidade));
      setPrecoUnitario(String(linha.preco_unitario));
      setObsLinha(linha.observacoes ?? '');
    } else {
      setEditingLinha(null);
      setMaterialId(''); setMatSearch(''); setQuantidade('1'); setPrecoUnitario('0'); setObsLinha('');
    }
    setCriarMode(false);
    setModalLinha(true);
  }

  function closeModalLinha() {
    setModalLinha(false);
    setEditingLinha(null);
    setMaterialId(''); setMatSearch(''); setQuantidade('1'); setPrecoUnitario('0'); setObsLinha('');
    setCriarMode(false); setMatOpen(false);
  }

  function openModalBom() {
    if (!data?.bom) return;
    setCustoMdo(String(data.bom.custo_mao_de_obra ?? '0'));
    setCustosIndiretos(String(data.bom.custos_indiretos ?? '0'));
    setMargemLucro(String(data.bom.margem_lucro ?? '0'));
    setObsBom(data.bom.observacoes ?? '');
    setModalBom(true);
  }

  function handleSubmitLinha(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantidade);
    const punit = parseFloat(precoUnitario);
    saveLinha.mutate({ material_id: Number(materialId), quantidade: qty, preco_unitario: punit, subtotal: qty * punit, observacoes: obsLinha || null });
  }

  function handleSubmitBom(e: React.FormEvent) {
    e.preventDefault();
    const totalMat = (data?.linhas ?? []).reduce((acc: number, l: any) => acc + parseFloat(l.linha.subtotal ?? 0), 0);
    const mdo = parseFloat(custoMdo);
    const ind = parseFloat(custosIndiretos);
    const margem = parseFloat(margemLucro);
    const custo = totalMat + mdo + ind;
    saveBom.mutate({ custo_mao_de_obra: mdo, custos_indiretos: ind, margem_lucro: margem, preco_venda: (custo * (1 + margem / 100)).toFixed(2), observacoes: obsBom || null });
  }

  function handleMaterialChange(mid: string, descricao: string) {
    setMaterialId(mid);
    setMatSearch(descricao);
    setMatOpen(false);
    const mat = (materiais ?? []).find((m: any) => String(m.material.id) === mid);
    if (mat?.material?.preco_unitario) setPrecoUnitario(String(mat.material.preco_unitario));
  }

  function handleCriarMaterial() {
    if (!matSearch.trim()) return;
    criarMaterial.mutate({
      descricao: matSearch.trim(),
      tipo: novoMatTipo,
      unidade: novoMatUnidade,
      preco_unitario: precoUnitario || '0',
    });
  }

  function handlePrint() {
    window.print();
  }

  const prodMap = Object.fromEntries((produtos ?? []).map((p: any) => [String(p.produto.id), p.produto]));
  const matMap = Object.fromEntries((materiais ?? []).map((m: any) => [String(m.material.id), m.material]));
  const materiaisList: any[] = (materiais ?? []).map((m: any) => m.material);

  const bom = data?.bom;
  const linhas: any[] = data?.linhas ?? [];

  const totalMateriais = linhas.reduce((acc, l) => acc + parseFloat(l.linha.subtotal ?? 0), 0);
  const totalMdo = parseFloat(bom?.custo_mao_de_obra ?? 0);
  const totalIndiretos = parseFloat(bom?.custos_indiretos ?? 0);

  // Totais das seções dinâmicas locais
  const totalMoLocal = moRows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);
  const totalIndLocal = indRows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0);

  // Custo por peça (indiretos ÷ qtde) — esse valor entra na composição, não o total bruto
  const qtde = parseFloat(qtdePecas) || 1;
  const custoPorPeca = totalIndLocal / qtde;

  // Custo total real (usa custo/peça nos indiretos)
  const custoTotalComposicao = totalMateriais + totalMoLocal + custoPorPeca;

  // Preço sugerido com markup divisor 40%
  const precoSugerido40 = custoTotalComposicao > 0 ? custoTotalComposicao / 0.40 : 0;

  // Custo total do BOM salvo (legacy — usado só no modal)
  const custoTotal = totalMateriais + totalMdo + totalIndiretos;
  const margem = parseFloat(bom?.margem_lucro ?? 0);
  const produto = bom ? prodMap[String(bom.produto_id)] : null;

  // Chips = famílias únicas das fichas técnicas PLM cadastradas
  const familiasChips = Array.from(new Set((fichasTecnicas ?? []).map((f: any) => f.familia).filter(Boolean))) as string[];

  // Ids já no BOM para filtrar duplicatas
  const idsNoBom = new Set((linhas ?? []).map((l: any) => l.linha?.material_id ?? l.material_id));
  // Materiais da família que ainda não estão no BOM
  const materiaisParaAdicionar = materiaisFamilia.filter((m: any) => !idsNoBom.has(m.material_id));

  async function handleBuscarFamilia() {
    if (!familiaFiltro.trim()) return;
    setBuscandoFamilia(true);
    setMateriaisFamilia([]);
    try {
      const res = await apiFetch(`/plm/bom/materiais-por-familia?familia=${encodeURIComponent(familiaFiltro.trim())}`);
      if (res.fichasEncontradas === 0) {
        toast.error(`Nenhuma ficha técnica encontrada para família "${familiaFiltro}"`);
      } else if (res.materiais.length === 0) {
        toast.error(`Fichas encontradas (${res.fichasEncontradas}), mas sem materiais na ficha de custo ainda`);
      } else {
        setMateriaisFamilia(res.materiais);
      }
    } catch {
      toast.error('Erro ao buscar família');
    } finally {
      setBuscandoFamilia(false);
    }
  }

  async function handleCarregarFamilia() {
    if (materiaisParaAdicionar.length === 0) return;
    setCarregandoFamilia(true);
    try {
      for (const m of materiaisParaAdicionar) {
        await apiFetch(`/plm/bom/${id}/linhas`, {
          method: 'POST',
          body: JSON.stringify({
            bom_id: Number(id),
            material_id: m.material_id,
            quantidade: m.quantidade,
            preco_unitario: m.preco_unitario,
            subtotal: (parseFloat(m.quantidade) * parseFloat(m.preco_unitario)).toFixed(2),
          }),
        });
      }
      await qc.invalidateQueries({ queryKey: ['plm-bom', id] });
      toast.success(`${materiaisParaAdicionar.length} material(is) adicionado(s)!`);
      setShowFamiliaFilter(false);
      setFamiliaFiltro('');
      setMateriaisFamilia([]);
    } catch {
      toast.error('Erro ao carregar família');
    } finally {
      setCarregandoFamilia(false);
    }
  }

  if (isLoading) {
    return (
      <PLMLayout>
        <div className="p-6 space-y-4 max-w-screen-xl mx-auto">
          <Skeleton className="h-8 w-64" /><Skeleton className="h-32 rounded-xl" /><Skeleton className="h-64 rounded-xl" />
        </div>
      </PLMLayout>
    );
  }

  if (!bom) {
    return (
      <PLMLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">Ficha de custo não encontrada.</p>
          <Link href="/hub/plm/bom"><Button variant="outline" className="mt-4 gap-2"><ArrowLeft size={14} /> Voltar</Button></Link>
        </div>
      </PLMLayout>
    );
  }

  const nomeProduto = produto?.nome ?? `Produto #${bom.produto_id}`;

  return (
    <PLMLayout>
      {/* ── Estilos de impressão ──────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #bom-print-area, #bom-print-area * { visibility: visible !important; }
          #bom-print-area { position: fixed; left: 0; top: 0; width: 100%; padding: 24px; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

        {/* ── Breadcrumb + cabeçalho ─────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
              <Link href="/hub/plm/bom" className="hover:text-foreground transition-colors">Custos</Link>
              <ChevronRight size={14} />
              <span className="text-foreground font-medium">{nomeProduto}</span>
            </div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="w-6 h-6 text-green-600" />
              {nomeProduto}
              <Badge variant="outline" className="text-xs font-normal">v{bom.versao}</Badge>
            </h1>
            {bom.observacoes && <p className="text-sm text-muted-foreground mt-0.5">{bom.observacoes}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 no-print">
              <Printer size={14} /> Imprimir / PDF
            </Button>
            <Button variant="outline" size="sm" onClick={openModalBom} className="gap-2 no-print">
              <Pencil size={14} /> Editar custos / margem
            </Button>
          </div>
        </div>

        {/* ── Dashboard: cards + composição inline ───────── */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-500" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Materiais</span></div>
                <p className="text-xl font-bold">{fmt(totalMateriais)}</p>
                <p className="text-xs text-muted-foreground">{linhas.length} item(ns)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-orange-500" /><span className="text-xs text-muted-foreground uppercase tracking-wide">M.O. + Indiretos/pç</span></div>
                <p className="text-xl font-bold">{fmt(totalMoLocal + custoPorPeca)}</p>
                <p className="text-xs text-muted-foreground">M.O.: {fmt(totalMoLocal)} · Ind./pç: {fmt(custoPorPeca)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><Percent className="w-4 h-4 text-purple-500" /><span className="text-xs text-muted-foreground uppercase tracking-wide">Custo Total / pç</span></div>
                <p className="text-xl font-bold">{fmt(custoTotalComposicao)}</p>
                <p className="text-xs text-muted-foreground">Base: {qtdePecas} pcs</p>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1"><ShoppingCart className="w-4 h-4 text-green-600" /><span className="text-xs text-green-700 uppercase tracking-wide font-medium">Preço sugerido (40%)</span></div>
                <p className="text-xl font-bold text-green-700">{fmt(precoSugerido40)}</p>
                <p className="text-xs text-green-600">Markup divisor 0,40</p>
              </CardContent>
            </Card>
          </div>

          {/* Composição de custos inline sob os cards */}
          {custoTotalComposicao > 0 && (() => {
            const itens = [
              { label: 'Materiais',    value: totalMateriais, pct: totalMateriais / custoTotalComposicao, color: 'bg-blue-500' },
              { label: moTitle,        value: totalMoLocal,   pct: totalMoLocal / custoTotalComposicao,   color: 'bg-orange-400' },
              { label: indTitle + '/pç', value: custoPorPeca, pct: custoPorPeca / custoTotalComposicao,   color: 'bg-yellow-400' },
            ];
            return (
              <Card className="border-muted/60">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Composição de Custos</p>
                  {/* Barra empilhada */}
                  <div className="flex h-3 rounded-full overflow-hidden mb-3 gap-px">
                    {itens.map(it => (
                      <div key={it.label} className={`${it.color} transition-all`} style={{ width: `${(it.pct * 100).toFixed(1)}%` }} />
                    ))}
                  </div>
                  {/* Legenda */}
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    {itens.map(it => (
                      <div key={it.label} className="flex items-center gap-2 text-xs">
                        <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${it.color}`} />
                        <span className="text-muted-foreground">{it.label}</span>
                        <span className="font-semibold">{fmt(it.value)}</span>
                        <span className="text-muted-foreground">({(it.pct * 100).toFixed(0)}%)</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>

        {/* ── Tabela de materiais ────────────────────────── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base">Materiais</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Lista de componentes e matérias-primas</p>
            </div>
            <div className="flex items-center gap-2 no-print">
              <div className="relative">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowFamiliaFilter(v => !v)}>
                  <Filter size={13} /> Carregar por família
                </Button>
                {showFamiliaFilter && (
                  <div className="absolute right-0 top-10 z-20 bg-white border rounded-xl shadow-lg p-4 w-80 space-y-3">
                    <p className="text-sm font-medium">Buscar por família de produto</p>

                    {/* Input + botão buscar */}
                    <div className="flex gap-1.5">
                      <Input
                        placeholder="Ex: camiseta, short..."
                        value={familiaFiltro}
                        onChange={e => { setFamiliaFiltro(e.target.value); setMateriaisFamilia([]); }}
                        onKeyDown={e => e.key === 'Enter' && handleBuscarFamilia()}
                        className="h-8 text-sm flex-1"
                      />
                      <Button size="sm" variant="outline" className="text-xs px-2 shrink-0" disabled={!familiaFiltro.trim() || buscandoFamilia} onClick={handleBuscarFamilia}>
                        {buscandoFamilia ? '...' : 'Buscar'}
                      </Button>
                    </div>

                    {/* Chips das famílias das fichas técnicas */}
                    {familiasChips.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {familiasChips.map((f) => (
                          <button key={f} onClick={() => { setFamiliaFiltro(f); setMateriaisFamilia([]); }}
                            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${familiaFiltro === f ? 'bg-indigo-600 text-white border-indigo-600' : 'border-muted-foreground/30 hover:border-indigo-400 text-muted-foreground'}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Preview dos materiais encontrados */}
                    {materiaisFamilia.length > 0 && (
                      <div className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 border-b">
                          {materiaisParaAdicionar.length} material(is) a adicionar
                          {materiaisFamilia.length !== materiaisParaAdicionar.length && (
                            <span className="text-muted-foreground ml-1">({materiaisFamilia.length - materiaisParaAdicionar.length} já na ficha)</span>
                          )}
                        </div>
                        <div className="max-h-36 overflow-y-auto divide-y">
                          {materiaisFamilia.map((m: any) => {
                            const jaEsta = idsNoBom.has(m.material_id);
                            return (
                              <div key={m.material_id} className={`flex justify-between items-center px-3 py-1.5 text-xs ${jaEsta ? 'opacity-40' : ''}`}>
                                <span className="truncate max-w-[160px]">{m.descricao ?? `Material #${m.material_id}`}</span>
                                <span className="text-muted-foreground shrink-0 ml-2">{m.quantidade} {m.unidade}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground italic">
                      Busca fichas técnicas da família → importa os materiais das fichas de custo delas.
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs"
                        disabled={materiaisParaAdicionar.length === 0 || carregandoFamilia}
                        onClick={handleCarregarFamilia}>
                        {carregandoFamilia ? 'Adicionando...' : `Adicionar ${materiaisParaAdicionar.length > 0 ? `(${materiaisParaAdicionar.length})` : ''}`}
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => { setShowFamiliaFilter(false); setMateriaisFamilia([]); setFamiliaFiltro(''); }}>Fechar</Button>
                    </div>
                  </div>
                )}
              </div>
              <Button size="sm" onClick={() => openModalLinha()} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Plus size={14} /> Adicionar material
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {linhas.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhum material adicionado</p>
                <Button variant="outline" size="sm" className="mt-3 gap-2 no-print" onClick={() => openModalLinha()}>
                  <Plus size={14} /> Adicionar primeiro material
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Material</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Unidade</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Qtd</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Preço Unit.</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Subtotal</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Obs.</th>
                      <th className="p-3 no-print"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhas.map((l: any, i: number) => {
                      const mat = l.material ?? matMap[String(l.linha.material_id)];
                      return (
                        <tr key={l.linha.id} className={`border-b last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}>
                          <td className="p-3 font-medium">{mat?.descricao ?? mat?.nome ?? `Material #${l.linha.material_id}`}</td>
                          <td className="p-3 text-muted-foreground">{mat?.unidade ?? '—'}</td>
                          <td className="p-3 text-right">{parseFloat(l.linha.quantidade).toFixed(3)}</td>
                          <td className="p-3 text-right">R$ {parseFloat(l.linha.preco_unitario).toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold">R$ {parseFloat(l.linha.subtotal).toFixed(2)}</td>
                          <td className="p-3 text-muted-foreground text-xs">{l.linha.observacoes ?? '—'}</td>
                          <td className="p-3 no-print">
                            <div className="flex items-center gap-1 justify-end">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => openModalLinha(l.linha)}><Pencil size={12} /></Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-600" onClick={() => { if (confirm('Remover este material?')) deleteLinha.mutate(l.linha.id); }}><Trash2 size={12} /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/20">
                      <td colSpan={4} className="p-3 text-right font-semibold text-sm">Total Materiais:</td>
                      <td className="p-3 text-right font-bold text-sm">{fmt(totalMateriais)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Mão de Obra (dinâmica) ─────────────────────── */}
        <CostSection
          accentColor="orange"
          icon={<Wrench className="w-4 h-4 text-orange-500" />}
          title={moTitle}
          onTitleChange={setMoTitle}
          rows={moRows}
          onRowsChange={setMoRows}
        />

        {/* ── Custos Indiretos (dinâmicos) ───────────────── */}
        <CostSection
          accentColor="yellow"
          icon={<DollarSign className="w-4 h-4 text-yellow-500" />}
          title={indTitle}
          onTitleChange={setIndTitle}
          rows={indRows}
          onRowsChange={setIndRows}
          extra={
            <div className="mt-3 mb-1 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-amber-600" />
                  <span className="text-xs font-medium text-amber-800">Quantidade de peças</span>
                </div>
                {editingQtde ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number" min="1" step="1"
                      className="h-7 w-24 text-xs"
                      value={qtdeDraft}
                      onChange={e => setQtdeDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setQtdePecas(qtdeDraft); setEditingQtde(false); } if (e.key === 'Escape') setEditingQtde(false); }}
                      autoFocus
                    />
                    <span className="text-xs text-amber-700">pcs</span>
                    <button onClick={() => { setQtdePecas(qtdeDraft); setEditingQtde(false); }} className="text-green-600"><Check size={13} /></button>
                    <button onClick={() => setEditingQtde(false)} className="text-muted-foreground"><X size={13} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setQtdeDraft(qtdePecas); setEditingQtde(true); }} className="flex items-center gap-1 group">
                    <span className="text-sm font-bold text-amber-800">{qtdePecas} pcs</span>
                    <Edit2 size={11} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-amber-200 pt-2">
                <span className="text-xs text-amber-700">
                  {fmt(totalIndLocal)} ÷ {qtdePecas} pcs
                </span>
                <div className="text-right">
                  <span className="text-xs text-amber-600">Custo / peça</span>
                  <p className="text-base font-bold text-amber-800">{fmt(custoPorPeca)}</p>
                </div>
              </div>
            </div>
          }
        />

        {/* ── 3 Sugestões de Markup ──────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Percent className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sugestões de Preço de Venda</h2>
            <span className="text-xs text-muted-foreground">(divisor markup sobre custo total)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MARKUPS.map(mk => {
              const preco = custoTotalComposicao > 0 ? custoTotalComposicao / (mk.pct / 100) : 0;
              const isSelected = markupSel === mk.pct;
              return (
                <button
                  key={mk.pct}
                  onClick={() => setMarkupSel(mk.pct)}
                  className={`rounded-xl border-2 p-5 text-left transition-all duration-150 hover:shadow-md ${mk.colorCard}
                    ${isSelected ? `ring-2 ring-offset-2 ${mk.ring} shadow-md` : 'opacity-80 hover:opacity-100'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mk.colorBadge}`}>Markup divisor {mk.label}</span>
                    {isSelected && <CheckCircle2 size={16} className="opacity-80" />}
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{fmt(preco)}</p>
                  <p className="text-xs mt-1 opacity-70">{fmt(custoTotalComposicao)} ÷ {mk.pct / 100}</p>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ══ ÁREA DE IMPRESSÃO / PDF ══════════════════════════════════ */}
      <div id="bom-print-area" className="hidden print:block p-8 bg-white font-sans text-sm">
        {/* Cabeçalho com logo */}
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <img src="/r2pb-logo.jpg" alt="R2PB Confecções" className="h-16 max-w-48 object-contain" />
          <div className="text-right">
            <p className="text-xs text-gray-500">Ficha de Custo</p>
            <p className="text-xs text-gray-400">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Produto */}
        <div className="mb-5">
          <h1 className="text-lg font-bold">{nomeProduto} <span className="text-xs font-normal text-gray-500">v{bom.versao}</span></h1>
          {bom.observacoes && <p className="text-xs text-gray-500 mt-0.5">{bom.observacoes}</p>}
        </div>

        {/* Tabela de materiais */}
        <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">Materiais</h2>
        <table className="w-full border-collapse text-xs mb-5">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border">Material</th>
              <th className="text-left p-2 border">Un.</th>
              <th className="text-right p-2 border">Qtd</th>
              <th className="text-right p-2 border">Unit.</th>
              <th className="text-right p-2 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l: any) => {
              const mat = l.material ?? matMap[String(l.linha.material_id)];
              return (
                <tr key={l.linha.id} className="border-b">
                  <td className="p-2 border">{mat?.nome ?? `Material #${l.linha.material_id}`}</td>
                  <td className="p-2 border">{mat?.unidade ?? '—'}</td>
                  <td className="p-2 border text-right">{parseFloat(l.linha.quantidade).toFixed(3)}</td>
                  <td className="p-2 border text-right">R$ {parseFloat(l.linha.preco_unitario).toFixed(2)}</td>
                  <td className="p-2 border text-right font-semibold">R$ {parseFloat(l.linha.subtotal).toFixed(2)}</td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={4} className="p-2 border text-right">Total Materiais</td>
              <td className="p-2 border text-right">{fmt(totalMateriais)}</td>
            </tr>
          </tbody>
        </table>

        {/* Mão de Obra */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          <div>
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">{moTitle}</h2>
            <table className="w-full border-collapse text-xs">
              <tbody>
                {moRows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-1.5 text-gray-600">{r.label}</td>
                    <td className="p-1.5 text-right font-medium">{fmt(parseFloat(r.value) || 0)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-orange-50">
                  <td className="p-1.5">Total</td>
                  <td className="p-1.5 text-right text-orange-700">{fmt(totalMoLocal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase text-gray-500 mb-2">{indTitle}</h2>
            <table className="w-full border-collapse text-xs">
              <tbody>
                {indRows.map(r => (
                  <tr key={r.id} className="border-b">
                    <td className="p-1.5 text-gray-600">{r.label}</td>
                    <td className="p-1.5 text-right font-medium">{fmt(parseFloat(r.value) || 0)}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-yellow-50">
                  <td className="p-1.5">Total ({qtdePecas} pcs)</td>
                  <td className="p-1.5 text-right text-yellow-700">{fmt(totalIndLocal)}</td>
                </tr>
                <tr className="bg-amber-50">
                  <td className="p-1.5 text-amber-700">Custo / peça</td>
                  <td className="p-1.5 text-right font-bold text-amber-800">{fmt(custoPorPeca)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo final */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-3">Resumo de Custos</h2>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span>Materiais</span><span>{fmt(totalMateriais)}</span></div>
            <div className="flex justify-between"><span>{moTitle}</span><span>{fmt(totalMoLocal)}</span></div>
            <div className="flex justify-between"><span>{indTitle}</span><span>{fmt(totalIndLocal)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1 mt-1 text-sm"><span>Custo Total</span><span>{fmt(custoTotalComposicao)}</span></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
            {MARKUPS.map(mk => (
              <div key={mk.pct} className="text-center p-2 border rounded">
                <p className="text-gray-500">Markup {mk.label}</p>
                <p className="font-bold text-sm">{fmt(custoTotalComposicao > 0 ? custoTotalComposicao / (mk.pct / 100) : 0)}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-8">Mirage — Sistema de Gestão para Confecção · {new Date().getFullYear()}</p>
      </div>

      {/* ── Modal adicionar/editar linha ───────────────── */}
      <Dialog open={modalLinha} onOpenChange={open => { if (!open) closeModalLinha(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingLinha ? 'Editar Material' : 'Adicionar Material'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitLinha} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Material *</Label>
              <Popover open={matOpen} onOpenChange={setMatOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {materialId
                        ? (matMap[materialId]?.descricao ?? matSearch ?? 'Material selecionado')
                        : 'Selecione ou digite um material...'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[380px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar material..."
                      value={matSearch}
                      onValueChange={v => { setMatSearch(v); setMaterialId(''); setCriarMode(false); }}
                    />
                    <CommandList>
                      {materiaisList.length === 0 && !matSearch && (
                        <CommandEmpty>Nenhum material cadastrado.</CommandEmpty>
                      )}
                      <CommandGroup heading="Materiais cadastrados">
                        {materiaisList
                          .filter(m => !matSearch || m.descricao?.toLowerCase().includes(matSearch.toLowerCase()))
                          .map((m: any) => (
                            <CommandItem
                              key={m.id}
                              value={m.descricao}
                              onSelect={() => handleMaterialChange(String(m.id), m.descricao)}
                              className="cursor-pointer"
                            >
                              <span className="font-medium">{m.descricao}</span>
                              <span className="ml-auto text-xs text-muted-foreground">{m.codigo} · {m.unidade}</span>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                      {matSearch.trim() && !materiaisList.some(m => m.descricao?.toLowerCase() === matSearch.trim().toLowerCase()) && (
                        <CommandGroup heading="Criar novo">
                          <CommandItem
                            value={`__criar__${matSearch}`}
                            onSelect={() => setCriarMode(true)}
                            className="cursor-pointer text-indigo-600 font-medium"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Criar "{matSearch.trim()}" como novo material
                          </CommandItem>
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Mini-formulário inline para criar novo material */}
              {criarMode && (
                <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3 space-y-3 mt-2">
                  <p className="text-xs font-semibold text-indigo-700">Criar: "{matSearch.trim()}"</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={novoMatTipo} onValueChange={setNovoMatTipo}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="tecido">Tecido</SelectItem>
                          <SelectItem value="aviamento">Aviamento</SelectItem>
                          <SelectItem value="embalagem">Embalagem</SelectItem>
                          <SelectItem value="insumo">Insumo</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unidade</Label>
                      <Select value={novoMatUnidade} onValueChange={setNovoMatUnidade}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m">m (metro)</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="un">un (unidade)</SelectItem>
                          <SelectItem value="par">par</SelectItem>
                          <SelectItem value="pç">pç (peça)</SelectItem>
                          <SelectItem value="cx">cx (caixa)</SelectItem>
                          <SelectItem value="rolo">rolo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs h-8"
                      onClick={handleCriarMaterial}
                      disabled={criarMaterial.isPending}
                    >
                      {criarMaterial.isPending ? 'Criando...' : 'Criar e selecionar'}
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="text-xs h-8" onClick={() => setCriarMode(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quantidade *</Label>
                <Input type="number" step="0.001" min="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Preço unitário (R$) *</Label>
                <Input type="number" step="0.01" min="0" value={precoUnitario} onChange={e => setPrecoUnitario(e.target.value)} required />
              </div>
            </div>
            {quantidade && precoUnitario && (
              <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                Subtotal: <strong>R$ {(parseFloat(quantidade) * parseFloat(precoUnitario)).toFixed(2)}</strong>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={obsLinha} onChange={e => setObsLinha(e.target.value)} placeholder="Opcional..." />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={closeModalLinha}>Cancelar</Button>
              <Button type="submit" disabled={saveLinha.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {editingLinha ? 'Salvar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Modal editar cabeçalho BOM ─────────────────── */}
      <Dialog open={modalBom} onOpenChange={setModalBom}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Custos e Margem</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmitBom} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>M.O. Total (R$)</Label>
                <Input type="number" step="0.01" min="0" value={custoMdo} onChange={e => setCustoMdo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Indiretos (R$)</Label>
                <Input type="number" step="0.01" min="0" value={custosIndiretos} onChange={e => setCustosIndiretos(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Margem (%)</Label>
                <Input type="number" step="0.01" min="0" value={margemLucro} onChange={e => setMargemLucro(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Input value={obsBom} onChange={e => setObsBom(e.target.value)} placeholder="Notas sobre esta ficha de custo..." />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Materiais</span><span>{fmt(totalMateriais)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">M.O.</span><span>{fmt(parseFloat(custoMdo) || 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Indiretos</span><span>{fmt(parseFloat(custosIndiretos) || 0)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Custo Total</span>
                <span>{fmt(totalMateriais + (parseFloat(custoMdo) || 0) + (parseFloat(custosIndiretos) || 0))}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setModalBom(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveBom.isPending}>{saveBom.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
