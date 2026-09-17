import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { storageUrl } from '@/lib/storage-url';
import { BarChart3, Download, FileText, Package } from 'lucide-react';

const STATUS: Record<string, { label: string; className: string }> = {
  em_andamento: { label: 'Em andamento', className: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  reprovado: { label: 'Reprovada', className: 'bg-red-100 text-red-700' },
  concluido: { label: 'Concluída', className: 'bg-gray-100 text-gray-700' },
};

const FASE_STYLE: Record<string, string> = {
  concluido: 'bg-green-100 text-green-700 border-green-200',
  iniciado: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
  pendente: 'bg-gray-50 text-gray-500 border-gray-200',
};
const FASE_ICON: Record<string, string> = { concluido: '✓', iniciado: '●', pendente: '○' };
const FASE_STATUS_LABEL: Record<string, string> = { iniciado: 'Iniciada', concluido: 'Concluída', pendente: 'Pendente' };
const faseStatusNormalizado = (status?: string) =>
  status === 'aprovado' ? 'concluido' : status === 'reprovado' ? 'iniciado' : (status ?? 'pendente');

const date = (value?: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const PAGE_SIZE = 25;

export default function PLMRelatorios() {
  const [clienteId, setClienteId] = useState('todos');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [processoId, setProcessoId] = useState('todos');
  const [faseNome, setFaseNome] = useState('todos');
  const [faseStatus, setFaseStatus] = useState('todos');
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [pagina, setPagina] = useState(1);
  const { data: pilotos, isLoading: pilotosLoading } = useQuery({ queryKey: ['plm-pilotos'], queryFn: () => apiFetch('/plm/pilotos') });
  const { data: clientes, isLoading: clientesLoading } = useQuery({ queryKey: ['plm-clientes'], queryFn: () => apiFetch('/plm/clientes') });
  const { data: produtos, isLoading: produtosLoading } = useQuery({ queryKey: ['plm-produtos'], queryFn: () => apiFetch('/plm/produtos') });
  const { data: processos, isLoading: processosLoading } = useQuery({ queryKey: ['plm-processos'], queryFn: () => apiFetch('/plm/processos') });
  const { data: aprovacoes, isLoading: aprovacoesLoading } = useQuery({ queryKey: ['plm-aprovacoes'], queryFn: () => apiFetch('/plm/aprovacoes') });

  const clienteMap = useMemo(() => Object.fromEntries((clientes ?? []).flatMap((item: any) => [[item.id, item], [item.cliente_central_id ?? item.id, item]])), [clientes]);
  const produtoMap = useMemo(() => Object.fromEntries((produtos ?? []).map((item: any) => [item.produto.id, item.produto])), [produtos]);
  const processoMap = useMemo(() => Object.fromEntries((processos ?? []).map((item: any) => [item.id, item])), [processos]);

  // Fases disponíveis para o filtro vêm sempre do processo do próprio tenant;
  // qualquer alteração feita em Processos (criar/renomear/inativar fase) aparece
  // aqui assim que a tela recarrega os dados, sem nada fixo no código.
  const faseOptions = useMemo(() => {
    const processosRelevantes = processoId === 'todos'
      ? (processos ?? [])
      : (processos ?? []).filter((processo: any) => String(processo.id) === processoId);
    const map = new Map<string, { nome: string; sequencia: number }>();
    processosRelevantes.forEach((processo: any) => {
      (processo.etapas ?? []).filter((etapa: any) => etapa.ativo).forEach((etapa: any) => {
        const chave = etapa.nome.trim().toLowerCase();
        const atual = map.get(chave);
        if (!atual || etapa.sequencia < atual.sequencia) map.set(chave, { nome: etapa.nome, sequencia: etapa.sequencia });
      });
    });
    return Array.from(map.entries()).map(([chave, valor]) => ({ chave, ...valor })).sort((a, b) => a.sequencia - b.sequencia);
  }, [processos, processoId]);

  useEffect(() => {
    if (faseNome !== 'todos' && !faseOptions.some(fase => fase.chave === faseNome)) setFaseNome('todos');
  }, [faseOptions, faseNome]);

  const linhas = useMemo(() => (pilotos ?? []).map((piloto: any) => {
    const clienteEfetivoId = piloto.cliente_central_id ?? piloto.cliente_id;
    const processo = processoMap[piloto.processo_id];
    const etapas = (processo?.etapas ?? []).filter((etapa: any) => etapa.ativo);
    const decisoes = (aprovacoes ?? []).filter((item: any) => item.piloto_id === piloto.id);
    const proxima = etapas.find((etapa: any) => faseStatusNormalizado(decisoes.find((item: any) => item.processo_etapa_id === etapa.id)?.status) !== 'concluido');
    const faseAtual = piloto.status === 'aprovado'
      ? 'Processo aprovado'
      : piloto.status === 'reprovado'
        ? 'Pilotagem reprovada'
        : proxima ? `${proxima.sequencia}. ${proxima.nome}` : 'Aguardando decisão final';
    const progresso = etapas.map((etapa: any) => {
      const decisao = decisoes.find((item: any) => item.processo_etapa_id === etapa.id);
      const corStatus = faseStatusNormalizado(decisao?.status);
      return { ...etapa, status: decisao?.status ?? 'pendente', corStatus };
    });
    return {
      ...piloto,
      clienteEfetivoId,
      cliente: clienteMap[clienteEfetivoId],
      produto: produtoMap[piloto.produto_id],
      processo,
      decisoes,
      progresso,
      faseAtual,
    };
  }).filter((linha: any) => {
    const texto = `${linha.numero_piloto ?? ''} ${linha.cliente?.nome ?? ''} ${linha.referencia_cliente ?? ''} ${linha.referencia ?? ''} ${linha.produto?.referencia ?? ''} ${linha.produto?.nome ?? ''} ${linha.processo?.nome ?? ''}`.toLowerCase();
    const faseSelecionada = faseNome === 'todos' ? null : linha.progresso.find((fase: any) => fase.nome.trim().toLowerCase() === faseNome);
    return (clienteId === 'todos' || String(linha.clienteEfetivoId) === clienteId)
      && (!busca.trim() || texto.includes(busca.toLowerCase().trim()))
      && (status === 'todos' || linha.status === status)
      && (processoId === 'todos' || String(linha.processo_id) === processoId)
      && (faseNome === 'todos' || (!!faseSelecionada && (faseStatus === 'todos' || faseSelecionada.corStatus === faseStatus)))
      && (!apenasPendentes || linha.progresso.length === 0 || linha.progresso.some((fase: any) => fase.corStatus !== 'concluido'));
  }), [pilotos, processoMap, aprovacoes, clienteMap, produtoMap, clienteId, busca, status, processoId, faseNome, faseStatus, apenasPendentes]);
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / PAGE_SIZE));
  const linhasVisiveis = linhas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [clienteId, busca, status, processoId, faseNome, faseStatus, apenasPendentes]);

  useEffect(() => {
    if (pagina > totalPaginas) setPagina(totalPaginas);
  }, [pagina, totalPaginas]);

  const resumo = useMemo(() => ({
    total: linhas.length,
    andamento: linhas.filter((linha: any) => linha.status === 'em_andamento').length,
    aprovadas: linhas.filter((linha: any) => linha.status === 'aprovado').length,
    reprovadas: linhas.filter((linha: any) => linha.status === 'reprovado').length,
  }), [linhas]);

  const exportar = () => {
    const header = ['Cliente', 'Referência do cliente', 'Referência', 'Produto', 'Pilotagem', 'Processo', 'Fase atual', 'Status', 'Início', 'Prevista', 'Término real', 'Motivo reprovação'];
    const rows = linhas.map((linha: any) => [
      linha.cliente?.nome ?? '', linha.referencia_cliente ?? '', linha.referencia ?? '', linha.produto?.nome ?? '',
      linha.numero_piloto, linha.processo ? `${linha.processo.sequencia}. ${linha.processo.nome}` : '',
      linha.faseAtual, STATUS[linha.status]?.label ?? linha.status, date(linha.data_inicio), date(linha.data_prevista),
      date(linha.data_termino_real), linha.motivo_reprovacao ?? '',
    ]);
    const csv = [header, ...rows].map(row => row.map((value: any) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = 'relatorio-pilotagens.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const isLoading = pilotosLoading || clientesLoading || produtosLoading || processosLoading || aprovacoesLoading;

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios de Pilotagem</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Acompanhamento por cliente, referência e número da pilotagem</p>
          </div>
          <Button variant="outline" onClick={exportar} disabled={!linhas.length}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            ['Total de pilotagens', resumo.total, 'bg-slate-50'],
            ['Em andamento', resumo.andamento, 'bg-blue-50'],
            ['Aprovadas', resumo.aprovadas, 'bg-green-50'],
            ['Reprovadas', resumo.reprovadas, 'bg-red-50'],
          ].map(([label, value, color]) => (
            <Card key={String(label)} className={color as string}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-2xl font-bold mt-1">{value}</p></CardContent></Card>
          ))}
        </div>

        <Card>
            <CardContent className="p-4 space-y-3">
              <div className="grid md:grid-cols-[220px_1fr_180px_220px] gap-3">
            <Select value={clienteId} onValueChange={setClienteId}>
               <SelectTrigger data-testid="select-relatorio-cliente"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
               <SelectContent className="max-h-72 overflow-y-auto"><SelectItem value="todos">Todos os clientes</SelectItem>{(clientes ?? []).map((cliente: any) => <SelectItem key={cliente.cliente_central_id ?? cliente.id} value={String(cliente.cliente_central_id ?? cliente.id)}>{cliente.nome}</SelectItem>)}</SelectContent>
            </Select>
             <Input data-testid="input-busca-relatorio" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar cliente, ref. cliente, referência ou produto" />
            <Select value={status} onValueChange={setStatus}>
               <SelectTrigger data-testid="select-relatorio-status"><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent className="max-h-64 overflow-y-auto"><SelectItem value="todos">Todos os status</SelectItem>{Object.entries(STATUS).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
             <Select value={processoId} onValueChange={setProcessoId}>
               <SelectTrigger data-testid="select-relatorio-processo"><SelectValue placeholder="Todos os processos" /></SelectTrigger>
               <SelectContent className="max-h-64 overflow-y-auto"><SelectItem value="todos">Todos os processos</SelectItem>{(processos ?? []).filter((processo: any) => processo.ativo).map((processo: any) => <SelectItem key={processo.id} value={String(processo.id)}>{processo.nome}</SelectItem>)}</SelectContent>
             </Select>
              </div>
              <div className="grid md:grid-cols-[220px_220px] gap-3">
                <Select value={faseNome} onValueChange={setFaseNome}>
                  <SelectTrigger data-testid="select-relatorio-fase"><SelectValue placeholder="Todas as fases" /></SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="todos">Todas as fases</SelectItem>
                    {faseOptions.map(fase => <SelectItem key={fase.chave} value={fase.chave}>{fase.sequencia}. {fase.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={faseStatus} onValueChange={setFaseStatus} disabled={faseNome === 'todos'}>
                  <SelectTrigger data-testid="select-relatorio-fase-status"><SelectValue placeholder="Status da fase" /></SelectTrigger>
                  <SelectContent className="max-h-64 overflow-y-auto">
                    <SelectItem value="todos">Qualquer status da fase</SelectItem>
                    {Object.entries(FASE_STATUS_LABEL).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
               {(clienteId !== 'todos' || busca || status !== 'todos' || processoId !== 'todos' || faseNome !== 'todos' || faseStatus !== 'todos' || apenasPendentes) && (
                 <Button variant="outline" onClick={() => { setClienteId('todos'); setBusca(''); setStatus('todos'); setProcessoId('todos'); setFaseNome('todos'); setFaseStatus('todos'); setApenasPendentes(false); }}>
                   Limpar filtros
                 </Button>
               )}
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input data-testid="checkbox-relatorio-apenas-pendentes" type="checkbox" checked={apenasPendentes} onChange={event => setApenasPendentes(event.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-indigo-600" />
                Somente pilotagens com fases pendentes
              </label>
          </CardContent>
        </Card>

        {isLoading ? <div className="space-y-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-28 rounded-xl" />)}</div> : linhas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Nenhuma pilotagem encontrada para os filtros atuais.</p></div>
        ) : (
          <div>
            <div className="space-y-3">
             {linhasVisiveis.map((linha: any) => {
              const statusConfig = STATUS[linha.status] ?? STATUS.em_andamento;
               const fasesConcluidas = linha.progresso.filter((item: any) => item.corStatus === 'concluido').length;
              return (
                <Card key={linha.id} className="overflow-visible">
                  <CardContent className="flex min-h-[184px] flex-col p-0 sm:flex-row">
                    <div className="group relative w-full shrink-0 self-stretch sm:w-44">
                      {linha.produto?.imagem_url ? (
                        <>
                          <button
                            type="button"
                            title="Passe o mouse para ampliar"
                            aria-label={`Ampliar foto de ${linha.produto?.nome ?? 'produto'}`}
                            className="h-36 w-full cursor-zoom-in overflow-hidden rounded-t-xl border-b bg-muted/20 p-2 outline-none ring-inset ring-indigo-500 focus:ring-2 sm:h-full sm:rounded-l-xl sm:rounded-tr-none sm:border-b-0 sm:border-r"
                          >
                            <img src={storageUrl(linha.produto.imagem_url)} alt={linha.produto?.nome ?? 'Produto'} className="h-full w-full object-contain" />
                          </button>
                          <img
                            src={storageUrl(linha.produto.imagem_url)}
                            alt=""
                            className="pointer-events-none absolute left-[calc(100%+8px)] top-0 z-30 hidden h-[350px] w-[280px] rounded-xl border bg-white p-2 object-contain opacity-0 shadow-2xl transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100 lg:block"
                          />
                        </>
                      ) : (
                        <div className="flex h-36 w-full items-center justify-center rounded-t-xl border-b bg-indigo-50 sm:h-full sm:rounded-l-xl sm:rounded-tr-none sm:border-b-0 sm:border-r">
                          <Package className="h-8 w-8 text-indigo-300" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 p-3">
                      <div className="flex flex-col justify-between gap-2 lg:flex-row lg:items-start">
                        <div className="min-w-0">
                          <p className="font-semibold">Pilotagem {linha.numero_piloto} — {linha.referencia || 'Sem referência'}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Cliente: <strong className="text-foreground">{linha.cliente?.nome ?? 'Não informado'}</strong>
                            {' · '}Ref. cliente: {linha.referencia_cliente || '—'}
                            {linha.produto?.descricao ? <> · Descrição: <span className="text-foreground">{linha.produto.descricao}</span></> : null}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Produto: {linha.produto?.nome ?? '—'} · Processo: {linha.processo ? `${linha.processo.sequencia}. ${linha.processo.nome}` : '—'}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                          <Badge variant="outline">{fasesConcluidas} concluídas</Badge>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-2 gap-2 border-y py-2 text-xs lg:grid-cols-4">
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Fase atual</p><p className="mt-0.5 font-semibold">{linha.faseAtual}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Início</p><p className="mt-0.5 font-semibold">{date(linha.data_inicio)}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Previsão</p><p className="mt-0.5 font-semibold">{date(linha.data_prevista)}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Término real</p><p className="mt-0.5 font-semibold">{date(linha.data_termino_real)}</p></div>
                      </div>

                      {linha.progresso.length > 0 && (
                        <div className="mt-2">
                          <p className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Progresso das fases</p>
                          <div className="flex flex-wrap gap-1">
                            {linha.progresso.map((fase: any) => (
                              <span key={fase.id} className={`rounded-full border px-2 py-0.5 text-[10px] ${FASE_STYLE[fase.corStatus]}`}>
                                {FASE_ICON[fase.corStatus]} {fase.sequencia}. {fase.nome}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {linha.motivo_reprovacao && <p className="mt-2 rounded-md bg-red-50 p-1.5 text-xs text-red-700"><strong>Motivo:</strong> {linha.motivo_reprovacao}</p>}
                      {linha.imagem_aprovacao_url && <a href={`/api/storage${linha.imagem_aprovacao_url}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-block text-xs text-indigo-600 hover:underline">Ver imagem da aprovação</a>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {linhas.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 mt-2 border-t border-muted/20">
              <p className="text-xs text-muted-foreground">
                Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, linhas.length)} de {linhas.length}
              </p>
              <div className="flex items-center gap-2">
                <Button data-testid="button-relatorio-pagina-anterior" variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(valor => Math.max(1, valor - 1))}>Anterior</Button>
                <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
                <Button data-testid="button-relatorio-pagina-proxima" variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(valor => Math.min(totalPaginas, valor + 1))}>Próxima</Button>
              </div>
            </div>
          )}
        </div>)}
      </div>
    </PLMLayout>
  );
}