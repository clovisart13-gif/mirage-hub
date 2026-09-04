import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { CheckSquare, ChevronDown, ChevronUp, FlaskConical, ImageIcon, Search, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-700' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-700' },
} as const;

const STATUS_EMOJI = {
  pendente: '⏳',
  aprovado: '👍',
  reprovado: '👎',
} as const;

const PAGE_SIZE = 25;

export default function PLMAprovacoes() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [busca, setBusca] = useState('');
  const [clienteId, setClienteId] = useState('todos');
  const [processoId, setProcessoId] = useState('todos');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [apenasPendentes, setApenasPendentes] = useState(true);
  const [pagina, setPagina] = useState(1);
  const [pilotoAberto, setPilotoAberto] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});
  const [motivos, setMotivos] = useState<Record<number, string>>({});
  const [imagens, setImagens] = useState<Record<number, string>>({});
  const [processosSelecionados, setProcessosSelecionados] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState<Record<number, boolean>>({});
  const queries = {
    pilotos: useQuery({ queryKey: ['plm-pilotos'], queryFn: () => apiFetch('/plm/pilotos') }),
    produtos: useQuery({ queryKey: ['plm-produtos'], queryFn: () => apiFetch('/plm/produtos') }),
    clientes: useQuery({ queryKey: ['plm-clientes'], queryFn: () => apiFetch('/plm/clientes') }),
    processos: useQuery({ queryKey: ['plm-processos'], queryFn: () => apiFetch('/plm/processos') }),
    aprovacoes: useQuery({ queryKey: ['plm-aprovacoes'], queryFn: () => apiFetch('/plm/aprovacoes') }),
  };

  const produtoMap = useMemo(
    () => Object.fromEntries((queries.produtos.data ?? []).map((item: any) => [item.produto.id, item.produto])),
    [queries.produtos.data],
  );
  const clienteMap = useMemo(
    () => Object.fromEntries((queries.clientes.data ?? []).map((item: any) => [item.id, item])),
    [queries.clientes.data],
  );
  const processoMap = useMemo(
    () => Object.fromEntries((queries.processos.data ?? []).map((item: any) => [item.id, item])),
    [queries.processos.data],
  );

  const decidir = useMutation({
    mutationFn: (data: { piloto_id: number; processo_etapa_id: number; status: 'aprovado' | 'reprovado'; observacoes?: string }) =>
      apiFetch('/plm/aprovacoes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-aprovacoes'] });
      toast.success('Decisão registrada para este piloto!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao registrar aprovação'),
  });
  const decidirPiloto = useMutation({
    mutationFn: ({ pilotoId, payload }: { pilotoId: number; payload: any }) =>
      apiFetch(`/plm/pilotos/${pilotoId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      toast.success('Situação da pilotagem atualizada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao atualizar a pilotagem'),
  });
  const vincularProcesso = useMutation({
    mutationFn: ({ pilotoId, processoId }: { pilotoId: number; processoId: string }) =>
      apiFetch(`/plm/pilotos/${pilotoId}`, { method: 'PATCH', body: JSON.stringify({ processo_id: processoId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      toast.success('Processo vinculado ao piloto!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao vincular processo'),
  });

  const uploadImagem = async (pilotoId: number, file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Selecione um arquivo de imagem.'); return; }
    setUploading(prev => ({ ...prev, [pilotoId]: true }));
    try {
      const { uploadURL, objectPath } = await apiFetch('/storage/uploads/request-url', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      await fetch(uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setImagens(prev => ({ ...prev, [pilotoId]: objectPath }));
      toast.success('Imagem anexada. Clique em Aprovar pilotagem para concluir.');
    } catch {
      toast.error('Falha ao anexar a imagem.');
    } finally {
      setUploading(prev => ({ ...prev, [pilotoId]: false }));
    }
  };

  const getAprovacao = (pilotoId: number, etapaId: number) =>
    (queries.aprovacoes.data ?? []).find((item: any) => item.piloto_id === pilotoId && item.processo_etapa_id === etapaId);

  const isLoading = Object.values(queries).some(query => query.isLoading);
  const pilotos = queries.pilotos.data ?? [];
  const pilotosFiltrados = useMemo(() => pilotos.filter((piloto: any) => {
    const produto = produtoMap[piloto.produto_id];
    const cliente = clienteMap[piloto.cliente_id];
    const processo = processoMap[piloto.processo_id];
    const etapas = (processo?.etapas ?? []).filter((etapa: any) => etapa.ativo);
    const texto = `${piloto.numero_piloto} ${piloto.referencia ?? ''} ${piloto.referencia_cliente ?? ''} ${produto?.nome ?? ''} ${cliente?.nome ?? ''}`.toLowerCase();
    const temFasePendente = etapas.length === 0 || etapas.some((etapa: any) => getAprovacao(piloto.id, etapa.id)?.status !== 'aprovado');
    return (
      (clienteId === 'todos' || String(piloto.cliente_id) === clienteId) &&
      (processoId === 'todos' || String(piloto.processo_id) === processoId) &&
      (statusFiltro === 'todos' || piloto.status === statusFiltro) &&
      (!apenasPendentes || temFasePendente) &&
      (!busca.trim() || texto.includes(busca.trim().toLowerCase()))
    );
  }), [pilotos, produtoMap, clienteMap, processoMap, clienteId, processoId, statusFiltro, apenasPendentes, busca, queries.aprovacoes.data]);
  const totalPaginas = Math.max(1, Math.ceil(pilotosFiltrados.length / PAGE_SIZE));
  const pilotosVisiveis = pilotosFiltrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [busca, clienteId, processoId, statusFiltro, apenasPendentes]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Aprovações</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Aprovação manual das etapas de cada piloto e referência do cliente</p>
        </div>

        {!isLoading && pilotos.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-muted-foreground" /> Filtrar aprovações</p>
                <span className="text-xs text-muted-foreground">{pilotosFiltrados.length} de {pilotos.length} pilotagens</span>
              </div>
              <div className="grid md:grid-cols-[1.4fr_1fr_1fr_1fr] gap-3">
                <Input data-testid="input-busca-aprovacoes" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar piloto, cliente ou referência" />
                <Select value={clienteId} onValueChange={setClienteId}>
                  <SelectTrigger data-testid="select-filtro-cliente"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os clientes</SelectItem>
                    {(queries.clientes.data ?? []).map((cliente: any) => <SelectItem key={cliente.id} value={String(cliente.id)}>{cliente.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={processoId} onValueChange={setProcessoId}>
                  <SelectTrigger data-testid="select-filtro-processo"><SelectValue placeholder="Todos os processos" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os processos</SelectItem>
                    {(queries.processos.data ?? []).filter((processo: any) => processo.ativo).map((processo: any) => <SelectItem key={processo.id} value={String(processo.id)}>{processo.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={statusFiltro} onValueChange={setStatusFiltro}>
                  <SelectTrigger data-testid="select-filtro-status"><SelectValue placeholder="Todos os status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="aprovado">Pilotagem aprovada</SelectItem>
                    <SelectItem value="reprovado">Pilotagem reprovada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input data-testid="checkbox-apenas-pendentes" type="checkbox" checked={apenasPendentes} onChange={event => setApenasPendentes(event.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-indigo-600" />
                Somente pilotagens com alguma fase pendente
              </label>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        ) : pilotos.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Nenhum piloto para aprovação</p>
            <p className="text-sm text-muted-foreground mt-1">Crie o piloto e selecione um processo para iniciar as aprovações.</p>
          </div>
        ) : pilotosFiltrados.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Nenhuma aprovação encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">Ajuste os filtros para localizar outra pilotagem.</p>
          </div>
        ) : (
          <>
          <div className="space-y-4">
          {pilotosVisiveis.map((piloto: any) => {
          const produto = produtoMap[piloto.produto_id];
          const cliente = clienteMap[piloto.cliente_id];
          const processo = processoMap[piloto.processo_id];
          const etapas = (processo?.etapas ?? []).filter((etapa: any) => etapa.ativo);
          const aprovadas = etapas.filter((etapa: any) => getAprovacao(piloto.id, etapa.id)?.status === 'aprovado').length;
          const fasePendente = etapas.find((etapa: any) => getAprovacao(piloto.id, etapa.id)?.status !== 'aprovado');
          const motivo = motivos[piloto.id] ?? piloto.motivo_reprovacao ?? '';
          const imagem = imagens[piloto.id] ?? piloto.imagem_aprovacao_url ?? '';
          const aberto = pilotoAberto === piloto.id;
          return (
            <Card key={piloto.id} data-testid={`card-aprovacao-${piloto.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Piloto #{piloto.numero_piloto} — {piloto.referencia || produto?.referencia || 'Sem referência'}</CardTitle>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                        <span>Cliente: {cliente?.nome ?? '—'}</span>
                        <span>Ref. cliente: {piloto.referencia_cliente || '—'}</span>
                        <span>Produto: {produto?.nome || '—'}</span>
                        <span>Processo: {processo ? `${processo.sequencia}. ${processo.nome}` : '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline">{aprovadas}/{etapas.length} aprovadas</Badge>
                    <Badge className={piloto.status === 'aprovado' ? 'bg-green-100 text-green-700' : piloto.status === 'reprovado' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}>
                      {piloto.status === 'aprovado' ? 'Pilotagem aprovada' : piloto.status === 'reprovado' ? 'Pilotagem reprovada' : 'Em andamento'}
                    </Badge>
                     <Button variant="ghost" size="sm" onClick={() => navigate(`/hub/plm/produtos/${piloto.produto_id}`)}>Ver produto</Button>
                     <Button data-testid={`button-abrir-aprovacao-${piloto.id}`} variant="outline" size="sm" onClick={() => setPilotoAberto(aberto ? null : piloto.id)}>
                       {aberto ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                       {aberto ? 'Fechar aprovação' : 'Abrir aprovação'}
                     </Button>
                  </div>
                </div>
              </CardHeader>
               {!aberto ? (
                 <CardContent className="pt-0">
                   <div className="rounded-lg border bg-slate-50/70 px-3 py-2 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                     <span><span className="text-muted-foreground">Fase atual:</span> <strong>{fasePendente ? `⏳ ${fasePendente.sequencia}. ${fasePendente.nome}` : etapas.length ? '👍 Aguardando decisão final' : '⏳ Processo não vinculado'}</strong></span>
                     <span className="text-muted-foreground">{aprovadas}/{etapas.length} fases aprovadas</span>
                   </div>
                 </CardContent>
               ) : <CardContent>
                {etapas.length === 0 ? (
                  processo ? (
                    <p className="text-sm text-muted-foreground rounded-lg border bg-gray-50 p-3">O processo deste piloto ainda não possui etapas cadastradas.</p>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Este piloto ainda não tem processo vinculado</p>
                        <p className="text-xs text-amber-800 mt-1">Selecione o roteiro para carregar as fases e liberar os joinhas de aprovação.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select value={processosSelecionados[piloto.id] ?? ''} onValueChange={value => setProcessosSelecionados(prev => ({ ...prev, [piloto.id]: value }))}>
                          <SelectTrigger className="bg-white"><SelectValue placeholder="Selecionar processo" /></SelectTrigger>
                          <SelectContent>{(queries.processos.data ?? []).filter((item: any) => item.ativo).map((item: any) => <SelectItem key={item.id} value={String(item.id)}>{item.sequencia}. {item.nome}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button disabled={!processosSelecionados[piloto.id] || vincularProcesso.isPending} onClick={() => vincularProcesso.mutate({ pilotoId: piloto.id, processoId: processosSelecionados[piloto.id] })}>
                          Carregar fases
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-2">
                    {etapas.map((etapa: any) => {
                      const aprovacao = getAprovacao(piloto.id, etapa.id);
                      const status = aprovacao?.status ?? 'pendente';
                      const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendente;
                      const observacaoKey = `${piloto.id}:${etapa.id}`;
                      const observacao = observacoes[observacaoKey] ?? aprovacao?.observacoes ?? '';
                      return (
                        <div key={etapa.id} className="rounded-lg border bg-gray-50/50 p-3">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex items-center gap-3 min-w-0 lg:w-64">
                              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">{etapa.sequencia}</span>
                              <span className="text-sm font-medium truncate">{etapa.nome}</span>
                               <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.className)}>{STATUS_EMOJI[status as keyof typeof STATUS_EMOJI]} {cfg.label}</span>
                            </div>
                            <Input
                              value={observacao}
                              onChange={event => setObservacoes(prev => ({ ...prev, [observacaoKey]: event.target.value }))}
                              placeholder="Observação desta etapa"
                              className="flex-1 bg-white"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" disabled={decidir.isPending}
                                onClick={() => decidir.mutate({ piloto_id: piloto.id, processo_etapa_id: etapa.id, status: 'aprovado', observacoes: observacao })}>
                                 <span className="mr-1.5 text-base leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>👍</span> Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50"
                                disabled={decidir.isPending || !observacao.trim()}
                                onClick={() => decidir.mutate({ piloto_id: piloto.id, processo_etapa_id: etapa.id, status: 'reprovado', observacoes: observacao })}>
                                 <span className="mr-1.5 text-base leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>👎</span> Reprovar
                              </Button>
                            </div>
                          </div>
                          {aprovacao?.responsavel_nome && (
                            <p className="text-xs text-muted-foreground mt-2 pl-10">
                              Decidido por {aprovacao.responsavel_nome} em {new Date(aprovacao.data_decisao).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 rounded-lg border p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Decisão final da pilotagem</p>
                    <p className="text-xs text-muted-foreground">A decisão pertence somente à Pilotagem {piloto.numero_piloto} desta referência do cliente.</p>
                  </div>
                  <div className="grid lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Input value={motivo} onChange={event => setMotivos(prev => ({ ...prev, [piloto.id]: event.target.value }))} placeholder="Motivo obrigatório para reprovar" />
                      <Button variant="outline" className="w-full text-red-700 border-red-200 hover:bg-red-50"
                        disabled={!motivo.trim() || decidirPiloto.isPending}
                        onClick={() => decidirPiloto.mutate({ pilotoId: piloto.id, payload: { status: 'reprovado', motivo_reprovacao: motivo } })}>
                         <span className="mr-2 text-base leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>👎</span> Reprovar pilotagem
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center justify-center gap-2 rounded-md border h-10 px-3 cursor-pointer bg-white text-sm hover:bg-gray-50">
                        <Upload className="w-4 h-4" />
                        {uploading[piloto.id] ? 'Enviando imagem...' : imagem ? 'Trocar imagem da aprovação' : 'Anexar imagem da aprovação'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploading[piloto.id]} onChange={event => uploadImagem(piloto.id, event.target.files?.[0])} />
                      </label>
                      <Button className="w-full bg-green-600 hover:bg-green-700" disabled={!imagem || uploading[piloto.id] || decidirPiloto.isPending}
                        onClick={() => decidirPiloto.mutate({ pilotoId: piloto.id, payload: { status: 'aprovado', imagem_aprovacao_url: imagem } })}>
                         <span className="mr-2 text-base leading-none" style={{ fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' }}>👍</span> Aprovar pilotagem
                      </Button>
                    </div>
                  </div>
                  {imagem && (
                    <a href={`/api/storage${imagem}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-indigo-600 hover:underline">
                      <ImageIcon className="w-4 h-4" /> Ver imagem anexada
                    </a>
                  )}
                </div>
               </CardContent>}
            </Card>
          );
          })}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, pilotosFiltrados.length)} de {pilotosFiltrados.length}</p>
            <div className="flex items-center gap-2">
              <Button data-testid="button-pagina-anterior-aprovacoes" variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(valor => Math.max(1, valor - 1))}>Anterior</Button>
              <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
              <Button data-testid="button-pagina-proxima-aprovacoes" variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(valor => Math.min(totalPaginas, valor + 1))}>Próxima</Button>
            </div>
          </div>
          </>
        )}
      </div>
    </PLMLayout>
  );
}