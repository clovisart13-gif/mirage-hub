import { useState, useMemo, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Plus, Search, Trash2, Package, Clock, CheckCircle, XCircle,
  Filter, DollarSign, TrendingUp, CalendarDays, ChevronLeft, ChevronRight,
  PlayCircle, Edit, Printer, Save, X, Settings, ChevronDown, ChevronUp, Building2, Send, Shirt, Layers, Loader2,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Grade {
  id: string; nome: string; tamanhos: string[];
}
interface ItemPedido {
  id: string; pedidoId: string; referencia: string; descricao: string;
  corNome: string; gradeId: string | null; gradeNome?: string; gradeTamanhos?: string[];
  quantidadeTotal: number; quantidadePorTamanho: Record<string, number>;
  valorUnitario: number; valorTotal: number; cmp: number;
  referenciaId: string | null;
  isAviamento: boolean;
  isDesenvolvimento: boolean;
}
interface Pedido {
  id: string; numeroPedido: string; nomeCliente: string; emailCliente: string;
  telefoneCliente: string; status: string; prazoEntrega: string | null;
  valorTotal: number; valorSinal: number;
  acrescimoTipo: string; acrescimoValor: number;
  descontoTipo: string; descontoValor: number;
  observacoes: string; origem: string; createdAt: string;
  cnpjCliente: string; enderecoCliente: string; cepCliente: string;
  cidadeCliente: string; ufCliente: string; idVhsysCliente: string | null;
  idVhsysPedido: string | null;
  itens: ItemPedido[];
}
interface GrupoReferencia {
  referencia: string; itens: ItemPedido[];
  quantidadeTotal: number; todosComCartao: boolean; algumSemCartao: boolean;
}
interface Sinal {
  id: string; descricao: string; valor_cents: number; data_recebido: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtBRL = (centavos: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(centavos / 100);
const fmtData = (d: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

// Converte ISO (yyyy-mm-dd) → pt-BR (dd/mm/yyyy) para exibição no input
const isoParaPtBR = (iso: string): string => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};
// Converte pt-BR (dd/mm/yyyy) → ISO (yyyy-mm-dd) para salvar
const ptBRParaISO = (ptbr: string): string => {
  if (!ptbr) return '';
  const [d, m, y] = ptbr.split('/');
  if (!d || !m || !y || y.length !== 4) return '';
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};
// Mascara entrada de data para guiar o usuário
const mascaraData = (valor: string): string => {
  const nums = valor.replace(/\D/g, '').substring(0, 8);
  if (nums.length <= 2) return nums;
  if (nums.length <= 4) return `${nums.slice(0, 2)}/${nums.slice(2)}`;
  return `${nums.slice(0, 2)}/${nums.slice(2, 4)}/${nums.slice(4)}`;
};
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

type FiltroCartao = 'todos' | 'sem_cartao' | 'parcial' | 'completo';
type FiltroData = 'todos' | 'dia' | 'mes' | 'ano';
type StatusCartao = 'sem_cartao' | 'parcial' | 'completo';

function getStatusCartao(pedido: Pedido): StatusCartao {
  if (!pedido.itens || pedido.itens.length === 0) return 'sem_cartao';
  // Apenas itens de produção real (excluir aviamento e desenvolvimento)
  const producao = pedido.itens.filter(i => !i.isAviamento && !i.isDesenvolvimento);
  if (producao.length === 0) return 'completo'; // pedido só com avi/dev → não precisa de cartão
  const comCartao = producao.filter(i => i.referenciaId !== null).length;
  if (comCartao === 0) return 'sem_cartao';
  if (comCartao === producao.length) return 'completo';
  return 'parcial';
}

function getBorderColor(s: StatusCartao) {
  if (s === 'sem_cartao') return 'border-l-4 border-l-orange-500';
  if (s === 'parcial') return 'border-l-4 border-l-yellow-500';
  return 'border-l-4 border-l-green-500';
}

function getCartaoBadge(s: StatusCartao) {
  if (s === 'sem_cartao') return <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-300">📋 Sem Cartão</Badge>;
  if (s === 'parcial') return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-400">⚠️ Parcial</Badge>;
  return <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-300">✅ Completo</Badge>;
}

function getStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-800' },
    em_producao: { label: 'Em Produção', cls: 'bg-blue-100 text-blue-800' },
    concluido: { label: 'Concluído', cls: 'bg-green-100 text-green-800' },
    cancelado: { label: 'Cancelado', cls: 'bg-red-100 text-red-800' },
  };
  const cfg = map[status] || map.pendente;
  return <Badge className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>;
}

function parseTamanhos(grade: Grade | undefined): string[] {
  if (!grade) return [];
  const t = grade.tamanhos;
  if (!t) return [];
  if (Array.isArray(t)) {
    if (t.length === 1 && typeof t[0] === 'string' && t[0].includes(',')) {
      return t[0].split(',').map((x: string) => x.trim()).filter(Boolean);
    }
    return t.map(String).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(t as any);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {}
  return String(t).split(',').map(x => x.trim()).filter(Boolean);
}

// ─── GradeDialog (criar ou editar) ───────────────────────────────────────────
function NovaGradeDialog({ open, onOpenChange, onSaved, gradeParaEditar }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: (grade: Grade) => void;
  gradeParaEditar?: Grade | null;
}) {
  const [nome, setNome] = useState('');
  const [tamanhosStr, setTamanhosStr] = useState('');
  const [loading, setLoading] = useState(false);
  const editando = !!gradeParaEditar;

  useEffect(() => {
    if (open && gradeParaEditar) {
      setNome(gradeParaEditar.nome);
      setTamanhosStr(Array.isArray(gradeParaEditar.tamanhos) ? gradeParaEditar.tamanhos.join(', ') : '');
    } else if (!open) {
      setNome('');
      setTamanhosStr('');
    }
  }, [open, gradeParaEditar]);

  const handleSalvar = async () => {
    if (!nome.trim()) { toast.error('Nome da grade é obrigatório'); return; }
    const tamanhos = tamanhosStr.split(',').map(t => t.trim()).filter(Boolean);
    setLoading(true);
    try {
      const result: Grade = editando
        ? await apiFetch(`/kanban/grades/${gradeParaEditar!.id}`, { method: 'PUT', body: JSON.stringify({ nome: nome.trim(), tamanhos }) })
        : await apiFetch('/kanban/grades', { method: 'POST', body: JSON.stringify({ nome: nome.trim(), tamanhos }) });
      toast.success(editando ? `Grade "${result.nome}" atualizada` : `Grade "${result.nome}" criada`);
      onSaved(result);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || (editando ? 'Erro ao salvar grade' : 'Erro ao criar grade'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar Grade de Tamanhos' : 'Nova Grade de Tamanhos'}</DialogTitle>
          {editando && <p className="text-sm text-muted-foreground">Altere o nome ou adicione/remova tamanhos</p>}
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Nome da Grade *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: 36 ao 46" autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label>Tamanhos (separados por vírgula)</Label>
            <Input value={tamanhosStr} onChange={e => setTamanhosStr(e.target.value)} placeholder="Ex: 36, 38, 40, 42, 44, 46" />
            <p className="text-xs text-muted-foreground">Digite na ordem que devem aparecer</p>
            {editando && tamanhosStr && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tamanhosStr.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">{t}</span>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={loading}>
            {loading ? (editando ? 'Salvando...' : 'Criando...') : (editando ? 'Salvar Alterações' : 'Criar Grade')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── VarianteEditor inline ────────────────────────────────────────────────────
interface VarianteEditorProps {
  varianteIndex: number;
  variante: { id: string; corNome: string; gradeId: string | null; quantidades: Record<string, number> };
  grades: Grade[];
  onUpdate: (field: string, value: any) => void;
  onRemove: () => void;
  canRemove: boolean;
  onNovaGrade?: (afterCreate: (g: Grade) => void) => void;
  onEditarGrade?: (gradeAtual: Grade, afterEdit: (g: Grade) => void) => void;
}
function VarianteEditor({ varianteIndex, variante, grades, onUpdate, onRemove, canRemove, onNovaGrade, onEditarGrade }: VarianteEditorProps) {
  const grade = grades.find(g => g.id === variante.gradeId);
  const tamanhos = parseTamanhos(grade);
  const qtdTotal = Object.values(variante.quantidades).reduce((s, v) => s + (v || 0), 0);

  return (
    <div className="border border-gray-300 rounded-lg p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Variante {varianteIndex + 1}
          {variante.corNome && variante.gradeId && (
            <span className="ml-2 text-blue-600">
              ({variante.corNome} - {grade?.nome || ''})
            </span>
          )}
        </span>
        {canRemove && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-red-600" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Cor * (digite livremente)</Label>
          <Input
            value={variante.corNome}
            onChange={e => onUpdate('corNome', e.target.value)}
            placeholder="Ex: Preto, Azul Marinho..."
          />
        </div>
        <div>
          <Label>Grade de Tamanhos *</Label>
          <Select
            value={variante.gradeId || ''}
            onValueChange={val => {
              if (val === '__nova__') {
                onNovaGrade?.((novaGrade) => {
                  onUpdate('gradeId', novaGrade.id);
                  onUpdate('quantidades', {});
                });
                return;
              }
              if (val === '__editar__') {
                const gradeAtual = grades.find(g => g.id === variante.gradeId);
                if (gradeAtual) onEditarGrade?.(gradeAtual, (gradeEditada) => {
                  onUpdate('gradeId', gradeEditada.id);
                  onUpdate('quantidades', {});
                });
                return;
              }
              onUpdate('gradeId', val);
              onUpdate('quantidades', {});
            }}
          >
            <SelectTrigger><SelectValue placeholder="Selecione a grade" /></SelectTrigger>
            <SelectContent>
              {grades.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
              ))}
              {variante.gradeId && (
                <SelectItem value="__editar__" className="text-amber-600 font-medium">
                  ✏️ Editar grade atual...
                </SelectItem>
              )}
              <SelectItem value="__nova__" className="text-blue-600 font-medium border-t mt-1 pt-1">
                ➕ Nova Grade...
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {tamanhos.length > 0 && (
        <div>
          <Label>Quantidades por Tamanho</Label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {tamanhos.map(tam => (
              <div key={tam}>
                <Label className="text-xs">{tam}</Label>
                <Input
                  type="number" min="0"
                  value={variante.quantidades[tam] || 0}
                  onChange={e => {
                    const novas = { ...variante.quantidades, [tam]: parseInt(e.target.value) || 0 };
                    onUpdate('quantidades', novas);
                  }}
                />
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Total desta variante: <strong>{qtdTotal} peças</strong>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── NovoPedidoDialog ─────────────────────────────────────────────────────────
interface NovoPedidoDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void; onSuccess: () => void;
}
interface ItemForm {
  id: string; referencia: string; descricao: string; valorUnitario: number; cmp: number;
  variantes: { id: string; corNome: string; gradeId: string | null; quantidades: Record<string, number> }[];
}

function NovoPedidoDialog({ open, onOpenChange, onSuccess }: NovoPedidoDialogProps) {
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [valorSinal, setValorSinal] = useState(0);
  const [acrescimoTipo, setAcrescimoTipo] = useState<'valor' | 'percentual'>('valor');
  const [acrescimoValor, setAcrescimoValor] = useState(0);
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor');
  const [descontoValor, setDescontoValor] = useState(0);
  const [itens, setItens] = useState<ItemForm[]>([{
    id: `item-${Date.now()}`, referencia: '', descricao: '', valorUnitario: 0, cmp: 0,
    variantes: [{ id: `var-${Date.now()}`, corNome: '', gradeId: null, quantidades: {} }],
  }]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [novaGradeOpen, setNovaGradeOpen] = useState(false);
  const [novaGradeCb, setNovaGradeCb] = useState<((g: Grade) => void) | null>(null);
  const [editarGradeOpen, setEditarGradeOpen] = useState(false);
  const [editarGradeAlvo, setEditarGradeAlvo] = useState<Grade | null>(null);
  const [editarGradeCb, setEditarGradeCb] = useState<((g: Grade) => void) | null>(null);

  useEffect(() => {
    apiFetch('/kanban/grades').then(setGrades).catch(() => {});
  }, []);

  const abrirNovaGrade = (cb: (g: Grade) => void) => {
    setNovaGradeCb(() => cb);
    setNovaGradeOpen(true);
  };

  const abrirEditarGrade = (grade: Grade, cb: (g: Grade) => void) => {
    setEditarGradeAlvo(grade);
    setEditarGradeCb(() => cb);
    setEditarGradeOpen(true);
  };

  const limpar = () => {
    setNomeCliente(''); setEmailCliente(''); setTelefoneCliente(''); setPrazoEntrega('');
    setObservacoes(''); setValorSinal(0); setAcrescimoTipo('valor'); setAcrescimoValor(0);
    setDescontoTipo('valor'); setDescontoValor(0);
    setItens([{ id: `item-${Date.now()}`, referencia: '', descricao: '', valorUnitario: 0, cmp: 0,
      variantes: [{ id: `var-${Date.now()}`, corNome: '', gradeId: null, quantidades: {} }] }]);
  };

  const adicionarItem = () => {
    setItens(prev => [...prev, {
      id: `item-${Date.now()}`, referencia: '', descricao: '', valorUnitario: 0, cmp: 0,
      variantes: [{ id: `var-${Date.now()}-0`, corNome: '', gradeId: null, quantidades: {} }],
    }]);
  };

  const removerItem = (idx: number) => {
    if (itens.length > 1) setItens(prev => prev.filter((_, i) => i !== idx));
  };

  const atualizarItem = (idx: number, campo: string, valor: any) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: valor } : it));
  };

  const adicionarVariante = (itemIdx: number) => {
    setItens(prev => prev.map((it, i) => i === itemIdx ? {
      ...it,
      variantes: [...it.variantes, { id: `var-${Date.now()}-${it.variantes.length}`, corNome: '', gradeId: null, quantidades: {} }],
    } : it));
  };

  const removerVariante = (itemIdx: number, varIdx: number) => {
    setItens(prev => prev.map((it, i) => i === itemIdx && it.variantes.length > 1 ? {
      ...it, variantes: it.variantes.filter((_, j) => j !== varIdx),
    } : it));
  };

  const atualizarVariante = (itemIdx: number, varIdx: number, campo: string, valor: any) => {
    setItens(prev => prev.map((it, i) => i === itemIdx ? {
      ...it,
      variantes: it.variantes.map((v, j) => j === varIdx ? { ...v, [campo]: valor } : v),
    } : it));
  };

  const calcQtdVariante = (v: ItemForm['variantes'][0]) =>
    Object.values(v.quantidades).reduce((s, q) => s + (q || 0), 0);

  const calcTotaisItem = (item: ItemForm) => {
    const qtdTotal = item.variantes.reduce((s, v) => s + calcQtdVariante(v), 0);
    return { qtdTotal, valorTotal: qtdTotal * item.valorUnitario, custoTotal: qtdTotal * item.cmp };
  };

  const resumo = useMemo(() => {
    let qtdTotal = 0, valorSubtotal = 0, custoTotal = 0;
    itens.forEach(item => {
      const t = calcTotaisItem(item);
      qtdTotal += t.qtdTotal; valorSubtotal += t.valorTotal; custoTotal += t.custoTotal;
    });
    const valorAcrescimo = acrescimoTipo === 'valor' ? acrescimoValor : Math.round(valorSubtotal * (acrescimoValor / 100));
    const valorDesconto = descontoTipo === 'valor' ? descontoValor : Math.round(valorSubtotal * (descontoValor / 100));
    const valorTotal = valorSubtotal + valorAcrescimo - valorDesconto;
    const margem = valorTotal - custoTotal;
    const percentualMargem = valorTotal > 0 ? (margem / valorTotal) * 100 : 0;
    const saldo = valorTotal - valorSinal;
    return { qtdTotal, valorSubtotal, valorAcrescimo, valorDesconto, valorTotal, custoTotal, margem, percentualMargem, saldo };
  }, [itens, acrescimoTipo, acrescimoValor, descontoTipo, descontoValor, valorSinal]);

  const handleSubmit = async () => {
    if (!nomeCliente.trim()) { toast.error('Nome do cliente é obrigatório'); return; }
    if (itens.length === 0) { toast.error('Adicione pelo menos um item'); return; }

    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      if (!item.referencia.trim()) { toast.error(`Item ${i + 1}: Referência é obrigatória`); return; }
      if (item.valorUnitario <= 0) { toast.error(`Item ${i + 1}: Valor unitário deve ser maior que zero`); return; }
      for (let j = 0; j < item.variantes.length; j++) {
        const v = item.variantes[j];
        if (!v.corNome.trim()) { toast.error(`Item ${i + 1}, Variante ${j + 1}: Digite o nome da cor`); return; }
        if (!v.gradeId) { toast.error(`Item ${i + 1}, Variante ${j + 1}: Selecione uma grade`); return; }
        if (calcQtdVariante(v) === 0) { toast.error(`Item ${i + 1}, Variante ${j + 1}: Informe pelo menos uma quantidade`); return; }
      }
    }

    // Expandir variantes em itens separados para a API
    const itensSend: any[] = [];
    itens.forEach(item => {
      item.variantes.forEach(v => {
        const qtdTotal = calcQtdVariante(v);
        itensSend.push({
          referencia: item.referencia,
          descricao: item.descricao,
          corNome: v.corNome,
          gradeId: v.gradeId,
          quantidadeTotal: qtdTotal,
          quantidadePorTamanho: v.quantidades,
          valorUnitario: Math.round(item.valorUnitario * 100), // centavos
          cmp: Math.round((item.cmp || 0) * 100),
        });
      });
    });

    setLoading(true);
    try {
      await apiFetch('/kanban/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCliente, emailCliente, telefoneCliente,
          prazoEntrega: prazoEntrega || undefined,
          observacoes: observacoes || undefined,
          valorSinal: Math.round(valorSinal * 100),
          acrescimoTipo,
          acrescimoValor: acrescimoTipo === 'valor' ? Math.round(acrescimoValor * 100) : acrescimoValor,
          descontoTipo,
          descontoValor: descontoTipo === 'valor' ? Math.round(descontoValor * 100) : descontoValor,
          itens: itensSend,
        }),
      });
      toast.success('Pedido criado com sucesso!');
      limpar();
      onOpenChange(false);
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao criar pedido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Pedido</DialogTitle>
        </DialogHeader>

        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
          <p className="font-semibold text-amber-800">IMPORTANTE: Adicione os itens do pedido!</p>
          <p className="text-sm text-amber-700 mt-1">
            Preencha os dados do pedido E adicione pelo menos 1 item com suas variantes (referência, cor, grade, quantidades, valores). Sem itens, nenhum cartão será gerado no Kanban.
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
            📝 <strong>Numeração Automática:</strong> O número do pedido será gerado automaticamente no formato PED-YYYY-NNNN
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prazo de Entrega</Label>
              <Input
                type="date"
                value={prazoEntrega}
                onChange={e => setPrazoEntrega(e.target.value)}
              />
            </div>
            <div>
              <Label>Valor do Sinal (R$)</Label>
              <Input type="number" placeholder="0.00" value={valorSinal || ''}
                onChange={e => setValorSinal(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Nome do Cliente *</Label>
              <Input placeholder="Nome completo" value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={emailCliente} onChange={e => setEmailCliente(e.target.value)} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input placeholder="(00) 00000-0000" value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea placeholder="Informações adicionais sobre o pedido" value={observacoes}
              onChange={e => setObservacoes(e.target.value)} rows={3} />
          </div>

          {/* Itens do Pedido */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Itens do Pedido</h3>
              <Button type="button" onClick={adicionarItem} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />Adicionar Item
              </Button>
            </div>

            <div className="space-y-6">
              {itens.map((item, itemIdx) => {
                const totais = calcTotaisItem(item);
                return (
                  <div key={item.id} className="border-2 border-blue-300 rounded-lg p-4 space-y-4 bg-blue-50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-lg text-blue-900">Item {itemIdx + 1}</h4>
                      {itens.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removerItem(itemIdx)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Referência *</Label>
                        <Input placeholder="Código" value={item.referencia}
                          onChange={e => atualizarItem(itemIdx, 'referencia', e.target.value)} />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Input placeholder="Descrição do produto" value={item.descricao}
                          onChange={e => atualizarItem(itemIdx, 'descricao', e.target.value)} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Valor de Venda Unitário (R$) *</Label>
                        <Input type="number" min="0" step="0.01" placeholder="0.00"
                          value={item.valorUnitario || ''}
                          onChange={e => atualizarItem(itemIdx, 'valorUnitario', parseFloat(e.target.value) || 0)} />
                        <p className="text-xs text-muted-foreground mt-1">Valor que será cobrado do cliente</p>
                      </div>
                      <div>
                        <Label>CMP - Custo Matéria-Prima (R$)</Label>
                        <Input type="number" min="0" step="0.01" placeholder="0.00"
                          value={item.cmp || ''}
                          onChange={e => atualizarItem(itemIdx, 'cmp', parseFloat(e.target.value) || 0)} />
                        <p className="text-xs text-muted-foreground mt-1">Custo da matéria-prima unitária</p>
                      </div>
                    </div>

                    {/* Variantes */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-blue-800">Variantes (Cores e Tamanhos)</h5>
                        <Button type="button" onClick={() => adicionarVariante(itemIdx)} variant="outline" size="sm"
                          className="bg-green-50 hover:bg-green-100 border-green-300">
                          <Plus className="h-4 w-4 mr-2" />Adicionar Variante
                        </Button>
                      </div>

                      {item.variantes.map((v, varIdx) => (
                        <VarianteEditor
                          key={v.id}
                          varianteIndex={varIdx}
                          variante={v}
                          grades={grades}
                          onUpdate={(campo, valor) => {
                            if (campo === 'gradeId') {
                              atualizarVariante(itemIdx, varIdx, 'gradeId', valor);
                              atualizarVariante(itemIdx, varIdx, 'quantidades', {});
                            } else {
                              atualizarVariante(itemIdx, varIdx, campo, valor);
                            }
                          }}
                          onRemove={() => removerVariante(itemIdx, varIdx)}
                          canRemove={item.variantes.length > 1}
                          onNovaGrade={abrirNovaGrade}
                          onEditarGrade={abrirEditarGrade}
                        />
                      ))}
                    </div>

                    {/* Totais do item */}
                    <div className="bg-gray-100 p-3 rounded space-y-1">
                      <p className="text-sm font-semibold">Totais do Item:</p>
                      <div className="grid grid-cols-4 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Quantidade:</span> <strong>{totais.qtdTotal}</strong></div>
                        <div><span className="text-muted-foreground">Valor Total:</span> <strong>{fmtBRL(totais.valorTotal * 100)}</strong></div>
                        <div><span className="text-muted-foreground">Custo Total:</span> <strong>{fmtBRL(totais.custoTotal * 100)}</strong></div>
                        <div><span className="text-muted-foreground">Margem:</span> <strong className="text-green-600">{fmtBRL((totais.valorTotal - totais.custoTotal) * 100)}</strong></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acréscimo e Desconto */}
          <div className="bg-gray-50 border rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4">Acréscimo e Desconto</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Acréscimo</Label>
                <div className="flex gap-2">
                  <Select value={acrescimoTipo} onValueChange={v => setAcrescimoTipo(v as any)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor">Valor (R$)</SelectItem>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" step={acrescimoTipo === 'valor' ? '0.01' : '1'} min="0"
                    value={acrescimoValor || ''} onChange={e => setAcrescimoValor(parseFloat(e.target.value) || 0)}
                    className="flex-1" placeholder={acrescimoTipo === 'valor' ? '0,00' : '0%'} />
                </div>
                {acrescimoTipo === 'percentual' && resumo.valorAcrescimo > 0 && (
                  <p className="text-sm text-green-600">= {fmtBRL(resumo.valorAcrescimo * 100)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Desconto</Label>
                <div className="flex gap-2">
                  <Select value={descontoTipo} onValueChange={v => setDescontoTipo(v as any)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="valor">Valor (R$)</SelectItem>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" step={descontoTipo === 'valor' ? '0.01' : '1'} min="0"
                    value={descontoValor || ''} onChange={e => setDescontoValor(parseFloat(e.target.value) || 0)}
                    className="flex-1" placeholder={descontoTipo === 'valor' ? '0,00' : '0%'} />
                </div>
                {descontoTipo === 'percentual' && resumo.valorDesconto > 0 && (
                  <p className="text-sm text-red-600">= -{fmtBRL(resumo.valorDesconto * 100)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-blue-100 border-2 border-blue-400 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-4 text-blue-900">Resumo do Pedido</h3>
            <div className="grid grid-cols-4 gap-4">
              <div><p className="text-sm text-muted-foreground">Subtotal</p><p className="text-xl font-bold">{fmtBRL(resumo.valorSubtotal * 100)}</p></div>
              <div><p className="text-sm text-muted-foreground">Quantidade Total</p><p className="text-2xl font-bold">{resumo.qtdTotal}</p></div>
              <div><p className="text-sm text-muted-foreground">Valor Total</p><p className="text-2xl font-bold">{fmtBRL(resumo.valorTotal * 100)}</p></div>
              <div><p className="text-sm text-muted-foreground">Valor Sinal</p><p className="text-2xl font-bold">{fmtBRL(valorSinal * 100)}</p></div>
              <div><p className="text-sm text-muted-foreground">Saldo</p><p className="text-2xl font-bold">{fmtBRL(resumo.saldo * 100)}</p></div>
              <div><p className="text-sm text-muted-foreground">Margem</p><p className="text-2xl font-bold text-green-600">{fmtBRL(resumo.margem * 100)}</p></div>
              <div><p className="text-sm text-muted-foreground">% Margem</p><p className="text-2xl font-bold text-green-600">{resumo.percentualMargem.toFixed(1)}%</p></div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
      <NovaGradeDialog
        open={novaGradeOpen}
        onOpenChange={setNovaGradeOpen}
        onSaved={(novaGrade) => {
          setGrades(prev => [...prev, novaGrade]);
          novaGradeCb?.(novaGrade);
          setNovaGradeCb(null);
        }}
      />
      <NovaGradeDialog
        open={editarGradeOpen}
        onOpenChange={setEditarGradeOpen}
        gradeParaEditar={editarGradeAlvo}
        onSaved={(gradeEditada) => {
          setGrades(prev => prev.map(g => g.id === gradeEditada.id ? gradeEditada : g));
          editarGradeCb?.(gradeEditada);
          setEditarGradeCb(null);
          setEditarGradeAlvo(null);
        }}
      />
    </Dialog>
  );
}

// ─── DetalhesPedidoDialog ─────────────────────────────────────────────────────
interface DetalhesPedidoDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  pedidoId: string | null; onSuccess: () => void;
  onDeletar: (id: string, numero: string) => void;
}

function DetalhesPedidoDialog({ open, onOpenChange, pedidoId, onSuccess, onDeletar }: DetalhesPedidoDialogProps) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [loadingGerar, setLoadingGerar] = useState<string | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<string | null>(null);
  const [novaGradeOpen, setNovaGradeOpen] = useState(false);
  const [novaGradeTarget, setNovaGradeTarget] = useState<'novo' | 'edit'>('novo');
  const [editarGradeOpen, setEditarGradeOpen] = useState(false);
  const [editarGradeAlvo, setEditarGradeAlvo] = useState<Grade | null>(null);
  const [editarGradeTarget2, setEditarGradeTarget2] = useState<'novo' | 'edit'>('novo');

  // Campos editáveis
  const [nomeCliente, setNomeCliente] = useState('');
  const [emailCliente, setEmailCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [valorSinal, setValorSinal] = useState('');
  const [acrescimoTipo, setAcrescimoTipo] = useState<'valor' | 'percentual'>('valor');
  const [acrescimoValorEdit, setAcrescimoValorEdit] = useState('');
  const [descontoTipo, setDescontoTipo] = useState<'valor' | 'percentual'>('valor');
  const [descontoValorEdit, setDescontoValorEdit] = useState('');

  // Campos ERP
  const [cnpjCliente, setCnpjCliente] = useState('');
  const [enderecoCliente, setEnderecoCliente] = useState('');
  const [cepCliente, setCepCliente] = useState('');
  const [cidadeCliente, setCidadeCliente] = useState('');
  const [ufCliente, setUfCliente] = useState('');
  const [idVhsysCliente, setIdVhsysCliente] = useState<string | null>(null);
  const [erpAberto, setErpAberto] = useState(true);
  const [loadingErpCliente, setLoadingErpCliente] = useState(false);
  const [loadingErpPedidoId, setLoadingErpPedidoId] = useState<string | null>(null);

  // AdicionarItem inline
  const [adicionarItemOpen, setAdicionarItemOpen] = useState(false);
  const [novoItemRef, setNovoItemRef] = useState('');
  const [novoItemDescricao, setNovoItemDescricao] = useState('');
  const [novoItemCor, setNovoItemCor] = useState('');
  const [novoItemGradeId, setNovoItemGradeId] = useState('');
  const [novoItemQtds, setNovoItemQtds] = useState<Record<string, number>>({});
  const [novoItemValorUnitario, setNovoItemValorUnitario] = useState('');
  const [novoItemCmp, setNovoItemCmp] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [addCorRefLocked, setAddCorRefLocked] = useState<string | null>(null);

  // Estado para editar item
  const [itemParaEditar, setItemParaEditar] = useState<ItemPedido | null>(null);
  const [editItemReferencia, setEditItemReferencia] = useState('');
  const [editItemDescricao, setEditItemDescricao] = useState('');
  const [editItemCor, setEditItemCor] = useState('');
  const [editItemGradeId, setEditItemGradeId] = useState('');
  const [editItemQtds, setEditItemQtds] = useState<Record<string, number>>({});
  const [editItemValorUnitario, setEditItemValorUnitario] = useState('');
  const [editItemCmp, setEditItemCmp] = useState('');
  const [editItemIsAviamento, setEditItemIsAviamento] = useState(false);
  const [editItemIsDesenvolvimento, setEditItemIsDesenvolvimento] = useState(false);
  const [savingItemEdit, setSavingItemEdit] = useState(false);
  const [empresa, setEmpresa] = useState<{ nome_empresa?: string; logo_url?: string; cnpj?: string; endereco?: string; cidade_estado_cep?: string; telefone?: string } | null>(null);

  // Sinais
  const [sinais, setSinais] = useState<Sinal[]>([]);
  const [novoSinalOpen, setNovoSinalOpen] = useState(false);
  const [novoSinalDescricao, setNovoSinalDescricao] = useState('');
  const [novoSinalValor, setNovoSinalValor] = useState('');
  const [novoSinalData, setNovoSinalData] = useState('');
  const [savingSinal, setSavingSinal] = useState(false);

  useEffect(() => {
    apiFetch('/tenants/empresa').then(setEmpresa).catch(() => {});
  }, []);

  const handleImprimir = () => {
    if (!pedido) return;
    const saldoVal = pedido.valorTotal - pedido.valorSinal;

    // Flatten todos os itens (sem agrupamento por referência)
    const todosItens = pedido.itens || [];

    // Monta a célula "Quantidades" com breakdown por tamanho
    const fmtQtds = (i: ItemPedido): string => {
      const qtds = i.quantidadePorTamanho || {};
      const sizes = (i.gradeTamanhos && i.gradeTamanhos.length > 0)
        ? i.gradeTamanhos
        : Object.keys(qtds);
      const partes = sizes
        .map(t => ({ t, v: qtds[t] || 0 }))
        .filter(x => x.v > 0)
        .map(x => `${x.t}: ${x.v}`);
      return partes.length > 0 ? partes.join(' &nbsp;|&nbsp; ') : '–';
    };

    const tdC = (s: string, extra = '') =>
      `<td style="padding:6px 10px;border:1px solid #e0e0e0;${extra}">${s}</td>`;

    const linhasItens = todosItens.map((i, idx) => {
      const bg = idx % 2 === 0 ? '' : 'background:#fafafa;';
      return `<tr>
        ${tdC(i.referencia || '–', bg)}
        ${tdC(i.descricao || '–', bg)}
        ${tdC(i.corNome || '–', bg)}
        ${tdC(fmtQtds(i), `${bg}font-size:12px;`)}
        ${tdC(String(i.quantidadeTotal), `${bg}text-align:right;`)}
        ${tdC(fmtBRL(i.valorUnitario), `${bg}text-align:right;white-space:nowrap;`)}
        ${tdC(fmtBRL(i.valorTotal), `${bg}text-align:right;white-space:nowrap;font-weight:bold;`)}
      </tr>`;
    }).join('');

    const totalQtdGeral = todosItens.reduce((s, i) => s + i.quantidadeTotal, 0);
    const totalValorGeral = todosItens.reduce((s, i) => s + i.valorTotal, 0);
    const linhaTotais = `<tr style="background:#f0f0f0;font-weight:bold;">
      <td colspan="4" style="padding:6px 10px;border:1px solid #e0e0e0;text-align:right;">TOTAL GERAL</td>
      <td style="padding:6px 10px;border:1px solid #e0e0e0;text-align:right;">${totalQtdGeral}</td>
      <td style="padding:6px 10px;border:1px solid #e0e0e0;"></td>
      <td style="padding:6px 10px;border:1px solid #e0e0e0;text-align:right;white-space:nowrap;">${fmtBRL(totalValorGeral)}</td>
    </tr>`;

    const thStyle = 'padding:7px 10px;border:1px solid #d0d0d0;background:#f5f5f5;color:#444;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;';
    const tableHeader = `<thead><tr>
      <th style="${thStyle}text-align:left">Referência</th>
      <th style="${thStyle}text-align:left">Descrição</th>
      <th style="${thStyle}text-align:left">Cor</th>
      <th style="${thStyle}text-align:left">Quantidades</th>
      <th style="${thStyle}text-align:right">Total Peças</th>
      <th style="${thStyle}text-align:right">Valor Unitário</th>
      <th style="${thStyle}text-align:right">Valor Total</th>
    </tr></thead>`;

    // Calcular desconto real = diferença entre bruto (itens) e líquido (pedido.valorTotal)
    const descontoReal = Math.max(0, totalValorGeral - pedido.valorTotal);
    const acrescimoReal = Math.max(0, pedido.valorTotal - totalValorGeral);

    const descontoLabel = pedido.descontoTipo === 'percentual' && pedido.descontoValor > 0
      ? `Desconto (${pedido.descontoValor}%)`
      : 'Desconto';
    const acrescimoLabel = pedido.acrescimoTipo === 'percentual' && pedido.acrescimoValor > 0
      ? `Acréscimo (${pedido.acrescimoValor}%)`
      : 'Acréscimo';

    const descontoHtml = descontoReal > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#c0392b;">
        <span>${descontoLabel}:</span>
        <strong>-${fmtBRL(descontoReal)}</strong>
      </div>` : '';

    const acrescimoHtml = acrescimoReal > 0 ? `
      <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#27ae60;">
        <span>${acrescimoLabel}:</span>
        <strong>+${fmtBRL(acrescimoReal)}</strong>
      </div>` : '';

    const obsHtml = pedido.observacoes ? `
      <div style="background:#f5f5f5;border:1px solid #e0e0e0;padding:10px 12px;margin-top:14px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;margin-bottom:6px;">Observações</div>
        <div style="font-size:10px;color:#444;line-height:1.5;white-space:pre-wrap;">${pedido.observacoes}</div>
      </div>` : '';

    const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Pedido de Venda - ${pedido.numeroPedido}</title>
<style>
  @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 8mm; background: #fff; font-family: Arial, sans-serif; font-size: 12px; color: #222; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  @media print { body { margin: 0; padding: 0; } }
</style>
</head>
<body>

<!-- Cabeçalho -->
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1e3a5f;">
  <div>
    ${empresa?.logo_url ? `<img src="${empresa.logo_url}" alt="${empresa.nome_empresa ?? ''}" style="height:36px;max-width:140px;object-fit:contain;margin-bottom:6px;display:block;">` : ''}
    ${empresa?.nome_empresa ? `<div style="font-size:13px;font-weight:700;color:#1e3a5f;margin-bottom:2px;">${empresa.nome_empresa}</div>` : ''}
    ${empresa?.cnpj ? `<div style="font-size:9px;color:#777;">CNPJ: ${empresa.cnpj}</div>` : ''}
    ${empresa?.endereco ? `<div style="font-size:9px;color:#777;">${empresa.endereco}</div>` : ''}
    ${empresa?.cidade_estado_cep ? `<div style="font-size:9px;color:#777;">${empresa.cidade_estado_cep}</div>` : ''}
    ${empresa?.telefone ? `<div style="font-size:9px;color:#777;">Tel: ${empresa.telefone}</div>` : ''}
  </div>
  <div style="text-align:right;">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e3a5f;margin-bottom:3px;">Pedido de Venda</div>
    <div style="font-size:22px;font-weight:700;color:#111;">${pedido.numeroPedido}</div>
    <div style="font-size:11px;color:#555;line-height:1.7;margin-top:6px;">
      <div><strong>Data:</strong> ${new Date(pedido.createdAt).toLocaleDateString('pt-BR')}</div>
      ${pedido.prazoEntrega ? `<div><strong>Prazo de Entrega:</strong> ${new Date(pedido.prazoEntrega).toLocaleDateString('pt-BR')}</div>` : ''}
      <div><strong>Cliente:</strong> ${pedido.nomeCliente || '–'}</div>
    </div>
  </div>
</div>

<!-- Itens -->
<div style="margin-bottom:14px;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">Itens do Pedido</div>
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    ${tableHeader}
    <tbody>${linhasItens}${linhaTotais}</tbody>
  </table>
</div>

<!-- Totais -->
<div style="margin-top:8px;padding:10px 14px;background:#f8f8f8;border:1px solid #e8e8e8;max-width:320px;margin-left:auto;">
  <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
    <span>Total de Peças:</span><strong>${totalQtdGeral} unidades</strong>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
    <span>Total Geral (bruto):</span><strong>${fmtBRL(totalValorGeral)}</strong>
  </div>
  ${acrescimoHtml}
  ${descontoHtml}
  <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#111;border-top:2px solid #ddd;margin-top:6px;padding-top:8px;">
    <span>VALOR TOTAL:</span><span>${fmtBRL(pedido.valorTotal)}</span>
  </div>
</div>

<!-- Pagamento -->
${(pedido.valorSinal > 0 || saldoVal > 0) ? `
<div style="border-left:4px solid #1e3a5f;padding:10px 14px;margin-top:14px;background:#f0f4f8;max-width:320px;margin-left:auto;">
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;margin-bottom:8px;">Condições de Pagamento</div>
  <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
    <span>Valor Sinal:</span><strong>${fmtBRL(pedido.valorSinal)}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:700;color:#1e3a5f;border-top:1px solid #ccd6e0;margin-top:4px;padding-top:6px;">
    <span>Saldo a Receber:</span><span>${fmtBRL(saldoVal)}</span>
  </div>
</div>` : ''}

${obsHtml}

<p style="margin-top:24px;font-size:9px;color:#999;text-align:center;">Emitido em ${new Date().toLocaleString('pt-BR')}</p>
</body></html>`;


    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 300);
  };

  const handleDeletarPedido = async () => {
    if (!pedido) return;
    onDeletar(pedido.id, pedido.numeroPedido);
    onOpenChange(false);
  };

  const handleAbrirEditarItem = (item: ItemPedido) => {
    setItemParaEditar(item);
    setEditItemReferencia(item.referencia || '');
    setEditItemDescricao(item.descricao || '');
    setEditItemCor(item.corNome || '');
    setEditItemGradeId(item.gradeId || '');
    setEditItemQtds({ ...(item.quantidadePorTamanho || {}) });
    setEditItemValorUnitario(String((item.valorUnitario || 0) / 100));
    setEditItemCmp(String((item.cmp || 0) / 100));
    setEditItemIsAviamento(item.isAviamento ?? false);
    setEditItemIsDesenvolvimento(item.isDesenvolvimento ?? false);
  };

  const handleSalvarItemEditar = async () => {
    if (!itemParaEditar) return;
    const grade = grades.find(g => g.id === editItemGradeId);
    const tamanhos = parseTamanhos(grade);
    const qtdTotal = tamanhos.length > 0
      ? tamanhos.reduce((s, t) => s + (editItemQtds[t] || 0), 0)
      : Object.values(editItemQtds).reduce((s, v) => s + (v || 0), 0);
    if (qtdTotal === 0) { toast.error('Informe pelo menos uma quantidade'); return; }
    setSavingItemEdit(true);
    try {
      await apiFetch(`/kanban/itens-pedido/${itemParaEditar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referencia: editItemReferencia,
          descricao: editItemDescricao,
          corNome: editItemCor,
          gradeId: editItemGradeId || null,
          quantidadeTotal: qtdTotal,
          quantidadePorTamanho: editItemGradeId
            ? Object.fromEntries(tamanhos.map(t => [t, editItemQtds[t] || 0]))
            : editItemQtds,
          valorUnitario: Math.round(parseFloat(editItemValorUnitario || '0') * 100),
          cmp: Math.round(parseFloat(editItemCmp || '0') * 100),
          isAviamento: editItemIsAviamento,
          isDesenvolvimento: editItemIsDesenvolvimento,
        }),
      });
      toast.success('Item atualizado!');
      setItemParaEditar(null);
      carregar();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao editar item');
    } finally {
      setSavingItemEdit(false);
    }
  };

  const handleAbrirAdicionarCor = (grupo: GrupoReferencia) => {
    setAddCorRefLocked(grupo.referencia);
    setNovoItemRef(grupo.referencia);
    setNovoItemDescricao(grupo.itens[0]?.descricao || '');
    setNovoItemCor('');
    setNovoItemGradeId('');
    setNovoItemQtds({});
    setNovoItemValorUnitario(String((grupo.itens[0]?.valorUnitario || 0) / 100));
    setNovoItemCmp(String((grupo.itens[0]?.cmp || 0) / 100));
    setAdicionarItemOpen(true);
  };

  const carregarSinais = useCallback(async () => {
    if (!pedidoId) return;
    try { setSinais(await apiFetch(`/kanban/pedidos/${pedidoId}/sinais`)); } catch { /* ok */ }
  }, [pedidoId]);

  const carregar = useCallback(async () => {
    if (!pedidoId) return;
    setLoading(true);
    try {
      const [pedidoData, gradesData] = await Promise.all([
        apiFetch(`/kanban/pedidos/${pedidoId}/detail`),
        apiFetch('/kanban/grades'),
        carregarSinais(),
      ]);
      setPedido(pedidoData);
      setGrades(gradesData);
      // Popular campos de edição
      setNomeCliente(pedidoData.nomeCliente || '');
      setEmailCliente(pedidoData.emailCliente || '');
      setTelefoneCliente(pedidoData.telefoneCliente || '');
      setPrazoEntrega(pedidoData.prazoEntrega ? new Date(pedidoData.prazoEntrega).toISOString().split('T')[0] : '');
      setObservacoes(pedidoData.observacoes || '');
      setValorSinal(String((pedidoData.valorSinal || 0) / 100));
      setAcrescimoTipo(pedidoData.acrescimoTipo || 'valor');
      setAcrescimoValorEdit(pedidoData.acrescimoTipo === 'percentual'
        ? String(pedidoData.acrescimoValor || 0)
        : String((pedidoData.acrescimoValor || 0) / 100));
      setDescontoTipo(pedidoData.descontoTipo || 'valor');
      setDescontoValorEdit(pedidoData.descontoTipo === 'percentual'
        ? String(pedidoData.descontoValor || 0)
        : String((pedidoData.descontoValor || 0) / 100));
      // ERP
      setCnpjCliente(pedidoData.cnpjCliente || '');
      setEnderecoCliente(pedidoData.enderecoCliente || '');
      setCepCliente(pedidoData.cepCliente || '');
      setCidadeCliente(pedidoData.cidadeCliente || '');
      setUfCliente(pedidoData.ufCliente || '');
      setIdVhsysCliente(pedidoData.idVhsysCliente || null);
    } catch (e: any) {
      toast.error('Erro ao carregar pedido');
    } finally {
      setLoading(false);
    }
  }, [pedidoId]);

  useEffect(() => { if (open && pedidoId) carregar(); }, [open, pedidoId]);

  const handleAdicionarSinal = async () => {
    if (!pedidoId || !novoSinalDescricao.trim() || !novoSinalValor) return;
    setSavingSinal(true);
    try {
      await apiFetch(`/kanban/pedidos/${pedidoId}/sinais`, {
        method: 'POST',
        body: JSON.stringify({
          descricao: novoSinalDescricao.trim(),
          valor_cents: Math.round(parseFloat(novoSinalValor) * 100),
          data_recebido: novoSinalData || null,
        }),
      });
      setNovoSinalDescricao(''); setNovoSinalValor(''); setNovoSinalData('');
      setNovoSinalOpen(false);
      await carregarSinais();
      toast.success('Sinal registrado');
    } catch { toast.error('Erro ao registrar sinal'); }
    finally { setSavingSinal(false); }
  };

  const handleDeletarSinal = async (sinalId: string) => {
    if (!pedidoId) return;
    try {
      await apiFetch(`/kanban/pedidos/${pedidoId}/sinais/${sinalId}`, { method: 'DELETE' });
      await carregarSinais();
      toast.success('Sinal removido');
    } catch { toast.error('Erro ao remover sinal'); }
  };

  const handleSalvar = async () => {
    if (!pedidoId) return;
    const acrValorCents = acrescimoTipo === 'valor'
      ? Math.round(parseFloat(acrescimoValorEdit || '0') * 100)
      : parseInt(acrescimoValorEdit || '0');
    const dscValorCents = descontoTipo === 'valor'
      ? Math.round(parseFloat(descontoValorEdit || '0') * 100)
      : parseInt(descontoValorEdit || '0');

    try {
      await apiFetch(`/kanban/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCliente, emailCliente, telefoneCliente,
          prazoEntrega: prazoEntrega || null,
          observacoes,
          valorSinal: Math.round(parseFloat(valorSinal || '0') * 100),
          acrescimoTipo, acrescimoValor: acrValorCents,
          descontoTipo, descontoValor: dscValorCents,
          cnpjCliente, enderecoCliente, cepCliente, cidadeCliente, ufCliente,
        }),
      });
      toast.success('Pedido atualizado com sucesso!');
      setModoEdicao(false);
      carregar();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar');
    }
  };

  const handleEnviarPedidoErp = async (id: string) => {
    setLoadingErpPedidoId(id);
    try {
      const result = await apiFetch(`/kanban/pedidos/${id}/enviar-erp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(result.mensagem || 'Pedido de venda enviado ao ERP!');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar pedido ao ERP');
    } finally {
      setLoadingErpPedidoId(null);
    }
  };

  const handleEnviarClienteErp = async () => {
    if (!pedidoId) return;
    setLoadingErpCliente(true);
    try {
      // Salva os dados ERP primeiro
      await apiFetch(`/kanban/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cnpjCliente, enderecoCliente, cepCliente, cidadeCliente, ufCliente }),
      });
      // Sincroniza com ERP
      const result = await apiFetch(`/kanban/pedidos/${pedidoId}/enviar-cliente-erp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setIdVhsysCliente(String(result.id_vhsys_cliente));
      toast.success(result.mensagem || 'Cliente sincronizado no ERP Mirage!', {
        description: 'Passo 2: vá para Gestão de Estoque e clique em "Enviar ao ERP Mirage" para sincronizar os produtos.',
        duration: 7000,
      });
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao sincronizar cliente no ERP');
    } finally {
      setLoadingErpCliente(false);
    }
  };

  const handleGerarCartao = async (referencia: string) => {
    if (!pedidoId) return;
    setLoadingGerar(referencia);
    try {
      const result = await apiFetch(`/kanban/pedidos/${pedidoId}/gerar-cartao-referencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referencia }),
      });
      if (result.cartoesGerados > 0) {
        toast.success('Cartão gerado com sucesso! Acesse o Kanban para visualizá-lo.');
      } else {
        toast.info('Todos os itens desta referência já têm cartão');
      }
      carregar();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao gerar cartão');
    } finally {
      setLoadingGerar(null);
    }
  };

  const handleExcluirItem = async (itemId: string) => {
    try {
      await apiFetch(`/kanban/itens-pedido/${itemId}`, { method: 'DELETE' });
      toast.success('Item excluído com sucesso!');
      setItemParaExcluir(null);
      carregar();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir item');
    }
  };

  const handleAdicionarItem = async () => {
    if (!pedidoId || !novoItemRef.trim()) { toast.error('Referência é obrigatória'); return; }
    if (!novoItemGradeId) { toast.error('Selecione uma grade'); return; }
    const grade = grades.find(g => g.id === novoItemGradeId);
    const tamanhos = parseTamanhos(grade);
    const qtdTotal = tamanhos.reduce((s, t) => s + (novoItemQtds[t] || 0), 0);
    if (qtdTotal === 0) { toast.error('Informe pelo menos uma quantidade'); return; }

    setSavingItem(true);
    try {
      await apiFetch('/kanban/itens-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedidoId,
          referencia: novoItemRef,
          descricao: novoItemDescricao,
          corNome: novoItemCor,
          gradeId: novoItemGradeId,
          quantidadeTotal: qtdTotal,
          quantidadePorTamanho: Object.fromEntries(tamanhos.map(t => [t, novoItemQtds[t] || 0])),
          valorUnitario: Math.round(parseFloat(novoItemValorUnitario || '0') * 100),
          cmp: Math.round(parseFloat(novoItemCmp || '0') * 100),
        }),
      });
      toast.success('Item adicionado!');
      setAdicionarItemOpen(false);
      setNovoItemRef(''); setNovoItemDescricao(''); setNovoItemCor('');
      setNovoItemGradeId(''); setNovoItemQtds({}); setNovoItemValorUnitario(''); setNovoItemCmp('');
      carregar();
      onSuccess();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao adicionar item');
    } finally {
      setSavingItem(false);
    }
  };

  // Agrupar itens por referência
  const grupos: GrupoReferencia[] = useMemo(() => {
    if (!pedido?.itens) return [];
    const map = new Map<string, ItemPedido[]>();
    pedido.itens.forEach(item => {
      const arr = map.get(item.referencia) || [];
      arr.push(item);
      map.set(item.referencia, arr);
    });
    return Array.from(map.entries()).map(([referencia, itens]) => ({
      referencia,
      itens,
      quantidadeTotal: itens.reduce((s, i) => s + i.quantidadeTotal, 0),
      todosComCartao: itens.filter(i => !i.isAviamento && !i.isDesenvolvimento).every(i => i.referenciaId !== null),
      algumSemCartao: itens.filter(i => !i.isAviamento && !i.isDesenvolvimento).some(i => i.referenciaId === null),
    }));
  }, [pedido]);

  // valorTotal já vem líquido do backend (com desconto/acréscimo já aplicados)
  // A soma dos itens representa o valor bruto antes dos ajustes
  const valorBruto = pedido
    ? (pedido.itens ?? []).reduce((s: number, i: any) => s + Number(i.valorTotal ?? 0), 0)
    : 0;
  const valorEfetivo = pedido ? pedido.valorTotal : 0;
  // Desconto/acréscimo efetivos = diferença entre bruto e líquido
  const descontoEfetivo = Math.max(0, valorBruto - valorEfetivo);
  const acrescimoEfetivo = Math.max(0, valorEfetivo - valorBruto);
  const saldo = pedido ? Math.max(0, valorEfetivo - pedido.valorSinal) : 0;

  const novaItemGradeObj = grades.find(g => g.id === novoItemGradeId);
  const novaItemTamanhos = parseTamanhos(novaItemGradeObj);

  const editItemGradeObj = grades.find(g => g.id === editItemGradeId);
  const editItemTamanhos = parseTamanhos(editItemGradeObj);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : !pedido ? (
          <div className="text-center py-12 text-muted-foreground">Pedido não encontrado</div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <span>Pedido #{pedido.numeroPedido}</span>
                {getStatusBadge(pedido.status)}
              </DialogTitle>
            </DialogHeader>

            {/* Botões de ação */}
            <div className="flex gap-2 flex-wrap">
              {modoEdicao ? (
                <>
                  <Button size="sm" onClick={handleSalvar} className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" />Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setModoEdicao(false)}>
                    <X className="h-4 w-4 mr-2" />Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setModoEdicao(true)}>
                    <Edit className="h-4 w-4 mr-2" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={idVhsysCliente ? "outline" : "default"}
                    className={idVhsysCliente
                      ? "border-green-500 text-green-700 hover:bg-green-50"
                      : "bg-indigo-600 hover:bg-indigo-700"}
                    disabled={loadingErpCliente}
                    onClick={handleEnviarClienteErp}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {loadingErpCliente ? "Exportando..." : idVhsysCliente ? "ERP ✓ Re-sincronizar" : "Exportar para ERP"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={handleDeletarPedido}>
                    <Trash2 className="h-4 w-4 mr-2" />Excluir Pedido
                  </Button>
                </>
              )}
            </div>

            {/* Dados do pedido */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                  {modoEdicao ? (
                    <Input value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="mt-1" />
                  ) : (
                    <p className="font-medium">{pedido.nomeCliente}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">E-mail</p>
                  {modoEdicao ? (
                    <Input value={emailCliente} onChange={e => setEmailCliente(e.target.value)} className="mt-1" />
                  ) : (
                    <p className="font-medium">{pedido.emailCliente || '-'}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  {modoEdicao ? (
                    <Input value={telefoneCliente} onChange={e => setTelefoneCliente(e.target.value)} className="mt-1" />
                  ) : (
                    <p className="font-medium">{pedido.telefoneCliente || '-'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                  {modoEdicao ? (
                    <Input
                      type="date"
                      value={prazoEntrega}
                      onChange={e => setPrazoEntrega(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium">{fmtData(pedido.prazoEntrega)}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {modoEdicao ? (
                    <Select value={pedido.status} onValueChange={async val => {
                      await apiFetch(`/kanban/pedidos/${pedidoId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: val }),
                      });
                      carregar();
                    }}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_producao">Em Produção</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    getStatusBadge(pedido.status)
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Observações</p>
                  {modoEdicao ? (
                    <Textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} className="mt-1" rows={2} />
                  ) : (
                    <p className="text-sm">{pedido.observacoes || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Seção ERP Mirage — dados do cliente */}
            <div className="border rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                onClick={() => setErpAberto(v => !v)}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-600" />
                  <span className="font-medium text-sm">Dados para ERP Mirage</span>
                  {idVhsysCliente ? (
                    <Badge variant="default" className="bg-green-600 text-xs">✓ Sincronizado (ID {idVhsysCliente})</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-slate-500">Não sincronizado</Badge>
                  )}
                </div>
                {erpAberto ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </button>

              {erpAberto && (
                <div className="p-4 space-y-3 bg-white border-t">
                  <div className="flex gap-4 text-xs mb-1">
                    <div className="flex items-center gap-1.5 font-semibold text-indigo-700">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                      Sincronizar cliente (este pedido)
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">2</span>
                      Sincronizar produtos (Gestão de Estoque)
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Preencha os dados do cliente abaixo e clique em sincronizar. Os campos são opcionais — só o nome (já preenchido acima) é obrigatório.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">CNPJ / CPF</Label>
                      <Input
                        placeholder="00.000.000/0001-00"
                        value={cnpjCliente}
                        onChange={e => setCnpjCliente(e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Telefone</Label>
                      <Input
                        placeholder="(00) 00000-0000"
                        value={telefoneCliente}
                        onChange={e => setTelefoneCliente(e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Endereço (Rua, Nº)</Label>
                    <Input
                      placeholder="Rua das Flores, 123"
                      value={enderecoCliente}
                      onChange={e => setEnderecoCliente(e.target.value)}
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">CEP</Label>
                      <Input
                        placeholder="00000-000"
                        value={cepCliente}
                        onChange={e => setCepCliente(e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Cidade</Label>
                      <Input
                        placeholder="São Paulo"
                        value={cidadeCliente}
                        onChange={e => setCidadeCliente(e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">UF</Label>
                      <Input
                        placeholder="SP"
                        maxLength={2}
                        value={ufCliente}
                        onChange={e => setUfCliente(e.target.value.toUpperCase())}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={handleEnviarClienteErp}
                      disabled={loadingErpCliente}
                      className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {loadingErpCliente ? 'Sincronizando...' : 'Sincronizar Cliente no ERP'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Itens agrupados por referência */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Itens do Pedido</h3>
              {grupos.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">Nenhum item cadastrado</p>
              ) : (
                <div className="space-y-4">
                  {grupos.map(grupo => (
                    <div key={grupo.referencia} className="border rounded-lg overflow-hidden">
                      {/* Cabeçalho do grupo */}
                      <div className="bg-primary/10 p-3 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-lg">📦 {grupo.referencia}</span>
                          <span className="text-sm text-muted-foreground">
                            ({grupo.itens.length} {grupo.itens.length === 1 ? 'cor' : 'cores'} = {grupo.quantidadeTotal} pçs)
                          </span>
                          {grupo.todosComCartao ? (
                            <Badge variant="default" className="bg-green-600">✅ Cartão Gerado</Badge>
                          ) : (
                            <Badge variant="secondary">⏳ Aguardando</Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline" size="sm"
                            className="text-green-700 border-green-300 hover:bg-green-50"
                            onClick={() => handleAbrirAdicionarCor(grupo)}
                            title={`Adicionar nova cor à referência ${grupo.referencia}`}
                          >
                            <Plus className="h-4 w-4 mr-1" />Cor
                          </Button>
                          {grupo.algumSemCartao && (
                            <Button
                              variant="default" size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              disabled={loadingGerar === grupo.referencia}
                              onClick={() => handleGerarCartao(grupo.referencia)}
                              title={`Gerar 1 cartão consolidado para ${grupo.referencia} (${grupo.itens.length} cores)`}
                            >
                              <PlayCircle className="h-4 w-4 mr-1" />
                              {loadingGerar === grupo.referencia ? 'Gerando...' : 'Gerar Cartão'}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Itens (cores) dentro do grupo */}
                      <div className="divide-y">
                        {grupo.itens.map(item => (
                          <div key={item.id} className={`p-3 ${item.isDesenvolvimento ? 'bg-blue-50/60' : item.isAviamento ? 'bg-amber-50/60' : 'bg-white'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.isAviamento && (
                                    <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0">
                                      <Layers className="h-2.5 w-2.5 mr-0.5" />Aviamento
                                    </Badge>
                                  )}
                                  {item.isDesenvolvimento && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-[10px] px-1.5 py-0">
                                      🔬 Desenvolvimento
                                    </Badge>
                                  )}
                                  {item.descricao && (
                                    <p className="text-sm text-muted-foreground">{item.descricao}</p>
                                  )}
                                </div>
                                <div className="flex gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Cor:</span>{' '}
                                    <span className="font-medium">{item.corNome || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Grade:</span>{' '}
                                    <span className="font-medium">{item.gradeNome || grades.find(g => g.id === item.gradeId)?.nome || '-'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Qtd:</span>{' '}
                                    <span className="font-medium">{item.quantidadeTotal} pçs</span>
                                  </div>
                                </div>
                                {/* Quantidades por tamanho */}
                                <div className="flex gap-2 mt-2 text-xs flex-wrap">
                                  {Object.entries(item.quantidadePorTamanho || {}).map(([tam, qtd]) =>
                                    Number(qtd) > 0 ? (
                                      <span key={tam} className="bg-muted/50 px-2 py-1 rounded">
                                        {tam}: {qtd}
                                      </span>
                                    ) : null
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right text-sm">
                                  <p className="font-medium">{fmtBRL(item.valorTotal)}</p>
                                  <p className="text-xs text-muted-foreground">CMP: {fmtBRL(item.cmp)}</p>
                                </div>
                                {!item.referenciaId && (
                                <Button
                                  variant="outline" size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => handleAbrirEditarItem(item)}
                                  title="Editar item"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                )}
                                {!item.referenciaId ? (
                                  <Button
                                    variant="outline" size="sm"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => setItemParaExcluir(item.id)}
                                    title="Excluir item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Badge variant="outline" className="text-xs">🔒</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resumo Financeiro */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Resumo Financeiro</h3>
                <div className="flex gap-2">
                  <Button variant="default" size="sm" onClick={() => setAdicionarItemOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />Adicionar Item
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleImprimir}>
                    <Printer className="h-4 w-4 mr-2" />Imprimir Pedido
                  </Button>
                </div>
              </div>

              {/* Breakdown de valores */}
              <div className="space-y-1 text-sm mb-4">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valor dos itens</span>
                  <span>{fmtBRL(valorBruto)}</span>
                </div>

                {/* Acréscimo */}
                {modoEdicao ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Acréscimo</span>
                    <div className="flex gap-2 items-center">
                      <select value={acrescimoTipo} onChange={e => setAcrescimoTipo(e.target.value as any)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                        <option value="valor">R$</option>
                        <option value="percentual">%</option>
                      </select>
                      <Input type="number" step="0.01" min="0" value={acrescimoValorEdit}
                        onChange={e => setAcrescimoValorEdit(e.target.value)} className="max-w-[90px] h-8" placeholder="0" />
                    </div>
                  </div>
                ) : acrescimoEfetivo > 0 ? (
                  <div className="flex justify-between text-green-700">
                    <span>(+) Acréscimo {pedido.acrescimoTipo === 'percentual' ? `(${pedido.acrescimoValor}%)` : ''}</span>
                    <span className="font-medium">+{fmtBRL(acrescimoEfetivo)}</span>
                  </div>
                ) : null}

                {/* Desconto */}
                {modoEdicao ? (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-muted-foreground">Desconto</span>
                    <div className="flex gap-2 items-center">
                      <select value={descontoTipo} onChange={e => setDescontoTipo(e.target.value as any)}
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm">
                        <option value="valor">R$</option>
                        <option value="percentual">%</option>
                      </select>
                      <Input type="number" step="0.01" min="0" value={descontoValorEdit}
                        onChange={e => setDescontoValorEdit(e.target.value)} className="max-w-[90px] h-8" placeholder="0" />
                    </div>
                  </div>
                ) : descontoEfetivo > 0 ? (
                  <div className="flex justify-between text-red-600">
                    <span>(-) Desconto {pedido.descontoTipo === 'percentual' ? `(${pedido.descontoValor}%)` : ''}</span>
                    <span className="font-medium">-{fmtBRL(descontoEfetivo)}</span>
                  </div>
                ) : null}

                <div className="flex justify-between font-bold text-base border-t pt-2 mt-1">
                  <span>Valor Total</span>
                  <span className="text-blue-600">{fmtBRL(valorEfetivo)}</span>
                </div>
              </div>

              {/* Sinal e Saldo (legado) */}
              {!sinais.length && (
                <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
                  <div>
                    <p className="text-muted-foreground">Valor Sinal</p>
                    {modoEdicao ? (
                      <Input type="number" step="0.01" value={valorSinal}
                        onChange={e => setValorSinal(e.target.value)}
                        className="mt-1 max-w-[150px]" placeholder="0.00" />
                    ) : (
                      <p className="text-lg font-bold text-orange-600">{fmtBRL(pedido.valorSinal)}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">Saldo a Receber</p>
                    <p className="text-lg font-bold text-purple-600">{fmtBRL(saldo)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Sinais Recebidos ───────────────────────────────── */}
            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between bg-orange-50 px-4 py-2.5 border-b">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-sm">Sinais Recebidos</span>
                  {sinais.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">{sinais.length}</Badge>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={() => setNovoSinalOpen(v => !v)}
                  className="h-7 text-xs gap-1 border-orange-300 text-orange-700 hover:bg-orange-100">
                  <Plus className="w-3 h-3" />Registrar Sinal
                </Button>
              </div>

              {novoSinalOpen && (
                <div className="p-3 bg-orange-50/50 border-b grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                    <Input className="mt-1 h-8 text-sm" placeholder="Ex: 1º Sinal" value={novoSinalDescricao}
                      onChange={e => setNovoSinalDescricao(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
                    <Input type="number" step="0.01" className="mt-1 h-8 text-sm" placeholder="0,00"
                      value={novoSinalValor} onChange={e => setNovoSinalValor(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Data Recebido</label>
                    <Input type="date" className="mt-1 h-8 text-sm" value={novoSinalData}
                      onChange={e => setNovoSinalData(e.target.value)} />
                  </div>
                  <div className="col-span-3 flex gap-2">
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white h-7 text-xs"
                      onClick={handleAdicionarSinal} disabled={savingSinal}>
                      {savingSinal ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      Salvar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setNovoSinalOpen(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {sinais.length === 0 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground">
                  Nenhum sinal registrado. Sinais criados no orçamento aparecem automaticamente.
                </div>
              ) : (
                <div className="divide-y">
                  {sinais.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30">
                      <div>
                        <span className="text-sm font-medium">{s.descricao}</span>
                        {s.data_recebido && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {new Date(s.data_recebido).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-orange-700">
                          {(s.valor_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        <button onClick={() => handleDeletarSinal(s.id)}
                          className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-2.5 bg-muted/20 flex justify-between items-center">
                    <span className="text-sm font-medium text-muted-foreground">Total Sinais</span>
                    <span className="font-bold text-orange-700">
                      {(sinais.reduce((s, x) => s + x.valor_cents, 0) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                  <div className="px-4 py-2.5 bg-red-50 flex justify-between items-center">
                    <span className="text-sm font-bold text-red-800">Saldo a Pagar</span>
                    <span className="font-bold text-red-700 text-base">
                      {((valorEfetivo - sinais.reduce((s, x) => s + x.valor_cents, 0)) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Dialog: Adicionar Item / + Cor */}
            <Dialog open={adicionarItemOpen} onOpenChange={v => { setAdicionarItemOpen(v); if (!v) setAddCorRefLocked(null); }}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{addCorRefLocked ? `Adicionar Cor — ${addCorRefLocked}` : 'Adicionar Item ao Pedido'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Referência *</Label>
                      <Input
                        value={novoItemRef}
                        onChange={e => setNovoItemRef(e.target.value)}
                        placeholder="Código"
                        readOnly={!!addCorRefLocked}
                        className={addCorRefLocked ? 'bg-muted text-muted-foreground cursor-not-allowed' : ''}
                      />
                    </div>
                    <div><Label>Descrição</Label><Input value={novoItemDescricao} onChange={e => setNovoItemDescricao(e.target.value)} placeholder="Descrição" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Cor *</Label><Input value={novoItemCor} onChange={e => setNovoItemCor(e.target.value)} placeholder="Ex: Preto" autoFocus={!!addCorRefLocked} /></div>
                    <div>
                      <Label>Grade *</Label>
                      <Select value={novoItemGradeId} onValueChange={v => {
                        if (v === '__nova__') { setNovaGradeTarget('novo'); setNovaGradeOpen(true); return; }
                        if (v === '__editar__') {
                          const g = grades.find(x => x.id === novoItemGradeId);
                          if (g) { setEditarGradeAlvo(g); setEditarGradeTarget2('novo'); setEditarGradeOpen(true); }
                          return;
                        }
                        setNovoItemGradeId(v); setNovoItemQtds({});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                          {novoItemGradeId && (
                            <SelectItem value="__editar__" className="text-amber-600 font-medium">✏️ Editar grade atual...</SelectItem>
                          )}
                          <SelectItem value="__nova__" className="text-blue-600 font-medium border-t mt-1 pt-1">➕ Nova Grade...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {novaItemTamanhos.length > 0 && (
                    <div>
                      <Label>Quantidades por Tamanho</Label>
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {novaItemTamanhos.map(t => (
                          <div key={t}>
                            <Label className="text-xs">{t}</Label>
                            <Input type="number" min="0" value={novoItemQtds[t] || 0}
                              onChange={e => setNovoItemQtds(prev => ({ ...prev, [t]: parseInt(e.target.value) || 0 }))} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Unitário (R$)</Label><Input type="number" step="0.01" value={novoItemValorUnitario} onChange={e => setNovoItemValorUnitario(e.target.value)} placeholder="0.00" /></div>
                    <div><Label>CMP (R$)</Label><Input type="number" step="0.01" value={novoItemCmp} onChange={e => setNovoItemCmp(e.target.value)} placeholder="0.00" /></div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setAdicionarItemOpen(false); setAddCorRefLocked(null); }}>Cancelar</Button>
                  <Button onClick={handleAdicionarItem} disabled={savingItem}>
                    {savingItem ? 'Adicionando...' : 'Adicionar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Editar Item */}
            <Dialog open={itemParaEditar !== null} onOpenChange={v => !v && setItemParaEditar(null)}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Edit className="h-5 w-5 text-blue-600" />Editar Item — {itemParaEditar?.referencia}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {itemParaEditar && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-sm text-blue-800 flex justify-between">
                      <span>Quantidade atual do pedido:</span>
                      <strong>{itemParaEditar.quantidadeTotal} peças</strong>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Referência *</Label>
                      <Input value={editItemReferencia} onChange={e => setEditItemReferencia(e.target.value)} placeholder="Código" autoFocus />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Input value={editItemDescricao} onChange={e => setEditItemDescricao(e.target.value)} placeholder="Descrição do produto" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cor</Label>
                      <Input value={editItemCor} onChange={e => setEditItemCor(e.target.value)} placeholder="Ex: Preto" />
                    </div>
                    <div>
                      <Label>Grade</Label>
                      <Select value={editItemGradeId} onValueChange={v => {
                        if (v === '__nova__') { setNovaGradeTarget('edit'); setNovaGradeOpen(true); return; }
                        if (v === '__editar__') {
                          const g = grades.find(x => x.id === editItemGradeId);
                          if (g) { setEditarGradeAlvo(g); setEditarGradeTarget2('edit'); setEditarGradeOpen(true); }
                          return;
                        }
                        setEditItemGradeId(v); setEditItemQtds({});
                      }}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}
                          {editItemGradeId && (
                            <SelectItem value="__editar__" className="text-amber-600 font-medium">✏️ Editar grade atual...</SelectItem>
                          )}
                          <SelectItem value="__nova__" className="text-blue-600 font-medium border-t mt-1 pt-1">➕ Nova Grade...</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(() => {
                    const tamanhos = editItemTamanhos.length > 0
                      ? editItemTamanhos
                      : Object.keys(editItemQtds).filter(k => k !== '_');
                    const qtdTotal = tamanhos.length > 0
                      ? tamanhos.reduce((s, t) => s + (editItemQtds[t] || 0), 0)
                      : (editItemQtds['_'] || itemParaEditar?.quantidadeTotal || 0);
                    const valorTotalPreview = qtdTotal * parseFloat(editItemValorUnitario || '0');
                    return tamanhos.length > 0 ? (
                      <div>
                        <Label>Quantidades por Tamanho</Label>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          {tamanhos.map(t => (
                            <div key={t}>
                              <Label className="text-xs">{t}</Label>
                              <Input type="number" min="0" value={editItemQtds[t] || 0}
                                onChange={e => setEditItemQtds(prev => ({ ...prev, [t]: parseInt(e.target.value) || 0 }))} />
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Total: {qtdTotal} peças — Valor Total: {fmtBRL(Math.round(valorTotalPreview * 100))}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <Label>Quantidade Total</Label>
                        <Input type="number" min="0"
                          value={editItemQtds['_'] || itemParaEditar?.quantidadeTotal || 0}
                          onChange={e => setEditItemQtds({ '_': parseInt(e.target.value) || 0 })} />
                        <p className="text-xs text-muted-foreground mt-1">
                          Valor Total: {fmtBRL(Math.round(valorTotalPreview * 100))}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Valor Unitário (R$)</Label><Input type="number" step="0.01" value={editItemValorUnitario} onChange={e => setEditItemValorUnitario(e.target.value)} placeholder="0.00" /></div>
                    <div><Label>CMP (R$)</Label><Input type="number" step="0.01" value={editItemCmp} onChange={e => setEditItemCmp(e.target.value)} placeholder="0.00" /></div>
                  </div>
                  <div className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${editItemIsAviamento ? 'bg-amber-50 border-amber-300' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2">
                      <Layers className={`h-4 w-4 ${editItemIsAviamento ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium">Aviamento / Acessório</p>
                        <p className="text-xs text-muted-foreground">Exclui das métricas de produção principal</p>
                      </div>
                    </div>
                    <Switch
                      checked={editItemIsAviamento}
                      onCheckedChange={setEditItemIsAviamento}
                      className="data-[state=checked]:bg-amber-500"
                    />
                  </div>
                  <div className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${editItemIsDesenvolvimento ? 'bg-blue-50 border-blue-300' : 'bg-muted/30'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🔬</span>
                      <div>
                        <p className="text-sm font-medium">Desenvolvimento / Pilotagem</p>
                        <p className="text-xs text-muted-foreground">Não gera cartão de produção nem conta em métricas</p>
                      </div>
                    </div>
                    <Switch
                      checked={editItemIsDesenvolvimento}
                      onCheckedChange={setEditItemIsDesenvolvimento}
                      className="data-[state=checked]:bg-blue-500"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setItemParaEditar(null)}>Cancelar</Button>
                  <Button onClick={handleSalvarItemEditar} disabled={savingItemEdit} className="bg-blue-600 hover:bg-blue-700">
                    {savingItemEdit ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dialog: Confirmar exclusão item */}
            <Dialog open={itemParaExcluir !== null} onOpenChange={open => !open && setItemParaExcluir(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-red-600 flex items-center gap-2">
                    <Trash2 className="h-5 w-5" />Excluir Item
                  </DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground py-4">Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.</p>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setItemParaExcluir(null)}>Cancelar</Button>
                  <Button variant="destructive" onClick={() => itemParaExcluir && handleExcluirItem(itemParaExcluir)}>Excluir</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </DialogContent>
      <NovaGradeDialog
        open={novaGradeOpen}
        onOpenChange={setNovaGradeOpen}
        onSaved={(novaGrade) => {
          setGrades(prev => [...prev, novaGrade]);
          if (novaGradeTarget === 'novo') { setNovoItemGradeId(novaGrade.id); setNovoItemQtds({}); }
          else { setEditItemGradeId(novaGrade.id); setEditItemQtds({}); }
        }}
      />
      <NovaGradeDialog
        open={editarGradeOpen}
        onOpenChange={setEditarGradeOpen}
        gradeParaEditar={editarGradeAlvo}
        onSaved={(gradeEditada) => {
          setGrades(prev => prev.map(g => g.id === gradeEditada.id ? gradeEditada : g));
          if (editarGradeTarget2 === 'novo') { setNovoItemGradeId(gradeEditada.id); setNovoItemQtds({}); }
          else { setEditItemGradeId(gradeEditada.id); setEditItemQtds({}); }
          setEditarGradeAlvo(null);
        }}
      />
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function KanbanPedidos() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCartao, setFiltroCartao] = useState<FiltroCartao>('todos');
  const [novoPedidoOpen, setNovoPedidoOpen] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<string | null>(null);
  const [loadingErpPedidoId, setLoadingErpPedidoId] = useState<string | null>(null);

  const hoje = new Date();
  const [filtroData, setFiltroData] = useState<FiltroData>('mes');
  const [diaFiltro, setDiaFiltro] = useState(hoje.getDate());
  const [mesFiltro, setMesFiltro] = useState(hoje.getMonth());
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());
  const [filtroTipoData, setFiltroTipoData] = useState<'criacao' | 'entrega'>('criacao');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/kanban/pedidos');
      setPedidos(data);
    } catch (e: any) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, []);

  const handleExcluir = async (id: string, numero: string) => {
    if (!confirm(`Excluir o pedido ${numero}? Esta ação não pode ser desfeita.`)) return;
    try {
      await apiFetch(`/kanban/pedidos/${id}`, { method: 'DELETE' });
      toast.success('Pedido excluído!');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    }
  };

  const handleEnviarPedidoErp = async (id: string) => {
    setLoadingErpPedidoId(id);
    try {
      const result = await apiFetch(`/kanban/pedidos/${id}/enviar-erp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(result.mensagem || 'Pedido de venda enviado ao ERP!');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar pedido ao ERP');
    } finally {
      setLoadingErpPedidoId(null);
    }
  };

  // Resumo financeiro com filtro de data
  const resumoFinanceiro = useMemo(() => {
    const filtrados = pedidos.filter(p => {
      if (filtroData === 'todos') return true;
      const criacao = new Date(p.createdAt);
      if (filtroData === 'dia') return criacao.getDate() === diaFiltro && criacao.getMonth() === mesFiltro && criacao.getFullYear() === anoFiltro;
      if (filtroData === 'mes') return criacao.getMonth() === mesFiltro && criacao.getFullYear() === anoFiltro;
      return criacao.getFullYear() === anoFiltro;
    });
    const totalBruto = filtrados.reduce((s, p) => s + (p.valorTotal || 0), 0);
    const quantidade = filtrados.length;
    // Separar itens por categoria
    const allItens = filtrados.flatMap(p => p.itens || []);
    const itensProducao     = allItens.filter((i: any) => !i.isAviamento && !i.isDesenvolvimento);
    const itensDesenvolvimento = allItens.filter((i: any) => i.isDesenvolvimento);
    const itensAviamento    = allItens.filter((i: any) => i.isAviamento);
    const totalPecasProducao      = itensProducao.reduce((s: number, i: any) => s + (i.quantidadeTotal || 0), 0);
    const totalPecasDesenvolvimento = itensDesenvolvimento.reduce((s: number, i: any) => s + (i.quantidadeTotal || 0), 0);
    const totalPecasAviamento     = itensAviamento.reduce((s: number, i: any) => s + (i.quantidadeTotal || 0), 0);
    const valorProducao      = itensProducao.reduce((s: number, i: any) => s + (i.valorTotal || 0), 0);
    const valorDesenvolvimento = itensDesenvolvimento.reduce((s: number, i: any) => s + (i.valorTotal || 0), 0);
    const valorAviamentos    = itensAviamento.reduce((s: number, i: any) => s + (i.valorTotal || 0), 0);
    const totalPecas = totalPecasProducao; // backward compat
    const total = totalBruto; // total inclui todas as categorias
    let label = '';
    if (filtroData === 'dia') label = `${String(diaFiltro).padStart(2, '0')}/${String(mesFiltro + 1).padStart(2, '0')}/${anoFiltro}`;
    else if (filtroData === 'mes') label = `${MESES[mesFiltro]} ${anoFiltro}`;
    else if (filtroData === 'ano') label = `${anoFiltro}`;
    else label = 'Todos os períodos';
    return {
      total, quantidade, totalPecas,
      totalPecasProducao, totalPecasDesenvolvimento, totalPecasAviamento,
      valorProducao, valorDesenvolvimento, valorAviamentos, label,
    };
  }, [pedidos, filtroData, diaFiltro, mesFiltro, anoFiltro]);

  const navegarPeriodo = (dir: -1 | 1) => {
    if (filtroData === 'dia') {
      const d = new Date(anoFiltro, mesFiltro, diaFiltro + dir);
      setDiaFiltro(d.getDate()); setMesFiltro(d.getMonth()); setAnoFiltro(d.getFullYear());
    } else if (filtroData === 'mes') {
      const d = new Date(anoFiltro, mesFiltro + dir, 1);
      setMesFiltro(d.getMonth()); setAnoFiltro(d.getFullYear());
    } else if (filtroData === 'ano') {
      setAnoFiltro(a => a + dir);
    }
  };

  const matchData = (p: Pedido) => {
    if (filtroData === 'todos') return true;
    const ref = filtroTipoData === 'entrega'
      ? (p.prazoEntrega ? new Date(p.prazoEntrega) : null)
      : new Date(p.createdAt);
    if (!ref) return filtroTipoData === 'entrega' ? false : true;
    if (filtroData === 'dia') return ref.getDate() === diaFiltro && ref.getMonth() === mesFiltro && ref.getFullYear() === anoFiltro;
    if (filtroData === 'mes') return ref.getMonth() === mesFiltro && ref.getFullYear() === anoFiltro;
    return ref.getFullYear() === anoFiltro;
  };

  const pedidosPeriodo = pedidos.filter(matchData);

  const contadores = {
    todos: pedidosPeriodo.length,
    sem_cartao: pedidosPeriodo.filter(p => getStatusCartao(p) === 'sem_cartao').length,
    parcial: pedidosPeriodo.filter(p => getStatusCartao(p) === 'parcial').length,
    completo: pedidosPeriodo.filter(p => getStatusCartao(p) === 'completo').length,
  };

  const pedidosFiltrados = pedidosPeriodo.filter(p => {
    const matchBusca = p.nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
      p.numeroPedido.toLowerCase().includes(busca.toLowerCase());
    const matchCartao = filtroCartao === 'todos' || getStatusCartao(p) === filtroCartao;
    return matchBusca && matchCartao;
  });

  return (
    <KanbanLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pedidos</h1>
            <p className="text-sm text-muted-foreground">Gerencie pedidos e gere cartões de produção</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setNovoPedidoOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />Novo Pedido
            </Button>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou número do pedido..."
              value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground mr-2">Filtrar por cartões:</span>
            <Button variant={filtroCartao === 'todos' ? 'default' : 'outline'} size="sm" onClick={() => setFiltroCartao('todos')}>
              Todos ({contadores.todos})
            </Button>
            <Button variant={filtroCartao === 'sem_cartao' ? 'default' : 'outline'} size="sm"
              onClick={() => setFiltroCartao('sem_cartao')}
              className={filtroCartao === 'sem_cartao' ? 'bg-orange-500 hover:bg-orange-600' : 'border-orange-500 text-orange-600 hover:bg-orange-50'}>
              📋 Sem Cartão ({contadores.sem_cartao})
            </Button>
            <Button variant={filtroCartao === 'parcial' ? 'default' : 'outline'} size="sm"
              onClick={() => setFiltroCartao('parcial')}
              className={filtroCartao === 'parcial' ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'border-yellow-500 text-yellow-700 hover:bg-yellow-50'}>
              ⚠️ Parcial ({contadores.parcial})
            </Button>
            <Button variant={filtroCartao === 'completo' ? 'default' : 'outline'} size="sm"
              onClick={() => setFiltroCartao('completo')}
              className={filtroCartao === 'completo' ? 'bg-green-500 hover:bg-green-600' : 'border-green-500 text-green-600 hover:bg-green-50'}>
              ✅ Completo ({contadores.completo})
            </Button>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <Card className="p-5 border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-6 flex-1 flex-wrap">
              {/* KPI principal */}
              <div className="flex items-center gap-3">
                <div className="bg-green-500 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total em Pedidos</p>
                  <p className="text-3xl font-bold text-green-700">{fmtBRL(resumoFinanceiro.total)}</p>
                  <p className="text-xs text-muted-foreground">{resumoFinanceiro.label}</p>
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-green-200" />
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 p-3 rounded-xl">
                  <Package className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Pedidos</p>
                  <p className="text-3xl font-bold text-blue-700">{resumoFinanceiro.quantidade}</p>
                  <p className="text-xs text-muted-foreground">pedido{resumoFinanceiro.quantidade !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="hidden md:block w-px h-12 bg-green-200" />
              <div className="flex items-center gap-3">
                <div className="bg-amber-500 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ticket Médio</p>
                  <p className="text-3xl font-bold text-amber-700">
                    {resumoFinanceiro.quantidade > 0
                      ? fmtBRL(Math.round(resumoFinanceiro.total / resumoFinanceiro.quantidade))
                      : 'R$ 0,00'}
                  </p>
                  <p className="text-xs text-muted-foreground">por pedido</p>
                </div>
              </div>
            </div>

            {/* Filtro de data */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs text-muted-foreground mr-1">Filtrar por:</span>
                <Button size="sm" variant={filtroTipoData === 'criacao' ? 'default' : 'outline'}
                  className={`text-xs px-3 py-1 h-7 ${filtroTipoData === 'criacao' ? 'bg-green-600 hover:bg-green-700' : 'hover:bg-green-50 border-green-300'}`}
                  onClick={() => setFiltroTipoData('criacao')}>
                  📅 Criação
                </Button>
                <Button size="sm" variant={filtroTipoData === 'entrega' ? 'default' : 'outline'}
                  className={`text-xs px-3 py-1 h-7 ${filtroTipoData === 'entrega' ? 'bg-purple-600 hover:bg-purple-700' : 'hover:bg-purple-50 border-purple-300'}`}
                  onClick={() => setFiltroTipoData('entrega')}>
                  🚚 Entrega
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4 text-muted-foreground mr-1" />
                {(['todos', 'dia', 'mes', 'ano'] as FiltroData[]).map(tipo => (
                  <Button key={tipo} size="sm" variant={filtroData === tipo ? 'default' : 'outline'}
                    className={`text-xs px-3 py-1 h-7 ${filtroData === tipo ? (filtroTipoData === 'entrega' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700') : (filtroTipoData === 'entrega' ? 'hover:bg-purple-50 border-purple-300' : 'hover:bg-green-50 border-green-300')}`}
                    onClick={() => setFiltroData(tipo)}>
                    {tipo === 'todos' ? 'Todos' : tipo === 'dia' ? 'Dia' : tipo === 'mes' ? 'Mês' : 'Ano'}
                  </Button>
                ))}
              </div>
              {filtroData !== 'todos' && (
                <div className="flex items-center gap-1 justify-end">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-green-300 hover:bg-green-50"
                    onClick={() => navegarPeriodo(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm font-medium min-w-[140px] text-center text-green-800">
                    {resumoFinanceiro.label}
                  </span>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 border-green-300 hover:bg-green-50"
                    onClick={() => navegarPeriodo(1)}><ChevronRight className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700 hover:bg-green-100 px-2 ml-1"
                    onClick={() => { const n = new Date(); setDiaFiltro(n.getDate()); setMesFiltro(n.getMonth()); setAnoFiltro(n.getFullYear()); }}>
                    Hoje
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Breakdown por categoria */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Produção */}
          <Card className="p-4 border-2 border-green-200 bg-green-50/60">
            <div className="flex items-center gap-2 mb-3">
              <Shirt className="h-5 w-5 text-green-700" />
              <span className="font-semibold text-green-800">Produção</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-green-700">{resumoFinanceiro.totalPecasProducao.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">peças</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-green-700">{fmtBRL(resumoFinanceiro.valorProducao)}</p>
                <p className="text-xs text-green-600">
                  {resumoFinanceiro.totalPecasProducao > 0
                    ? `média ${fmtBRL(Math.round(resumoFinanceiro.valorProducao / resumoFinanceiro.totalPecasProducao))}/pç`
                    : 'sem itens'}
                </p>
              </div>
            </div>
          </Card>
          {/* Desenvolvimento */}
          <Card className="p-4 border-2 border-blue-200 bg-blue-50/60">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">🔬</span>
              <span className="font-semibold text-blue-800">Desenvolvimento</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-blue-700">{resumoFinanceiro.totalPecasDesenvolvimento.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">peças</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-blue-700">{fmtBRL(resumoFinanceiro.valorDesenvolvimento)}</p>
                <p className="text-xs text-blue-600">
                  {resumoFinanceiro.totalPecasDesenvolvimento > 0
                    ? `média ${fmtBRL(Math.round(resumoFinanceiro.valorDesenvolvimento / resumoFinanceiro.totalPecasDesenvolvimento))}/pç`
                    : 'sem itens'}
                </p>
              </div>
            </div>
          </Card>
          {/* Aviamento */}
          <Card className="p-4 border-2 border-amber-200 bg-amber-50/60">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="h-5 w-5 text-amber-700" />
              <span className="font-semibold text-amber-800">Aviamento</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-amber-700">{resumoFinanceiro.totalPecasAviamento.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground">peças</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-amber-700">{fmtBRL(resumoFinanceiro.valorAviamentos)}</p>
                <p className="text-xs text-amber-600">
                  {resumoFinanceiro.totalPecasAviamento > 0
                    ? `média ${fmtBRL(Math.round(resumoFinanceiro.valorAviamentos / resumoFinanceiro.totalPecasAviamento))}/pç`
                    : 'sem itens'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total de Pedidos</p><p className="text-2xl font-bold">{pedidos.length}</p></div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-yellow-600">{pedidos.filter(p => p.status === 'pendente').length}</p></div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Em Produção</p><p className="text-2xl font-bold text-blue-600">{pedidos.filter(p => p.status === 'em_producao').length}</p></div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Concluídos</p><p className="text-2xl font-bold text-green-600">{pedidos.filter(p => p.status === 'concluido').length}</p></div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>

        {/* Lista de pedidos */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="ml-4 text-muted-foreground">Carregando pedidos...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {busca ? 'Tente ajustar sua busca' : filtroCartao !== 'todos' ? 'Nenhum pedido nesta categoria' : 'Comece criando seu primeiro pedido'}
            </p>
            {filtroCartao !== 'todos' && (
              <Button variant="outline" onClick={() => setFiltroCartao('todos')} className="mr-2">Limpar Filtro</Button>
            )}
            <Button onClick={() => setNovoPedidoOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo Pedido</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {pedidosFiltrados.map(pedido => {
              const statusCartao = getStatusCartao(pedido);
              return (
                <Card key={pedido.id} className={`p-6 hover:shadow-lg transition-shadow ${getBorderColor(statusCartao)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-primary">Pedido #{pedido.numeroPedido}</h3>
                        {getStatusBadge(pedido.status)}
                        {getCartaoBadge(statusCartao)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cliente</p>
                          <p className="font-medium">{pedido.nomeCliente}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Valor Total</p>
                          <p className="font-medium text-green-600">{fmtBRL(pedido.valorTotal)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Prazo de Entrega</p>
                          <p className="font-medium">{fmtData(pedido.prazoEntrega)}</p>
                        </div>
                      </div>
                      {pedido.prazoEntrega && (() => {
                        const inicio = new Date(pedido.createdAt).getTime();
                        const fim = new Date(pedido.prazoEntrega).getTime();
                        const agora = Date.now();
                        const total = fim - inicio;
                        const pct = total > 0 ? Math.min(Math.round(((agora - inicio) / total) * 100), 100) : 100;
                        const vencido = agora > fim;
                        const diasRestantes = Math.ceil((fim - agora) / (1000 * 60 * 60 * 24));
                        const barColor = vencido ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-400' : 'bg-green-500';
                        const textColor = vencido ? 'text-red-600' : pct >= 70 ? 'text-yellow-700' : 'text-green-700';
                        const label = vencido
                          ? `Vencido há ${Math.abs(diasRestantes)} dia${Math.abs(diasRestantes) !== 1 ? 's' : ''}`
                          : diasRestantes === 0 ? 'Vence hoje!'
                          : `${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''} restante${diasRestantes !== 1 ? 's' : ''}`;
                        return (
                          <div className="mt-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs text-muted-foreground">Progresso de entrega</span>
                              <span className={`text-xs font-semibold ${textColor}`}>{label}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                              <div className={`h-2.5 rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                      {statusCartao === 'parcial' && pedido.itens && (
                        <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 px-3 py-1 rounded-md inline-block">
                          ⚠️ {pedido.itens.filter(i => i.referenciaId !== null).length} de {pedido.itens.length} itens com cartão
                        </div>
                      )}
                      {pedido.observacoes && (
                        <div className="mt-3 text-sm">
                          <p className="text-muted-foreground">Observações:</p>
                          <p>{pedido.observacoes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant={pedido.idVhsysPedido ? "outline" : "secondary"}
                        className={pedido.idVhsysPedido ? "border-green-500 text-green-700" : ""}
                        disabled={loadingErpPedidoId === pedido.id}
                        onClick={() => handleEnviarPedidoErp(pedido.id)}
                        title={pedido.idVhsysPedido ? `Pedido de venda já no ERP (ID ${pedido.idVhsysPedido}) — clique para reenviar` : "Enviar pedido de venda ao ERP"}
                      >
                        {loadingErpPedidoId === pedido.id
                          ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          : <Send className="h-3.5 w-3.5 mr-1" />}
                        {pedido.idVhsysPedido ? 'ERP ✓' : 'ERP'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => { setPedidoSelecionado(pedido.id); setDetalhesOpen(true); }}>
                        Ver Detalhes
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleExcluir(pedido.id, pedido.numeroPedido)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Dialogs */}
        <NovoPedidoDialog open={novoPedidoOpen} onOpenChange={setNovoPedidoOpen} onSuccess={carregar} />
        <DetalhesPedidoDialog
          key={pedidoSelecionado ?? ''}
          open={detalhesOpen}
          onOpenChange={setDetalhesOpen}
          pedidoId={pedidoSelecionado}
          onSuccess={carregar}
          onDeletar={handleExcluir}
        />
      </div>
    </KanbanLayout>
  );
}
