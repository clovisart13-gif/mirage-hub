import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { CheckSquare, Package, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ETAPAS = [
  { key: 'ficha_tecnica', label: 'Ficha Técnica' },
  { key: 'modelagem', label: 'Modelagem' },
  { key: 'bom_custos', label: 'Custos' },
  { key: 'qualidade_piloto', label: 'Qualidade do Piloto' },
  { key: 'aprovacao_gerencial', label: 'Aprovação Gerencial' },
];

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-700' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-700' },
} as const;

const PRODUTO_STATUS = {
  rascunho: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  desenvolvimento: { label: 'Desenvolvimento', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  pilotagem: { label: 'Pilotagem', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  aprovado: { label: 'Aprovado', className: 'bg-green-50 text-green-700 border-green-200' },
} as const;

export default function PLMAprovacoes() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();

  const { data: produtos, isLoading: produtosLoading } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  const { data: aprovacoes, isLoading: aprovLoading } = useQuery({
    queryKey: ['plm-aprovacoes'],
    queryFn: () => apiFetch('/plm/aprovacoes'),
  });

  const decidir = useMutation({
    mutationFn: (data: { produto_id: number; etapa: string; status: string; observacoes?: string }) =>
      apiFetch('/plm/aprovacoes', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-aprovacoes'] });
      toast.success('Aprovação registrada!');
    },
    onError: () => toast.error('Erro ao registrar aprovação'),
  });

  const getAprovacao = (produtoId: number, etapa: string) =>
    (aprovacoes ?? []).find((a: any) => a.produto_id === produtoId && a.etapa === etapa);

  const isLoading = produtosLoading || aprovLoading;
  const produtosEmDesenvolvimento = (produtos ?? []).filter((p: any) =>
    ['desenvolvimento', 'pilotagem'].includes(p.produto.status)
  );

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Aprovações</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Checklist de aprovação por produto</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
        ) : produtosEmDesenvolvimento.length === 0 ? (
          <div className="text-center py-16">
            <CheckSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Nenhum produto em aprovação</p>
            <p className="text-sm text-muted-foreground mt-1">Produtos em desenvolvimento ou pilotagem aparecem aqui</p>
          </div>
        ) : produtosEmDesenvolvimento.map(({ produto }: any) => {
          const pStatus = PRODUTO_STATUS[produto.status as keyof typeof PRODUTO_STATUS];
          return (
            <Card key={produto.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Package className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{produto.nome}</CardTitle>
                      {produto.referencia && <p className="text-xs text-muted-foreground">Ref: {produto.referencia}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pStatus && <Badge className={cn('text-xs border', pStatus.className)}>{pStatus.label}</Badge>}
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/hub/plm/produtos/${produto.id}`)}>
                      Ver produto
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ETAPAS.map(({ key, label }) => {
                    const aprov = getAprovacao(produto.id, key);
                    const status = aprov?.status ?? 'pendente';
                    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg?.className ?? 'bg-gray-100 text-gray-700')}>
                            {cfg?.label ?? 'Pendente'}
                          </span>
                          <span className="text-sm font-medium">{label}</span>
                          {aprov?.responsavel_nome && (
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              por {aprov.responsavel_nome} · {new Date(aprov.data_decisao).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm" variant="outline"
                            className="text-green-700 border-green-200 hover:bg-green-50 h-7 px-2"
                            onClick={() => decidir.mutate({ produto_id: produto.id, etapa: key, status: 'aprovado' })}
                            disabled={decidir.isPending}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50 h-7 px-2"
                            onClick={() => decidir.mutate({ produto_id: produto.id, etapa: key, status: 'reprovado' })}
                            disabled={decidir.isPending}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </PLMLayout>
  );
}
