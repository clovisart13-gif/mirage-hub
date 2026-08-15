import { useState, useEffect } from 'react';
import { useSearch } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Scissors, Download, Link as LinkIcon } from 'lucide-react';

const TAMANHOS_BASE = ['PP', 'P', 'M', 'G', 'GG', 'XGG', '34', '36', '38', '40', '42', '44', '46'];

export default function PLMModelagem() {
  const qc = useQueryClient();
  const search = useSearch();
  const [modal, setModal] = useState(false);
  const [produtoId, setProdutoId] = useState('');
  const [tamanhoBase, setTamanhoBase] = useState('');
  const [arquivoUrl, setArquivoUrl] = useState('');
  const [descricaoAlteracoes, setDescricaoAlteracoes] = useState('');
  const [observacoes, setObservacoes] = useState('');

  // Auto-abre o modal se vier de produto-detalhe via ?produto_id=X&open=1
  useEffect(() => {
    const params = new URLSearchParams(search);
    const pid = params.get('produto_id');
    const open = params.get('open');
    if (pid && open === '1') {
      setProdutoId(pid);
      setModal(true);
    }
  }, [search]);

  const { data: moldes, isLoading } = useQuery({
    queryKey: ['plm-moldes'],
    queryFn: () => apiFetch('/plm/modelagem'),
  });

  const { data: produtos } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });

  const save = useMutation({
    mutationFn: (data: any) => apiFetch('/plm/modelagem', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-moldes'] });
      toast.success('Molde cadastrado!');
      setModal(false);
      setProdutoId(''); setTamanhoBase(''); setArquivoUrl(''); setDescricaoAlteracoes(''); setObservacoes('');
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const prodMap = Object.fromEntries((produtos ?? []).map((p: any) => [String(p.produto.id), p.produto]));

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Modelagem</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Moldes e arquivos de modelagem</p>
          </div>
          <Button onClick={() => setModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Molde
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : (moldes ?? []).length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhum molde cadastrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(moldes ?? []).map((m: any) => {
              const produto = prodMap[String(m.produto_id)];
              return (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">
                        {produto?.nome ?? `Produto #${m.produto_id}`} — Molde v{m.versao}
                        {m.tamanho_base && <span className="text-muted-foreground ml-2">Base {m.tamanho_base}</span>}
                      </p>
                      {m.descricao_alteracoes && <p className="text-xs text-muted-foreground mt-0.5">{m.descricao_alteracoes}</p>}
                    </div>
                    {m.arquivo_url && (
                      <a href={m.arquivo_url} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5 mr-2" /> Baixar</Button>
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Molde</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); save.mutate({ produto_id: produtoId, tamanho_base: tamanhoBase, arquivo_url: arquivoUrl || null, descricao_alteracoes: descricaoAlteracoes, observacoes }); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Produto *</Label>
              <Select value={produtoId} onValueChange={setProdutoId} required>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{(produtos ?? []).map((p: any) => <SelectItem key={p.produto.id} value={String(p.produto.id)}>{p.produto.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tamanho base</Label>
              <Select value={tamanhoBase} onValueChange={setTamanhoBase}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{TAMANHOS_BASE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Link da modelagem</Label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="url"
                  className="pl-9"
                  placeholder="https://drive.google.com/... ou outro endereço"
                  value={arquivoUrl}
                  onChange={e => setArquivoUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">Cole o link onde o arquivo de modelagem está armazenado (Google Drive, Dropbox, etc.)</p>
            </div>
            <div className="space-y-1.5"><Label>Descrição das alterações</Label><Textarea value={descricaoAlteracoes} onChange={e => setDescricaoAlteracoes(e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label>Observações</Label><Input value={observacoes} onChange={e => setObservacoes(e.target.value)} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending} className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
