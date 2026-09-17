import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { CalendarDays, ChevronDown, ChevronUp, ExternalLink, FlaskConical, Link2, Plus, Search } from 'lucide-react';

const STATUS_PILOTO: Record<string, { label: string; className: string }> = {
  em_andamento: { label: 'Em andamento', className: 'bg-blue-100 text-blue-700' },
  concluido: { label: 'Concluído', className: 'bg-gray-100 text-gray-700' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-700' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
};

const faseStatus = (status?: string) =>
  status === 'aprovado' ? 'concluido' : status === 'reprovado' ? 'iniciado' : (status ?? 'pendente');

const EMPTY_FORM = {
  cliente_central_id: '',
  produto_id: '',
  referencia: '',
  referencia_cliente: '',
  tamanho_piloto: '',
  processo_id: '',
  modelagem_id: '',
  link_modelagem: '',
  criar_modelagem: false,
  data_inicio: '',
  data_prevista: '',
  data_termino_real: '',
  observacoes: '',
};

const formatDate = (value?: string | null) =>
  value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';

export default function PLMPilotagem() {
  const qc = useQueryClient();
  const [novoPilotoModal, setNovoPilotoModal] = useState(false);
  const [modoPrimeiro, setModoPrimeiro] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('outro');
  const [form, setForm] = useState(EMPTY_FORM);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [edicoes, setEdicoes] = useState<Record<number, any>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clienteFilter, setClienteFilter] = useState('todos');

  const { data: pilotos, isLoading } = useQuery({
    queryKey: ['plm-pilotos'],
    queryFn: () => apiFetch('/plm/pilotos'),
  });
  const { data: clientes } = useQuery({
    queryKey: ['plm-clientes'],
    queryFn: () => apiFetch('/plm/clientes'),
  });
  const { data: produtos } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });
  const { data: processos } = useQuery({
    queryKey: ['plm-processos'],
    queryFn: () => apiFetch('/plm/processos'),
  });
  const { data: modelagens } = useQuery({
    queryKey: ['plm-modelagens', form.produto_id],
    queryFn: () => apiFetch(`/plm/modelagem?produto_id=${form.produto_id}`),
    enabled: !!form.produto_id,
  });
  const { data: aprovacoes } = useQuery({
    queryKey: ['plm-aprovacoes'],
    queryFn: () => apiFetch('/plm/aprovacoes'),
  });

  const produtosDoCliente = useMemo(
    () => (produtos ?? []).filter((item: any) => String(item.produto.cliente_central_id ?? item.produto.cliente_id ?? '') === form.cliente_central_id),
    [produtos, form.cliente_central_id],
  );
  const produtosDaReferenciaCliente = useMemo(
    () => form.referencia_cliente
      ? produtosDoCliente.filter((item: any) => item.produto.referencia_cliente === form.referencia_cliente)
      : produtosDoCliente,
    [produtosDoCliente, form.referencia_cliente],
  );
  const referenciasCliente = useMemo(
    () => [...new Set(produtosDoCliente.map((item: any) => item.produto.referencia_cliente).filter(Boolean))],
    [produtosDoCliente],
  );
  const produtoMap = Object.fromEntries((produtos ?? []).map((item: any) => [item.produto.id, item.produto]));
  const clienteMap = Object.fromEntries((clientes ?? []).flatMap((item: any) => [[item.id, item], [item.cliente_central_id ?? item.id, item]]));
  const processoMap = Object.fromEntries((processos ?? []).map((item: any) => [item.id, item]));
  const processosAtivos = (processos ?? []).filter((item: any) => item.ativo);

  const filteredPilotos = useMemo(() => {
    if (!pilotos) return [];
    return pilotos.filter((piloto: any) => {
      const produto = produtoMap[piloto.produto_id];
       const clienteId = piloto.cliente_central_id ?? piloto.cliente_id;
       const cliente = clienteMap[clienteId];
       const processo = processoMap[piloto.processo_id];
      const term = search.toLowerCase();

      const matchSearch = !search
        || String(piloto.numero_piloto).includes(term)
        || (piloto.referencia || produto?.referencia || '').toLowerCase().includes(term)
        || (piloto.referencia_cliente || '').toLowerCase().includes(term)
         || (produto?.nome || '').toLowerCase().includes(term)
         || (cliente?.nome || '').toLowerCase().includes(term)
         || (processo?.nome || '').toLowerCase().includes(term);

      const matchStatus = statusFilter === 'todos' || piloto.status === statusFilter;
       const matchCliente = clienteFilter === 'todos' || String(clienteId) === clienteFilter;

      return matchSearch && matchStatus && matchCliente;
    });
  }, [pilotos, search, statusFilter, clienteFilter, produtoMap, clienteMap, processoMap]);

  const criarPiloto = useMutation({
    mutationFn: () => apiFetch('/plm/pilotos', {
      method: 'POST',
      body: JSON.stringify(form),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      qc.invalidateQueries({ queryKey: ['plm-modelagens'] });
      toast.success('Piloto criado!');
      setNovoPilotoModal(false);
      setForm(EMPTY_FORM);
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao criar piloto'),
  });
  const iniciarPilotagem = useMutation({
    mutationFn: () => apiFetch('/plm/pilotos/primeiro', {
      method: 'POST',
      body: JSON.stringify({
        cliente_central_id: form.cliente_central_id, nome: novoNome,
        categoria: novaCategoria, referencia_cliente: form.referencia_cliente,
        tamanho_piloto: form.tamanho_piloto, processo_id: form.processo_id,
        data_inicio: form.data_inicio, data_prevista: form.data_prevista,
        observacoes: form.observacoes,
      }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      qc.invalidateQueries({ queryKey: ['plm-produtos'] });
      toast.success('Produto, ficha v1 e piloto criados!');
      setNovoPilotoModal(false); setModoPrimeiro(false); setNovoNome(''); setForm(EMPTY_FORM);
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao iniciar pilotagem'),
  });

  const atualizarPiloto = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      apiFetch(`/plm/pilotos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      qc.invalidateQueries({ queryKey: ['plm-modelagens'] });
      toast.success('Piloto atualizado!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao atualizar piloto'),
  });

  const abrirEdicao = (piloto: any) => {
    setExpanded(prev => ({ ...prev, [piloto.id]: !prev[piloto.id] }));
    setEdicoes(prev => prev[piloto.id] ? prev : ({
      ...prev,
      [piloto.id]: {
        status: piloto.status,
        processo_id: String(piloto.processo_id ?? ''),
        tamanho_piloto: piloto.tamanho_piloto ?? '',
        link_modelagem: piloto.link_modelagem ?? '',
        data_inicio: piloto.data_inicio ?? '',
        data_prevista: piloto.data_prevista ?? '',
        data_termino_real: piloto.data_termino_real ?? '',
        observacoes: piloto.observacoes ?? '',
      },
    }));
  };

  const setEdicao = (id: number, campo: string, valor: any) =>
    setEdicoes(prev => ({ ...prev, [id]: { ...prev[id], [campo]: valor } }));

  const pilotosDaReferencia = (pilotos ?? []).filter((piloto: any) =>
    String(piloto.cliente_central_id ?? piloto.cliente_id ?? '') === form.cliente_central_id
    && piloto.referencia_cliente === form.referencia_cliente
    && piloto.referencia === form.referencia
  );
  const podeCriar = form.cliente_central_id && form.referencia_cliente && form.produto_id && form.referencia.trim()
    && form.tamanho_piloto.trim() && form.processo_id && form.data_inicio && form.data_prevista;

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pilotagem</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Controle manual dos pilotos e seus processos</p>
          </div>
           <Button onClick={() => { setModoPrimeiro(false); setNovoPilotoModal(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Criar piloto
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[20rem]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por referência, nome ou número do piloto..."
              className="pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
           <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_PILOTO).map(([key, item]) => (
                <SelectItem key={key} value={key}>{item.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={clienteFilter} onValueChange={setClienteFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Cliente" />
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              <SelectItem value="todos">Todos os clientes</SelectItem>
              {(clientes ?? []).map((cliente: any) => (
                 <SelectItem key={cliente.cliente_central_id ?? cliente.id} value={String(cliente.cliente_central_id ?? cliente.id)}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
           {(search || statusFilter !== 'todos' || clienteFilter !== 'todos') && (
             <Button variant="outline" onClick={() => { setSearch(''); setStatusFilter('todos'); setClienteFilter('todos'); }}>
               Limpar filtros
             </Button>
           )}
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : filteredPilotos.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum piloto encontrado</p>
          </div>
        ) : filteredPilotos.map((piloto: any) => {
          const produto = produtoMap[piloto.produto_id];
           const cliente = clienteMap[piloto.cliente_central_id] ?? clienteMap[piloto.cliente_id];
          const processo = processoMap[piloto.processo_id];
          const statusCfg = STATUS_PILOTO[piloto.status] ?? STATUS_PILOTO.em_andamento;
          const edit = edicoes[piloto.id];
          const etapas = (processo?.etapas ?? []).filter((etapa: any) => etapa.ativo);
          const decisoes = (aprovacoes ?? []).filter((item: any) => item.piloto_id === piloto.id);
           const fasesConcluidas = etapas.filter((etapa: any) => faseStatus(decisoes.find((item: any) => item.processo_etapa_id === etapa.id)?.status) === 'concluido').length;
          return (
            <Card key={piloto.id} className="overflow-hidden">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => abrirEdicao(piloto)}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Pilotagem {piloto.numero_piloto} — {piloto.referencia || produto?.referencia || 'Sem referência'}</CardTitle>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>Cliente: {cliente?.nome ?? 'Não informado'}</span>
                        <span>Ref. cliente: {piloto.referencia_cliente || '—'}</span>
                        <span>Produto: {produto?.nome || '—'}</span>
                        <span>Tamanho: {piloto.tamanho_piloto || '—'}</span>
                        <span>Processo: {processo ? `${processo.sequencia}. ${processo.nome}` : '—'}</span>
                         {etapas.length > 0 && <span>Fases concluídas: {fasesConcluidas}/{etapas.length}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
                    {expanded[piloto.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </CardHeader>
              {expanded[piloto.id] && edit && (
                <CardContent className="pt-0 space-y-4">
                  <div className="rounded-lg border bg-slate-50 p-3">
                     <p className="text-sm font-medium mb-2">Progresso das fases</p>
                    <div className="flex flex-wrap gap-1.5">
                       {etapas.map((etapa: any) => {
                         const decisao = decisoes.find((item: any) => item.processo_etapa_id === etapa.id);
                          const statusFase = faseStatus(decisao?.status);
                          const emoji = statusFase === 'concluido' ? '✓' : statusFase === 'iniciado' ? '●' : '○';
                         return (
                           <span key={etapa.id} className="rounded-full bg-white border px-2.5 py-1 text-xs">
                             {emoji} {etapa.sequencia}. {etapa.nome}
                           </span>
                         );
                       })}
                       {etapas.length > 0 && <span className="text-xs text-muted-foreground self-center ml-1">As decisões são registradas em Aprovações.</span>}
                       {etapas.length === 0 && (
                         <span className="text-xs text-muted-foreground">Este piloto ainda não possui etapas cadastradas.</span>
                       )}
                    </div>
                  </div>
                  {piloto.status === 'reprovado' && piloto.motivo_reprovacao && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-semibold text-red-700">Motivo da reprovação</p>
                      <p className="text-sm text-red-800 mt-1">{piloto.motivo_reprovacao}</p>
                    </div>
                  )}
                  {piloto.status === 'aprovado' && piloto.imagem_aprovacao_url && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                      <p className="text-xs font-semibold text-green-700 mb-2">Imagem da aprovação</p>
                      <a href={`/api/storage${piloto.imagem_aprovacao_url}`} target="_blank" rel="noreferrer">
                        <img src={`/api/storage${piloto.imagem_aprovacao_url}`} alt={`Aprovação da pilotagem ${piloto.numero_piloto}`} className="max-h-56 rounded-md border object-contain bg-white" />
                      </a>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1"><Label>Data de início</Label><Input type="date" value={edit.data_inicio} onChange={e => setEdicao(piloto.id, 'data_inicio', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Data prevista</Label><Input type="date" value={edit.data_prevista} onChange={e => setEdicao(piloto.id, 'data_prevista', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Data real de término</Label><Input type="date" value={edit.data_termino_real} onChange={e => setEdicao(piloto.id, 'data_termino_real', e.target.value)} /></div>
                    <div className="space-y-1"><Label>Tamanho do piloto</Label><Input value={edit.tamanho_piloto} onChange={e => setEdicao(piloto.id, 'tamanho_piloto', e.target.value)} /></div>
                    <div className="space-y-1">
                      <Label>Processo</Label>
                      <Select value={edit.processo_id} onValueChange={v => setEdicao(piloto.id, 'processo_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent className="max-h-64 overflow-y-auto">{processosAtivos.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.sequencia}. {p.nome}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Link da modelagem</Label>
                    <div className="flex gap-2"><Input type="url" value={edit.link_modelagem} onChange={e => setEdicao(piloto.id, 'link_modelagem', e.target.value)} />
                      {edit.link_modelagem && <Button variant="outline" size="icon" asChild><a href={edit.link_modelagem} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a></Button>}
                    </div>
                  </div>
                  <div className="space-y-1"><Label>Observações</Label><Textarea value={edit.observacoes} onChange={e => setEdicao(piloto.id, 'observacoes', e.target.value)} /></div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Início {formatDate(piloto.data_inicio)} · Prevista {formatDate(piloto.data_prevista)} · Real {formatDate(piloto.data_termino_real)}</p>
                    <Button onClick={() => atualizarPiloto.mutate({ id: piloto.id, payload: edit })}>Salvar alterações</Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={novoPilotoModal} onOpenChange={open => { setNovoPilotoModal(open); if (!open) setForm(EMPTY_FORM); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{modoPrimeiro ? 'Iniciar pilotagem (produto novo)' : 'Criar piloto'}</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Button type="button" variant={!modoPrimeiro ? 'default' : 'outline'} onClick={() => setModoPrimeiro(false)}>Produto existente</Button>
            <Button type="button" variant={modoPrimeiro ? 'default' : 'outline'} onClick={() => setModoPrimeiro(true)}>Começar do zero</Button>
          </div>
          <p className="text-sm text-muted-foreground">{modoPrimeiro ? 'Crie produto, ficha técnica v1 e piloto numa única operação.' : 'Selecione nesta ordem: cliente, referência do cliente e referência.'}</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>1. Cliente *</Label>
               <Select value={form.cliente_central_id} onValueChange={cliente_central_id => setForm({ ...EMPTY_FORM, cliente_central_id })}>
                <SelectTrigger><SelectValue placeholder="Buscar e selecionar cliente" /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                   {(clientes ?? []).map((c: any) => <SelectItem key={c.cliente_central_id ?? c.id} value={String(c.cliente_central_id ?? c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {modoPrimeiro && <>
              <div className="space-y-1.5">
                <Label>Nome do produto *</Label>
                <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Descrição do produto" />
              </div>
              <div className="space-y-1.5">
                <Label>Família</Label>
                <Input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Ex: Bermuda" />
              </div>
            </>}
            <div className="space-y-1.5 sm:col-span-2">
              <Label>2. Referência do cliente *</Label>
               <Select disabled={!form.cliente_central_id} value={form.referencia_cliente} onValueChange={referencia_cliente => setForm(prev => ({ ...prev, referencia_cliente, referencia: '', produto_id: '', modelagem_id: '', link_modelagem: '', criar_modelagem: false }))}>
                 <SelectTrigger><SelectValue placeholder={form.cliente_central_id ? 'Buscar referência do cliente' : 'Selecione o cliente primeiro'} /></SelectTrigger>
                 <SelectContent className="max-h-72 overflow-y-auto">
                  {referenciasCliente.map((referencia: string) => <SelectItem key={referencia} value={referencia}>{referencia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>3. Referência *</Label>
              <Select disabled={!form.referencia_cliente} value={form.referencia} onValueChange={referencia => {
                const item = produtosDaReferenciaCliente.find((entry: any) => entry.produto.referencia === referencia);
                setForm(prev => ({ ...prev, referencia, produto_id: item ? String(item.produto.id) : '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Buscar e selecionar referência" /></SelectTrigger>
                <SelectContent className="max-h-72 overflow-y-auto">
                  {produtosDaReferenciaCliente.filter((item: any) => item.produto.referencia).map((item: any) => <SelectItem key={item.produto.id} value={item.produto.referencia}>{item.produto.referencia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Produto / descrição</Label>
              <Input value={form.produto_id ? (produtoMap[form.produto_id]?.nome ?? '') : ''} readOnly placeholder="A descrição aparecerá após escolher a referência" />
              {form.produto_id && (
                <p className="text-xs text-indigo-600 mt-1">
                  {pilotosDaReferencia.length === 0
                    ? 'Será a Pilotagem 1 desta referência do cliente.'
                    : `${pilotosDaReferencia.length} pilotagem(ns) existente(s). A próxima será a Pilotagem ${Math.max(...pilotosDaReferencia.map((piloto: any) => piloto.numero_piloto)) + 1}.`}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Tamanho do piloto *</Label>
              <Input value={form.tamanho_piloto} onChange={e => setForm(p => ({ ...p, tamanho_piloto: e.target.value }))} placeholder="Ex: M ou 40" />
            </div>
            <div className="space-y-1.5">
              <Label>Processo *</Label>
              <Select value={form.processo_id} onValueChange={processo_id => setForm(p => ({ ...p, processo_id }))}>
                <SelectTrigger><SelectValue placeholder="Escolher processo" /></SelectTrigger>
                 <SelectContent className="max-h-64 overflow-y-auto">{processosAtivos.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.sequencia}. {p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Modelagem existente</Label>
              <Select disabled={!form.produto_id || !(modelagens ?? []).length} value={form.modelagem_id || 'nenhuma'} onValueChange={modelagem_id => setForm(p => ({ ...p, modelagem_id: modelagem_id === 'nenhuma' ? '' : modelagem_id, criar_modelagem: false }))}>
                <SelectTrigger><SelectValue placeholder={(modelagens ?? []).length ? 'Selecionar modelagem' : 'Nenhuma modelagem existente'} /></SelectTrigger>
                 <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="nenhuma">Não vincular modelagem existente</SelectItem>
                  {(modelagens ?? []).map((m: any) => <SelectItem key={m.id} value={String(m.id)}>Modelagem v{m.versao}{m.tamanho_base ? ` · ${m.tamanho_base}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Link da modelagem</Label>
              <Input type="url" value={form.link_modelagem} onChange={e => setForm(p => ({ ...p, link_modelagem: e.target.value }))} placeholder="Cole o link quando estiver disponível" />
              {!form.modelagem_id && (
                <button type="button" onClick={() => setForm(p => ({ ...p, criar_modelagem: !p.criar_modelagem }))}
                  className={`mt-2 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${form.criar_modelagem ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'text-muted-foreground'}`}>
                  <Link2 className="w-4 h-4" /> {form.criar_modelagem ? 'Modelagem será criada com o piloto' : 'Criar uma modelagem para anexar o link depois'}
                </button>
              )}
            </div>
            <div className="space-y-1.5"><Label>Data de início *</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Data prevista *</Label><Input type="date" value={form.data_prevista} onChange={e => setForm(p => ({ ...p, data_prevista: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Data real de término</Label><Input type="date" value={form.data_termino_real} onChange={e => setForm(p => ({ ...p, data_termino_real: e.target.value }))} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setNovoPilotoModal(false)}>Cancelar</Button>
            <Button disabled={modoPrimeiro ? (!form.cliente_central_id || !novoNome.trim() || !form.processo_id || !form.data_inicio || !form.data_prevista || iniciarPilotagem.isPending) : (!podeCriar || criarPiloto.isPending)} onClick={() => modoPrimeiro ? iniciarPilotagem.mutate() : criarPiloto.mutate()} className="bg-indigo-600 hover:bg-indigo-700">
              {modoPrimeiro ? 'Criar produto e piloto' : 'Criar piloto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}