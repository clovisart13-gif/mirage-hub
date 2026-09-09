import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, getActiveTenantId } from '@/lib/api';
import { useMe } from '@/hooks/useMe';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, CheckCircle2, FileText, Loader2, LockKeyhole, Plus, Printer, RotateCcw, Search, ShieldAlert, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type Produto = { referencia_id: string; item_id?: string; referencia: string; descricao?: string | null; quantidade_corte: number; valor_unitario_cents: number; total_cents: number };
type Pedido = { id: string; numero?: string | null; numero_pedido?: string | null };
type Cliente = { nome?: string | null; cnpj?: string | null; endereco?: string | null; contato?: string | null; email?: string | null; telefone?: string | null };
type Elegivel = { pedido: Pedido; cliente: Cliente; produtos: Produto[] };
type Ajuste = { id: string; tipo: 'signal' | 'discount' | 'addition'; descricao: string; valor_cents: number; source?: 'order' | 'manual'; origem?: 'pedido' | 'manual' };
type PreAgendamento = { id: string; numero?: string | number; status: 'active' | 'reverted' | 'finalized'; criado_em?: string; pedido: Pedido; cliente: Cliente; produtos: Produto[]; ajustes?: Ajuste[] };
type Empresa = { nome_empresa?: string; logo_url?: string; cnpj?: string; pix?: string };
type DiagnosticoProduto = { referencia_id: string; referencia: string; descricao?: string | null; fase_atual: string; quantidade_atual: number; quantidade_cortada: number; tem_saida_corte: boolean; bloqueado_pre_ativo: boolean; elegivel: boolean; pode_corrigir_marco_corte: boolean; motivos: string[] };
type Diagnostico = { pedido: { id: string; numero: string; cliente?: string | null }; produtos: DiagnosticoProduto[] };
type Correcao = { produto: DiagnosticoProduto; quantidade: string };

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const orderNumber = (pedido: Pedido) => pedido.numero ?? pedido.numero_pedido ?? pedido.id;
const isOrderAdjustment = (a: Ajuste) => a.source === 'order' || a.origem === 'pedido';
const isReverted = (status: PreAgendamento['status']) => status === 'reverted';
const adjustmentName = (tipo: Ajuste['tipo']) => ({ signal: 'Sinal', discount: 'Desconto', addition: 'Acréscimo' }[tipo] ?? tipo);
const apiErrorMessage = (error: unknown, fallback: string) => {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message);
    return parsed.error || fallback;
  } catch {
    return error.message || fallback;
  }
};

export default function KanbanPreAgendamento() {
  const client = useQueryClient();
  const { tenants } = useMe();
  const activeTenantId = getActiveTenantId();
  const canManageTenant = tenants.some(membership =>
    membership.tenant_id === activeTenantId
    && (membership.role === 'owner' || membership.role === 'admin')
  );
  const [clientFilter, setClientFilter] = useState('');
  const [orderFilter, setOrderFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [document, setDocument] = useState<PreAgendamento | null>(null);
  const [reverting, setReverting] = useState<PreAgendamento | null>(null);
  const [newType, setNewType] = useState<Ajuste['tipo']>('addition');
  const [newDescription, setNewDescription] = useState('');
  const [newValue, setNewValue] = useState('');
  const [diagnosticOrder, setDiagnosticOrder] = useState('');
  const [diagnostic, setDiagnostic] = useState<Diagnostico | null>(null);
  const [correction, setCorrection] = useState<Correcao | null>(null);

  const eligibleQuery = useQuery<Elegivel[]>({ queryKey: ['pre-agendamentos', 'eligiveis'], queryFn: () => apiFetch('/kanban/pre-agendamentos/eligiveis') });
  const listQuery = useQuery<PreAgendamento[]>({ queryKey: ['pre-agendamentos'], queryFn: () => apiFetch('/kanban/pre-agendamentos') });
  const empresaQuery = useQuery<Empresa>({ queryKey: ['empresa'], queryFn: () => apiFetch('/tenants/empresa'), staleTime: 600000 });
  const refresh = () => client.invalidateQueries({ queryKey: ['pre-agendamentos'] });

  const createMutation = useMutation({
    mutationFn: (group: Elegivel) => apiFetch('/kanban/pre-agendamentos', { method: 'POST', body: JSON.stringify({ pedido_id: group.pedido.id, referencia_ids: group.produtos.filter(p => selected.has(`${group.pedido.id}:${p.referencia_id}`)).map(p => p.referencia_id), ajustes: [] }) }),
    onSuccess: data => { setDocument(data); setSelected(new Set()); refresh(); toast.success('Pré-agendamento criado'); },
    onError: () => toast.error('Não foi possível criar o pré-agendamento'),
  });
  const adjustmentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Omit<Ajuste, 'id'> }) => apiFetch(`/kanban/pre-agendamentos/${id}/ajustes`, { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: data => { setDocument(data); refresh(); setNewDescription(''); setNewValue(''); toast.success('Ajuste adicionado'); },
    onError: () => toast.error('Não foi possível adicionar o ajuste'),
  });
  const deleteAdjustment = useMutation({
    mutationFn: ({ id, adjustmentId }: { id: string; adjustmentId: string }) => apiFetch(`/kanban/pre-agendamentos/${id}/ajustes/${adjustmentId}`, { method: 'DELETE' }),
    onSuccess: data => { setDocument(data); refresh(); toast.success('Ajuste removido'); },
    onError: () => toast.error('Não foi possível remover o ajuste'),
  });
  const revertMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/kanban/pre-agendamentos/${id}/reverter`, { method: 'POST' }),
    onSuccess: () => { setReverting(null); setDocument(null); refresh(); toast.success('Pré-agendamento revertido; produtos voltaram aos elegíveis'); },
    onError: () => toast.error('Não foi possível reverter o pré-agendamento'),
  });
  const diagnosticMutation = useMutation({
    mutationFn: (pedidoNumero: string) => apiFetch(`/kanban/pre-agendamentos/diagnostico?pedido_numero=${encodeURIComponent(pedidoNumero)}`),
    onSuccess: data => setDiagnostic(data),
    onError: error => { setDiagnostic(null); toast.error(apiErrorMessage(error, 'Não foi possível verificar o pedido')); },
  });
  const repairCutMutation = useMutation({
    mutationFn: ({ referenciaId, quantidade }: { referenciaId: string; quantidade: number }) => apiFetch(`/kanban/referencias/${referenciaId}/corrigir-marco-corte`, {
      method: 'POST',
      body: JSON.stringify({
        quantidade_cortada: quantidade,
        motivo: `Correção administrativa solicitada no pré-agendamento do pedido ${diagnostic?.pedido.numero ?? ''}`,
      }),
    }),
    onSuccess: data => {
      setCorrection(null);
      refresh();
      if (diagnosticOrder.trim()) diagnosticMutation.mutate(diagnosticOrder.trim());
      toast.success(data.inserted ? 'Marco do Corte corrigido' : 'O marco do Corte já estava corrigido');
    },
    onError: error => toast.error(apiErrorMessage(error, 'Não foi possível corrigir o marco do Corte')),
  });

  const eligible = useMemo(() => (eligibleQuery.data ?? []).filter(g =>
    (!clientFilter || (g.cliente.nome ?? '').toLowerCase().includes(clientFilter.toLowerCase())) &&
    (!orderFilter || orderNumber(g.pedido).toLowerCase().includes(orderFilter.toLowerCase()))
  ), [eligibleQuery.data, clientFilter, orderFilter]);

  const openDocument = async (item: PreAgendamento) => {
    try { setDocument(await apiFetch(`/kanban/pre-agendamentos/${item.id}`)); } catch { toast.error('Não foi possível carregar o documento'); }
  };
  const toggleGroup = (group: Elegivel, checked: boolean) => setSelected(old => {
    const next = new Set(old);
    group.produtos.forEach(p => checked ? next.add(`${group.pedido.id}:${p.referencia_id}`) : next.delete(`${group.pedido.id}:${p.referencia_id}`));
    return next;
  });

  const products = document?.produtos ?? [];
  const adjustments = document?.ajustes ?? [];
  const subtotal = products.reduce((sum, p) => sum + p.total_cents, 0);
  const total = adjustments.reduce((sum, a) => sum + (a.tipo === 'addition' ? a.valor_cents : -a.valor_cents), subtotal);

  return <KanbanLayout><div className="min-h-full bg-slate-50">
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b bg-white/95 px-6 py-4 print:hidden">
      <div><h1 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-5 w-5 text-violet-600" />Pré-agendamentos</h1><p className="text-sm text-muted-foreground">Selecione itens liberados no corte e gere o documento financeiro.</p></div>
      {document && <Button variant="outline" onClick={() => window.print()} data-testid="button-print-doc"><Printer className="mr-2 h-4 w-4" />Imprimir / PDF</Button>}
    </header>
    {document ? <DocumentView document={document} empresa={empresaQuery.data} adjustments={adjustments} subtotal={subtotal} total={total} newType={newType} newDescription={newDescription} newValue={newValue} setNewType={setNewType} setNewDescription={setNewDescription} setNewValue={setNewValue} onClose={() => setDocument(null)} onAdd={() => {
      const value = Math.round(Number(newValue.replace(',', '.')) * 100);
      if (!newDescription.trim() || !Number.isFinite(value) || value <= 0) {
        toast.error('Informe descrição e valor do ajuste');
        return;
      }
      adjustmentMutation.mutate({ id: document.id, payload: { tipo: newType, descricao: newDescription.trim(), valor_cents: value } });
    }} onRemove={(adjustmentId: string) => deleteAdjustment.mutate({ id: document.id, adjustmentId })} onRevert={() => setReverting(document)} saving={adjustmentMutation.isPending || deleteAdjustment.isPending} />
    : <main className="space-y-7 p-6">
      {canManageTenant && <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-amber-700" /><div><h2 className="font-semibold">Diagnóstico administrativo</h2><p className="text-sm text-muted-foreground">Localize pedidos que não aparecem por ausência do marco obrigatório do Corte.</p></div></div>
        <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Número do pedido para diagnóstico" placeholder="Ex.: PED-2026-0039" value={diagnosticOrder} onChange={e => setDiagnosticOrder(e.target.value)} /><Button variant="outline" disabled={!diagnosticOrder.trim() || diagnosticMutation.isPending} onClick={() => diagnosticMutation.mutate(diagnosticOrder.trim())}>{diagnosticMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}Verificar pedido</Button></div>
        {diagnostic && <div className="mt-4 space-y-3"><div className="text-sm"><strong>{diagnostic.pedido.numero}</strong> · {diagnostic.pedido.cliente || 'Cliente não informado'}</div>{diagnostic.produtos.map(produto => <div key={produto.referencia_id} className="rounded-lg border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono font-semibold">{produto.referencia}</div><p className="text-sm text-muted-foreground">Fase atual: {produto.fase_atual} · Quantidade atual: {produto.quantidade_atual} · Corte registrado: {produto.quantidade_cortada}</p>{produto.motivos.map(motivo => <p key={motivo} className="mt-1 text-sm text-amber-800">• {motivo}</p>)}</div>{produto.pode_corrigir_marco_corte && <Button size="sm" onClick={() => setCorrection({ produto, quantidade: produto.quantidade_cortada > 0 ? String(produto.quantidade_cortada) : '' })}>Corrigir marco do Corte</Button>}{produto.elegivel && <Badge className="bg-emerald-100 text-emerald-800">Elegível</Badge>}</div></div>)}</div>}
      </section>}
      <section className="rounded-xl border bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><h2 className="font-semibold">Produtos elegíveis</h2></div>
        <div className="mb-5 grid gap-3 sm:grid-cols-2"><Input aria-label="Filtrar por cliente" data-testid="input-filter-client" placeholder="Filtrar por cliente" value={clientFilter} onChange={e => setClientFilter(e.target.value)} /><Input aria-label="Filtrar por pedido" data-testid="input-filter-order" placeholder="Filtrar por pedido" value={orderFilter} onChange={e => setOrderFilter(e.target.value)} /></div>
        {eligibleQuery.isLoading ? <Loading /> : eligibleQuery.isError ? <ErrorState onRetry={() => eligibleQuery.refetch()} /> : eligible.length === 0 ? <Empty text={eligibleQuery.data?.length ? 'Nenhum produto corresponde aos filtros.' : 'Não há produtos elegíveis para pré-agendamento.'} /> : <div className="space-y-4">{eligible.map(group => {
          const keys = group.produtos.map(p => `${group.pedido.id}:${p.referencia_id}`); const all = keys.every(k => selected.has(k));
          return <div key={group.pedido.id} className="overflow-hidden rounded-lg border" data-testid={`eligible-order-${group.pedido.id}`}><div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 px-4 py-3"><div><strong>{group.cliente.nome || 'Cliente não informado'}</strong><span className="ml-2 font-mono text-sm text-muted-foreground">Pedido {orderNumber(group.pedido)}</span></div><label className="flex items-center gap-2 text-sm"><input aria-label={`Selecionar todos do pedido ${orderNumber(group.pedido)}`} type="checkbox" checked={all} onChange={e => toggleGroup(group, e.target.checked)} />Selecionar todos</label></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="w-10 p-3" /><th className="p-3">Referência</th><th className="p-3">Descrição</th><th className="p-3 text-right">Qtd. corte</th><th className="p-3 text-right">Total</th></tr></thead><tbody>{group.produtos.map(p => { const key = `${group.pedido.id}:${p.referencia_id}`; return <tr key={key} className="border-b last:border-0"><td className="p-3 text-center"><input aria-label={`Selecionar ${p.referencia}`} type="checkbox" checked={selected.has(key)} onChange={e => setSelected(old => { const next = new Set(old); e.target.checked ? next.add(key) : next.delete(key); return next; })} /></td><td className="p-3 font-mono font-medium">{p.referencia}</td><td className="p-3">{p.descricao || '—'}</td><td className="p-3 text-right">{p.quantidade_corte}</td><td className="p-3 text-right font-medium">{brl(p.total_cents)}</td></tr>; })}</tbody></table></div>
            <div className="flex justify-end border-t bg-slate-50 p-3"><Button disabled={!keys.some(k => selected.has(k)) || createMutation.isPending} onClick={() => createMutation.mutate(group)} data-testid={`button-create-${group.pedido.id}`}>{createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Criar pré-agendamento</Button></div></div>;
        })}</div>}</section>
      <section className="rounded-xl border bg-white p-5 shadow-sm"><h2 className="mb-4 font-semibold">Pré-agendamentos existentes</h2>{listQuery.isLoading ? <Loading /> : listQuery.isError ? <ErrorState onRetry={() => listQuery.refetch()} /> : (listQuery.data?.length ?? 0) === 0 ? <Empty text="Nenhum pré-agendamento criado." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left text-muted-foreground"><tr><th className="p-3">Número</th><th className="p-3">Cliente</th><th className="p-3">Pedido</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>{listQuery.data!.map(item => <tr key={item.id} className="border-b last:border-0"><td className="p-3 font-mono">{item.numero ?? item.id}</td><td className="p-3">{item.cliente?.nome || '—'}</td><td className="p-3">{item.pedido ? orderNumber(item.pedido) : '—'}</td><td className="p-3"><Badge className={isReverted(item.status) ? 'bg-slate-100 text-slate-700' : 'bg-violet-100 text-violet-800'}>{isReverted(item.status) ? 'Revertido' : item.status === 'finalized' ? 'Finalizado' : 'Ativo'}</Badge></td><td className="p-3 text-right"><Button size="sm" variant="outline" onClick={() => openDocument(item)} data-testid={`button-open-pre-${item.id}`}>Abrir documento</Button></td></tr>)}</tbody></table></div>}</section>
    </main>}
    <AlertDialog open={!!reverting} onOpenChange={open => !open && setReverting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reverter pré-agendamento?</AlertDialogTitle><AlertDialogDescription>Os produtos retornarão à lista de elegíveis e o documento ficará marcado como revertido.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => reverting && revertMutation.mutate(reverting.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{revertMutation.isPending ? 'Revertendo...' : 'Reverter'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={!!correction} onOpenChange={open => !open && setCorrection(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Corrigir marco obrigatório do Corte?</AlertDialogTitle><AlertDialogDescription>Esta ação registra o histórico ausente sem mudar a fase atual e sem gerar custos, contas ou integrações externas.</AlertDialogDescription></AlertDialogHeader>{correction && <div className="space-y-2"><Label htmlFor="cut-quantity">Quantidade concluída no Corte</Label><Input id="cut-quantity" type="number" min="1" step="1" value={correction.quantidade} onChange={e => setCorrection({ ...correction, quantidade: e.target.value })} /><p className="text-sm text-muted-foreground">Referência {correction.produto.referencia} · fase atual {correction.produto.fase_atual}</p></div>}<AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction disabled={repairCutMutation.isPending || !correction || !Number.isSafeInteger(Number(correction.quantidade)) || Number(correction.quantidade) <= 0} onClick={() => correction && repairCutMutation.mutate({ referenciaId: correction.produto.referencia_id, quantidade: Number(correction.quantidade) })}>{repairCutMutation.isPending ? 'Corrigindo...' : 'Confirmar correção'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div></KanbanLayout>;
}

function DocumentView(props: any) {
  const { document, empresa, adjustments, subtotal, total } = props;
  const active = document.status === 'active';
  const pix = String(empresa?.pix ?? '').trim();

  return (
    <main className="p-6 print:p-0">
      <div className="mx-auto max-w-[210mm] border bg-white shadow-sm print:w-full print:max-w-none print:border-0 print:shadow-none" data-testid="document-container">
        <div className="flex justify-between border-b-4 border-violet-900 bg-slate-50 p-8 print:bg-white">
          <div>
            {empresa?.logo_url ? <img src={empresa.logo_url} alt={empresa.nome_empresa || 'Logo da empresa'} className="h-12 w-auto object-contain" /> : <strong className="text-xl">{empresa?.nome_empresa || 'Empresa'}</strong>}
            <p className="mt-3 text-xs text-muted-foreground">{empresa?.nome_empresa}{empresa?.cnpj ? ` · CNPJ ${empresa.cnpj}` : ''}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black">PRÉ-AGENDAMENTO</h2>
            <p className="font-mono font-bold text-violet-700">{document.numero ?? document.id}</p>
            <p className="mt-2 text-sm"><Calendar className="mr-1 inline h-4 w-4" />{new Date(document.criado_em ?? Date.now()).toLocaleDateString('pt-BR')}</p>
            <Badge className={active ? 'mt-3 bg-violet-100 text-violet-800' : 'mt-3 bg-slate-100 text-slate-700'}>{active ? 'Ativo' : 'Revertido'}</Badge>
          </div>
        </div>

        <div className="space-y-7 p-8 print:p-5">
          <section className="rounded-lg border bg-slate-50 p-5">
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Cliente / Pedido</h3>
            <strong data-testid="text-client-name">{document.cliente?.nome || '—'}</strong>
            <p className="text-sm text-muted-foreground">Pedido {document.pedido ? orderNumber(document.pedido) : '—'} {document.cliente?.cnpj ? `· CNPJ ${document.cliente.cnpj}` : ''}</p>
          </section>

          <section>
            <h3 className="mb-3 text-xs font-bold uppercase text-muted-foreground">Produtos liberados pela fase Corte</h3>
            <table className="w-full text-sm" data-testid="table-products">
              <thead className="border-y bg-slate-50 text-left"><tr><th className="p-3">Referência</th><th className="p-3">Descrição</th><th className="p-3 text-right">Qtd.</th><th className="p-3 text-right">Unitário</th><th className="p-3 text-right">Subtotal</th></tr></thead>
              <tbody>{document.produtos.map((p: Produto) => <tr key={p.referencia_id} className="border-b"><td className="p-3 font-mono">{p.referencia}</td><td className="p-3">{p.descricao || '—'}</td><td className="p-3 text-right">{p.quantidade_corte}</td><td className="p-3 text-right">{brl(p.valor_unitario_cents)}</td><td className="p-3 text-right font-semibold">{brl(p.total_cents)}</td></tr>)}</tbody>
            </table>
          </section>

          <div className="grid gap-7 md:grid-cols-2 print:grid-cols-2">
            <section className="space-y-3 print:hidden">
              <h3 className="font-semibold">Ajustes financeiros</h3>
              {adjustments.map((a: Ajuste) => <div key={a.id} className="flex items-center justify-between rounded border p-3"><div><Badge variant="secondary">{adjustmentName(a.tipo)}</Badge>{isOrderAdjustment(a) && <span className="ml-2 text-xs text-muted-foreground"><LockKeyhole className="mr-1 inline h-3 w-3" />Do pedido</span>}<p className="mt-1 text-sm">{a.descricao}</p></div><div className="flex items-center gap-2 font-semibold">{brl(a.valor_cents)} {!isOrderAdjustment(a) && active && <Button size="icon" variant="ghost" aria-label={`Remover ${a.descricao}`} onClick={() => props.onRemove(a.id)}><Trash2 className="h-4 w-4" /></Button>}</div></div>)}
              {active && <div className="rounded border border-dashed p-3"><div className="grid gap-2 sm:grid-cols-3"><select aria-label="Tipo de ajuste" value={props.newType} onChange={e => props.setNewType(e.target.value)} className="rounded border px-2"><option value="addition">Acréscimo</option><option value="discount">Desconto</option><option value="signal">Sinal</option></select><Input aria-label="Descrição do ajuste" placeholder="Descrição obrigatória" value={props.newDescription} onChange={(e: any) => props.setNewDescription(e.target.value)} /><Input aria-label="Valor do ajuste" type="number" min="0.01" step="0.01" placeholder="Valor (R$)" value={props.newValue} onChange={(e: any) => props.setNewValue(e.target.value)} /></div><Button className="mt-2" size="sm" onClick={props.onAdd} disabled={props.saving || !props.newDescription.trim()}><Plus className="mr-1 h-4 w-4" />Adicionar ajuste</Button></div>}
            </section>
            <section className="rounded-lg border bg-slate-50 p-5 print:col-start-2">
              <div className="flex justify-between"><span>Subtotal dos produtos</span><strong>{brl(subtotal)}</strong></div>
              {adjustments.map((a: Ajuste) => <div key={`total-${a.id}`} className="mt-2 flex justify-between text-sm"><span>{a.tipo === 'addition' ? '(+)' : '(-)'} {a.descricao}</span><span>{a.tipo === 'addition' ? '+' : '-'}{brl(a.valor_cents)}</span></div>)}
              <div className="mt-4 flex justify-between border-t pt-4 text-lg font-bold"><span>Total a pagar</span><span className="text-violet-700" data-testid="text-total-due">{brl(Math.max(0, total))}</span></div>
            </section>
          </div>

          <section className="break-inside-avoid rounded-lg border border-violet-200 bg-violet-50/50 p-5" data-testid="section-pix">
            <h3 className="mb-4 text-xs font-bold uppercase text-violet-900">Pagamento via PIX</h3>
            {pix ? (
              <div className="flex items-center gap-5">
                <div className="shrink-0 rounded bg-white p-2"><QRCodeSVG value={pix} size={112} level="M" includeMargin={false} title="QR Code PIX" /></div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code ou use a chave abaixo:</p>
                  <p className="mt-2 break-all font-mono text-sm font-semibold text-slate-900" data-testid="text-pix-key">{pix}</p>
                  <p className="mt-3 text-sm font-bold text-violet-800">Valor: {brl(Math.max(0, total))}</p>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">Chave PIX não configurada para esta empresa.</p>}
          </section>

          {active && <div className="flex justify-between border-t pt-5 print:hidden"><Button variant="outline" onClick={props.onClose}>Voltar à lista</Button><Button variant="destructive" onClick={props.onRevert}><RotateCcw className="mr-2 h-4 w-4" />Reverter</Button></div>}
          {!active && <Button variant="outline" className="print:hidden" onClick={props.onClose}>Voltar à lista</Button>}
          <p className="text-center text-xs text-muted-foreground"><CheckCircle2 className="mr-1 inline h-3 w-3" />Documento gerado por {empresa?.nome_empresa || 'Mirage Hub'}</p>
        </div>
      </div>
    </main>
  );
}
function Loading() { return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>; }
function Empty({ text }: { text: string }) { return <p className="py-10 text-center text-sm text-muted-foreground">{text}</p>; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="py-10 text-center"><p className="text-sm text-destructive">Não foi possível carregar os dados.</p><Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Tentar novamente</Button></div>; }