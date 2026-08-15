import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import type { Referencia, Fornecedor } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: Referencia | null;
  fornecedores?: Fornecedor[];
  onSuccess?: () => void;
}

export default function IniciarTecidoDialog({ open, onOpenChange, cartao, fornecedores = [], onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [cmp, setCmp] = useState('');

  useEffect(() => {
    if (cartao && open) {
      setQuantidade(String(cartao.quantidade ?? 0));
      setFornecedorId(cartao.fornecedor_id ?? '');
      setFornecedorNome(cartao.fornecedor ?? '');
      setDataInicio(new Date().toISOString().slice(0, 10));
      setDataTermino('');
      setCmp(cartao.cmp ? String(cartao.cmp / 100) : '');
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
          fase_destino: 'tecido',
          fornecedor_id: fornecedorId || undefined,
          fornecedor: fornecedorNome || undefined,
          quantidade: parseInt(quantidade),
          cmp: cmp ? Math.round(parseFloat(cmp) * 100) : undefined,
          data_prevista: dataTermino || undefined,
          cmo: 0,
        }),
      });
      toast.success('Cartão enviado para Tecido!');
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mover para Tecido');
    } finally {
      setLoading(false);
    }
  };

  if (!cartao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 px-6 py-5 relative">
          <button type="button" onClick={() => onOpenChange(false)} className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">INICIAR TECIDO</h2>
          <p className="text-cyan-100 mt-1 font-semibold">{cartao.codigo}</p>
          {cartao.nome_cliente && <p className="text-cyan-200 text-sm">Cliente: {cartao.nome_cliente}</p>}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold">Quantidade *</Label>
            <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} disabled={loading} className="mt-1 h-10 text-lg" />
          </div>

          <div>
            <Label className="text-sm font-semibold">CMP — Custo Matéria-Prima (R$)</Label>
            <Input type="number" step="0.01" value={cmp} onChange={e => setCmp(e.target.value)} disabled={loading} className="mt-1 h-10" placeholder="0.00" />
          </div>

          <div>
            <Label className="text-sm font-semibold">Fornecedor (Tecedeira)</Label>
            {fornecedores.length > 0 ? (
              <select
                value={fornecedorId}
                onChange={e => {
                  setFornecedorId(e.target.value);
                  const f = fornecedores.find(f => f.id === e.target.value);
                  if (f) setFornecedorNome(f.nome);
                }}
                disabled={loading}
                className="mt-1 w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
              >
                <option value="">Selecionar...</option>
                {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
            ) : (
              <Input value={fornecedorNome} onChange={e => setFornecedorNome(e.target.value)} disabled={loading} className="mt-1 h-10" placeholder="Nome do fornecedor" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Data Início</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} disabled={loading} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Previsão de Retorno</Label>
              <Input type="date" value={dataTermino} onChange={e => setDataTermino(e.target.value)} disabled={loading} className="mt-1" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 font-bold">
              {loading ? 'Enviando...' : 'Enviar para Tecido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
