import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, ShoppingBag, Pencil, Loader2 } from 'lucide-react';

const TIPOS = ['todos', 'tecido', 'aviamento', 'insumo', 'embalagem'] as const;
const UNIDADES = ['metro', 'kg', 'unidade', 'duzia', 'rolo', 'par'] as const;
const TIPO_LABEL: Record<string, string> = { tecido: 'Tecido', aviamento: 'Aviamento', insumo: 'Insumo', embalagem: 'Embalagem' };
const TIPO_COLOR: Record<string, string> = { tecido: 'bg-blue-100 text-blue-700', aviamento: 'bg-purple-100 text-purple-700', insumo: 'bg-amber-100 text-amber-700', embalagem: 'bg-green-100 text-green-700' };

const emptyForm = () => ({ fornecedor_id: '', tipo: '', codigo: '', descricao: '', unidade: '', preco_unitario: '', cor: '', composicao: '', observacoes: '' });

export default function PLMMateriais() {
  const qc = useQueryClient();
  const [tipoFiltro, setTipoFiltro] = useState('todos');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());

  const { data: materiais, isLoading } = useQuery({
    queryKey: ['plm-materiais'],
    queryFn: () => apiFetch('/plm/materiais'),
  });

  const { data: fornecedores } = useQuery({
    queryKey: ['plm-fornecedores'],
    queryFn: () => apiFetch('/plm/fornecedores'),
  });

  const save = useMutation({
    mutationFn: (data: any) => editando
      ? apiFetch(`/plm/materiais/${editando.id}`, { method: 'PATCH', body: JSON.stringify(data) })
      : apiFetch('/plm/materiais', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-materiais'] });
      toast.success(editando ? 'Material atualizado!' : 'Material cadastrado!');
      setModalOpen(false);
      setEditando(null);
      setForm(emptyForm());
    },
    onError: () => toast.error('Erro ao salvar'),
  });

  const abrirNovo = () => { setEditando(null); setForm(emptyForm()); setModalOpen(true); };
  const abrirEditar = (m: any) => {
    setEditando(m);
    setForm({ fornecedor_id: m.fornecedor_id ? String(m.fornecedor_id) : 'none', tipo: m.tipo, codigo: m.codigo ?? '', descricao: m.descricao, unidade: m.unidade, preco_unitario: m.preco_unitario, cor: m.cor ?? '', composicao: m.composicao ?? '', observacoes: m.observacoes ?? '' });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    save.mutate({ ...form, fornecedor_id: (form.fornecedor_id && form.fornecedor_id !== 'none') ? form.fornecedor_id : null });
  };

  const filtered = (materiais ?? []).filter((d: any) => {
    const matchTipo = tipoFiltro === 'todos' || d.material.tipo === tipoFiltro;
    const matchSearch = !search || d.material.descricao.toLowerCase().includes(search.toLowerCase()) || (d.material.codigo ?? '').toLowerCase().includes(search.toLowerCase());
    return matchTipo && matchSearch;
  });

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Materiais</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Tecidos, aviamentos e insumos</p>
          </div>
          <Button onClick={abrirNovo} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Material
          </Button>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Tabs value={tipoFiltro} onValueChange={setTipoFiltro}>
            <TabsList>
              {TIPOS.map(t => <TabsTrigger key={t} value={t}>{t === 'todos' ? 'Todos' : TIPO_LABEL[t]}</TabsTrigger>)}
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div> : (
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-muted-foreground">Nenhum material encontrado</p>
              </div>
            ) : filtered.map(({ material, fornecedor }: any) => (
              <Card key={material.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_COLOR[material.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                    {TIPO_LABEL[material.tipo] ?? material.tipo}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{material.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {material.codigo && `Cód: ${material.codigo} · `}
                      {material.unidade} · R$ {parseFloat(material.preco_unitario).toFixed(2).replace('.', ',')}
                      {fornecedor && ` · ${fornecedor.nome}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => abrirEditar(material)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar Material' : 'Novo Material'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Descrição *</Label>
                <Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))} required>
                  <SelectTrigger><SelectValue placeholder="Tipo..." /></SelectTrigger>
                  <SelectContent>{TIPOS.filter(t => t !== 'todos').map(t => <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Unidade *</Label>
                <Select value={form.unidade} onValueChange={v => setForm(f => ({ ...f, unidade: v }))} required>
                  <SelectTrigger><SelectValue placeholder="Unidade..." /></SelectTrigger>
                  <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Preço unitário *</Label>
                <Input type="number" step="0.01" value={form.preco_unitario} onChange={e => setForm(f => ({ ...f, preco_unitario: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Cor</Label>
                <Input value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Composição</Label>
                <Input value={form.composicao} onChange={e => setForm(f => ({ ...f, composicao: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fornecedor</Label>
                <Select value={form.fornecedor_id} onValueChange={v => setForm(f => ({ ...f, fornecedor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {(fornecedores ?? []).map((f: any) => <SelectItem key={f.id} value={String(f.id)}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {save.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PLMLayout>
  );
}
