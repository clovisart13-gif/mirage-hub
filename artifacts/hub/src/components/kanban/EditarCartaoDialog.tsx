import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch, API_BASE } from '@/lib/api';
import { toast } from 'sonner';
import { ImagePlus, Trash2, Star, Loader2 } from 'lucide-react';
import type { Referencia } from './types';

interface Imagem {
  id: string;
  url: string;
  nome?: string;
  principal: boolean;
  ordem: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  referencia: Referencia | null;
  onSuccess: () => void;
  clientes?: { id: string; nome: string }[];
}

export default function EditarCartaoDialog({ open, onOpenChange, referencia, onSuccess, clientes = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  // Imagens
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!referencia) return;
    setForm({
      codigo: referencia.codigo ?? '',
      descricao_modelo: referencia.descricao_modelo ?? '',
      nome_cliente: referencia.nome_cliente ?? '',
      cliente_id: referencia.cliente_id ?? '',
      numero_op: referencia.numero_op ?? '',
      numero_pedido: referencia.numero_pedido ?? '',
      previsao_conclusao: referencia.previsao_conclusao ? referencia.previsao_conclusao.slice(0, 10) : '',
      quantidade: String(referencia.quantidade ?? referencia.quantidade_total ?? 0),
      cmp: referencia.cmp ? String(referencia.cmp / 100) : '',
      valor_venda: referencia.valor_venda ? String(referencia.valor_venda) : '',
      cores: referencia.cores ?? '',
      grade: referencia.grade ?? '',
      observacoes: referencia.observacoes ?? '',
    });
    carregarImagens(referencia.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referencia?.id]);

  const carregarImagens = async (id: string) => {
    try {
      const data = await apiFetch(`/kanban/referencias/${id}/imagens`);
      setImagens(data);
    } catch { /* silently ignore */ }
  };

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referencia) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        codigo: form.codigo?.trim().toUpperCase(),
        descricao_modelo: form.descricao_modelo || null,
        nome_cliente: form.nome_cliente || null,
        cliente_id: form.cliente_id || null,
        numero_op: form.numero_op || null,
        numero_pedido: form.numero_pedido || null,
        previsao_conclusao: form.previsao_conclusao || null,
        quantidade: form.quantidade ? parseInt(form.quantidade) : undefined,
        cmp: form.cmp ? Math.round(parseFloat(form.cmp) * 100) : 0,
        valor_venda: form.valor_venda ? parseFloat(form.valor_venda) : null,
        cores: form.cores || null,
        grade: form.grade || null,
        observacoes: form.observacoes || null,
      };

      await apiFetch(`/kanban/referencias/${referencia.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      toast.success('Referência atualizada!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  // ── Upload de imagem ──────────────────────────────────────────────────────
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !referencia) return;
    e.target.value = '';

    setUploading(true);
    try {
      // 1. Solicita URL pré-assinada
      const { uploadURL, objectPath } = await apiFetch('/storage/uploads/request-url', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });

      // 2. Faz upload direto para o GCS
      const putRes = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!putRes.ok) throw new Error('Falha no upload para o storage');

      // 3. Registra a imagem na API
      const primeiraImagem = imagens.length === 0;
      await apiFetch(`/kanban/referencias/${referencia.id}/imagens`, {
        method: 'POST',
        body: JSON.stringify({
          url: objectPath,
          nome: file.name,
          principal: primeiraImagem,
        }),
      });

      toast.success('Imagem adicionada!');
      await carregarImagens(referencia.id);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  // ── Excluir imagem ────────────────────────────────────────────────────────
  const handleExcluir = async (img: Imagem) => {
    if (!referencia) return;
    try {
      await apiFetch(`/kanban/referencias/${referencia.id}/imagens/${img.id}`, { method: 'DELETE' });
      const novas = imagens.filter(i => i.id !== img.id);
      // Se era a capa e ainda tem imagens, promove a primeira
      if (img.principal && novas.length > 0) {
        await apiFetch(`/kanban/referencias/${referencia.id}/imagens/${novas[0].id}/capa`, { method: 'PATCH' });
      }
      await carregarImagens(referencia.id);
      toast.success('Imagem removida');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao remover imagem');
    }
  };

  // ── Definir como capa ─────────────────────────────────────────────────────
  const handleDefinirCapa = async (img: Imagem) => {
    if (!referencia) return;
    try {
      await apiFetch(`/kanban/referencias/${referencia.id}/imagens/${img.id}/capa`, { method: 'PATCH' });
      await carregarImagens(referencia.id);
      toast.success('Imagem definida como capa');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao definir capa');
    }
  };

  // URL para exibição (objectPath → URL de serviço)
  const imgSrc = (url: string) => {
    if (url.startsWith('/objects/')) return `${API_BASE}/storage${url}`;
    return url;
  };

  if (!referencia) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Referência — {referencia.codigo}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Código *</Label>
              <Input value={form.codigo ?? ''} onChange={e => set('codigo', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Nº OP</Label>
              <Input value={form.numero_op ?? ''} onChange={e => set('numero_op', e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Descrição do Modelo</Label>
            <Input value={form.descricao_modelo ?? ''} onChange={e => set('descricao_modelo', e.target.value)} placeholder="Ex: Camiseta Oversized ML" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Cliente</Label>
              <Input value={form.nome_cliente ?? ''} onChange={e => set('nome_cliente', e.target.value)} placeholder="Nome do cliente" />
            </div>
            <div className="grid gap-1.5">
              <Label>Nº do Pedido</Label>
              <Input value={form.numero_pedido ?? ''} onChange={e => set('numero_pedido', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label>Quantidade</Label>
              <Input type="number" min="0" value={form.quantidade ?? ''} onChange={e => set('quantidade', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>CMP (R$)</Label>
              <Input type="number" step="0.01" value={form.cmp ?? ''} onChange={e => set('cmp', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Venda (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_venda ?? ''} onChange={e => set('valor_venda', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Cores</Label>
              <Input value={form.cores ?? ''} onChange={e => set('cores', e.target.value)} placeholder="Ex: Azul, Vermelho" />
            </div>
            <div className="grid gap-1.5">
              <Label>Grade</Label>
              <Input value={form.grade ?? ''} onChange={e => set('grade', e.target.value)} placeholder="Ex: P/M/G/GG" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Prazo de Entrega</Label>
            <Input type="date" value={form.previsao_conclusao ?? ''} onChange={e => set('previsao_conclusao', e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea value={form.observacoes ?? ''} onChange={e => set('observacoes', e.target.value)} rows={2} />
          </div>

          {/* ── Seção de Imagens ─────────────────────────────────────────── */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-semibold">Imagens do Cartão</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-8 text-xs"
              >
                {uploading ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Enviando...</>
                ) : (
                  <><ImagePlus className="w-3 h-3 mr-1" />Adicionar Imagem</>
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
            </div>

            {imagens.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                Nenhuma imagem. Clique em "Adicionar Imagem" para enviar.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {imagens.map(img => (
                  <div
                    key={img.id}
                    className={`relative group rounded-lg overflow-hidden border-2 ${img.principal ? 'border-yellow-400' : 'border-transparent'}`}
                  >
                    <img
                      src={imgSrc(img.url)}
                      alt={img.nome || 'imagem'}
                      className="w-full h-24 object-cover"
                    />
                    {img.principal && (
                      <div className="absolute top-1 left-1 bg-yellow-400 text-yellow-900 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5 fill-current" /> CAPA
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {!img.principal && imagens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDefinirCapa(img)}
                          title="Definir como capa"
                          className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900 rounded-full p-1.5"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleExcluir(img)}
                        title="Remover imagem"
                        className="bg-red-500 hover:bg-red-400 text-white rounded-full p-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {img.nome && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">
                        {img.nome}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {imagens.length > 1 && (
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Passe o mouse sobre uma imagem e clique em ⭐ para definir como capa do cartão.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
