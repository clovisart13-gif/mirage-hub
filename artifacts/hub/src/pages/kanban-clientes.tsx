import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, Loader2, Users, Pencil, Trash2 } from 'lucide-react';

interface Cliente {
  id: string; nome: string; cnpj: string | null; email: string | null;
  telefone: string | null; endereco: string | null; cidade: string | null; estado: string | null; ativo: boolean;
}

const EMPTY = { nome: '', cnpj: '', email: '', telefone: '', endereco: '', cidade: '', estado: '' };

export default function KanbanClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<'novo' | 'editar' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState<string | null>(null);

  const load = () =>
    apiFetch('/kanban/clientes')
      .then(setClientes)
      .catch(() => toast.error('Erro ao carregar clientes'))
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const openNovo = () => { setForm(EMPTY); setEditId(null); setDialog('novo'); };
  const openEditar = (c: Cliente) => {
    setForm({ nome: c.nome, cnpj: c.cnpj ?? '', email: c.email ?? '', telefone: c.telefone ?? '', endereco: c.endereco ?? '', cidade: c.cidade ?? '', estado: c.estado ?? '' });
    setEditId(c.id); setDialog('editar');
  };

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    setSaving(true);
    try {
      const body = { ...form, cnpj: form.cnpj || null, email: form.email || null, telefone: form.telefone || null, endereco: form.endereco || null, cidade: form.cidade || null, estado: form.estado || null };
      if (editId) {
        await apiFetch(`/kanban/clientes/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
        toast.success('Cliente atualizado');
      } else {
        await apiFetch('/kanban/clientes', { method: 'POST', body: JSON.stringify(body) });
        toast.success('Cliente criado');
      }
      setDialog(null); load();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  };

  const excluir = async (id: string, nome: string) => {
    if (!confirm(`Excluir cliente "${nome}"?`)) return;
    await apiFetch(`/kanban/clientes/${id}`, { method: 'DELETE' });
    toast.success('Cliente excluído'); load();
  };

  const filtrados = clientes.filter(c => {
    if (!search) return true;
    const s = search.toLowerCase();
    return c.nome.toLowerCase().includes(s) || (c.cidade ?? '').toLowerCase().includes(s) || (c.email ?? '').toLowerCase().includes(s);
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
            <Users className="w-5 h-5 text-violet-600" />
            <h1 className="text-xl font-bold">Clientes</h1>
            <span className="text-sm text-muted-foreground">({filtrados.length})</span>
          </div>
          <Button size="sm" onClick={openNovo} className="bg-violet-600 hover:bg-violet-700">
            <Plus className="w-4 h-4 mr-1" /> Novo Cliente
          </Button>
        </div>

        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-violet-600" /></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">Nenhum cliente cadastrado.</div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium">CNPJ</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Telefone</th>
                  <th className="text-left px-4 py-3 font-medium">Cidade / UF</th>
                  <th className="w-16"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => (
                  <tr key={c.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                    <td className="px-4 py-3 font-medium">{c.nome}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.cnpj ?? '—'}</td>
                    <td className="px-4 py-3">{c.email ?? '—'}</td>
                    <td className="px-4 py-3">{c.telefone ?? '—'}</td>
                    <td className="px-4 py-3">{c.cidade ? `${c.cidade}${c.estado ? ` / ${c.estado}` : ''}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openEditar(c)} className="p-1 rounded hover:bg-muted">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        <button onClick={() => excluir(c.id, c.nome)} className="p-1 rounded hover:bg-muted">
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
            <DialogTitle>{dialog === 'novo' ? 'Novo Cliente' : 'Editar Cliente'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {field('nome', 'Nome *', 'Marca ABC')}
            {field('cnpj', 'CNPJ', '00.000.000/0001-00')}
            {field('email', 'E-mail', '', 'email')}
            {field('telefone', 'Telefone', '(11) 99999-0000')}
            {field('endereco', 'Endereço', 'Rua, número...')}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">{field('cidade', 'Cidade', 'São Paulo')}</div>
              <div>{field('estado', 'UF', 'SP')}</div>
            </div>
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
