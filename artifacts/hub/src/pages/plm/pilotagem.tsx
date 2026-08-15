import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, FlaskConical, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const ETAPAS = ['corte', 'costura', 'acabamento', 'controle_qualidade'] as const;
const ETAPA_LABEL: Record<string, string> = { corte: 'Corte', costura: 'Costura', acabamento: 'Acabamento', controle_qualidade: 'Controle de Qualidade' };
const RESULTADO_CONFIG: Record<string, { label: string; className: string }> = {
  passou: { label: 'Passou', className: 'bg-green-100 text-green-700' },
  falhou: { label: 'Falhou', className: 'bg-red-100 text-red-700' },
  ajuste_necessario: { label: 'Ajuste Necessário', className: 'bg-amber-100 text-amber-700' },
  pendente: { label: 'Pendente', className: 'bg-gray-100 text-gray-600' },
};
const STATUS_PILOTO: Record<string, { label: string; className: string }> = {
  em_andamento: { label: 'Em Andamento', className: 'bg-blue-100 text-blue-700' },
  concluido: { label: 'Concluído', className: 'bg-gray-100 text-gray-700' },
  reprovado: { label: 'Reprovado', className: 'bg-red-100 text-red-700' },
  aprovado: { label: 'Aprovado', className: 'bg-green-100 text-green-700' },
};

export default function PLMPilotagem() {
  const qc = useQueryClient();
  const [novoPilotoModal, setNovoPilotoModal] = useState(false);
  const [selectedProdutoId, setSelectedProdutoId] = useState('');
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { data: pilotos, isLoading } = useQuery({
    queryKey: ['plm-pilotos'],
    queryFn: () => apiFetch('/plm/pilotos'),
  });

  const { data: produtos } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  const criarPiloto = useMutation({
    mutationFn: () => apiFetch('/plm/pilotos', { method: 'POST', body: JSON.stringify({ produto_id: selectedProdutoId }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      toast.success('Piloto criado!');
      setNovoPilotoModal(false);
      setSelectedProdutoId('');
    },
    onError: () => toast.error('Erro ao criar piloto'),
  });

  const atualizarStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch(`/plm/pilotos/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      toast.success('Status atualizado!');
    },
  });

  const atualizarEtapa = useMutation({
    mutationFn: ({ pilotoId, etapa, resultado }: { pilotoId: number; etapa: string; resultado: string }) =>
      apiFetch(`/plm/pilotos/${pilotoId}/etapas`, { method: 'POST', body: JSON.stringify({ etapa, resultado }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-pilotos'] });
      toast.success('Etapa registrada!');
    },
  });

  const prodMap = Object.fromEntries((produtos ?? []).map((p: any) => [p.produto.id, p.produto]));

  const toggleExpanded = (id: number) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Pilotagem</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Acompanhe a produção dos pilotos</p>
          </div>
          <Button onClick={() => setNovoPilotoModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Piloto
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        ) : (pilotos ?? []).length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum piloto cadastrado</p>
          </div>
        ) : (pilotos ?? []).map((p: any) => {
          const produto = prodMap[p.produto_id];
          const isOpen = expanded[p.id];
          const statusCfg = STATUS_PILOTO[p.status] ?? STATUS_PILOTO.em_andamento;
          return (
            <Card key={p.id} className="overflow-hidden">
              <CardHeader className="pb-3 cursor-pointer" onClick={() => toggleExpanded(p.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <FlaskConical className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        Piloto #{p.numero_piloto}
                        {produto && <span className="font-normal text-muted-foreground ml-2">— {produto.nome}</span>}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={p.status} onValueChange={status => atualizarStatus.mutate({ id: p.id, status })}>
                      <SelectTrigger className="w-36 h-7 text-xs" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_PILOTO).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {isOpen && (
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ETAPAS.map(etapa => {
                      const resultado = 'pendente';
                      const resCfg = RESULTADO_CONFIG[resultado];
                      return (
                        <div key={etapa} className="rounded-lg border p-3 space-y-2">
                          <p className="text-xs font-medium">{ETAPA_LABEL[etapa]}</p>
                          <Select
                            defaultValue={resultado}
                            onValueChange={r => atualizarEtapa.mutate({ pilotoId: p.id, etapa, resultado: r })}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(RESULTADO_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <Dialog open={novoPilotoModal} onOpenChange={setNovoPilotoModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Piloto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Produto</label>
              <Select value={selectedProdutoId} onValueChange={setSelectedProdutoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {(produtos ?? []).map((p: any) => (
                    <SelectItem key={p.produto.id} value={String(p.produto.id)}>{p.produto.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNovoPilotoModal(false)}>Cancelar</Button>
              <Button onClick={() => criarPiloto.mutate()} disabled={!selectedProdutoId || criarPiloto.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                Criar piloto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
