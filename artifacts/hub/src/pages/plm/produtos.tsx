import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { apiFetch, getActiveTenantId } from '@/lib/api';
import { useMe } from '@/hooks/useMe';
import { toast } from 'sonner';
import { Plus, Search, Package, ArrowRight, Calendar, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  desenvolvimento: { label: 'Desenvolvimento', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  pilotagem: { label: 'Pilotagem', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  aprovado: { label: 'Aprovado', className: 'bg-green-50 text-green-700 border-green-200' },
} as const;

const CATEGORIA_LABEL: Record<string, string> = {
  camiseta: 'Camiseta', camisa: 'Camisa', calca: 'Calça', short: 'Short',
  vestido: 'Vestido', saia: 'Saia', jaqueta: 'Jaqueta', casaco: 'Casaco',
  blusa: 'Blusa', moletom: 'Moletom', macacao: 'Macacão', outro: 'Outro',
};

function DialogFichasLote({ open, onOpenChange, selections, onComplete }: any) {
  const { data: preview, isLoading } = useQuery({
    queryKey: ['lote-preview', 'fichas', selections],
    queryFn: () => apiFetch('/plm/lote/preview', {
      method: 'POST',
      body: JSON.stringify({ operation: 'fichas', selections })
    }),
    enabled: open && selections.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () => {
       const finalSelections = preview?.items
         ?.filter((d: any) => d.status === 'apto')
         .map((d: any) => ({
           produto_id: d.produto_id
         })) || selections;
       return apiFetch('/plm/lote/fichas', {
         method: 'POST',
         body: JSON.stringify({ selections: finalSelections })
       });
    },
    onSuccess: onComplete,
    onError: (err: any) => toast.error(err.message || 'Erro ao criar fichas')
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Fichas Técnicas em Lote</DialogTitle>
          <DialogDescription>Pré-visualização da criação de fichas técnicas para os itens selecionados</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
             <div className="grid grid-cols-3 gap-4 text-center">
               <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700">{preview.aptos ?? 0}</div>
                 <div className="text-xs text-green-600 uppercase tracking-wider font-semibold mt-1">Elegíveis</div>
               </div>
               <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <div className="text-3xl font-bold text-amber-700">{preview.existentes ?? 0}</div>
                 <div className="text-xs text-amber-600 uppercase tracking-wider font-semibold mt-1">Já existem</div>
               </div>
               <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <div className="text-3xl font-bold text-red-700">{preview.bloqueados ?? 0}</div>
                 <div className="text-xs text-red-600 uppercase tracking-wider font-semibold mt-1">Bloqueadas</div>
               </div>
             </div>
              {preview.items && preview.items.length > 0 && (
               <div className="border rounded-xl overflow-hidden">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-muted border-b">
                     <tr>
                       <th className="px-4 py-3 font-semibold text-muted-foreground">Produto</th>
                       <th className="px-4 py-3 font-semibold text-muted-foreground w-32">Status</th>
                       <th className="px-4 py-3 font-semibold text-muted-foreground">Motivo</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                      {preview.items.map((d: any, i: number) => (
                        <tr key={i} className={d.status === 'apto' ? 'bg-background' : 'bg-muted/30 text-muted-foreground'}>
                          <td className="px-4 py-3 font-medium">{d.produto_nome || `Produto #${d.produto_id}`}</td>
                         <td className="px-4 py-3">
                            {d.status === 'apto' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">Elegível</span>}
                            {d.status === 'existente' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">Existente</span>}
                            {d.status === 'bloqueado' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">Bloqueado</span>}
                         </td>
                          <td className="px-4 py-3 text-xs">{d.motivo || '-'}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">Não foi possível carregar a pré-visualização.</div>
        )}
        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>Cancelar</Button>
          <Button
            disabled={!preview || preview.aptos === 0 || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending ? 'Criando...' : `Confirmar Criação (${preview?.aptos ?? 0})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogPilotosLote({ open, onOpenChange, selections, onComplete }: any) {
  const [processoId, setProcessoId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  const [tamanhoGlobal, setTamanhoGlobal] = useState('');
  const [tamanhos, setTamanhos] = useState<Record<number, string>>({});

  const { data: processos } = useQuery({
    queryKey: ['plm-processos'],
    queryFn: () => apiFetch('/plm/processos'),
    enabled: open,
  });

  const { data: preview, isLoading } = useQuery({
    queryKey: ['lote-preview', 'pilotos', selections],
    queryFn: () => apiFetch('/plm/lote/preview', {
      method: 'POST',
      body: JSON.stringify({ operation: 'pilotos', selections })
    }),
    enabled: open && selections.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () => {
       const finalSelections = preview?.items
         ?.filter((d: any) => d.status === 'apto')
         .map((d: any) => ({
           produto_id: d.produto_id,
           tamanho_piloto: tamanhos[d.produto_id] || tamanhoGlobal || 'M'
         })) || [];
       return apiFetch('/plm/lote/pilotos', {
         method: 'POST',
         body: JSON.stringify({ selections: finalSelections, processo_id: Number(processoId), data_inicio: dataInicio, data_prevista: dataPrevista })
       });
    },
    onSuccess: onComplete,
    onError: (err: any) => toast.error(err.message || 'Erro ao criar pilotos')
  });

  const allEligibleFilled = preview?.items
    ?.filter((d: any) => d.status === 'apto')
    .every((d: any) => !!tamanhos[d.produto_id] || !!tamanhoGlobal) ?? true;

  const canSubmit = preview?.aptos > 0 && processoId && dataInicio && dataPrevista && allEligibleFilled;

  const aplicarTamanhoTodos = () => {
    if (!tamanhoGlobal.trim()) return;
    const proximos = { ...tamanhos };
    for (const item of preview?.items ?? []) {
      if (item.status === 'apto') {
        proximos[item.produto_id] = tamanhoGlobal;
      }
    }
    setTamanhos(proximos);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Pilotos em Lote</DialogTitle>
          <DialogDescription>Configure o processo e as datas compartilhadas para todos os pilotos elegíveis.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-muted/30 p-4 rounded-xl border">
          <div className="space-y-2">
            <Label>Processo Compartilhado</Label>
            <Select value={processoId} onValueChange={setProcessoId}>
              <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {processos?.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Data Prevista</Label>
            <Input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="bg-background" />
          </div>
          <div className="space-y-2">
            <Label>Aplicar tamanho a todos</Label>
            <div className="flex gap-2">
              <Input placeholder="Tamanho (ex: M)" value={tamanhoGlobal} onChange={e => setTamanhoGlobal(e.target.value)} className="bg-background" />
              <Button variant="secondary" onClick={aplicarTamanhoTodos}>Aplicar</Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-8 space-y-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : preview ? (
          <div className="space-y-4">
             <div className="grid grid-cols-3 gap-4 text-center">
               <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <div className="text-3xl font-bold text-green-700">{preview.aptos ?? 0}</div>
                 <div className="text-xs text-green-600 uppercase tracking-wider font-semibold mt-1">Elegíveis</div>
               </div>
               <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <div className="text-3xl font-bold text-amber-700">{preview.existentes ?? 0}</div>
                 <div className="text-xs text-amber-600 uppercase tracking-wider font-semibold mt-1">Já existem</div>
               </div>
               <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                  <div className="text-3xl font-bold text-red-700">{preview.bloqueados ?? 0}</div>
                 <div className="text-xs text-red-600 uppercase tracking-wider font-semibold mt-1">Bloqueadas</div>
               </div>
             </div>

              {preview.items && preview.items.length > 0 && (
               <div className="border rounded-xl overflow-hidden">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-muted border-b">
                     <tr>
                       <th className="px-4 py-3 font-semibold text-muted-foreground">Produto</th>
                       <th className="px-4 py-3 font-semibold text-muted-foreground w-32">Status</th>
                       <th className="px-4 py-3 font-semibold text-muted-foreground w-40">Tamanho Piloto</th>
                       <th className="px-4 py-3 font-semibold text-muted-foreground">Motivo</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y">
                      {preview.items.map((d: any, i: number) => {
                       return (
                          <tr key={i} className={d.status === 'apto' ? 'bg-background' : 'bg-muted/30 text-muted-foreground'}>
                            <td className="px-4 py-3 font-medium">{d.produto_nome || `Produto #${d.produto_id}`}</td>
                           <td className="px-4 py-3">
                              {d.status === 'apto' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">Elegível</span>}
                              {d.status === 'existente' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-700">Existente</span>}
                              {d.status === 'bloqueado' && <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">Bloqueado</span>}
                           </td>
                           <td className="px-4 py-2">
                              {d.status === 'apto' ? (
                               <Input
                                 className="h-8 bg-background"
                                 placeholder="ex: M"
                                 value={tamanhos[d.produto_id] || ''}
                                 onChange={e => setTamanhos(p => ({...p, [d.produto_id]: e.target.value}))}
                               />
                             ) : '-'}
                           </td>
                            <td className="px-4 py-3 text-xs">{d.motivo || '-'}</td>
                         </tr>
                       );
                     })}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        ) : null}

        <DialogFooter className="mt-6 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={createMutation.isPending}>Cancelar</Button>
          <Button
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {createMutation.isPending ? 'Criando...' : `Confirmar Criação (${preview?.aptos ?? 0})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PLMProdutos() {
  const queryClient = useQueryClient();
  const { isSuperAdmin, tenants } = useMe();
  const activeTenantId = getActiveTenantId();
  const isR2pbTenant = tenants.some((membership) =>
    membership.tenant_id === activeTenantId
    && membership.tenants?.slug?.trim().toLowerCase() === 'r2pb'
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clienteFilter, setClienteFilter] = useState('todos');
  const [pedidoFilter, setPedidoFilter] = useState('todos');
  const [techFilter, setTechFilter] = useState('todos');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState('');

  const [selectedProdutoIds, setSelectedProdutoIds] = useState<number[]>([]);
  const [loteFichasOpen, setLoteFichasOpen] = useState(false);
  const [lotePilotosOpen, setLotePilotosOpen] = useState(false);

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  const { data: pedidosApi } = useQuery({
    queryKey: ['plm-pedidos', clienteFilter],
    queryFn: () => apiFetch(`/plm/pedidos${clienteFilter !== 'todos' ? `?cliente_central_id=${clienteFilter}` : ''}`),
  });

  const resetPlm = useMutation({
    mutationFn: () => {
      const tenantId = getActiveTenantId();
      if (!tenantId) throw new Error('Selecione o tenant R2PB antes de continuar');
      return apiFetch('/plm/admin/reset-from-approved-budgets', {
        method: 'POST',
        body: JSON.stringify({ confirmacao: resetConfirmation, tenant_id: tenantId }),
      });
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['plm-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['plm-clientes'] });
      queryClient.invalidateQueries({ queryKey: ['plm-pilotos'] });
      queryClient.invalidateQueries({ queryKey: ['plm-fichas'] });
      setResetOpen(false);
      setResetConfirmation('');
      const createdClients = result.createdCentralClients?.length ?? 0;
      toast.success(
        `${result.rebuiltProducts} produto(s) reconstruído(s) de ${result.firstReference ?? '—'} até ${result.lastReference ?? '—'}.`
        + (createdClients > 0 ? ` ${createdClients} cliente(s) central(is) criado(s).` : ''),
      );
    },
    onError: (error: any) => toast.error(error?.message || 'Não foi possível reiniciar o PLM'),
  });

  const filtered = useMemo(() => {
    if (!produtos) return [];
    return produtos.filter(({ produto, cliente, pedidos, ficha_tecnica_id, total_pilotos }: any) => {
      const termo = search.toLowerCase();
      const matchSearch = !search
        || produto.nome.toLowerCase().includes(termo)
        || (produto.referencia ?? '').toLowerCase().includes(termo)
        || (produto.referencia_cliente ?? '').toLowerCase().includes(termo)
        || (pedidos && pedidos.some((ped: any) => ped.numeroPedido?.toLowerCase().includes(termo)));

      const matchStatus = statusFilter === 'todos' || produto.status === statusFilter;
      const matchCliente = clienteFilter === 'todos' || String(cliente?.id) === clienteFilter;
      const matchPedido = pedidoFilter === 'todos'
        || pedidos?.some((pedido: any) => pedido.pedidoId === pedidoFilter);

      let matchTech = true;
      if (techFilter === 'sem_ficha') {
        matchTech = !ficha_tecnica_id;
      } else if (techFilter === 'com_ficha') {
        matchTech = !!ficha_tecnica_id;
      } else if (techFilter === 'sem_piloto') {
        matchTech = !total_pilotos;
      } else if (techFilter === 'com_piloto') {
        matchTech = total_pilotos > 0;
      }

      return matchSearch && matchStatus && matchCliente && matchPedido && matchTech;
    });
  }, [produtos, search, statusFilter, clienteFilter, pedidoFilter, techFilter]);

  const clientes = useMemo(() => {
    const unique = new Map<number, string>();
    for (const item of produtos ?? []) {
      if (item.cliente?.id) unique.set(item.cliente.id, item.cliente.nome);
    }
    return Array.from(unique, ([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [produtos]);

  const pedidosDisponiveis = useMemo(() => {
    if (!pedidosApi) return [];
    return pedidosApi.map((pedido: any) => ({
      id: pedido.id,
      numero: pedido.numero_pedido || pedido.id,
    })).sort((a: any, b: any) => a.numero.localeCompare(b.numero, 'pt-BR'));
  }, [pedidosApi]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProdutoIds(filtered.map((row: any) => row.produto.id));
    } else {
      setSelectedProdutoIds([]);
    }
  };

  const handleSelectRow = (produtoId: number, checked: boolean) => {
    if (checked) {
      setSelectedProdutoIds(prev => [...prev, produtoId]);
    } else {
      setSelectedProdutoIds(prev => prev.filter(id => id !== produtoId));
    }
  };

  const currentSelections = useMemo(() => {
    return selectedProdutoIds.map(id => ({ produto_id: id }));
  }, [selectedProdutoIds]);

  const onCompleteFichas = (resultado: any) => {
    toast.success(`${resultado.criados} ficha(s) criada(s). ${resultado.ignorados} ignorada(s) e ${resultado.bloqueados} bloqueada(s).`);
    setLoteFichasOpen(false);
    setSelectedProdutoIds([]);
    queryClient.invalidateQueries({ queryKey: ['plm-produtos'] });
    queryClient.invalidateQueries({ queryKey: ['plm-fichas'] });
  };

  const onCompletePilotos = (resultado: any) => {
    toast.success(`${resultado.criados} pilotagem(ns) criada(s). ${resultado.ignorados} ignorada(s) e ${resultado.bloqueados} bloqueada(s).`);
    setLotePilotosOpen(false);
    setSelectedProdutoIds([]);
    queryClient.invalidateQueries({ queryKey: ['plm-produtos'] });
    queryClient.invalidateQueries({ queryKey: ['plm-pilotos'] });
  };

  const allFilteredIds = filtered.map((row: any) => row.produto.id);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id: number) => selectedProdutoIds.includes(id));
  const someSelected = selectedProdutoIds.length > 0;

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerencie todos os produtos em desenvolvimento</p>
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && isR2pbTenant && (
              <Button size="sm" variant="destructive" onClick={() => setResetOpen(true)}>
                <RotateCcw className="w-4 h-4 mr-2" /> Reiniciar PLM
              </Button>
            )}
            <Link href="/hub/plm/produtos/novo">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" /> Novo Produto
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[20rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por descrição, referência ou pedido..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="desenvolvimento">Desenvolvimento</SelectItem>
              <SelectItem value="pilotagem">Pilotagem</SelectItem>
              <SelectItem value="aprovado">Aprovado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={clienteFilter} onValueChange={value => {
            setClienteFilter(value);
            setPedidoFilter('todos');
            setSelectedProdutoIds([]);
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {clientes.map(cliente => (
                <SelectItem key={cliente.id} value={String(cliente.id)}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pedidoFilter} onValueChange={value => {
            setPedidoFilter(value);
            setSelectedProdutoIds([]);
          }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pedido" />
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="todos">Todos os pedidos</SelectItem>
              {pedidosDisponiveis.map(pedido => (
                <SelectItem key={pedido.id} value={pedido.id}>{pedido.numero}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={techFilter} onValueChange={setTechFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status Técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os registros</SelectItem>
              <SelectItem value="sem_ficha">Sem ficha técnica</SelectItem>
              <SelectItem value="com_ficha">Com ficha técnica</SelectItem>
              <SelectItem value="sem_piloto">Sem piloto</SelectItem>
              <SelectItem value="com_piloto">Com piloto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">
              {pedidoFilter !== 'todos' ? 'Nenhum produto rastreado neste pedido' : 'Nenhum produto encontrado'}
            </p>
            {pedidoFilter === 'todos' && (
              <Link href="/hub/plm/produtos/novo">
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white" size="sm">
                  <Plus className="w-4 h-4 mr-2" /> Novo Produto
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border border-border">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(c) => handleSelectAll(!!c)}
              />
              <span className="text-sm font-medium">Selecionar todos visíveis</span>

              {someSelected && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-sm text-muted-foreground mr-2 font-medium">{selectedProdutoIds.length} selecionado(s)</span>
                  <Button size="sm" variant="outline" className="bg-background shadow-sm" onClick={() => setLoteFichasOpen(true)}>
                    Criar Fichas
                  </Button>
                  <Button size="sm" variant="outline" className="bg-background shadow-sm" onClick={() => setLotePilotosOpen(true)}>
                    Criar Pilotos
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {filtered.map((row: any) => {
                const { produto, colecao, cliente } = row;
                const statusCfg = STATUS_CONFIG[produto.status as keyof typeof STATUS_CONFIG];
                const isChecked = selectedProdutoIds.includes(produto.id);
                const pedidosVisiveis = row.pedidos?.filter((pedido: any) =>
                  pedidoFilter === 'todos' || pedido.pedidoId === pedidoFilter
                ) ?? [];

                return (
                  <div key={produto.id} className="flex gap-3 items-center group">
                    <div className="pl-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(c) => handleSelectRow(produto.id, !!c)}
                        aria-label={`Selecionar ${produto.nome}`}
                        className="w-5 h-5 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                      />
                    </div>
                    <Link href={`/hub/plm/produtos/${produto.id}`} className="block flex-1 min-w-0">
                      <Card className={cn("hover:shadow-md transition-all cursor-pointer border", isChecked ? "border-indigo-300 bg-indigo-50/20" : "border-border")}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {produto.codigo && (
                                  <span className="text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                    {produto.codigo}
                                  </span>
                                )}
                                <p className="font-semibold text-foreground">{produto.nome}</p>
                                {(produto.referencia_tecnica || produto.referencia) && (
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    Ref. técnica: {produto.referencia_tecnica || produto.referencia}
                                  </span>
                                )}
                                {produto.referencia_cliente && (
                                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                    Ref. cliente: {produto.referencia_cliente}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-muted-foreground">{CATEGORIA_LABEL[produto.categoria] ?? produto.categoria}</span>
                                {colecao && <span className="text-xs text-muted-foreground">· {colecao.nome}</span>}
                                {cliente && <span className="text-xs text-muted-foreground">· Cliente: {cliente.nome}</span>}
                                 {pedidosVisiveis.map((pedido: any) => (
                                   <span key={pedido.itemId} className="text-xs text-muted-foreground">
                                     · Pedido: {pedido.numeroPedido || pedido.pedidoId}
                                   </span>
                                 ))}
                                 <Badge variant={row.ficha_tecnica_id ? 'secondary' : 'outline'}>
                                   {row.ficha_tecnica_id ? 'Com ficha' : 'Sem ficha'}
                                 </Badge>
                                 <Badge variant={row.total_pilotos > 0 ? 'secondary' : 'outline'}>
                                   {row.total_pilotos > 0 ? 'Com pilotagem' : 'Sem pilotagem'}
                                 </Badge>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(produto.created_at).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {statusCfg && (
                                <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full border', statusCfg.className)}>
                                  {statusCfg.label}
                                </span>
                              )}
                              <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <DialogFichasLote
        open={loteFichasOpen}
        onOpenChange={setLoteFichasOpen}
        selections={currentSelections}
        onComplete={onCompleteFichas}
      />

      <DialogPilotosLote
        open={lotePilotosOpen}
        onOpenChange={setLotePilotosOpen}
        selections={currentSelections}
        produtos={produtos}
        onComplete={onCompletePilotos}
      />

      <Dialog open={resetOpen} onOpenChange={open => {
        if (!resetPlm.isPending) setResetOpen(open);
        if (!open) setResetConfirmation('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reiniciar os dados do PLM?</DialogTitle>
            <DialogDescription>
              Esta ação apaga todos os produtos, fichas, pilotos, aprovações, modelagens, coleções, materiais e fornecedores do PLM da R2PB. Em seguida, consulta os orçamentos aprovados e recria somente os produtos, começando em R2PB-0001. Orçamentos, pedidos, Kanban, estoque e financeiro não são alterados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reset-plm-confirmation">Digite REINICIAR PLM para confirmar</Label>
            <Input
              id="reset-plm-confirmation"
              value={resetConfirmation}
              onChange={event => setResetConfirmation(event.target.value)}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetPlm.isPending}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={resetConfirmation !== 'REINICIAR PLM' || resetPlm.isPending}
              onClick={() => resetPlm.mutate()}
            >
              {resetPlm.isPending ? 'Reiniciando...' : 'Apagar e reconstruir produtos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
