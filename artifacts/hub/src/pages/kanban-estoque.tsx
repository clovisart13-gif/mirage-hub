import { useState, useEffect, useMemo, Fragment } from 'react';
import { apiFetch } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { toast } from 'sonner';
import {
  Package, Scissors, Star, AlertTriangle, DollarSign,
  Pencil, Trash2, Printer, Send, Loader2, Search, X, Plus, CheckSquare, FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeCell {
  cor_nome: string;
  tamanho: string;
  qtd_primeira: number;
  qtd_segunda: number;
}

interface Sinal {
  id: string;
  descricao: string;
  valor_cents: number;
  data_recebido: string | null;
}

interface ExtraItem {
  id: string;
  descricao: string;
  valor: string;
}

interface EstoqueItem {
  id: string;
  referencia_id: string;
  quantidade_total: number;
  qtd_inicial: number;
  qtd_cortada: number;
  qtd_primeira: number;
  qtd_segunda: number;
  nome_cliente: string | null;
  numero_pedido: string | null;
  numero_op: string | null;
  valor_unitario_cents: number;
  status_erp: string;
  faturado: boolean;
  nf_numero: string | null;
  atualizado_em: string;
  codigo: string;
  descricao: string | null;
  grades: GradeCell[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtBRL = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtN = (n: number) => n.toLocaleString('pt-BR');

const variacaoClass = (v: number) =>
  v === 0 ? 'text-gray-500' : v > 0 ? 'text-green-600' : 'text-red-500';

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color ?? 'text-gray-900'}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Grade Editor Modal ───────────────────────────────────────────────────────

interface GradeEditorState {
  cors: string[];
  tamanhos: string[];
  cells: Record<string, Record<string, { p: number; s: number }>>;
}

function initGradeState(grades: GradeCell[]): GradeEditorState {
  const cors = [...new Set(grades.map(g => g.cor_nome))];
  const tamanhos = [...new Set(grades.map(g => g.tamanho))];
  const cells: GradeEditorState['cells'] = {};
  cors.forEach(cor => {
    cells[cor] = {};
    tamanhos.forEach(tam => {
      const g = grades.find(x => x.cor_nome === cor && x.tamanho === tam);
      cells[cor][tam] = { p: g?.qtd_primeira ?? 0, s: g?.qtd_segunda ?? 0 };
    });
  });
  return { cors, tamanhos, cells };
}

function GradeEditor({ state, onChange }: {
  state: GradeEditorState;
  onChange: (s: GradeEditorState) => void;
}) {
  const [novaCor, setNovaCor] = useState('');
  const [novoTamanho, setNovoTamanho] = useState('');

  const { cors, tamanhos, cells } = state;

  const totalPrimeira = cors.reduce((acc, cor) =>
    acc + tamanhos.reduce((a, tam) => a + (cells[cor]?.[tam]?.p ?? 0), 0), 0);
  const totalSegunda = cors.reduce((acc, cor) =>
    acc + tamanhos.reduce((a, tam) => a + (cells[cor]?.[tam]?.s ?? 0), 0), 0);

  const setCell = (cor: string, tam: string, field: 'p' | 's', val: number) => {
    const next = {
      ...state,
      cells: {
        ...cells,
        [cor]: { ...cells[cor], [tam]: { ...cells[cor]?.[tam], [field]: isNaN(val) ? 0 : val } },
      },
    };
    onChange(next);
  };

  const addCor = () => {
    const c = novaCor.trim().toUpperCase();
    if (!c || cors.includes(c)) return;
    const newCells = { ...cells, [c]: {} };
    tamanhos.forEach(tam => { newCells[c][tam] = { p: 0, s: 0 }; });
    onChange({ ...state, cors: [...cors, c], cells: newCells });
    setNovaCor('');
  };

  const addTamanho = () => {
    const t = novoTamanho.trim().toUpperCase();
    if (!t || tamanhos.includes(t)) return;
    const newCells = { ...cells };
    cors.forEach(cor => { newCells[cor] = { ...newCells[cor], [t]: { p: 0, s: 0 } }; });
    onChange({ ...state, tamanhos: [...tamanhos, t], cells: newCells });
    setNovoTamanho('');
  };

  const removeCor = (cor: string) => {
    const newCells = { ...cells };
    delete newCells[cor];
    onChange({ ...state, cors: cors.filter(c => c !== cor), cells: newCells });
  };

  const removeTam = (tam: string) => {
    const newCells: GradeEditorState['cells'] = {};
    cors.forEach(cor => {
      newCells[cor] = { ...cells[cor] };
      delete newCells[cor][tam];
    });
    onChange({ ...state, tamanhos: tamanhos.filter(t => t !== tam), cells: newCells });
  };

  return (
    <div className="space-y-4">
      {/* Grade table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left px-3 py-2 font-medium border border-border rounded-tl">Cor</th>
              {tamanhos.map(tam => (
                <th key={tam} colSpan={2} className="px-2 py-2 font-medium border border-border text-center">
                  <div className="flex items-center justify-center gap-1">
                    {tam}
                    <button onClick={() => removeTam(tam)} className="text-red-400 hover:text-red-600 ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </th>
              ))}
            </tr>
            <tr className="bg-muted/20 text-xs text-muted-foreground">
              <th className="border border-border px-3 py-1"></th>
              {tamanhos.map(tam => (
                <Fragment key={tam}>
                  <th className="border border-border px-2 py-1 text-center font-normal">1ª</th>
                  <th className="border border-border px-2 py-1 text-center font-normal">2ª</th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {cors.map((cor, ci) => (
              <tr key={cor} className={ci % 2 === 0 ? 'bg-white' : 'bg-muted/10'}>
                <td className="border border-border px-3 py-1 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {cor}
                    <button onClick={() => removeCor(cor)} className="text-red-400 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                {tamanhos.map(tam => (
                  <Fragment key={`${cor}-${tam}`}>
                    <td className="border border-border px-1 py-1">
                      <input
                        type="number" min={0}
                        value={cells[cor]?.[tam]?.p ?? 0}
                        onChange={e => setCell(cor, tam, 'p', parseInt(e.target.value))}
                        className="w-14 text-center text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>
                    <td className="border border-border px-1 py-1">
                      <input
                        type="number" min={0}
                        value={cells[cor]?.[tam]?.s ?? 0}
                        onChange={e => setCell(cor, tam, 's', parseInt(e.target.value))}
                        className="w-14 text-center text-sm border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </td>
                  </Fragment>
                ))}
              </tr>
            ))}
            {/* Totals row */}
            {cors.length > 1 && (
              <tr className="bg-gray-50 font-semibold text-xs">
                <td className="border border-border px-3 py-1">TOTAL</td>
                {tamanhos.map(tam => {
                  const p = cors.reduce((a, cor) => a + (cells[cor]?.[tam]?.p ?? 0), 0);
                  const s = cors.reduce((a, cor) => a + (cells[cor]?.[tam]?.s ?? 0), 0);
                  return (
                    <Fragment key={`tot-${tam}`}>
                      <td className="border border-border px-1 py-1 text-center text-green-700">{p}</td>
                      <td className="border border-border px-1 py-1 text-center text-orange-600">{s}</td>
                    </Fragment>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Totals summary */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-700 font-medium">1ª Qualidade: <strong>{fmtN(totalPrimeira)}</strong> peças</span>
        <span className="text-orange-600 font-medium">2ª Qualidade: <strong>{fmtN(totalSegunda)}</strong> peças</span>
        <span className="font-semibold text-violet-700">Total Geral: <strong>{fmtN(totalPrimeira + totalSegunda)}</strong> peças</span>
      </div>

      {/* Add controls */}
      <div className="flex gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Select onValueChange={setNovaCor} value={novaCor}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Selecione uma cor" />
            </SelectTrigger>
            <SelectContent>
              {['BRANCO', 'PRETO', 'VERMELHO', 'AZUL', 'VERDE', 'AMARELO', 'ROSA', 'ROXO', 'CINZA', 'MARROM'].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Nova Cor"
            value={novaCor}
            onChange={e => setNovaCor(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && addCor()}
            className="h-8 text-xs w-32"
          />
          <Button size="sm" variant="outline" onClick={addCor} className="h-8 px-2">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Ex: XGG"
            value={novoTamanho}
            onChange={e => setNovoTamanho(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && addTamanho()}
            className="h-8 text-xs w-24"
          />
          <Button size="sm" variant="outline" onClick={addTamanho} className="h-8 px-2">
            <Plus className="w-3 h-3" />
          </Button>
          <span className="text-xs text-muted-foreground">Adicionar Tamanho</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KanbanEstoque() {
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empresa, setEmpresa] = useState<{ nome_empresa?: string; logo_url?: string } | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterFaturado, setFilterFaturado] = useState('todos');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterPedido, setFilterPedido] = useState('');

  // Modal state
  const [editingItem, setEditingItem] = useState<EstoqueItem | null>(null);
  const [gradeState, setGradeState] = useState<GradeEditorState>({ cors: [], tamanhos: [], cells: {} });

  // Confirm dialogs
  const [deleteItem, setDeleteItem] = useState<EstoqueItem | null>(null);
  const [erpItem, setErpItem] = useState<EstoqueItem | null>(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Config de impressão por item (desconto + acréscimos), editado no modal de edição
  type ItemPrintCfg = { descTipo: 'percentual' | 'valor'; descValor: string; extras: ExtraItem[] };
  const [itemPrintConfig, setItemPrintConfig] = useState<Record<string, ItemPrintCfg>>({});

  // Campos do edit dialog — seção romaneio
  const [editDescTipo, setEditDescTipo] = useState<'percentual' | 'valor'>('valor');
  const [editDescValor, setEditDescValor] = useState('');
  const [editExtras, setEditExtras] = useState<ExtraItem[]>([]);
  const addEditExtra = () => setEditExtras(p => [...p, { id: crypto.randomUUID(), descricao: '', valor: '' }]);
  const removeEditExtra = (id: string) => setEditExtras(p => p.filter(e => e.id !== id));
  const updateEditExtra = (id: string, field: 'descricao' | 'valor', val: string) =>
    setEditExtras(p => p.map(e => e.id === id ? { ...e, [field]: val } : e));

  // Config do lote (aparece na barra flutuante quando selectedIds.size > 0)
  const [batchDescTipo, setBatchDescTipo] = useState<'percentual' | 'valor'>('valor');
  const [batchDescValor, setBatchDescValor] = useState('');
  const [batchExtras, setBatchExtras] = useState<ExtraItem[]>([]);
  const addBatchExtra = () => setBatchExtras(p => [...p, { id: crypto.randomUUID(), descricao: '', valor: '' }]);
  const removeBatchExtra = (id: string) => setBatchExtras(p => p.filter(e => e.id !== id));
  const updateBatchExtra = (id: string, field: 'descricao' | 'valor', val: string) =>
    setBatchExtras(p => p.map(e => e.id === id ? { ...e, [field]: val } : e));

  // Faturar dialog
  const [faturarItem, setFaturarItem] = useState<EstoqueItem | null>(null);
  const [nfNumeroEdit, setNfNumeroEdit] = useState('');
  const [savingFaturar, setSavingFaturar] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/kanban/estoque'),
      apiFetch('/tenants/empresa').catch(() => null),
    ]).then(([estoqueData, empresaData]) => {
      setItems(estoqueData);
      if (empresaData) setEmpresa(empresaData);
    }).catch(() => toast.error('Erro ao carregar estoque'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Client-side filter
  const filtered = useMemo(() => {
    return items.filter(item => {
      if (filterStatus !== 'todos' && item.status_erp !== filterStatus) return false;
      if (filterFaturado === 'sim' && !item.faturado) return false;
      if (filterFaturado === 'nao' && item.faturado) return false;
      if (filterCliente && !item.nome_cliente?.toLowerCase().includes(filterCliente.toLowerCase())) return false;
      if (filterPedido && !item.numero_pedido?.toLowerCase().includes(filterPedido.toLowerCase())) return false;
      return true;
    });
  }, [items, filterStatus, filterFaturado, filterCliente, filterPedido]);

  // KPIs from filtered
  const kpis = useMemo(() => {
    const totalItens = filtered.length;
    const qtdCortada = filtered.reduce((s, i) => s + i.qtd_cortada, 0);
    const primeira = filtered.reduce((s, i) => s + i.qtd_primeira, 0);
    const segunda = filtered.reduce((s, i) => s + i.qtd_segunda, 0);
    const total = primeira + segunda;
    const variacao = total - qtdCortada;
    const varPct = qtdCortada > 0 ? ((variacao / qtdCortada) * 100) : 0;
    const valorTotal = filtered.reduce((s, i) => s + (i.qtd_primeira * i.valor_unitario_cents), 0);
    return { totalItens, qtdCortada, primeira, segunda, variacao, varPct, valorTotal };
  }, [filtered]);

  // Edit modal
  const openEdit = (item: EstoqueItem) => {
    setEditingItem(item);
    setGradeState(initGradeState(item.grades));
    // Pré-popula campos de romaneio com config salva (ou defaults)
    const cfg = itemPrintConfig[item.id];
    setEditDescTipo(cfg?.descTipo ?? 'valor');
    setEditDescValor(cfg?.descValor ?? '');
    setEditExtras(cfg?.extras ?? []);
  };

  const saveGrades = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const gradesCells = gradeState.cors.flatMap(cor =>
        gradeState.tamanhos.map(tam => ({
          cor_nome: cor,
          tamanho: tam,
          qtd_primeira: gradeState.cells[cor]?.[tam]?.p ?? 0,
          qtd_segunda: gradeState.cells[cor]?.[tam]?.s ?? 0,
        }))
      );
      await apiFetch(`/kanban/estoque/${editingItem.id}/grades`, {
        method: 'PATCH',
        body: JSON.stringify({ grades: gradesCells }),
      });
      // Salva config de romaneio em estado local
      setItemPrintConfig(prev => ({
        ...prev,
        [editingItem.id]: { descTipo: editDescTipo, descValor: editDescValor, extras: editExtras },
      }));
      toast.success('Estoque atualizado');
      setEditingItem(null);
      load();
    } catch {
      toast.error('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await apiFetch(`/kanban/estoque/${deleteItem.id}`, { method: 'DELETE' });
      toast.success('Removido do estoque');
      setDeleteItem(null);
      load();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const handleEnviarErp = async () => {
    if (!erpItem) return;
    try {
      const data = await apiFetch(`/kanban/estoque/${erpItem.id}/enviar-erp`, { method: 'POST' });
      if (data?.mensagem) {
        toast.success(data.mensagem);
      } else {
        toast.success('Enviado ao ERP Mirage');
      }
      setErpItem(null);
      load();
    } catch {
      toast.error('Erro ao sincronizar com ERP Mirage');
    }
  };

  // ── Helpers de impressão ───────────────────────────────────────────────────
  const printHtml = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open(); doc.write(html); doc.close();
    const doprint = () => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch {}
      setTimeout(() => { try { document.body.removeChild(iframe); } catch {} }, 2000);
    };
    // Aguarda imagens carregarem (máx 1.5s)
    let printed = false;
    iframe.onload = () => { if (!printed) { printed = true; setTimeout(doprint, 300); } };
    setTimeout(() => { if (!printed) { printed = true; doprint(); } }, 1500);
  };

  const fetchLogoBase64 = async (url: string): Promise<string | null> => {
    try {
      const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
      const r = await fetch(fullUrl);
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise<string | null>(res => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.onerror = () => res(null);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };

  const buildRomaneioHtml = (
    itens: EstoqueItem[],
    sinaisMap: Record<string, Sinal[]>,
    emp: typeof empresa,
    descTipo: 'percentual' | 'valor' = 'valor',
    descVal: number = 0,
    extras: ExtraItem[] = [],
    logoDataUrl: string | null = null,
  ) => {
    const fmtBRL = (cents: number) =>
      (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const logoSrc = logoDataUrl ?? emp?.logo_url;
    const logoHtml = logoSrc
      ? `<img src="${logoSrc}" alt="${emp?.nome_empresa ?? ''}" style="height:36px;max-width:130px;object-fit:contain;display:block">`
      : '';
    const nomeEmpresaHtml = emp?.nome_empresa
      ? `<div style="font-size:9px;color:#a0c4f1;margin-top:2px;font-weight:600;letter-spacing:.5px">${emp.nome_empresa}</div>`
      : '';

    // Agrupar sinais de todos os itens (por numero_pedido)
    const todosSinais: Sinal[] = [];
    const pedidosVistos = new Set<string>();
    itens.forEach(item => {
      const key = item.numero_pedido ?? item.id;
      if (!pedidosVistos.has(key)) {
        pedidosVistos.add(key);
        (sinaisMap[item.id] ?? []).forEach(s => todosSinais.push(s));
      }
    });
    const totalSinaisCents = todosSinais.reduce((s, x) => s + x.valor_cents, 0);

    const buildGradeTable = (item: EstoqueItem) => {
      const cors = [...new Set(item.grades.map(g => g.cor_nome))];
      const tams = [...new Set(item.grades.map(g => g.tamanho))];
      if (cors.length === 0) return '<p style="font-size:9px;color:#888">Sem grade registrada</p>';
      const th = (s: string, extra = '') => `<th style="border:1px solid #ccc;padding:4px 6px;background:#e8f0fe;font-size:9px;${extra}">${s}</th>`;
      const td = (s: string | number, extra = '') => `<td style="border:1px solid #ccc;padding:4px 6px;text-align:center;font-size:9px;${extra}">${s}</td>`;
      const header = `<tr>${th('Cor', 'text-align:left')}${tams.map(t => `${th(t, 'text-align:center')}${th(t, 'text-align:center')}`).join('')}${th('1ª')}${th('2ª')}${th('Total')}</tr>
        <tr>${th('')}${tams.map(() => `${th('1ª')}${th('2ª')}`).join('')}${th('')}${th('')}${th('')}</tr>`;
      let tot1 = 0, tot2 = 0;
      const bodyRows = cors.map(cor => {
        const cells = tams.flatMap(t => {
          const g = item.grades.find(x => x.cor_nome === cor && x.tamanho === t);
          return [`${td(g?.qtd_primeira ?? 0)}`, `${td(g?.qtd_segunda ?? 0)}`];
        });
        const r1 = tams.reduce((s, t) => s + (item.grades.find(x => x.cor_nome === cor && x.tamanho === t)?.qtd_primeira ?? 0), 0);
        const r2 = tams.reduce((s, t) => s + (item.grades.find(x => x.cor_nome === cor && x.tamanho === t)?.qtd_segunda ?? 0), 0);
        tot1 += r1; tot2 += r2;
        return `<tr>${td(cor, 'text-align:left;font-weight:600')}${cells.join('')}${td(r1)}${td(r2)}${td(r1 + r2, 'font-weight:700')}</tr>`;
      }).join('');
      const totRow = `<tr style="background:#f0f0f0;font-weight:700">${td('TOTAL', 'text-align:left')}${tams.flatMap(() => [td(''), td('')]).join('')}${td(tot1)}${td(tot2)}${td(tot1 + tot2)}</tr>`;
      return `<table style="border-collapse:collapse;width:100%;margin-top:4px"><thead>${header}</thead><tbody>${bodyRows}${totRow}</tbody></table>`;
    };

    const via = (dest: string) => {
      const valorTotalCents = itens.reduce((s, i) => s + i.valor_unitario_cents * (i.qtd_primeira + i.qtd_segunda), 0);
      const descontoCents = descTipo === 'percentual'
        ? Math.round(valorTotalCents * descVal / 100)
        : Math.round(descVal * 100);
      const valorComDesconto = valorTotalCents - descontoCents;

      // Acréscimos (correio, uber, piloto extra, etc.)
      const extrasValidos = extras.filter(e => e.descricao.trim() && parseFloat(e.valor) > 0);
      const totalExtrasCents = extrasValidos.reduce((s, e) => s + Math.round(parseFloat(e.valor) * 100), 0);
      const valorComAcrescimos = valorComDesconto + totalExtrasCents;
      const saldoCents = valorComAcrescimos - totalSinaisCents;

      const descontoHtml = descontoCents > 0
        ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;color:#c0392b">
            <span>(-) Desconto${descTipo === 'percentual' ? ` (${descVal}%)` : ''}:</span>
            <strong>-${fmtBRL(descontoCents)}</strong>
          </div>`
        : '';

      const extrasHtml = extrasValidos.length > 0
        ? extrasValidos.map(e =>
            `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;color:#1a6b3c">
              <span>(+) ${e.descricao}:</span>
              <strong>+${fmtBRL(Math.round(parseFloat(e.valor) * 100))}</strong>
            </div>`
          ).join('')
        : '';

      const sinaisHtml = todosSinais.length > 0
        ? todosSinais.map(s =>
            `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;color:#444">
              <span>(-) ${s.descricao}${s.data_recebido ? ' <span style="color:#888;font-size:9px">(' + new Date(s.data_recebido).toLocaleDateString('pt-BR') + ')</span>' : ''}:</span>
              <strong style="color:#c0392b">-${fmtBRL(s.valor_cents)}</strong>
            </div>`).join('')
        : '';

      const itensHtml = itens.map(item => `
        <div style="margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #eee">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px">
            <div>
              <span style="font-size:11px;font-weight:700;color:#1e3a5f">${item.codigo || item.numero_op || '—'}</span>
              ${item.descricao ? `<span style="font-size:9px;color:#666;margin-left:6px">${item.descricao}</span>` : ''}
            </div>
            <div style="font-size:9px;color:#555">Unit: <strong>${fmtBRL(item.valor_unitario_cents)}</strong></div>
          </div>
          ${buildGradeTable(item)}
          <div style="margin-top:4px;font-size:10px;display:flex;gap:16px">
            <span>1ª: <strong>${item.qtd_primeira}</strong> pcs</span>
            <span>2ª: <strong>${item.qtd_segunda}</strong> pcs</span>
            <span>Total: <strong>${item.qtd_primeira + item.qtd_segunda}</strong> pcs</span>
            <span style="margin-left:auto">Subtotal: <strong>${fmtBRL(item.valor_unitario_cents * (item.qtd_primeira + item.qtd_segunda))}</strong></span>
          </div>
        </div>`).join('');

      const clienteInfo = itens[0];
      return `
<div style="font-family:Arial,sans-serif;font-size:10px;color:#111;margin-bottom:4mm">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;background:#1e3a5f;color:white;padding:8px 12px;border-radius:4px 4px 0 0">
    <div>
      ${logoHtml}
      <div style="font-size:11px;font-weight:bold;letter-spacing:1px;margin-top:${logoSrc ? '4px' : '0'};color:#a0c4f1">ROMANEIO DE EXPEDIÇÃO</div>
      ${nomeEmpresaHtml}
    </div>
    <div style="text-align:right;display:flex;flex-direction:column;gap:4px;align-items:flex-end">
      ${clienteInfo?.nf_numero ? `<div style="background:#ffffff22;color:#fff;font-size:9px;padding:1px 8px;border-radius:3px">NF: ${clienteInfo.nf_numero}</div>` : ''}
      <div style="font-size:9px;color:#a0c4f1">${new Date().toLocaleDateString('pt-BR')}</div>
    </div>
  </div>
  <!-- Cliente destaque -->
  <div style="background:#16305a;padding:6px 12px;border-bottom:2px solid #2e5fa3">
    <div style="font-size:15px;font-weight:900;color:#ffffff;letter-spacing:0.3px">${clienteInfo?.nome_cliente ?? '—'}</div>
    <div style="font-size:10px;color:#8ab4e8;margin-top:2px">Pedido: <strong style="color:#c7dbf5">${clienteInfo?.numero_pedido ?? '—'}</strong> &nbsp;·&nbsp; OP: <strong style="color:#c7dbf5">${clienteInfo?.numero_op ?? '—'}</strong></div>
  </div>
  <!-- Body -->
  <div style="border:1px solid #ccc;border-top:none;padding:10px 12px;border-radius:0 0 4px 4px">
    ${itensHtml}
    <!-- Financeiro -->
    <div style="margin-top:10px;padding:8px 12px;background:#f8f8f8;border:1px solid #e0e0e0;max-width:280px;margin-left:auto">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#333;margin-bottom:6px">Financeiro</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0;color:#444">
        <span>Total Bruto:</span><strong>${fmtBRL(valorTotalCents)}</strong>
      </div>
      ${descontoHtml}
      ${descontoCents > 0 ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0 4px;color:#555;border-bottom:1px solid #e0e0e0;margin-bottom:4px"><span>Total c/ Desconto:</span><strong>${fmtBRL(valorComDesconto)}</strong></div>` : ''}
      ${extrasHtml}
      ${extrasValidos.length > 0 ? `<div style="display:flex;justify-content:space-between;font-size:10px;padding:2px 0 4px;color:#555;border-bottom:1px solid #e0e0e0;margin-bottom:4px"><span>Total c/ Acréscimos:</span><strong>${fmtBRL(valorComAcrescimos)}</strong></div>` : ''}
      ${sinaisHtml}
      <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:${saldoCents > 0 ? '#c0392b' : '#27ae60'};border-top:2px solid #ddd;margin-top:6px;padding-top:6px">
        <span>SALDO A PAGAR:</span><span>${fmtBRL(saldoCents)}</span>
      </div>
    </div>
    <!-- Rodapé -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;padding-top:6px;border-top:1px solid #eee">
      <span style="font-size:8px;color:#999">Impresso em: ${new Date().toLocaleString('pt-BR')}</span>
      <div style="border-top:1px solid #333;width:140px;text-align:center;padding-top:2px;font-size:8px;color:#555">Assinatura / Responsável</div>
    </div>
  </div>
</div>`;
    };

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Romaneio de Expedição</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;font-size:10px;color:#111;background:#fff}
@page{size:A4 portrait;margin:10mm}
.corte{display:flex;align-items:center;gap:6px;color:#999;font-size:9px;padding:2mm 0;margin-bottom:4mm}
.corte-line{flex:1;border-top:1px dashed #aaa}
</style></head><body>
<div>
  ${via('CLIENTE')}
  <div class="corte">
    <div class="corte-line"></div>
    <span style="font-size:13px;transform:rotate(90deg);display:inline-block">✂</span>
    <span>recorte aqui</span>
    <div class="corte-line"></div>
  </div>
  ${via('EXPEDIÇÃO')}
</div>
</body></html>`;
  };

  // Impressão unitária — usa config do item (salva no edit modal)
  const handlePrint = async (item: EstoqueItem) => {
    const cfg = itemPrintConfig[item.id];
    const descVal = parseFloat(cfg?.descValor || '0') || 0;
    const logoDataUrl = empresa?.logo_url ? await fetchLogoBase64(empresa.logo_url) : null;
    let sinais: Sinal[] = [];
    try { sinais = await apiFetch(`/kanban/estoque/${item.id}/sinais`); } catch {}
    printHtml(buildRomaneioHtml([item], { [item.id]: sinais }, empresa, cfg?.descTipo ?? 'valor', descVal, cfg?.extras ?? [], logoDataUrl));
  };

  // Impressão em lote — usa batchDesc + batchExtras da barra flutuante
  const handlePrintBatch = async () => {
    const selecionados = filtered.filter(i => selectedIds.has(i.id));
    if (selecionados.length === 0) return;
    const descVal = parseFloat(batchDescValor || '0') || 0;
    const [sinaisResults, logoDataUrl] = await Promise.all([
      Promise.all(selecionados.map(async item => {
        try { return { id: item.id, sinais: await apiFetch(`/kanban/estoque/${item.id}/sinais`) as Sinal[] }; }
        catch { return { id: item.id, sinais: [] as Sinal[] }; }
      })),
      empresa?.logo_url ? fetchLogoBase64(empresa.logo_url) : Promise.resolve(null),
    ]);
    const sinaisMap: Record<string, Sinal[]> = {};
    sinaisResults.forEach(r => { sinaisMap[r.id] = r.sinais; });
    printHtml(buildRomaneioHtml(selecionados, sinaisMap, empresa, batchDescTipo, descVal, batchExtras, logoDataUrl));
  };

  const handleFaturar = async () => {
    if (!faturarItem) return;
    setSavingFaturar(true);
    try {
      await apiFetch(`/kanban/estoque/${faturarItem.id}/faturar`, {
        method: 'PATCH',
        body: JSON.stringify({ nf_numero: nfNumeroEdit.trim() || null }),
      });
      toast.success('Item marcado como faturado');
      setFaturarItem(null);
      setNfNumeroEdit('');
      load();
    } catch { toast.error('Erro ao faturar'); }
    finally { setSavingFaturar(false); }
  };

  return (
    <KanbanLayout>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Package className="w-5 h-5 text-violet-600" />
              Gestão de Estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Controle de estoque — gerado automaticamente na fase de Expedição
            </p>
          </div>
        </div>

        {/* ── Barra de lote: aparece somente quando há itens selecionados ── */}
        {selectedIds.size > 0 && (
          <div className="border border-violet-200 rounded-xl bg-violet-50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-violet-600" />
                <span className="font-semibold text-sm text-violet-800">
                  {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
                </span>
                <span className="text-xs text-violet-500">— configure o romaneio do lote abaixo</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelectedIds(new Set())} className="text-xs text-violet-500 hover:text-violet-700 underline">
                  Limpar seleção
                </button>
                <Button onClick={handlePrintBatch} className="bg-violet-600 hover:bg-violet-700 text-white gap-2 h-8 text-xs">
                  <Printer className="w-3.5 h-3.5" />
                  Gerar Romaneio ({selectedIds.size} {selectedIds.size === 1 ? 'item' : 'itens'})
                </Button>
              </div>
            </div>
            <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Desconto do lote */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Desconto do lote</label>
                <div className="flex gap-2 items-center">
                  <select value={batchDescTipo} onChange={e => setBatchDescTipo(e.target.value as 'percentual' | 'valor')}
                    className="h-8 rounded-md border border-input bg-white px-2 text-sm">
                    <option value="valor">R$</option>
                    <option value="percentual">%</option>
                  </select>
                  <Input type="number" min="0" step="0.01" value={batchDescValor}
                    onChange={e => setBatchDescValor(e.target.value)}
                    placeholder={batchDescTipo === 'percentual' ? 'Ex: 10' : 'Ex: 50,00'}
                    className="h-8 flex-1 bg-white" />
                  {batchDescValor && parseFloat(batchDescValor) > 0 && (
                    <button onClick={() => setBatchDescValor('')} className="text-muted-foreground hover:text-red-500 p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* Acréscimos do lote */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acréscimos do lote</label>
                  <button onClick={addBatchExtra} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                    <Plus className="w-3 h-3" />Adicionar
                  </button>
                </div>
                {batchExtras.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nenhum — clique em Adicionar</p>
                ) : (
                  <div className="space-y-1.5">
                    {batchExtras.map(e => (
                      <div key={e.id} className="flex gap-2 items-center">
                        <Input value={e.descricao} onChange={ev => updateBatchExtra(e.id, 'descricao', ev.target.value)}
                          placeholder="Ex: Correio" className="h-7 text-xs flex-1 bg-white" />
                        <Input type="number" min="0" step="0.01" value={e.valor}
                          onChange={ev => updateBatchExtra(e.id, 'valor', ev.target.value)}
                          placeholder="R$" className="h-7 text-xs w-24 bg-white" />
                        <button onClick={() => removeBatchExtra(e.id)} className="text-muted-foreground hover:text-red-500 p-1 shrink-0">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-8 text-sm">
              <SelectValue placeholder="Status ERP" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFaturado} onValueChange={setFilterFaturado}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Faturado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Faturamento</SelectItem>
              <SelectItem value="sim">Faturado</SelectItem>
              <SelectItem value="nao">Não Faturado</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 w-40 text-sm"
              placeholder="Filtrar cliente..."
              value={filterCliente}
              onChange={e => setFilterCliente(e.target.value)}
            />
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 w-40 text-sm"
              placeholder="Filtrar pedido..."
              value={filterPedido}
              onChange={e => setFilterPedido(e.target.value)}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            icon={<Package className="w-3.5 h-3.5" />}
            label="Total Itens"
            value={String(kpis.totalItens)}
            sub="referências em estoque"
          />
          <KpiCard
            icon={<Scissors className="w-3.5 h-3.5" />}
            label="Qtd Cortada"
            value={fmtN(kpis.qtdCortada)}
            sub="peças cortadas"
          />
          <KpiCard
            icon={<Star className="w-3.5 h-3.5" />}
            label="1ª Qualidade"
            value={fmtN(kpis.primeira)}
            sub="peças primeira"
            color="text-green-600"
          />
          <KpiCard
            icon={<Star className="w-3.5 h-3.5" />}
            label="2ª Qualidade"
            value={fmtN(kpis.segunda)}
            sub="peças segunda"
            color="text-orange-500"
          />
          <KpiCard
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="Variação"
            value={`${kpis.variacao >= 0 ? '+' : ''}${fmtN(kpis.variacao)}`}
            sub={`${kpis.varPct >= 0 ? '+' : ''}${kpis.varPct.toFixed(1)}% das cortadas`}
            color={variacaoClass(kpis.variacao)}
          />
          <KpiCard
            icon={<DollarSign className="w-3.5 h-3.5" />}
            label="Valor Total"
            value={fmtBRL(kpis.valorTotal)}
            sub="em estoque (1ª)"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            {items.length === 0
              ? 'Nenhum item em estoque. OPs entram no estoque ao chegar na fase de Expedição.'
              : 'Nenhum item corresponde aos filtros aplicados.'}
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="px-3 py-3 text-center w-8">
                      <input type="checkbox"
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onChange={e => setSelectedIds(e.target.checked ? new Set(filtered.map(x => x.id)) : new Set())}
                        className="rounded" />
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Referência</th>
                    <th className="text-left px-4 py-3 font-medium">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium">Pedido</th>
                    <th className="text-right px-3 py-3 font-medium">Qtd Inicial</th>
                    <th className="text-right px-3 py-3 font-medium">Qtd Cortada</th>
                    <th className="text-right px-3 py-3 font-medium text-green-700">1ª Qual.</th>
                    <th className="text-right px-3 py-3 font-medium text-orange-600">2ª Qual.</th>
                    <th className="text-right px-3 py-3 font-medium">Total Final</th>
                    <th className="text-right px-3 py-3 font-medium">Variação</th>
                    <th className="text-center px-3 py-3 font-medium">Status ERP</th>
                    <th className="text-center px-3 py-3 font-medium">Faturado</th>
                    <th className="text-center px-3 py-3 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, i) => {
                    const totalFinal = item.qtd_primeira + item.qtd_segunda;
                    const variacao = totalFinal - item.qtd_cortada;
                    const varPct = item.qtd_cortada > 0 ? (variacao / item.qtd_cortada) * 100 : 0;
                    const isSelected = selectedIds.has(item.id);
                    return (
                      <tr key={item.id} className={`${isSelected ? 'bg-violet-50 border-l-2 border-violet-400' : i % 2 === 0 ? 'bg-white' : 'bg-muted/10'}`}>
                        <td className="px-3 py-3 text-center">
                          <input type="checkbox" checked={isSelected}
                            onChange={e => {
                              const next = new Set(selectedIds);
                              e.target.checked ? next.add(item.id) : next.delete(item.id);
                              setSelectedIds(next);
                            }} className="rounded" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-violet-700">{item.codigo || item.numero_op || '—'}</div>
                          {item.descricao && <div className="text-xs text-muted-foreground truncate max-w-[180px]">{item.descricao}</div>}
                        </td>
                        <td className="px-4 py-3 text-sm">{item.nome_cliente ?? '—'}</td>
                        <td className="px-3 py-3 font-mono text-xs">{item.numero_pedido ?? '—'}</td>
                        <td className="px-3 py-3 text-right">{fmtN(item.qtd_inicial)}</td>
                        <td className="px-3 py-3 text-right">{fmtN(item.qtd_cortada)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-green-700">{fmtN(item.qtd_primeira)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-orange-600">{fmtN(item.qtd_segunda)}</td>
                        <td className="px-3 py-3 text-right font-bold">{fmtN(totalFinal)}</td>
                        <td className={`px-3 py-3 text-right text-xs font-medium ${variacaoClass(variacao)}`}>
                          {variacao >= 0 ? '+' : ''}{fmtN(variacao)} ({varPct >= 0 ? '+' : ''}{varPct.toFixed(1)}%)
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={item.status_erp === 'enviado' ? 'default' : 'secondary'}
                            className={item.status_erp === 'enviado'
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-yellow-50 text-yellow-700 border-yellow-200'}>
                            {item.status_erp === 'enviado' ? 'Enviado' : 'Pendente'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {item.faturado ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200">Faturado</Badge>
                              {item.nf_numero && <span className="text-xs text-muted-foreground font-mono">{item.nf_numero}</span>}
                            </div>
                          ) : (
                            <button
                              onClick={() => { setFaturarItem(item); setNfNumeroEdit(''); }}
                              className="text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2 font-medium"
                              title="Registrar faturamento">
                              Faturar NF
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5 justify-center">
                            <button onClick={() => handlePrint(item)}
                              title="Imprimir romaneio" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-gray-700">
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(item)}
                              title="Editar grade" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-blue-600">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteItem(item)}
                              title="Remover" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            {!item.faturado && (
                              <button onClick={() => setErpItem(item)}
                                title="Enviar ao ERP Mirage"
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-violet-600 text-white hover:bg-violet-700">
                                <Send className="w-3 h-3" />
                                ERP
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Grade Modal */}
      <Dialog open={!!editingItem} onOpenChange={open => !open && setEditingItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Estoque</DialogTitle>
            <p className="text-sm text-muted-foreground">Preencha as quantidades do estoque por cor e tamanho</p>
          </DialogHeader>

          {editingItem && (
            <div className="space-y-4">
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="font-semibold">Grade de Estoque — {editingItem.codigo || editingItem.numero_op}</div>
                <div className="text-sm text-muted-foreground">Informe as quantidades por cor e tamanho</div>
              </div>

              <GradeEditor state={gradeState} onChange={setGradeState} />

              {/* ── Romaneio: Desconto e Acréscimos ── */}
              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-violet-600" />
                  <span className="font-semibold text-sm">Romaneio deste pedido</span>
                  <span className="text-xs text-muted-foreground">— salvo ao clicar em Atualizar</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Desconto */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Desconto</label>
                    <div className="flex gap-2 items-center">
                      <select value={editDescTipo} onChange={e => setEditDescTipo(e.target.value as 'percentual' | 'valor')}
                        className="h-9 rounded-md border border-input bg-background px-2 text-sm">
                        <option value="valor">R$</option>
                        <option value="percentual">%</option>
                      </select>
                      <Input type="number" min="0" step="0.01" value={editDescValor}
                        onChange={e => setEditDescValor(e.target.value)}
                        placeholder={editDescTipo === 'percentual' ? 'Ex: 10' : 'Ex: 50,00'}
                        className="h-9 flex-1" />
                      {editDescValor && parseFloat(editDescValor) > 0 && (
                        <button onClick={() => setEditDescValor('')} className="text-muted-foreground hover:text-red-500 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    {editDescValor && parseFloat(editDescValor) > 0 && (
                      <p className="text-xs text-violet-600 mt-1">
                        ✓ Desconto de {editDescTipo === 'percentual' ? `${editDescValor}%` : `R$ ${editDescValor}`} aparecerá no romaneio
                      </p>
                    )}
                  </div>

                  {/* Acréscimos */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acréscimos</label>
                      <button onClick={addEditExtra} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
                        <Plus className="w-3 h-3" />Adicionar (correio, frete, piloto…)
                      </button>
                    </div>
                    {editExtras.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Nenhum — clique em Adicionar para incluir</p>
                    ) : (
                      <div className="space-y-1.5">
                        {editExtras.map(e => (
                          <div key={e.id} className="flex gap-2 items-center">
                            <Input value={e.descricao} onChange={ev => updateEditExtra(e.id, 'descricao', ev.target.value)}
                              placeholder="Descrição (ex: Correio)" className="h-8 text-sm flex-1" />
                            <Input type="number" min="0" step="0.01" value={e.valor}
                              onChange={ev => updateEditExtra(e.id, 'valor', ev.target.value)}
                              placeholder="R$ valor" className="h-8 text-sm w-28" />
                            <button onClick={() => removeEditExtra(e.id)} className="text-muted-foreground hover:text-red-500 p-1 shrink-0">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>Cancelar</Button>
            <Button onClick={saveGrades} disabled={saving} className="bg-violet-600 hover:bg-violet-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Atualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteItem} onOpenChange={open => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do estoque?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá <strong>{deleteItem?.codigo}</strong> do estoque. Não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Faturar Dialog */}
      <Dialog open={!!faturarItem} onOpenChange={open => !open && setFaturarItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Faturamento</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Informe o número da NF emitida para <strong>{faturarItem?.codigo}</strong>
            </p>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Número da NF</label>
              <Input
                className="mt-1"
                placeholder="Ex: 001234"
                value={nfNumeroEdit}
                onChange={e => setNfNumeroEdit(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFaturar()}
              />
              <p className="text-xs text-muted-foreground mt-1">Opcional — deixe em branco se ainda não tiver o número</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFaturarItem(null)}>Cancelar</Button>
            <Button onClick={handleFaturar} disabled={savingFaturar} className="bg-blue-600 hover:bg-blue-700 text-white">
              {savingFaturar ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Confirmar Faturamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ERP Confirm */}
      <AlertDialog open={!!erpItem} onOpenChange={open => !open && setErpItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar ao ERP Mirage?</AlertDialogTitle>
            <AlertDialogDescription>
              O produto <strong>{erpItem?.codigo}</strong> será sincronizado com o ERP Mirage:{" "}
              se já existir será atualizado com as quantidades, se não existir será criado automaticamente.
              <br />
              <span className="font-medium">1ª Qualidade: {erpItem?.qtd_primeira ?? 0} pcs | 2ª Qualidade: {erpItem?.qtd_segunda ?? 0} pcs</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnviarErp} className="bg-violet-600 hover:bg-violet-700">
              Confirmar Envio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </KanbanLayout>
  );
}
