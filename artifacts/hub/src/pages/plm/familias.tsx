import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { Plus, Search, Tags, Edit2 } from 'lucide-react';

export default function PLMFamilias() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [ativo, setAtivo] = useState(true);

  const { data: familias, isLoading } = useQuery({
    queryKey: ['plm-familias-produto-all'],
    queryFn: () => apiFetch('/plm/familias-produto?all=1'),
  });

  const filtered = useMemo(() => {
    if (!familias) return [];
    const term = search.toLowerCase();
    return familias.filter((f: any) =>
      !term || String(f.nome ?? '').toLowerCase().includes(term)
    );
  }, [familias, search]);

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editingId) {
        return apiFetch(`/plm/familias-produto/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify({ nome, ativo }),
        });
      }
      return apiFetch('/plm/familias-produto', {
        method: 'POST',
        body: JSON.stringify({ nome }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plm-familias-produto'] });
      qc.invalidateQueries({ queryKey: ['plm-familias-produto-all'] });
      toast.success(editingId ? 'Família atualizada!' : 'Família criada!');
      setModalOpen(false);
    },
    onError: (err: any) => toast.error(err?.message || 'Erro ao salvar família'),
  });

  const handleEdit = (familia: any) => {
    setEditingId(familia.id);
    setNome(familia.nome);
    setAtivo(familia.ativo);
    setModalOpen(true);
  };

  const handleCreate = () => {
    setEditingId(null);
    setNome('');
    setAtivo(true);
    setModalOpen(true);
  };

  return (
    <PLMLayout>
      <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Famílias de Produto</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gerencie as categorias de classificação dos produtos</p>
          </div>
          <Button onClick={handleCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Nova Família
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar famílias..."
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {search && <Button variant="outline" onClick={() => setSearch('')}>Limpar filtros</Button>}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Tags className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Nenhuma família encontrada</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((familia: any) => (
              <Card key={familia.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-semibold text-lg">{familia.nome}</h3>
                      <Badge variant="outline" className={familia.ativo ? "text-green-600 border-green-200 bg-green-50 mt-2" : "text-gray-500 mt-2"}>
                        {familia.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(familia)}>
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Família' : 'Nova Família'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Família *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={e => setNome(e.target.value.toUpperCase())}
                  placeholder="Ex: CAMISETA"
                  autoFocus
                />
              </div>

              {editingId && (
                <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg border">
                  <div>
                    <Label className="text-sm font-medium">Status da Família</Label>
                    <p className="text-xs text-muted-foreground">
                      {ativo ? 'Ativa: aparece nas seleções' : 'Inativa: não pode ser usada em novos produtos'}
                    </p>
                  </div>
                  <Switch checked={ativo} onCheckedChange={setAtivo} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!nome.trim() || saveMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PLMLayout>
  );
}
