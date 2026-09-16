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

export default function PLMProdutoForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const isEditing = !!id && id !== 'novo';

  const [nome, setNome] = useState('');
  const [referencia, setReferencia] = useState('');
  const [referenciaCliente, setReferenciaCliente] = useState('');
  const [linkModelagem, setLinkModelagem] = useState('');
  const [clienteId, setClienteId] = useState<string>('');
  const [categoria, setCategoria] = useState('');
  const [novaFamilia, setNovaFamilia] = useState('');
  const [colecaoId, setColecaoId] = useState<string>('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const { data: colecoes } = useQuery({
    queryKey: ['plm-colecoes'],
    queryFn: () => apiFetch('/plm/colecoes'),
  });
  const { data: clientes } = useQuery({
    queryKey: ['plm-clientes'],
    queryFn: () => apiFetch('/plm/clientes'),
  });
  const { data: familiasMaster, isLoading: familiasLoading } = useQuery({
    queryKey: ['plm-familias-produto'],
    queryFn: () => apiFetch('/plm/familias-produto'),
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
      setReferenciaCliente(p.referencia_cliente ?? '');
      setLinkModelagem(p.link_modelagem ?? '');
       setClienteId(p.cliente_central_id ? String(p.cliente_central_id) : 'none');
      setCategoria(p.familia_produto_id ? String(p.familia_produto_id) : (p.categoria ?? ''));
      setColecaoId(p.colecao_id ? String(p.colecao_id) : 'none');
      setDescricao(p.descricao ?? '');
      setObservacoes(p.observacoes ?? '');
    }
  }, [produtoData]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      // Allow legacy text category or real ID
      let categoriaVal = undefined;
      let familiaId = undefined;

      const payload: any = { ...data };
      if (data.categoria) {
        // If it's a UUID string or number string, assume it's the ID
        if (!isNaN(Number(data.categoria))) {
          payload.familia_produto_id = Number(data.categoria);
          delete payload.categoria;
        } else {
          payload.categoria = data.categoria;
          delete payload.familia_produto_id;
        }
      }

      return isEditing
        ? apiFetch(`/plm/produtos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : apiFetch('/plm/produtos', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['plm-produtos'] });
      qc.invalidateQueries({ queryKey: ['plm-familias-produto'] });
      toast.success(isEditing ? 'Produto atualizado!' : 'Produto criado!');
      navigate(isEditing ? `/hub/plm/produtos/${id}` : `/hub/plm/produtos/${res.id}`);
    },
    onError: () => toast.error('Erro ao salvar produto'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const familiaFinal = novaFamilia.trim().toUpperCase() || categoria;
    if (!nome || !familiaFinal) { toast.error('Descrição e família são obrigatórias'); return; }
    if (!clienteId || clienteId === 'none') { toast.error('Cliente é obrigatório para criar o produto técnico'); return; }
    mutation.mutate({
      nome,
      referencia,
      referencia_cliente: referenciaCliente,
      link_modelagem: linkModelagem,
      cliente_central_id: (clienteId && clienteId !== 'none') ? clienteId : null,
       categoria: familiaFinal,
      colecao_id: (colecaoId && colecaoId !== 'none') ? colecaoId : null,
      descricao,
      observacoes,
    });
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
                  <Label htmlFor="nome">Descrição *</Label>
                  <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Camiseta Dry" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referencia">Referência</Label>
                  <Input id="referencia" value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ex: 26CAM-132" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referencia-cliente">Referência do cliente</Label>
                  <Input id="referencia-cliente" value={referenciaCliente} onChange={e => setReferenciaCliente(e.target.value)} placeholder="Ex: REF-CLIENTE-001" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="link-modelagem">Link de modelagem</Label>
                  <Input id="link-modelagem" type="url" value={linkModelagem} onChange={e => setLinkModelagem(e.target.value)} placeholder="https://..." />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label>Cliente</Label>
                   <Select value={clienteId} onValueChange={setClienteId} disabled={isEditing}>
                     <SelectTrigger disabled={isEditing}>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem cliente definido</SelectItem>
                      {(clientes ?? []).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                   {isEditing && <p className="text-xs text-muted-foreground">Cliente imutável. Para outro cliente, abra a ficha técnica e use “Duplicar para cliente”.</p>}
                </div>
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="familia">Família *</Label>
                  <Select value={categoria} onValueChange={setCategoria} required>
                    <SelectTrigger id="familia">
                      <SelectValue placeholder={familiasLoading ? 'Carregando famílias...' : 'Selecione uma família...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {familiasMaster && familiasMaster.length > 0 ? familiasMaster.map((f: any) => (
                        <SelectItem key={String(f.id)} value={String(f.id)}>{f.nome}</SelectItem>
                      )) : (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          Nenhuma família encontrada neste tenant.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Input className="mt-2" value={novaFamilia} onChange={e => setNovaFamilia(e.target.value)}
                    placeholder="Ou digite o nome para criar uma nova família (ex.: BERMUDA)" />
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
                <Label htmlFor="descricao">Detalhes técnicos</Label>
                <Textarea id="descricao" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Informe detalhes técnicos do produto..." rows={3} />
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
