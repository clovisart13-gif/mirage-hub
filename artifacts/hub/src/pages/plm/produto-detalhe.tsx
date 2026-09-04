import { useParams, useLocation, Link } from 'wouter';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, FileText, Scissors, Calculator,
  FlaskConical, CheckSquare, History, Package, Plus,
  ExternalLink, ThumbsDown, ThumbsUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  desenvolvimento: { label: 'Desenvolvimento', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  pilotagem: { label: 'Pilotagem', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  aprovado: { label: 'Aprovado', className: 'bg-green-50 text-green-700 border-green-200' },
} as const;

const STATUS_FLOW = ['rascunho', 'desenvolvimento', 'pilotagem', 'aprovado'];

const CATEGORIA_LABEL: Record<string, string> = {
  camiseta: 'Camiseta', camisa: 'Camisa', calca: 'Calça', short: 'Short',
  vestido: 'Vestido', saia: 'Saia', jaqueta: 'Jaqueta', casaco: 'Casaco',
  blusa: 'Blusa', moletom: 'Moletom', macacao: 'Macacão', outro: 'Outro',
};

const MODULO_LABEL: Record<string, string> = {
  produto: 'Produto', ficha_tecnica: 'Ficha Técnica', modelagem: 'Modelagem',
  material: 'Material', bom: 'Materiais & Custos', pilotagem: 'Pilotagem', aprovacao: 'Aprovação',
};

const ACAO_COLOR: Record<string, string> = {
  criacao: 'bg-blue-100 text-blue-700',
  atualizacao: 'bg-amber-100 text-amber-700',
  aprovacao: 'bg-green-100 text-green-700',
  reprovacao: 'bg-red-100 text-red-700',
  upload: 'bg-purple-100 text-purple-700',
};

export default function PLMProdutoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [observacoesAprovacao, setObservacoesAprovacao] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['plm-produto', id],
    queryFn: () => apiFetch(`/plm/produtos/${id}`),
    enabled: !!id,
  });

  const { data: fichas } = useQuery({
    queryKey: ['plm-fichas', id],
    queryFn: () => apiFetch(`/plm/fichas?produto_id=${id}`),
    enabled: !!id,
  });

  const { data: moldes } = useQuery({
    queryKey: ['plm-moldes', id],
    queryFn: () => apiFetch(`/plm/modelagem?produto_id=${id}`),
    enabled: !!id,
  });

  const { data: boms } = useQuery({
    queryKey: ['plm-boms', id],
    queryFn: () => apiFetch(`/plm/bom?produto_id=${id}`),
    enabled: !!id,
  });

  const { data: pilotos } = useQuery({
    queryKey: ['plm-pilotos', id],
    queryFn: () => apiFetch(`/plm/pilotos?produto_id=${id}`),
    enabled: !!id,
  });

  const { data: aprovacoes } = useQuery({
    queryKey: ['plm-aprovacoes-produto', id],
    queryFn: () => apiFetch(`/plm/aprovacoes?produto_id=${id}`),
    enabled: !!id,
  });

  const { data: processos } = useQuery({
    queryKey: ['plm-processos'],
    queryFn: () => apiFetch('/plm/processos'),
  });

  const { data: auditoria } = useQuery({
    queryKey: ['plm-auditoria-produto', id],
    queryFn: () => apiFetch(`/plm/auditoria?produto_id=${id}&limit=30`),
    enabled: !!id,
  });

  const decidirEtapa = useMutation({
    mutationFn: (payload: { piloto_id: number; processo_etapa_id: number; status: 'aprovado' | 'reprovado'; observacoes?: string }) =>
      apiFetch('/plm/aprovacoes', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-aprovacoes-produto', id] });
      toast.success('Decisão da etapa registrada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Erro ao registrar decisão'),
  });

  const updateStatus = useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/plm/produtos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-produto', id] });
      qc.invalidateQueries({ queryKey: ['plm-produtos'] });
      toast.success('Status atualizado!');
    },
    onError: () => toast.error('Erro ao atualizar status'),
  });

  if (isLoading) return (
    <PLMLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </PLMLayout>
  );

  if (!data) return (
    <PLMLayout>
      <div className="p-6 text-center text-muted-foreground">Produto não encontrado</div>
    </PLMLayout>
  );

  const { produto, colecao, cliente } = data;
  const rastreabilidade = data.rastreabilidade ?? { fichasCusto: [], orcamentos: [], pedidos: [] };
  const statusCfg = STATUS_CONFIG[produto.status as keyof typeof STATUS_CONFIG];

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/hub/plm/produtos">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{produto.nome}</h1>
                {produto.referencia && <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Ref: {produto.referencia}</span>}
                {produto.referencia_cliente && <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Ref. cliente: {produto.referencia_cliente}</span>}
                {statusCfg && <Badge className={cn('text-xs border', statusCfg.className)}>{statusCfg.label}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {CATEGORIA_LABEL[produto.categoria] ?? produto.categoria}
                {colecao && ` · ${colecao.nome} ${colecao.ano}`}
                {cliente && ` · Cliente: ${cliente.nome}`}
              </p>
              {produto.link_modelagem && (
                <a href={produto.link_modelagem} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline">
                  Abrir link de modelagem <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={produto.status} onValueChange={v => updateStatus.mutate(v)} disabled={updateStatus.isPending}>
              <SelectTrigger className="w-44 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FLOW.map(s => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => navigate(`/hub/plm/produtos/${id}/editar`)}>
              <Pencil className="w-4 h-4 mr-2" /> Editar
            </Button>
          </div>
        </div>

        {(rastreabilidade.fichasCusto.length > 0 || rastreabilidade.orcamentos.length > 0 || rastreabilidade.pedidos.length > 0) && (
          <Card className="border-indigo-200 bg-indigo-50/40">
            <CardHeader><CardTitle className="text-base">Rastreabilidade comercial</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <div><p className="text-xs text-muted-foreground">Fichas de custo</p><p className="font-semibold">{rastreabilidade.fichasCusto.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Orçamentos</p><p className="font-semibold">{rastreabilidade.orcamentos.length}</p></div>
              <div><p className="text-xs text-muted-foreground">Pedidos</p><p className="font-semibold">{rastreabilidade.pedidos.length}</p></div>
              <div className="sm:col-span-3 flex flex-wrap gap-2">
                {rastreabilidade.fichasCusto.map((f: any) => (
                  <Button key={f.id} size="sm" variant="outline" onClick={() => navigate(`/hub/custos/fichas/${f.id}`)}>Ficha {f.referencia}</Button>
                ))}
                {rastreabilidade.orcamentos.map((o: any) => (
                  <Button key={o.itemId} size="sm" variant="outline" onClick={() => navigate(`/hub/custos/orcamentos/${o.orcamentoId}`)}>{o.numero}</Button>
                ))}
                {rastreabilidade.pedidos.map((p: any) => (
                  <Button key={p.itemId} size="sm" variant="outline" onClick={() => navigate("/hub/kanban/pedidos")}>
                    {p.numero ?? 'Pedido'}{p.referenciaCliente ? ` · Ref. cliente ${p.referenciaCliente}` : ''}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="ficha">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="ficha" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Fichas ({fichas?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="modelagem" className="gap-1.5"><Scissors className="w-3.5 h-3.5" /> Modelagem ({moldes?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="bom" className="gap-1.5"><Calculator className="w-3.5 h-3.5" /> Mat. & Custos ({boms?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="pilotagem" className="gap-1.5"><FlaskConical className="w-3.5 h-3.5" /> Pilotos ({pilotos?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="aprovacao" className="gap-1.5"><CheckSquare className="w-3.5 h-3.5" /> Aprovações</TabsTrigger>
            <TabsTrigger value="historico" className="gap-1.5"><History className="w-3.5 h-3.5" /> Histórico</TabsTrigger>
          </TabsList>

          {/* Fichas Técnicas */}
          <TabsContent value="ficha" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Link href={`/hub/plm/fichas/nova?produto_id=${id}`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Nova Ficha</Button>
              </Link>
            </div>
            {(fichas ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><FileText className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhuma ficha técnica</div>
            ) : (fichas ?? []).map((f: any) => (
              <Link key={f.id} href={`/hub/plm/fichas/${f.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{f.titulo ?? `Ficha Técnica v${f.versao}`}</p>
                      <p className="text-xs text-muted-foreground">{f.familia && `Família: ${f.familia} · `}Status: {f.status}</p>
                    </div>
                    <Badge variant="outline">v{f.versao}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          {/* Modelagem */}
          <TabsContent value="modelagem" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Link href={`/hub/plm/modelagem?produto_id=${id}&open=1`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Novo Molde</Button>
              </Link>
            </div>
            {(moldes ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><Scissors className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhum molde cadastrado</div>
            ) : (moldes ?? []).map((m: any) => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Molde v{m.versao} {m.tamanho_base && `— Base ${m.tamanho_base}`}</p>
                    {m.arquivo_nome && <p className="text-xs text-muted-foreground">{m.arquivo_nome}</p>}
                    {m.descricao_alteracoes && <p className="text-xs text-muted-foreground mt-1">{m.descricao_alteracoes}</p>}
                  </div>
                  {m.arquivo_url && (
                    <a href={m.arquivo_url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">Baixar</Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* BOM */}
          <TabsContent value="bom" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Link href={`/hub/plm/bom/novo?produto_id=${id}`}>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700"><Plus className="w-4 h-4 mr-2" /> Nova ficha de custo</Button>
              </Link>
            </div>
            {(boms ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><Calculator className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhuma ficha de custo criada</div>
            ) : (boms ?? []).map((b: any) => (
              <Link key={b.id} href={`/hub/plm/bom/${b.id}`} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">Ficha de custo v{b.versao}</p>
                      <p className="text-xs text-muted-foreground">
                        M.O.: R${parseFloat(b.custo_mao_de_obra ?? 0).toFixed(2)} · Margem: {b.margem_lucro ?? 0}% · Venda: R${parseFloat(b.preco_venda ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <Badge variant="outline">v{b.versao}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </TabsContent>

          {/* Pilotagem */}
          <TabsContent value="pilotagem" className="space-y-3 mt-4">
            <div className="flex justify-end">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(`/hub/plm/pilotagem?produto_id=${id}`)}>
                <Plus className="w-4 h-4 mr-2" /> Novo Piloto
              </Button>
            </div>
            {(pilotos ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhum piloto iniciado</div>
            ) : (pilotos ?? []).map((p: any) => (
              <Card key={p.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">Piloto #{p.numero_piloto}</p>
                    <p className="text-xs text-muted-foreground">{p.status}</p>
                  </div>
                  <Badge className={cn('text-xs', p.status === 'aprovado' ? 'bg-green-100 text-green-700' : p.status === 'reprovado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700')}>
                    {p.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Aprovações */}
          <TabsContent value="aprovacao" className="space-y-4 mt-4">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4">
              <div>
                <p className="font-semibold text-sm">Aprovação por fase do piloto</p>
                <p className="text-xs text-muted-foreground mt-0.5">Cada piloto possui decisões independentes conforme o processo selecionado.</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate('/hub/plm/aprovacoes')}>Abrir painel completo</Button>
            </div>
            {(pilotos ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" /> Nenhum piloto criado para este produto</div>
            ) : (pilotos ?? []).map((piloto: any) => {
              const processo = (processos ?? []).find((item: any) => item.id === piloto.processo_id);
              const etapas = (processo?.etapas ?? []).filter((etapa: any) => etapa.ativo);
              return (
                <Card key={piloto.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Pilotagem {piloto.numero_piloto} — {piloto.referencia || produto.referencia || 'Sem referência'}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Ref. cliente: {piloto.referencia_cliente || '—'} · Processo: {processo ? `${processo.sequencia}. ${processo.nome}` : '—'}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {etapas.length === 0 ? (
                      <p className="text-sm text-muted-foreground rounded-lg border bg-gray-50 p-3">Este processo ainda não possui etapas cadastradas.</p>
                    ) : etapas.map((etapa: any) => {
                      const aprovacao = (aprovacoes ?? []).find((item: any) => item.piloto_id === piloto.id && item.processo_etapa_id === etapa.id);
                      const status = aprovacao?.status ?? 'pendente';
                      const statusLabel = status === 'aprovado' ? 'Aprovado' : status === 'reprovado' ? 'Reprovado' : 'Pendente';
                      const key = `${piloto.id}:${etapa.id}`;
                      const observacao = observacoesAprovacao[key] ?? aprovacao?.observacoes ?? '';
                      return (
                        <div key={etapa.id} className="rounded-lg border bg-gray-50/50 p-3">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                            <div className="flex items-center gap-2 min-w-0 lg:w-60">
                              <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold shrink-0">{etapa.sequencia}</span>
                              <span className="font-medium text-sm truncate">{etapa.nome}</span>
                              <Badge className={cn('text-xs', status === 'aprovado' ? 'bg-green-100 text-green-700' : status === 'reprovado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700')}>{statusLabel}</Badge>
                            </div>
                            <Input value={observacao} onChange={event => setObservacoesAprovacao(prev => ({ ...prev, [key]: event.target.value }))} placeholder="Observação/motivo" className="flex-1 bg-white" />
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50" disabled={decidirEtapa.isPending}
                                title="Aprovar esta fase"
                                onClick={() => decidirEtapa.mutate({ piloto_id: piloto.id, processo_etapa_id: etapa.id, status: 'aprovado', observacoes: observacao })}>
                                <span className="mr-1.5 text-base leading-none" aria-hidden="true">👍</span> Aprovar
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-700 border-red-200 hover:bg-red-50" disabled={decidirEtapa.isPending || !observacao.trim()}
                                title="Reprovar esta fase"
                                onClick={() => decidirEtapa.mutate({ piloto_id: piloto.id, processo_etapa_id: etapa.id, status: 'reprovado', observacoes: observacao })}>
                                <span className="mr-1.5 text-base leading-none" aria-hidden="true">👎</span> Reprovar
                              </Button>
                            </div>
                          </div>
                          {aprovacao?.responsavel_nome && <p className="text-xs text-muted-foreground mt-2 pl-9">Decidido por {aprovacao.responsavel_nome} em {new Date(aprovacao.data_decisao).toLocaleString('pt-BR')}</p>}
                        </div>
                      );
                    })}
                    <p className="text-xs text-muted-foreground pt-2">Para anexar a imagem da aprovação ou registrar a decisão final, abra o painel completo.</p>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="historico" className="mt-4">
            {(auditoria ?? []).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground"><History className="w-8 h-8 mx-auto mb-2 opacity-30" /> Sem atividades</div>
            ) : (
              <div className="space-y-2">
                {(auditoria ?? []).map((a: any) => (
                  <div key={a.id} className="p-3 rounded-lg border bg-white flex gap-3 items-start">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5', ACAO_COLOR[a.acao] ?? 'bg-gray-100 text-gray-600')}>{a.acao}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700">{a.descricao}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {MODULO_LABEL[a.modulo] ?? a.modulo} · {a.usuario_nome && `${a.usuario_nome} · `}{new Date(a.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PLMLayout>
  );
}
