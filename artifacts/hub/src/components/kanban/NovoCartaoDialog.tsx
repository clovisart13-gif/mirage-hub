import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { FASES, FASE_LABEL } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  clientes?: { id: string; nome: string }[];
}

export default function NovoCartaoDialog({ open, onOpenChange, onSuccess, clientes = [] }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    codigo: '',
    descricao_modelo: '',
    nome_cliente: '',
    cliente_id: '',
    numero_op: '',
    numero_pedido: '',
    previsao_conclusao: '',
    quantidade: '',
    cmp: '',
    valor_venda: '',
    cores: '',
    grade: '',
    fase_atual: 'inicio',
    observacoes: '',
    data_entrada: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (open) {
      setForm({
        codigo: '',
        descricao_modelo: '',
        nome_cliente: '',
        cliente_id: '',
        numero_op: '',
        numero_pedido: '',
        previsao_conclusao: '',
        quantidade: '',
        cmp: '',
        valor_venda: '',
        cores: '',
        grade: '',
        fase_atual: 'inicio',
        observacoes: '',
        data_entrada: new Date().toISOString().slice(0, 10),
      });
    }
  }, [open]);

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.codigo.trim()) { toast.error('Código é obrigatório'); return; }
    if (!form.quantidade || isNaN(Number(form.quantidade))) { toast.error('Quantidade é obrigatória'); return; }

    setLoading(true);
    try {
      const qtd = parseInt(form.quantidade);
      const payload = {
        codigo: form.codigo.trim().toUpperCase(),
        descricao_modelo: form.descricao_modelo || undefined,
        nome_cliente: form.nome_cliente || (form.cliente_id ? undefined : undefined),
        cliente_id: form.cliente_id || undefined,
        numero_op: form.numero_op || undefined,
        numero_pedido: form.numero_pedido || undefined,
        previsao_conclusao: form.previsao_conclusao || undefined,
        quantidade: qtd,
        cmp: form.cmp ? Math.round(parseFloat(form.cmp) * 100) : 0,
        valor_venda: form.valor_venda ? parseFloat(form.valor_venda) : undefined,
        cores: form.cores || undefined,
        grade: form.grade || undefined,
        fase_atual: form.fase_atual,
        observacoes: form.observacoes || undefined,
        data_entrada: form.data_entrada || undefined,
      };
      await apiFetch('/kanban/referencias', { method: 'POST', body: JSON.stringify(payload) });
      toast.success('Referência criada com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar referência');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Referência</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="codigo">Código *</Label>
              <Input id="codigo" value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Ex: REF-001" autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="numero_op">Número da OP</Label>
              <Input id="numero_op" value={form.numero_op} onChange={e => set('numero_op', e.target.value)} placeholder="Ex: OP-001" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descricao_modelo">Descrição do Modelo</Label>
            <Input id="descricao_modelo" value={form.descricao_modelo} onChange={e => set('descricao_modelo', e.target.value)} placeholder="Ex: Camiseta Oversized ML" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="nome_cliente">Cliente</Label>
              {clientes.length > 0 ? (
                <Select value={form.cliente_id} onValueChange={v => {
                  const cli = clientes.find(c => c.id === v);
                  set('cliente_id', v);
                  if (cli) set('nome_cliente', cli.nome);
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={form.nome_cliente} onChange={e => set('nome_cliente', e.target.value)} placeholder="Nome do cliente" />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="numero_pedido">Nº do Pedido</Label>
              <Input id="numero_pedido" value={form.numero_pedido} onChange={e => set('numero_pedido', e.target.value)} placeholder="Ex: PED-123" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input id="quantidade" type="number" min="1" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} placeholder="0" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cmp">CMP (R$)</Label>
              <Input id="cmp" type="number" step="0.01" value={form.cmp} onChange={e => set('cmp', e.target.value)} placeholder="0,00" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="valor_venda">Valor Venda (R$)</Label>
              <Input id="valor_venda" type="number" step="0.01" value={form.valor_venda} onChange={e => set('valor_venda', e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cores">Cores</Label>
              <Input id="cores" value={form.cores} onChange={e => set('cores', e.target.value)} placeholder="Ex: Azul, Vermelho" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="grade">Grade</Label>
              <Input id="grade" value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="Ex: P/M/G/GG" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Prazo de Entrega</Label>
              <Input type="date" value={form.previsao_conclusao} onChange={e => set('previsao_conclusao', e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Etapa Inicial</Label>
              <Select value={form.fase_atual} onValueChange={v => set('fase_atual', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FASES.map(f => <SelectItem key={f} value={f}>{FASE_LABEL[f]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Observações</Label>
            <Textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={2} placeholder="Informações adicionais..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Criando...' : 'Criar Referência'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
