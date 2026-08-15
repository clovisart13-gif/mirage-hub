import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { Referencia } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: Referencia | null;
  etapaDestino: string;
  onSuccess?: () => void;
}

export default function ConcluirTecidoDialog({ open, onOpenChange, cartao, etapaDestino, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [perda, setPerda] = useState('0');
  const [dataRetorno, setDataRetorno] = useState('');

  useEffect(() => {
    if (cartao && open) {
      setQuantidade(String(cartao.quantidade ?? 0));
      setPerda('0');
      setDataRetorno(new Date().toISOString().slice(0, 10));
    }
  }, [cartao, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartao) return;
    if (!quantidade) { toast.error('Quantidade é obrigatória'); return; }

    setLoading(true);
    try {
      await apiFetch(`/kanban/referencias/${cartao.id}/mover`, {
        method: 'POST',
        body: JSON.stringify({
          fase_destino: etapaDestino || 'risco',
          quantidade: parseInt(quantidade),
          perda_quantidade: parseInt(perda) || 0,
          data_real: dataRetorno || undefined,
          cmo: 0,
          cmp: 0,
        }),
      });
      toast.success('Tecido concluído!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao concluir tecido');
    } finally {
      setLoading(false);
    }
  };

  if (!cartao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-cyan-600 to-teal-700 px-6 py-5 relative">
          <button type="button" onClick={() => onOpenChange(false)} className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">CONCLUIR TECIDO</h2>
          <p className="text-cyan-100 mt-1 font-semibold">{cartao.codigo}</p>
          {cartao.nome_cliente && <p className="text-cyan-200 text-sm">Cliente: {cartao.nome_cliente}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Qtd. Retornada *</Label>
              <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} disabled={loading} className="mt-1 h-10 text-lg" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Perda</Label>
              <Input type="number" min="0" value={perda} onChange={e => setPerda(e.target.value)} disabled={loading} className="mt-1 h-10" />
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">Data de Retorno</Label>
            <Input type="date" value={dataRetorno} onChange={e => setDataRetorno(e.target.value)} disabled={loading} className="mt-1" />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 font-bold">
              {loading ? 'Processando...' : 'Confirmar Retorno'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
