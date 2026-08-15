import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Factory, Pencil, Trash2 } from 'lucide-react';

interface Fornecedor {
  id: string; nome: string; cnpj: string | null; pix: string | null;
  telefone: string | null; email: string | null; endereco: string | null; ativo: boolean;
}

const EMPTY = { nome: '', cnpj: '', pix: '', telefone: '', email: '', endereco: '' };

export default function KanbanFornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'novo' | 'editar' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () =>
    apiFetch('/kanban/fornecedores')
      .then(setFornecedores)
      .catch(() => toast.error('Erro ao carregar fornecedores'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNovo = () => { setForm(EMPTY); setEditId(null); setDialog('novo'); };
  const openEditar = (f: Fornecedor) => {
    setForm({ nome: f.nome, cnpj: f.cnpj ?? '', pix: f.pix ?? '', telefone: f.telefone ?? '', email: f.email ?? '', endereco: f.endereco ?? '' });
    setEditId(f.id); setDialog('editar');
  };

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const body = { ...form, cnpj: form.cnpj || null, pix: form.pix || null, telefone: form.telefone || null, email: form.email || null, endereco: form.endereco || null };
      if (editId) {
        await apiFetch(`/kanban/fornecedores/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.success('Fornecedor atualizado');
      } else {
        await apiFetch('/kanban/fornecedores', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Fornecedor criado');
      }
      setDialog(null); load();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const excluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir fornecedor "${nome}"?`)) return;
    await apiFetch(`/kanban/fornecedores/${id}`, { method: 'DELETE' });
    toast.success('Fornecedor excluído'); load();
  };

  const filtrados = fornecedores.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return f.nome.toLowerCase().includes(s) || (f.cnpj ?? '').includes(s) || (f.email ?? '').toLowerCase().includes(s);
  });

  const field = (key: keyof typeof form, label: string, placeholder?: string, type = 'text') => (
    <div>
      <Label>{label}</Label>
      <Input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} />
    </div>
  );

  return (
    <KanbanLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-violet-600" />
            <h1 className="text-xl font-bold">Fornecedores</h1>
            <span className="text-sm text-muted-foreground">({filtrados.length})</span>
          </div>
          <Button size="sm" onClick={openNovo} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-1" /> Novo Fornecedor
          </Button>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Nenhum fornecedor cadastrado.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">CNPJ</th>
                  <th className="text-left px-4 py-3 font-medium">PIX / Banco</th>
                  <th className="text-left px-4 py-3 font-medium">Telefone</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((f, i) => (
                  <tr key={f.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-3 font-medium">{f.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs">{f.cnpj ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">{f.pix ?? '—'}</td>
                    <td className="px-4 py-3">{f.telefone ?? '—'}</td>
                    <td className="px-4 py-3">{f.email ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditar(f)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => excluir(f.id, f.nome)} className="p-1 rounded hover:bg-muted">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={dialog !== null} onOpenChange={o => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === 'novo' ? 'Novo Fornecedor' : 'Editar Fornecedor'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {field('nome', 'Nome *', 'Confecções Silva')}
            {field('cnpj', 'CNPJ', '00.000.000/0001-00')}
            {field('pix', 'PIX / Banco', 'CPF, CNPJ, chave aleatória...')}
            {field('telefone', 'Telefone', '(11) 99999-0000')}
            {field('email', 'E-mail', '', 'email')}
            {field('endereco', 'Endereço', 'Rua, número, cidade...')}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving} className="bg-violet-600 hover:bg-violet-700">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </KanbanLayout>
  );
}
