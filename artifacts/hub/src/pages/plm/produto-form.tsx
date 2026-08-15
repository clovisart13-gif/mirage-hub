import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PLMLayout from '@/components/plm/PLMLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

const CATEGORIAS = [
  { value: 'camiseta', label: 'Camiseta' }, { value: 'camisa', label: 'Camisa' },
  { value: 'calca', label: 'Calça' }, { value: 'short', label: 'Short' },
  { value: 'vestido', label: 'Vestido' }, { value: 'saia', label: 'Saia' },
  { value: 'jaqueta', label: 'Jaqueta' }, { value: 'casaco', label: 'Casaco' },
  { value: 'blusa', label: 'Blusa' }, { value: 'moletom', label: 'Moletom' },
  { value: 'macacao', label: 'Macacão' }, { value: 'outro', label: 'Outro' },
];

export default function PLMProdutoForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isEditing = !!id && id !== 'novo';

  const [nome, setNome] = useState('');
  const [referencia, setReferencia] = useState('');
  const [categoria, setCategoria] = useState('');
  const [colecaoId, setColecaoId] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const { data: colecoes } = useQuery({
    queryKey: ['plm-colecoes'],
    queryFn: () => apiFetch('/plm/colecoes'),
  });

  const { data: produtoData, isLoading } = useQuery({
    queryKey: ['plm-produto', id],
    queryFn: () => apiFetch(`/plm/produtos/${id}`),
    enabled: isEditing,
  });

  useEffect(() => {
    if (produtoData?.produto) {
      const p = produtoData.produto;
      setNome(p.nome ?? '');
      setReferencia(p.referencia ?? '');
      setCategoria(p.categoria ?? '');
      setColecaoId(p.colecao_id ? String(p.colecao_id) : 'none');
      setDescricao(p.descricao ?? '');
      setObservacoes(p.observacoes ?? '');
    }
  }, [produtoData]);

  const mutation = useMutation({
    mutationFn: (data: any) => isEditing
      ? apiFetch(`/plm/produtos/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
      : apiFetch('/plm/produtos', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['plm-produtos'] });
      toast.success(isEditing ? 'Produto atualizado!' : 'Produto criado!');
      navigate(isEditing ? `/hub/plm/produtos/${id}` : `/hub/plm/produtos/${res.id}`);
    },
    onError: () => toast.error('Erro ao salvar produto'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !categoria) { toast.error('Nome e categoria são obrigatórios'); return; }
    mutation.mutate({ nome, referencia, categoria, colecao_id: (colecaoId && colecaoId !== 'none') ? colecaoId : null, descricao, observacoes });
  };

  if (isEditing && isLoading) return (
    <PLMLayout><div className="p-6"><Skeleton className="h-64 rounded-xl" /></div></PLMLayout>
  );

  return (
    <PLMLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={isEditing ? `/hub/plm/produtos/${id}` : '/hub/plm/produtos'}>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h1>
            <p className="text-sm text-muted-foreground">Preencha as informações do produto</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="nome">Nome do produto *</Label>
                  <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Top Regata Alça Fina" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referencia">Referência</Label>
                  <Input id="referencia" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ex: TOP-001" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Select value={categoria} onValueChange={setCategoria} required>
                    <SelectTrigger id="categoria">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Coleção</Label>
                  <Select value={colecaoId} onValueChange={setColecaoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem coleção" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem coleção</SelectItem>
                      {(colecoes ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nome} ({c.ano})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea id="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva o produto..." rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea id="observacoes" value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observações internas..." rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end">
            <Link href={isEditing ? `/hub/plm/produtos/${id}` : '/hub/plm/produtos'}>
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              {isEditing ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </div>
        </form>
      </div>
    </PLMLayout>
  );
}
