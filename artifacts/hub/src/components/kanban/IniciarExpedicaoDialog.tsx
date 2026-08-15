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
  onSuccess?: () => void;
}

export default function IniciarExpedicaoDialog({ open, onOpenChange, cartao, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [dataExpedicao, setDataExpedicao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (cartao && open) {
      setQuantidade(String(cartao.quantidade ?? 0));
      setDataExpedicao(new Date().toISOString().slice(0, 10));
      setObservacoes('');
    }
  }, [cartao, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartao) return;
    if (!quantidade) { toast.error('Quantidade é obrigatória'); return; }

    setLoading(true);
    try {
      await apiFetch(`/kanban/referencias/${cartao.id}/iniciar-proxima`, {
        method: 'POST',
        body: JSON.stringify({
          fase_destino: 'expedicao',
          quantidade: parseInt(quantidade),
          data_prevista: dataExpedicao || undefined,
          observacoes: observacoes || undefined,
          cmo: 0,
        }),
      });
      toast.success('Cartão enviado para Expedição!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar expedição');
    } finally {
      setLoading(false);
    }
  };

  if (!cartao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-500 to-orange-700 px-6 py-5 relative">
          <button type="button" onClick={() => onOpenChange(false)} className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">INICIAR EXPEDIÇÃO</h2>
          <p className="text-orange-100 mt-1 font-semibold">{cartao.codigo}</p>
          {cartao.nome_cliente && <p className="text-orange-200 text-sm">Cliente: {cartao.nome_cliente}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold">Quantidade *</Label>
            <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} disabled={loading} className="mt-1 h-10 text-lg" />
          </div>

          <div>
            <Label className="text-sm font-semibold">Data de Expedição</Label>
            <Input type="date" value={dataExpedicao} onChange={e => setDataExpedicao(e.target.value)} disabled={loading} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm font-semibold">Observações</Label>
            <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} disabled={loading} className="mt-1" placeholder="Opcional..." />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 font-bold">
              {loading ? 'Processando...' : 'Iniciar Expedição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
