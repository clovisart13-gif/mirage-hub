import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, FileText, Scissors, Calculator,
  FlaskConical, CheckSquare, History, Package, Plus,
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

const ETAPAS_APROVACAO = [
  { key: 'ficha_tecnica', label: 'Ficha Técnica' },
  { key: 'modelagem', label: 'Modelagem' },
  { key: 'bom_custos', label: 'Custos' },
  { key: 'qualidade_piloto', label: 'Qualidade do Piloto' },
  { key: 'aprovacao_gerencial', label: 'Aprovação Gerencial' },
];

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

  const { data: auditoria } = useQuery({
    queryKey: ['plm-auditoria-produto', id],
    queryFn: () => apiFetch(`/plm/auditoria?produto_id=${id}&limit=30`),
    enabled: !!id,
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

  const { produto, colecao } = data;
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
                {statusCfg && <Badge className={cn('text-xs border', statusCfg.className)}>{statusCfg.label}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {CATEGORIA_LABEL[produto.categoria] ?? produto.categoria}
                {colecao && ` · ${colecao.nome} ${colecao.ano}`}
              </p>
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
          <TabsContent value="aprovacao" className="space-y-3 mt-4">
            {ETAPAS_APROVACAO.map(({ key, label }) => {
              const aprov = (aprovacoes ?? []).find((a: any) => a.etapa === key);
              const status = aprov?.status ?? 'pendente';
              return (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status === 'aprovado' ? 'bg-green-100 text-green-700' : status === 'reprovado' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>
                      {status === 'aprovado' ? 'Aprovado' : status === 'reprovado' ? 'Reprovado' : 'Pendente'}
                    </span>
                    <span className="text-sm font-medium">{label}</span>
                    {aprov?.responsavel_nome && <span className="text-xs text-muted-foreground hidden sm:inline">por {aprov.responsavel_nome}</span>}
                  </div>
                </div>
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
