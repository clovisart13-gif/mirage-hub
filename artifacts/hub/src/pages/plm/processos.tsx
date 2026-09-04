import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ListOrdered, Plus } from 'lucide-react';

export default function PLMProcessos() {
  const qc = useQueryClient();
  const [processo, setProcesso] = useState({ nome: '', numero: '' });
  const [etapas, setEtapas] = useState<Record<number, { nome: string; sequencia: string }>>({});
  const { data: processos, isLoading } = useQuery({
    queryKey: ['plm-processos'],
    queryFn: () => apiFetch('/plm/processos'),
  });

  const criarProcesso = useMutation({
    mutationFn: () => apiFetch('/plm/processos', {
      method: 'POST',
      body: JSON.stringify({ nome: processo.nome, sequencia: processo.numero }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-processos'] });
      setProcesso({ nome: '', numero: '' });
      toast.success('Processo criado. Agora adicione as etapas na sequência.');
    },
    onError: (error: any) => toast.error(error?.message || 'Não foi possível criar o processo'),
  });

  const criarEtapa = useMutation({
    mutationFn: ({ processoId, nome, sequencia }: { processoId: number; nome: string; sequencia: string }) =>
      apiFetch(`/plm/processos/${processoId}/etapas`, {
        method: 'POST',
        body: JSON.stringify({ nome, sequencia }),
      }),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['plm-processos'] });
      setEtapas(prev => ({ ...prev, [variables.processoId]: { nome: '', sequencia: '' } }));
      toast.success('Etapa adicionada!');
    },
    onError: (error: any) => toast.error(error?.message || 'Não foi possível adicionar a etapa'),
  });

  const atualizarAtivo = useMutation({
    mutationFn: ({ id, ativo }: { id: number; ativo: boolean }) =>
      apiFetch(`/plm/processos/${id}`, { method: 'PATCH', body: JSON.stringify({ ativo }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plm-processos'] }),
  });

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold">Processos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Banco de roteiros para pilotagem e aprovações</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Plus className="w-4 h-4" /> Novo processo</CardTitle>
            <p className="text-xs text-muted-foreground">Crie um roteiro genérico. Os nomes das peças abaixo são exemplos; você poderá cadastrar qualquer processo.</p>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-[1fr_160px_auto] gap-3 items-end">
            <div className="space-y-1.5"><Label>Nome do processo</Label><Input value={processo.nome} onChange={e => setProcesso(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Camiseta Básica" /></div>
            <div className="space-y-1.5"><Label>Número / sequência</Label><Input type="number" min="1" value={processo.numero} onChange={e => setProcesso(p => ({ ...p, numero: e.target.value }))} placeholder="Ex: 1" /></div>
            <Button disabled={!processo.nome.trim() || !processo.numero || criarProcesso.isPending} onClick={() => criarProcesso.mutate()}>Criar processo</Button>
          </CardContent>
        </Card>

        {isLoading ? <p className="text-sm text-muted-foreground">Carregando processos...</p> : (
          <div className="space-y-4">
            {(processos ?? []).map((item: any) => {
              const etapa = etapas[item.id] ?? { nome: '', sequencia: '' };
              const etapasAtivas = (item.etapas ?? []).filter((e: any) => e.ativo);
              return (
                <Card key={item.id} className={!item.ativo ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">Processo {item.sequencia} — {item.nome}</CardTitle>
                      <Button variant="ghost" size="sm" onClick={() => atualizarAtivo.mutate({ id: item.id, ativo: !item.ativo })}>{item.ativo ? 'Desativar' : 'Ativar'}</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {etapasAtivas.map((e: any) => (
                        <div key={e.id} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
                          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">{e.sequencia}</span>
                          <span>{e.nome}</span>
                        </div>
                      ))}
                      {etapasAtivas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada.</p>}
                    </div>
                    <div className="grid sm:grid-cols-[1fr_140px_auto] gap-2 pt-3 border-t">
                      <Input placeholder="Nome da etapa (ex: Modelagem)" value={etapa.nome} onChange={e => setEtapas(prev => ({ ...prev, [item.id]: { ...etapa, nome: e.target.value } }))} />
                      <Input type="number" min="1" placeholder="Sequência" value={etapa.sequencia} onChange={e => setEtapas(prev => ({ ...prev, [item.id]: { ...etapa, sequencia: e.target.value } }))} />
                      <Button variant="outline" disabled={!etapa.nome.trim() || !etapa.sequencia || criarEtapa.isPending} onClick={() => criarEtapa.mutate({ processoId: item.id, ...etapa })}>Adicionar etapa</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {(processos ?? []).length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <ListOrdered className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Nenhum processo cadastrado.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PLMLayout>
  );
}