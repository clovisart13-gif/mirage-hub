import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Truck, Pencil, Mail, Phone } from 'lucide-react';

const emptyForm = () => ({ nome: '', cnpj: '', contato: '', email: '', telefone: '', cidade: '', estado: '', observacoes: '' });

export default function PLMFornecedores() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: fornecedores, isLoading } = useQuery({
    queryKey: ['plm-fornecedores'],
    queryFn: () => apiFetch('/plm/fornecedores'),
  });

  const save = useMutation({
    mutationFn: (data: any) => editando
      ? apiFetch(`/plm/fornecedores/${editando.id}`, { method: 'PATCH', body: JSON.stringify(data) })
      : apiFetch('/plm/fornecedores', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-fornecedores'] });
      toast.success(editando ? 'Fornecedor atualizado!' : 'Fornecedor cadastrado!');
      setModalOpen(false); setEditando(null); setForm(emptyForm());
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const abrirEditar = (f: any) => {
    setEditando(f);
    setForm({ nome: f.nome, cnpj: f.cnpj ?? '', contato: f.contato ?? '', email: f.email ?? '', telefone: f.telefone ?? '', cidade: f.cidade ?? '', estado: f.estado ?? '', observacoes: f.observacoes ?? '' });
    setModalOpen(true);
  };

  const filtered = (fornecedores ?? []).filter((f: any) =>
    !search || f.nome.toLowerCase().includes(search.toLowerCase()) || (f.cidade ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fornecedores</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Cadastro de fornecedores de materiais</p>
          </div>
          <Button onClick={() => { setEditando(null); setForm(emptyForm()); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Fornecedor
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {isLoading ? <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-2 text-center py-12">
                <Truck className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum fornecedor cadastrado</p>
              </div>
            ) : filtered.map((f: any) => (
              <Card key={f.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Truck className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {f.codigo && (
                        <span className="text-xs font-mono font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded">
                          {f.codigo}
                        </span>
                      )}
                      <p className="font-semibold text-sm">{f.nome}</p>
                    </div>
                    {(f.cidade || f.estado) && <p className="text-xs text-muted-foreground">{[f.cidade, f.estado].filter(Boolean).join(' - ')}</p>}
                    <div className="flex gap-3 mt-1 flex-wrap">
                      {f.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail className="w-3 h-3" />{f.email}</span>}
                      {f.telefone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone className="w-3 h-3" />{f.telefone}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editando ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); save.mutate(form); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1"><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Contato</Label><Input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Cidade</Label><Input value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Estado (UF)</Label><Input value={form.estado} maxLength={2} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending} className="bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
