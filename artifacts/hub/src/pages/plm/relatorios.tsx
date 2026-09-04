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
import { BarChart3, Download, FileText } from 'lucide-react';

const STATUS: Record<string, { label: string; className: string }> = {
  em_andamento: { label: 'Em andamento', className: 'bg-blue-100 text-blue-700' },
  aprovado: { label: 'Aprovada', className: 'bg-green-100 text-green-700' },
  reprovado: { label: 'Reprovada', className: 'bg-red-100 text-red-700' },
  concluido: { label: 'Concluída', className: 'bg-gray-100 text-gray-700' },
};

const date = (value?: string | null) => value ? new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR') : '—';
const PAGE_SIZE = 25;

export default function PLMRelatorios() {
  const [clienteId, setClienteId] = useState('todos');
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [processoId, setProcessoId] = useState('todos');
  const [apenasPendentes, setApenasPendentes] = useState(false);
  const [pagina, setPagina] = useState(1);
  const { data: pilotos, isLoading: pilotosLoading } = useQuery({ queryKey: ['plm-pilotos'], queryFn: () => apiFetch('/plm/pilotos') });
  const { data: clientes, isLoading: clientesLoading } = useQuery({ queryKey: ['plm-clientes'], queryFn: () => apiFetch('/plm/clientes') });
  const { data: produtos, isLoading: produtosLoading } = useQuery({ queryKey: ['plm-produtos'], queryFn: () => apiFetch('/plm/produtos') });
  const { data: processos, isLoading: processosLoading } = useQuery({ queryKey: ['plm-processos'], queryFn: () => apiFetch('/plm/processos') });
  const { data: aprovacoes, isLoading: aprovacoesLoading } = useQuery({ queryKey: ['plm-aprovacoes'], queryFn: () => apiFetch('/plm/aprovacoes') });

  const clienteMap = useMemo(() => Object.fromEntries((clientes ?? []).map((item: any) => [item.id, item])), [clientes]);
  const produtoMap = useMemo(() => Object.fromEntries((produtos ?? []).map((item: any) => [item.produto.id, item.produto])), [produtos]);
  const processoMap = useMemo(() => Object.fromEntries((processos ?? []).map((item: any) => [item.id, item])), [processos]);

  const linhas = useMemo(() => (pilotos ?? []).map((piloto: any) => {
    const processo = processoMap[piloto.processo_id];
    const etapas = (processo?.etapas ?? []).filter((etapa: any) => etapa.ativo);
    const decisoes = (aprovacoes ?? []).filter((item: any) => item.piloto_id === piloto.id);
    const reprovada = decisoes.find((item: any) => item.status === 'reprovado');
    const proxima = etapas.find((etapa: any) => !decisoes.some((item: any) => item.processo_etapa_id === etapa.id && item.status === 'aprovado'));
    const faseAtual = piloto.status === 'aprovado'
      ? 'Processo aprovado'
      : piloto.status === 'reprovado'
        ? `Reprovado${reprovada ? ` na fase: ${reprovada.etapa}` : ''}`
        : proxima ? `${proxima.sequencia}. ${proxima.nome}` : 'Aguardando decisão final';
    return {
      ...piloto,
      cliente: clienteMap[piloto.cliente_id],
      produto: produtoMap[piloto.produto_id],
      processo,
      decisoes,
      progresso: etapas.map((etapa: any) => ({
        ...etapa,
        status: decisoes.find((item: any) => item.processo_etapa_id === etapa.id)?.status ?? 'pendente',
      })),
      faseAtual,
    };
  }).filter((linha: any) => {
    const texto = `${linha.cliente?.nome ?? ''} ${linha.referencia_cliente ?? ''} ${linha.referencia ?? ''} ${linha.produto?.nome ?? ''}`.toLowerCase();
    return (clienteId === 'todos' || String(linha.cliente_id) === clienteId)
      && (!busca.trim() || texto.includes(busca.toLowerCase().trim()))
      && (status === 'todos' || linha.status === status)
      && (processoId === 'todos' || String(linha.processo_id) === processoId)
      && (!apenasPendentes || linha.progresso.some((fase: any) => fase.status === 'pendente'));
  }), [pilotos, processoMap, aprovacoes, clienteMap, produtoMap, clienteId, busca, status, processoId, apenasPendentes]);
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / PAGE_SIZE));
  const linhasVisiveis = linhas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);

  useEffect(() => {
    setPagina(1);
  }, [clienteId, busca, status, processoId, apenasPendentes]);

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
              <SelectContent><SelectItem value="todos">Todos os clientes</SelectItem>{(clientes ?? []).map((cliente: any) => <SelectItem key={cliente.id} value={String(cliente.id)}>{cliente.nome}</SelectItem>)}</SelectContent>
            </Select>
             <Input data-testid="input-busca-relatorio" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Buscar cliente, ref. cliente, referência ou produto" />
            <Select value={status} onValueChange={setStatus}>
               <SelectTrigger data-testid="select-relatorio-status"><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos os status</SelectItem>{Object.entries(STATUS).map(([key, item]) => <SelectItem key={key} value={key}>{item.label}</SelectItem>)}</SelectContent>
            </Select>
             <Select value={processoId} onValueChange={setProcessoId}>
               <SelectTrigger data-testid="select-relatorio-processo"><SelectValue placeholder="Todos os processos" /></SelectTrigger>
               <SelectContent><SelectItem value="todos">Todos os processos</SelectItem>{(processos ?? []).filter((processo: any) => processo.ativo).map((processo: any) => <SelectItem key={processo.id} value={String(processo.id)}>{processo.nome}</SelectItem>)}</SelectContent>
             </Select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                <input data-testid="checkbox-relatorio-apenas-pendentes" type="checkbox" checked={apenasPendentes} onChange={event => setApenasPendentes(event.target.checked)} className="h-4 w-4 rounded border-gray-300 accent-indigo-600" />
                Somente pilotagens com fases pendentes
              </label>
          </CardContent>
        </Card>

        {isLoading ? <div className="space-y-3">{[1, 2, 3].map(item => <Skeleton key={item} className="h-28 rounded-xl" />)}</div> : linhas.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>Nenhuma pilotagem encontrada para os filtros atuais.</p></div>
        ) : (
          <div className="space-y-3">
             {linhasVisiveis.map((linha: any) => {
              const statusConfig = STATUS[linha.status] ?? STATUS.em_andamento;
              const fasesAprovadas = linha.decisoes.filter((item: any) => item.status === 'aprovado').length;
              const fasesReprovadas = linha.decisoes.filter((item: any) => item.status === 'reprovado').length;
              return (
                <Card key={linha.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-indigo-600" /></div>
                        <div>
                          <p className="font-semibold">Pilotagem {linha.numero_piloto} — {linha.referencia || 'Sem referência'}</p>
                          <p className="text-sm text-muted-foreground">{linha.cliente?.nome ?? 'Cliente não informado'} · Ref. cliente: {linha.referencia_cliente || '—'}</p>
                          <p className="text-xs text-muted-foreground mt-1">Produto: {linha.produto?.nome ?? '—'} · Processo: {linha.processo ? `${linha.processo.sequencia}. ${linha.processo.nome}` : '—'}</p>
                        </div>
           <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
             <p className="text-xs text-muted-foreground">Mostrando {(pagina - 1) * PAGE_SIZE + 1}–{Math.min(pagina * PAGE_SIZE, linhas.length)} de {linhas.length}</p>
             <div className="flex items-center gap-2">
               <Button data-testid="button-relatorio-pagina-anterior" variant="outline" size="sm" disabled={pagina === 1} onClick={() => setPagina(valor => Math.max(1, valor - 1))}>Anterior</Button>
               <span className="text-sm text-muted-foreground">Página {pagina} de {totalPaginas}</span>
               <Button data-testid="button-relatorio-pagina-proxima" variant="outline" size="sm" disabled={pagina === totalPaginas} onClick={() => setPagina(valor => Math.min(totalPaginas, valor + 1))}>Próxima</Button>
             </div>
           </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
                        <Badge variant="outline">{fasesAprovadas} aprovadas</Badge>
                        {fasesReprovadas > 0 && <Badge className="bg-red-100 text-red-700">{fasesReprovadas} reprovada(s)</Badge>}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-3 border-t text-sm">
                      <div><p className="text-xs text-muted-foreground">Fase atual</p><p className="font-medium mt-0.5">{linha.faseAtual}</p></div>
                      <div><p className="text-xs text-muted-foreground">Data de início</p><p className="font-medium mt-0.5">{date(linha.data_inicio)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Data prevista</p><p className="font-medium mt-0.5">{date(linha.data_prevista)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Término real</p><p className="font-medium mt-0.5">{date(linha.data_termino_real)}</p></div>
                    </div>
                    {linha.progresso.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Progresso das fases</p>
                        <div className="flex flex-wrap gap-1.5">
                          {linha.progresso.map((fase: any) => (
                            <span key={fase.id} className="rounded-full border bg-white px-2.5 py-1 text-xs">
                              {fase.status === 'aprovado' ? '👍' : fase.status === 'reprovado' ? '👎' : '⏳'} {fase.sequencia}. {fase.nome}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {linha.motivo_reprovacao && <p className="text-xs text-red-700 mt-3 rounded-md bg-red-50 p-2"><strong>Motivo:</strong> {linha.motivo_reprovacao}</p>}
                    {linha.imagem_aprovacao_url && <a href={`/api/storage${linha.imagem_aprovacao_url}`} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline inline-block mt-2">Ver imagem da aprovação</a>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PLMLayout>
  );
}