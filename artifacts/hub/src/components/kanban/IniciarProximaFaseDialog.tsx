import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X, Check } from 'lucide-react';
import { FASE_LABEL, FASE_FICHA_CMO, type Referencia, type Fornecedor, type FichaData } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: Referencia | null;
  proximaEtapa: string;
  fornecedores?: Fornecedor[];
  onSuccess?: () => void;
  onMoverEspera?: () => void;
}

export default function IniciarProximaFaseDialog({
  open, onOpenChange, cartao, proximaEtapa, fornecedores = [], onSuccess, onMoverEspera,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [cmo, setCmo] = useState('');
  const [cmp, setCmp] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataTermino, setDataTermino] = useState('');
  const [semCmo, setSemCmo] = useState(false);
  const [alterarCmp, setAlterarCmp] = useState(false);
  const [fichaPrevisto, setFichaPrevisto] = useState<FichaData | null>(null);

  useEffect(() => {
    if (cartao && open) {
      setQuantidade(String(cartao.quantidade ?? 0));
      setCmp(cartao.cmp ? String(cartao.cmp / 100) : '');
      setCmo('');
      setFornecedorId(cartao.fornecedor_id ?? '');
      setFornecedorNome(cartao.fornecedor ?? '');
      setDataInicio(new Date().toISOString().slice(0, 10));
      setDataTermino('');
      setSemCmo(false);
      setAlterarCmp(false);
      setFichaPrevisto(null);

      // Buscar ficha e pré-preencher CMO da próxima fase
      const fichaId = cartao.fichaData?.id ?? cartao.ficha_id;
      if (fichaId && proximaEtapa) {
        const campo = FASE_FICHA_CMO[proximaEtapa];
        if (campo) {
          // Se fichaData já veio com o cartão, usar direto
          const fichaDisponivel = cartao.fichaData;
          if (fichaDisponivel) {
            const val = Number(fichaDisponivel[campo] ?? 0);
            if (val > 0) setCmo(val.toFixed(2));
            setFichaPrevisto(fichaDisponivel);
          } else {
            // Buscar da API
            apiFetch(`/custos/fichas/${fichaId}`)
              .then((f: FichaData) => {
                setFichaPrevisto(f);
                const val = Number(f[campo] ?? 0);
                if (val > 0) setCmo(val.toFixed(2));
              })
              .catch(() => null);
          }
        }
      }
    }
  }, [cartao, open, proximaEtapa]);

  const cmoPrevisto = fichaPrevisto && FASE_FICHA_CMO[proximaEtapa]
    ? Number(fichaPrevisto[FASE_FICHA_CMO[proximaEtapa]] ?? 0)
    : 0;

  const qtdNum = parseInt(quantidade) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartao) return;

    if (!semCmo && !cmo) { toast.error('CMO é obrigatório'); return; }
    if (!semCmo && Number(cmo) > 0 && !fornecedorId && !fornecedorNome.trim()) {
      toast.error('Fornecedor é obrigatório quando há CMO'); return;
    }
    if (!quantidade) { toast.error('Quantidade é obrigatória'); return; }
    if (!dataInicio) { toast.error('Data de início é obrigatória'); return; }
    if (!dataTermino) { toast.error('Data de término prevista é obrigatória'); return; }
    if (new Date(dataTermino) < new Date(dataInicio)) {
      toast.error('Data de término não pode ser anterior ao início'); return;
    }

    setLoading(true);
    try {
      const cmoReal = semCmo ? 0 : Math.round(parseFloat(cmo) * 100);
      const payload = {
        fase_destino: proximaEtapa,
        fornecedor_id: fornecedorId || undefined,
        fornecedor: fornecedorNome || undefined,
        cmo: cmoReal,
        cmo_previsto: cmoPrevisto > 0 ? Math.round(cmoPrevisto * 100) : undefined,
        cmp: alterarCmp ? Math.round(parseFloat(cmp) * 100) : undefined,
        quantidade: parseInt(quantidade),
        data_prevista: dataTermino,
        observacoes: undefined,
      };
      await apiFetch(`/kanban/referencias/${cartao.id}/iniciar-proxima`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(`Fase ${FASE_LABEL[proximaEtapa] ?? proximaEtapa} iniciada!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar fase');
    } finally {
      setLoading(false);
    }
  };

  const handleMoverEspera = async () => {
    if (!cartao) return;
    setLoading(true);
    try {
      await apiFetch(`/kanban/referencias/${cartao.id}/mover`, {
        method: 'POST',
        body: JSON.stringify({ fase_destino: 'espera', quantidade: cartao.quantidade }),
      });
      toast.info('Cartão movido para Espera');
      onOpenChange(false);
      onMoverEspera?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao mover');
    } finally {
      setLoading(false);
    }
  };

  if (!cartao) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-6 py-5 relative">
          <button type="button" onClick={() => onOpenChange(false)} className="absolute top-3 right-3 text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white">INICIAR PRÓXIMA FASE</h2>
          <p className="text-blue-100 mt-1 font-semibold">{cartao.codigo}</p>
          {cartao.nome_cliente && <p className="text-blue-200 text-sm">Cliente: {cartao.nome_cliente}</p>}
          <div className="mt-2">
            <span className="text-2xl font-black text-white uppercase">
              {FASE_LABEL[proximaEtapa] ?? proximaEtapa}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold">Quantidade *</Label>
            <Input type="number" value={quantidade} onChange={e => setQuantidade(e.target.value)} disabled={loading} className="mt-1 h-10 text-lg" />
            <p className="text-xs text-gray-500 mt-1">Qtd anterior: {cartao.quantidade}</p>
          </div>

          <div>
            <Label className="text-sm font-semibold">CMP — Custo Matéria-Prima (R$)</Label>
            <div className="flex items-center gap-3 mt-1">
              <Input type="number" step="0.01" value={cmp} onChange={e => setCmp(e.target.value)} disabled={loading || !alterarCmp} className={`h-10 text-lg flex-1 ${!alterarCmp ? 'bg-gray-100' : ''}`} />
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 whitespace-nowrap">
                <input type="checkbox" checked={alterarCmp} onChange={e => setAlterarCmp(e.target.checked)} className="w-4 h-4" />
                Alterar CMP
              </label>
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">CMO — Custo Mão-de-Obra (R$/peça) *</Label>
            <Input
              type="number" step="0.01"
              value={cmo}
              onChange={e => setCmo(e.target.value)}
              disabled={loading || semCmo}
              className={`mt-1 h-10 text-lg ${semCmo ? 'bg-gray-100' : ''}`}
              placeholder="Ex: 25.00"
            />
            {cmoPrevisto > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                Previsto pela ficha: <strong>R$ {cmoPrevisto.toFixed(2).replace('.', ',')}/peça</strong>
                {qtdNum > 0 && <span className="text-gray-500 ml-1">· Total: R$ {(cmoPrevisto * qtdNum).toFixed(2).replace('.', ',')}</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-sm font-semibold">
              Fornecedor {!semCmo && Number(cmo) > 0 && <span className="text-red-500">*</span>}
            </Label>
            {fornecedores.length > 0 ? (
              <>
                <select
                  value={fornecedorId}
                  onChange={e => {
                    setFornecedorId(e.target.value);
                    const f = fornecedores.find(f => f.id === e.target.value);
                    if (f) setFornecedorNome(f.nome);
                    else setFornecedorNome('');
                  }}
                  disabled={loading}
                  className="mt-1 w-full h-10 border border-input rounded-md px-3 text-sm bg-background"
                >
                  <option value="">Selecionar fornecedor...</option>
                  {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
                {!fornecedorId && (
                  <Input
                    value={fornecedorNome}
                    onChange={e => setFornecedorNome(e.target.value)}
                    disabled={loading}
                    className="mt-1 h-9 text-sm"
                    placeholder="Ou digitar nome do fornecedor"
                  />
                )}
              </>
            ) : (
              <Input value={fornecedorNome} onChange={e => setFornecedorNome(e.target.value)} disabled={loading} className="mt-1 h-10" placeholder="Nome do fornecedor" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold">Data Início *</Label>
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} disabled={loading} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm font-semibold">Término Previsto *</Label>
              <Input type="date" value={dataTermino} onChange={e => setDataTermino(e.target.value)} disabled={loading} className="mt-1" />
            </div>
          </div>

          <div
            onClick={() => setSemCmo(!semCmo)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${semCmo ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200 hover:border-red-300'}`}
          >
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${semCmo ? 'bg-red-500 border-red-500' : 'border-red-400 bg-white'}`}>
              {semCmo && <Check className="w-3 h-3 text-white" />}
            </div>
            <span className="font-bold text-red-700 text-sm">Sem CMO (não gerar conta a pagar)</span>
          </div>

          <DialogFooter className="gap-2 flex-wrap">
            <Button type="button" variant="outline" onClick={handleMoverEspera} disabled={loading} className="text-slate-600">
              Mover para Espera
            </Button>
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 font-bold">
              {loading ? 'Processando...' : 'Iniciar Fase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
