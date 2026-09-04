import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { Plus, Search, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  rascunho: 'bg-gray-100 text-gray-700',
  em_revisao: 'bg-amber-100 text-amber-700',
  aprovada: 'bg-green-100 text-green-700',
} as const;

const STATUS_LABEL: Record<string, string> = { rascunho: 'Rascunho', em_revisao: 'Em Revisão', aprovada: 'Aprovada' };

export default function PLMFichas() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ produto_id: '', referencia: '', referencia_cliente: '', familia: '', tipo_costura: '', etiqueta_composicao_url: '', observacoes: '' });
  const [uploadingEtiqueta, setUploadingEtiqueta] = useState(false);
  const etiquetaInputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();

  const { data: fichas, isLoading: fichasLoading } = useQuery({
    queryKey: ['plm-fichas'],
    queryFn: () => apiFetch('/plm/fichas'),
  });

  const { data: produtos } = useQuery({
    queryKey: ['plm-produtos'],
    queryFn: () => apiFetch('/plm/produtos'),
  });
  const { data: fichasDistinct } = useQuery({
    queryKey: ['custos-fichas-distinct-values'],
    queryFn: () => apiFetch('/custos/fichas/distinct-values'),
  });
  const familias: string[] = fichasDistinct?.familias ?? [];

  const prodList: any[] = (produtos ?? []).map((p: any) => p.produto);
  const prodMap = Object.fromEntries(prodList.map(p => [p.id, p]));

  const mutation = useMutation({
    mutationFn: (body: object) => apiFetch('/plm/fichas', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-fichas'] });
      setOpen(false);
       setForm({ produto_id: '', referencia: '', referencia_cliente: '', familia: '', tipo_costura: '', etiqueta_composicao_url: '', observacoes: '' });
      toast.success('Ficha técnica criada com sucesso');
    },
    onError: () => toast.error('Erro ao criar ficha técnica'),
  });

  const filtered = (fichas ?? []).filter((f: any) =>
    !search ||
    (f.titulo ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (prodMap[f.produto_id]?.nome ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.produto_id) { toast.error('Selecione um produto'); return; }
    if (!form.referencia.trim()) { toast.error('Informe a referência da ficha'); return; }
    mutation.mutate({
      produto_id: Number(form.produto_id),
      referencia: form.referencia || undefined,
      referencia_cliente: form.referencia_cliente || undefined,
      familia: form.familia || undefined,
      tipo_costura: form.tipo_costura || undefined,
      etiqueta_composicao_url: form.etiqueta_composicao_url || undefined,
      observacoes: form.observacoes || undefined,
    });
  };

  const handleProdutoChange = (produtoId: string) => {
    const produto = prodList.find(p => String(p.id) === produtoId);
    setForm(f => ({
      ...f,
      produto_id: produtoId,
      referencia: produto?.referencia ?? '',
      referencia_cliente: produto?.referencia_cliente ?? '',
      familia: produto?.categoria ?? '',
    }));
  };

  const handleEtiquetaUpload = async (file: File) => {
    setUploadingEtiqueta(true);
    try {
      const meta = await apiFetch('/storage/uploads/request-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      await fetch(meta.uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      setForm(f => ({ ...f, etiqueta_composicao_url: `/api/storage/objects${meta.objectPath}` }));
      toast.success('Imagem da etiqueta anexada');
    } catch (err: any) {
      toast.error(err?.message || 'Não foi possível anexar a etiqueta');
    } finally {
      setUploadingEtiqueta(false);
    }
  };

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fichas Técnicas</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Todas as fichas de todos os produtos</p>
          </div>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} /> Nova Ficha
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por título ou produto..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {fichasLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border rounded-2xl bg-muted/20">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Nenhuma ficha técnica encontrada</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Crie a primeira ficha para começar</p>
            <Button onClick={() => setOpen(true)} variant="outline" className="gap-2">
              <Plus size={14} /> Criar ficha técnica
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((f: any) => {
              const produto = prodMap[f.produto_id];
              return (
                <Link key={f.id} href={`/hub/plm/fichas/${f.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer border-border">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {f.codigo && (
                            <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                              {f.codigo}
                            </span>
                          )}
                           <p className="font-medium">{f.referencia ?? f.titulo ?? `Ficha Técnica v${f.versao}`}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {produto && <span className="text-xs text-muted-foreground">Produto: <span className="font-medium text-foreground">{produto.nome}</span></span>}
                           {f.referencia_cliente && <span className="text-xs text-indigo-700">· Ref. cliente: {f.referencia_cliente}</span>}
                          {f.familia && <span className="text-xs text-muted-foreground">· {f.familia}</span>}
                          {f.tipo_costura && <span className="text-xs text-muted-foreground">· {f.tipo_costura}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG] ?? 'bg-gray-100 text-gray-600')}>
                          {STATUS_LABEL[f.status] ?? f.status}
                        </span>
                        <Badge variant="outline">v{f.versao}</Badge>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dialog Nova Ficha ────────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Ficha Técnica</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Produto <span className="text-red-500">*</span></Label>
               <Select value={form.produto_id} onValueChange={handleProdutoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {prodList.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.referencia ? `[${p.referencia}] ` : ''}{p.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
               <Label>Referência</Label>
               <Input placeholder="Selecione um produto para preencher" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                 <Label>Referência do cliente</Label>
                 <Input placeholder="Ex: REF-CLIENTE-001" value={form.referencia_cliente} onChange={e => setForm(f => ({ ...f, referencia_cliente: e.target.value }))} />
               </div>
              <div className="space-y-1.5">
                <Label>Família</Label>
                <Select value={form.familia} onValueChange={v => setForm(f => ({ ...f, familia: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Família..." />
                  </SelectTrigger>
                  <SelectContent>
                    {familias.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de costura</Label>
                <Input placeholder="Ex: Overlock 3 fios" value={form.tipo_costura} onChange={e => setForm(f => ({ ...f, tipo_costura: e.target.value }))} />
              </div>
            </div>

             <div className="space-y-1.5">
               <Label>Etiqueta de composição</Label>
               <input
                 ref={etiquetaInputRef}
                 type="file"
                 accept="image/*"
                 className="hidden"
                 onChange={e => {
                   const file = e.target.files?.[0];
                   if (file) void handleEtiquetaUpload(file);
                   e.target.value = '';
                 }}
               />
               <div className="flex items-center gap-3">
                 <Button type="button" variant="outline" onClick={() => etiquetaInputRef.current?.click()} disabled={uploadingEtiqueta}>
                   {uploadingEtiqueta ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
                   {form.etiqueta_composicao_url ? 'Trocar imagem' : 'Anexar imagem'}
                 </Button>
                 {form.etiqueta_composicao_url && <span className="text-xs text-muted-foreground truncate">Imagem anexada</span>}
               </div>
               <p className="text-xs text-muted-foreground">Anexe a foto da etiqueta com composição e instruções de lavagem.</p>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações gerais sobre a ficha..." rows={3} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Criar Ficha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
