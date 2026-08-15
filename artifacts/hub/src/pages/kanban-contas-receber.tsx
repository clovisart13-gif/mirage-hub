import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, Loader2, ArrowUpCircle, CheckCircle, Pencil, Trash2, AlertCircle, Send } from 'lucide-react';

interface Cliente { id: string; nome: string; }
interface ContaReceber {
  id: string; cliente_id: string | null; referencia_id: string | null;
  descricao: string | null; valor: string; data_vencimento: string | null;
  data_recebimento: string | null; status: string; nf_numero: string | null;
  observacoes: string | null; exportado_vhsys: boolean | null; id_vhsys: string | null;
  cliente?: { id: string; nome: string } | null;
  referencia?: { id: string; codigo: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700',
  recebido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
};
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtBRL = (v: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
const isVencida = (d: string | null, status: string) =>
  status === 'pendente' && d ? new Date(d) < new Date() : false;

const EMPTY_FORM = { cliente_id: '', descricao: '', valor: '', data_vencimento: '', nf_numero: '', observacoes: '' };

export default function KanbanContasReceber() {
  const [contas, setContas] = useState<ContaReceber[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pendente');
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'novo' | 'editar' | 'receber' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [erpLoadingId, setErpLoadingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const [c, cl] = await Promise.all([
        apiFetch('/kanban/contas-a-receber'),
        apiFetch('/kanban/clientes'),
      ]);
      setContas(c); setClientes(cl);
    } catch { toast.error('Erro ao carregar contas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNovo = () => { setForm(EMPTY_FORM); setEditId(null); setDialog('novo'); };
  const openEditar = (c: ContaReceber) => {
    setForm({
      cliente_id: c.cliente_id ?? '',
      descricao: c.descricao ?? '',
      valor: c.valor,
      data_vencimento: c.data_vencimento ? c.data_vencimento.substring(0, 10) : '',
      nf_numero: c.nf_numero ?? '',
      observacoes: c.observacoes ?? '',
    });
    setEditId(c.id); setDialog('editar');
  };
  const openReceber = (c: ContaReceber) => {
    setEditId(c.id);
    setForm({ ...EMPTY_FORM, data_vencimento: new Date().toISOString().substring(0, 10) });
    setDialog('receber');
  };

  const salvar = async () => {
    if (dialog !== 'receber' && (!form.valor || Number(form.valor) <= 0)) { toast.error('Valor inválido'); return; }
    setSaving(true);
    try {
      if (dialog === 'receber' && editId) {
        await apiFetch(`/kanban/contas-a-receber/${editId}/receber`, {
          method: 'PATCH',
          body: JSON.stringify({ data_recebimento: form.data_vencimento || null }),
        });
        toast.success('Recebimento confirmado');
      } else if (dialog === 'editar' && editId) {
        const body = { cliente_id: form.cliente_id || null, descricao: form.descricao || null, valor: form.valor, data_vencimento: form.data_vencimento || null, nf_numero: form.nf_numero || null, observacoes: form.observacoes || null };
        await apiFetch(`/kanban/contas-a-receber/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.success('Conta atualizada');
      } else {
        const body = { cliente_id: form.cliente_id || null, descricao: form.descricao || null, valor: form.valor, data_vencimento: form.data_vencimento || null, nf_numero: form.nf_numero || null, observacoes: form.observacoes || null };
        await apiFetch('/kanban/contas-a-receber', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Conta criada');
      }
      setDialog(null); load();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const cancelar = async (id: string) => {
    if (!confirm('Cancelar este recebível?')) return;
    await apiFetch(`/kanban/contas-a-receber/${id}`, { method: 'DELETE' });
    toast.success('Cancelado'); load();
  };

  const handleEnviarErp = async (c: ContaReceber) => {
    setErpLoadingId(c.id);
    try {
      const result = await apiFetch(`/kanban/contas-a-receber/${c.id}/enviar-erp`, { method: 'POST' });
      toast.success(result.mensagem || 'Conta enviada ao ERP!');
      load();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar ao ERP');
    } finally {
      setErpLoadingId(null);
    }
  };

  const filtradas = contas.filter(c => {
    const ok = filterStatus === 'todos' || c.status === filterStatus;
    const s = search.toLowerCase();
    const nomeCliente = clientes.find(cl => cl.id === c.cliente_id)?.nome ?? '';
    const ok_s = !search || nomeCliente.toLowerCase().includes(s) || (c.descricao ?? '').toLowerCase().includes(s) || (c.nf_numero ?? '').includes(s);
    return ok && ok_s;
  });

  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((s, c) => s + Number(c.valor), 0);
  const totalRecebido = contas.filter(c => c.status === 'recebido').reduce((s, c) => s + Number(c.valor), 0);
  const vencidas = contas.filter(c => isVencida(c.data_vencimento, c.status)).length;

  const nomeCliente = (id: string | null) => clientes.find(c => c.id === id)?.nome ?? '—';

  return (
    <KanbanLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="w-5 h-5 text-violet-600" />
            <h1 className="text-xl font-bold">Contas a Receber</h1>
          </div>
          <Button size="sm" onClick={openNovo} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-1" /> Nova Conta
          </Button>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">A Receber</p>
            <p className="text-xl font-bold text-yellow-600">{fmtBRL(totalPendente)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Já Recebido</p>
            <p className="text-xl font-bold text-green-600">{fmtBRL(totalRecebido)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Vencidos</p>
            <p className={`text-xl font-bold ${vencidas > 0 ? 'text-red-600' : 'text-green-600'}`}>{vencidas}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8 w-60" placeholder="Buscar cliente, descrição, NF..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="recebido">Recebido</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
        ) : filtradas.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Nenhuma conta encontrada.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 font-medium">Descrição</th>
                  <th className="text-left px-4 py-3 font-medium">NF</th>
                  <th className="text-right px-4 py-3 font-medium">Valor</th>
                  <th className="text-left px-4 py-3 font-medium">Vencimento</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((c, i) => (
                  <tr key={c.id} className={`${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'} ${isVencida(c.data_vencimento, c.status) ? 'border-l-2 border-red-400' : ''}`}>
                    <td className="px-4 py-3 font-medium">{nomeCliente(c.cliente_id)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.descricao ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.nf_numero ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold">{fmtBRL(c.valor)}</td>
                    <td className="px-4 py-3">
                      {isVencida(c.data_vencimento, c.status) && <AlertCircle className="inline w-3.5 h-3.5 text-red-500 mr-1" />}
                      {fmtDate(c.data_vencimento)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[c.status]}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEnviarErp(c)}
                          disabled={erpLoadingId === c.id}
                          className={`p-1 rounded hover:bg-muted ${c.exportado_vhsys ? 'text-green-600' : 'text-violet-500'}`}
                          title={c.exportado_vhsys ? `Já enviado ao ERP${c.id_vhsys ? ` (ID ${c.id_vhsys})` : ''} — clique para reenviar` : 'Enviar ao ERP'}
                        >
                          {erpLoadingId === c.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Send className={`w-3.5 h-3.5 ${c.exportado_vhsys ? 'text-green-600' : ''}`} />}
                        </button>
                        {c.status === 'pendente' && (
                          <button onClick={() => openReceber(c)} className="p-1 rounded hover:bg-muted" title="Marcar recebido">
                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                          </button>
                        )}
                        {c.status !== 'cancelado' && (
                          <button onClick={() => openEditar(c)} className="p-1 rounded hover:bg-muted">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                        {c.status !== 'cancelado' && (
                          <button onClick={() => cancelar(c.id)} className="p-1 rounded hover:bg-muted">
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog Nova/Editar */}
      <Dialog open={dialog === 'novo' || dialog === 'editar'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'novo' ? 'Nova Conta a Receber' : 'Editar Conta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Cliente</Label>
              <Select value={form.cliente_id || '_'} onValueChange={v => setForm(f => ({ ...f, cliente_id: v === '_' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Sem cliente</SelectItem>
                  {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Faturamento OP 001" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (R$) *</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Número da NF</Label>
              <Input value={form.nf_numero} onChange={e => setForm(f => ({ ...f, nf_numero: e.target.value }))} placeholder="00000" />
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Receber */}
      <Dialog open={dialog === 'receber'} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Recebimento</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-muted-foreground">Informe a data do recebimento:</p>
            <div>
              <Label>Data do Recebimento</Label>
              <Input type="date" value={form.data_vencimento} onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="bg-green-600 hover:bg-green-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
