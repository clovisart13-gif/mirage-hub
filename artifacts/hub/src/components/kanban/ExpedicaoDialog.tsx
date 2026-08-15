import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X, Truck } from 'lucide-react';
import type { Referencia } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: Referencia | null;
  onSuccess?: () => void;
}

export default function ExpedicaoDialog({ open, onOpenChange, cartao, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [dataSaida, setDataSaida] = useState('');
  const [nf, setNf] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (cartao && open) {
      setQuantidade(String(cartao.quantidade ?? 0));
      setDataSaida(new Date().toISOString().slice(0, 10));
      setNf('');
      setObservacoes('');
    }
  }, [cartao, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartao) return;
    if (!quantidade) { toast.error('Quantidade é obrigatória'); return; }

    setLoading(true);
    try {
      const obs = [observacoes, nf ? `NF: ${nf}` : ''].filter(Boolean).join(' | ');
      await apiFetch(`/kanban/referencias/${cartao.id}/mover`, {
        method: 'POST',
        body: JSON.stringify({
          fase_destino: 'faturamento',
          quantidade: parseInt(quantidade),
          data_real: dataSaida || undefined,
          observacoes: obs || undefined,
          cmo: 0,
          cmp: 0,
        }),
      });
      toast.success('Expedição concluída! Cartão movido para Faturamento.');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro na expedição');
    } finally {
      setLoading(false);
    }
  };

  if (!cartao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-orange-600 to-amber-600 px-6 py-5 relative">
          <button type="button" onClick={() => onOpenChange(false)} className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">CONCLUIR EXPEDIÇÃO</h2>
          </div>
          <p className="text-orange-100 font-semibold">{cartao.codigo}</p>
          {cartao.nome_cliente && <p className="text-orange-200 text-sm">Cliente: {cartao.nome_cliente}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold">Quantidade Expedida *</Label>
            <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} disabled={loading} className="mt-1 h-10 text-lg" />
            <p className="text-xs text-gray-500 mt-1">Quantidade em expedição: {cartao.quantidade}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold">Data de Saída</Label>
            <Input type="date" value={dataSaida} onChange={e => setDataSaida(e.target.value)} disabled={loading} className="mt-1" />
          </div>

          <div>
            <Label className="text-sm font-semibold">Nota Fiscal (NF)</Label>
            <Input value={nf} onChange={e => setNf(e.target.value)} disabled={loading} className="mt-1" placeholder="Ex: NF-1234" />
          </div>

          <div>
            <Label className="text-sm font-semibold">Observações</Label>
            <Input value={observacoes} onChange={e => setObservacoes(e.target.value)} disabled={loading} className="mt-1" placeholder="Opcional..." />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
            Confirmar saída moverá o cartão automaticamente para <strong>Faturamento</strong>.
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 font-bold">
              {loading ? 'Processando...' : 'Confirmar Saída'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
