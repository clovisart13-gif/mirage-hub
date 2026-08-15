import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { Plus, Search, Package, ArrowRight, Calendar } from 'lucide-react';
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

export default function PLMProdutos() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const { data: produtos, isLoading } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  const filtered = useMemo(() => {
    if (!produtos) return [];
    return produtos.filter(({ produto }: any) => {
      const matchSearch = !search || produto.nome.toLowerCase().includes(search.toLowerCase()) || (produto.referencia ?? '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'todos' || produto.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [produtos, search, statusFilter]);

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerencie todos os produtos em desenvolvimento</p>
          </div>
          <Link href="/hub/plm/produtos/novo">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" /> Novo Produto
            </Button>
          </Link>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou referência..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhum produto encontrado</p>
            <Link href="/hub/plm/produtos/novo">
              <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" size="sm">
                <Plus className="w-4 h-4 mr-2" /> Novo Produto
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(({ produto, colecao }: any) => {
              const statusCfg = STATUS_CONFIG[produto.status as keyof typeof STATUS_CONFIG];
              return (
                <Link key={produto.id} href={`/hub/plm/produtos/${produto.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
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
                            {produto.referencia && (
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                Ref: {produto.referencia}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">{CATEGORIA_LABEL[produto.categoria] ?? produto.categoria}</span>
                            {colecao && <span className="text-xs text-muted-foreground">· {colecao.nome}</span>}
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
              );
            })}
          </div>
        )}
      </div>
    </PLMLayout>
  );
}
