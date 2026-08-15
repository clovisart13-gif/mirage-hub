import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Calculator, ArrowRight, Package } from 'lucide-react';

export default function PLMBomLista() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [produtoId, setProdutoId] = useState('');
  const [custoMdo, setCustoMdo] = useState('0');
  const [custosIndiretos, setCustosIndiretos] = useState('0');
  const [margemLucro, setMargemLucro] = useState('0');

  const { data: boms, isLoading } = useQuery({
    queryKey: ['plm-boms'],
    queryFn: () => apiFetch('/plm/bom'),
  });

  const { data: produtos } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  const save = useMutation({
    mutationFn: (data: any) => apiFetch('/plm/bom', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-boms'] });
      toast.success('Ficha de custo criada!');
      setModal(false);
      setProdutoId(''); setCustoMdo('0'); setCustosIndiretos('0'); setMargemLucro('0');
    },
    onError: () => toast.error('Erro ao criar ficha de custo'),
  });

  const prodMap = Object.fromEntries((produtos ?? []).map((p: any) => [String(p.produto.id), p.produto]));

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Custos</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Fichas de custo com materiais, mão de obra e composição</p>
          </div>
          <Button onClick={() => setModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Nova ficha de custo
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (boms ?? []).length === 0 ? (
          <div className="text-center py-12">
            <Calculator className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma ficha de custo criada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(boms ?? []).map((b: any) => {
              const produto = prodMap[String(b.produto_id)];
              const totalMat = 0;
              const precoVenda = parseFloat(b.preco_venda ?? 0);
              return (
                <Link key={b.id} href={`/hub/plm/bom/${b.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                        <Calculator className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {b.codigo && (
                            <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              {b.codigo}
                            </span>
                          )}
                          <p className="font-medium">{produto?.nome ?? `Produto #${b.produto_id}`} — Versão {b.versao}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          M.O.: R$ {parseFloat(b.custo_mao_de_obra ?? 0).toFixed(2)} ·
                          Indiretos: R$ {parseFloat(b.custos_indiretos ?? 0).toFixed(2)} ·
                          Margem: {b.margem_lucro ?? 0}% ·
                          Venda: <strong>R$ {precoVenda.toFixed(2)}</strong>
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova ficha de custo</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); save.mutate({ produto_id: produtoId, custo_mao_de_obra: custoMdo, custos_indiretos: custosIndiretos, margem_lucro: margemLucro }); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={produtoId} onValueChange={setProdutoId} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{(produtos ?? []).map((p: any) => <SelectItem key={p.produto.id} value={String(p.produto.id)}>{p.produto.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label>M.O. (R$)</Label><Input type="number" step="0.01" value={custoMdo} onChange={e => setCustoMdo(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Indiretos (R$)</Label><Input type="number" step="0.01" value={custosIndiretos} onChange={e => setCustosIndiretos(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Margem (%)</Label><Input type="number" step="0.01" value={margemLucro} onChange={e => setMargemLucro(e.target.value)} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending} className="bg-indigo-600 hover:bg-indigo-700">Criar ficha de custo</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
