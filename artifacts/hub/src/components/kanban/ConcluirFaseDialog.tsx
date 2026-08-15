import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { X, ArrowRight, Check } from 'lucide-react';
import { FASE_LABEL, FASES_PRODUTIVAS, FASE_FICHA_CMO, type Referencia, type Fornecedor, type FichaData } from './types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: Referencia | null;
  proximaEtapa: string;
  fornecedores?: Fornecedor[];
  onSuccess?: () => void;
}

export default function ConcluirFaseDialog({
  open, onOpenChange, cartao, proximaEtapa, fornecedores = [], onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);

  // ─── Seção 1: Concluir fase atual ─────────────────────────────────────────
  const [cmpConcluir, setCmpConcluir] = useState('');
  const [cmoConcluir, setCmoConcluir] = useState('');
  const [qtdConcluir, setQtdConcluir] = useState('');
  const [dataTerminoReal, setDataTerminoReal] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [semCmoConcluir, setSemCmoConcluir] = useState(false);

  // ─── Seção 2: Iniciar próxima fase ────────────────────────────────────────
  const [fornecedorNome, setFornecedorNome] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [cmoProxima, setCmoProxima] = useState('');
  const [semCmoProxima, setSemCmoProxima] = useState(false);
  const [dataPrevista, setDataPrevista] = useState('');

  const [fichaPrevisto, setFichaPrevisto] = useState<FichaData | null>(null);

  const iniciarProxima = proximaEtapa && FASES_PRODUTIVAS.has(proximaEtapa);

  useEffect(() => {
    if (cartao && open) {
      // Pré-carrega valores do cartão atual
      setCmpConcluir(cartao.cmp ? String(cartao.cmp / 100) : '0');
      setQtdConcluir(String(cartao.quantidade ?? 0));
      setDataTerminoReal(new Date().toISOString().slice(0, 10));
      setDataVencimento('');
      setSemCmoConcluir(false);

      // Próxima fase — limpar fornecedor, não herdar da fase anterior
      setFornecedorNome('');
      setFornecedorId('');
      setSemCmoProxima(false);
      setDataPrevista('');
      setFichaPrevisto(null);

      const fichaId = cartao.fichaData?.id ?? cartao.ficha_id;

      if (fichaId) {
        const loadFicha = (f: FichaData) => {
          setFichaPrevisto(f);

          // Pré-preencher CMO fase atual
          const campoAtual = FASE_FICHA_CMO[cartao.fase_atual];
          if (campoAtual) {
            const val = Number(f[campoAtual] ?? 0);
            setCmoConcluir(val > 0 ? val.toFixed(2) : (cartao.cmo ? String(cartao.cmo / 100) : ''));
          } else {
            setCmoConcluir(cartao.cmo ? String(cartao.cmo / 100) : '');
          }

          // Pré-preencher CMO próxima fase
          const campoProximo = proximaEtapa ? FASE_FICHA_CMO[proximaEtapa] : undefined;
          if (campoProximo) {
            const val = Number(f[campoProximo] ?? 0);
            setCmoProxima(val > 0 ? val.toFixed(2) : '');
          } else {
            setCmoProxima('');
          }
        };

        if (cartao.fichaData) {
          loadFicha(cartao.fichaData);
        } else {
          apiFetch(`/custos/fichas/${fichaId}`)
            .then((f: FichaData) => loadFicha(f))
            .catch(() => {
              setCmoConcluir(cartao.cmo ? String(cartao.cmo / 100) : '');
              setCmoProxima('');
            });
        }
      } else {
        setCmoConcluir(cartao.cmo ? String(cartao.cmo / 100) : '');
        setCmoProxima('');
      }
    }
  }, [cartao, open, proximaEtapa]);

  const cmoAtualPrevisto = fichaPrevisto && FASE_FICHA_CMO[cartao?.fase_atual ?? '']
    ? Number(fichaPrevisto[FASE_FICHA_CMO[cartao!.fase_atual]] ?? 0)
    : 0;

  const cmoProximoPrevisto = fichaPrevisto && proximaEtapa && FASE_FICHA_CMO[proximaEtapa]
    ? Number(fichaPrevisto[FASE_FICHA_CMO[proximaEtapa]] ?? 0)
    : 0;

  const qtdNum = parseInt(qtdConcluir) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cartao) return;

    if (!semCmoConcluir && !cmoConcluir) {
      toast.error('CMO é obrigatório (ou marque "Sem CMO")');
      return;
    }
    if (!semCmoConcluir && Number(cmoConcluir) > 0 && !cartao.fornecedor_id && !cartao.fornecedor?.trim()) {
      toast.error('Fornecedor é obrigatório quando há CMO — defina o fornecedor da referência antes de concluir');
      return;
    }
    if (!semCmoConcluir && Number(cmoConcluir) > 0 && !dataVencimento) {
      toast.error('Data de vencimento é obrigatória quando há CMO');
      return;
    }
    if (!qtdConcluir) {
      toast.error('Quantidade é obrigatória');
      return;
    }
    if (iniciarProxima && !semCmoProxima && !cmoProxima) {
      toast.error('CMO da próxima fase é obrigatório (ou marque "Sem CMO")');
      return;
    }
    if (iniciarProxima && !semCmoProxima && Number(cmoProxima) > 0 && !fornecedorId && !fornecedorNome.trim()) {
      toast.error('Fornecedor é obrigatório para a próxima fase quando há CMO');
      return;
    }
    if (iniciarProxima && !dataPrevista) {
      toast.error('Data prevista da próxima fase é obrigatória');
      return;
    }

    setLoading(true);
    try {
      // 1. Concluir fase atual
      await apiFetch(`/kanban/referencias/${cartao.id}/concluir-fase`, {
        method: 'POST',
        body: JSON.stringify({
          quantidade_conferida: parseInt(qtdConcluir),
          cmo: semCmoConcluir ? 0 : Math.round(parseFloat(cmoConcluir) * 100),
          cmo_previsto: cmoAtualPrevisto > 0 ? Math.round(cmoAtualPrevisto * 100) : undefined,
          cmp: cmpConcluir ? Math.round(parseFloat(cmpConcluir) * 100) : undefined,
          data_real: dataTerminoReal || undefined,
          data_vencimento: dataVencimento || undefined,
        }),
      });

      // 2. Iniciar próxima fase (se produtiva)
      if (iniciarProxima) {
        await apiFetch(`/kanban/referencias/${cartao.id}/iniciar-proxima`, {
          method: 'POST',
          body: JSON.stringify({
            fase_destino: proximaEtapa,
            fornecedor_id: fornecedorId || undefined,
            fornecedor: fornecedorNome || undefined,
            cmo: semCmoProxima ? 0 : Math.round(parseFloat(cmoProxima) * 100),
            cmo_previsto: cmoProximoPrevisto > 0 ? Math.round(cmoProximoPrevisto * 100) : undefined,
            quantidade: parseInt(qtdConcluir),
            data_prevista: dataPrevista || undefined,
          }),
        });
      } else if (proximaEtapa) {
        // Fases não produtivas: só mover
        await apiFetch(`/kanban/referencias/${cartao.id}/mover`, {
          method: 'POST',
          body: JSON.stringify({ fase_destino: proximaEtapa, quantidade: parseInt(qtdConcluir) }),
        });
      }

      const faseLbl = FASE_LABEL[cartao.fase_atual] ?? cartao.fase_atual;
      const proxLbl = proximaEtapa ? (FASE_LABEL[proximaEtapa] ?? proximaEtapa) : '';
      toast.success(`${faseLbl} concluída${proxLbl ? ` → ${proxLbl} iniciada` : ''}!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar');
    } finally {
      setLoading(false);
    }
  };

  if (!cartao) return null;

  const faseAtualLbl = FASE_LABEL[cartao.fase_atual] ?? cartao.fase_atual;
  const proximaLbl = proximaEtapa ? (FASE_LABEL[proximaEtapa] ?? proximaEtapa) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* ── Header azul ── */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 py-4 relative">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 text-white/70 hover:text-white hover:bg-white/20 rounded-full p-1"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <ArrowRight className="w-4 h-4 text-blue-200" />
            <span className="text-white font-bold text-base">
              {faseAtualLbl}{proximaLbl ? ` → ${proximaLbl}` : ''}
            </span>
          </div>
          <p className="text-blue-100 text-sm font-semibold">{cartao.codigo}</p>
          {cartao.nome_cliente && (
            <p className="text-blue-200 text-xs">| {cartao.nome_cliente}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">

          {/* ── Seção 1: Concluir ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</span>
              <span className="font-semibold text-sm text-gray-700">Concluir {faseAtualLbl}</span>
            </div>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2 border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium w-28">CMP:</span>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-gray-400 text-xs">R$</span>
                  <Input
                    type="number" step="0.01" min="0"
                    value={cmpConcluir}
                    onChange={e => setCmpConcluir(e.target.value)}
                    disabled={loading}
                    className="h-7 text-sm w-28"
                  />
                </div>
              </div>
              <div className="flex items-start justify-between text-sm">
                <span className="text-gray-500 font-medium w-28 pt-1">CMO (R$/peça):</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">R$</span>
                    <Input
                      type="number" step="0.01" min="0"
                      value={cmoConcluir}
                      onChange={e => setCmoConcluir(e.target.value)}
                      disabled={loading || semCmoConcluir}
                      className={`h-7 text-sm w-28 ${semCmoConcluir ? 'bg-gray-200' : ''}`}
                    />
                  </div>
                  {cmoAtualPrevisto > 0 && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Previsto: <strong>R$ {cmoAtualPrevisto.toFixed(2).replace('.', ',')}/peça</strong>
                      {qtdNum > 0 && <span className="text-gray-500 ml-1">· Total: R$ {(cmoAtualPrevisto * qtdNum).toFixed(2).replace('.', ',')}</span>}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 font-medium w-28">Quantidade:</span>
                <Input
                  type="number" min="0"
                  value={qtdConcluir}
                  onChange={e => setQtdConcluir(e.target.value)}
                  disabled={loading}
                  className="h-7 text-sm w-28"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Data Término Real *</Label>
                <Input type="date" value={dataTerminoReal} onChange={e => setDataTerminoReal(e.target.value)} disabled={loading} className="mt-1 h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Data Vencimento {!semCmoConcluir && Number(cmoConcluir) > 0 && <span className="text-red-500">*</span>}
                </Label>
                <Input type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} disabled={loading} className="mt-1 h-8 text-sm" />
              </div>
            </div>

            <div
              onClick={() => setSemCmoConcluir(!semCmoConcluir)}
              className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer border-2 transition-all text-sm ${semCmoConcluir ? 'bg-red-100 border-red-400' : 'bg-red-50 border-red-200 hover:border-red-300'}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${semCmoConcluir ? 'bg-red-500 border-red-500' : 'border-red-400 bg-white'}`}>
                {semCmoConcluir && <Check className="w-2.5 h-2.5 text-white" />}
              </div>
              <span className="font-semibold text-red-700">Sem CMO (não gerar conta a pagar)</span>
            </div>
          </div>

          {/* ── Seção 2: Iniciar próxima fase (somente para fases produtivas) ── */}
          {iniciarProxima && (
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                <span className="font-semibold text-sm text-gray-700">Iniciar {proximaLbl}</span>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  Fornecedor {!semCmoProxima && Number(cmoProxima) > 0 && <span className="text-red-500">*</span>}
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
                      className="mt-1 w-full h-8 border border-input rounded-md px-3 text-sm bg-background"
                    >
                      <option value="">Selecionar fornecedor...</option>
                      {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                    {!fornecedorId && (
                      <Input
                        value={fornecedorNome}
                        onChange={e => setFornecedorNome(e.target.value)}
                        disabled={loading}
                        className="mt-1 h-8 text-sm"
                        placeholder="Ou digitar nome do fornecedor"
                      />
                    )}
                  </>
                ) : (
                  <Input
                    value={fornecedorNome}
                    onChange={e => setFornecedorNome(e.target.value)}
                    disabled={loading}
                    className="mt-1 h-8 text-sm"
                    placeholder="Nome do fornecedor"
                  />
                )}
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <Label className="text-xs font-semibold">CMO (R$/peça) *</Label>
                  <Input
                    type="number" step="0.01" min="0"
                    value={cmoProxima}
                    onChange={e => setCmoProxima(e.target.value)}
                    disabled={loading || semCmoProxima}
                    className={`mt-1 h-8 text-sm ${semCmoProxima ? 'bg-gray-100' : ''}`}
                    placeholder="0,00"
                  />
                  {cmoProximoPrevisto > 0 && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      Previsto: <strong>R$ {cmoProximoPrevisto.toFixed(2).replace('.', ',')}/peça</strong>
                      {qtdNum > 0 && <span className="text-gray-500 ml-1">· Total: R$ {(cmoProximoPrevisto * qtdNum).toFixed(2).replace('.', ',')}</span>}
                    </p>
                  )}
                </div>
                <label className="flex items-center gap-1.5 pb-1 pt-5 cursor-pointer text-xs text-red-700 font-semibold whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={semCmoProxima}
                    onChange={e => setSemCmoProxima(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  Sem CMO
                </label>
                <div>
                  <Label className="text-xs font-semibold">Data Prevista</Label>
                  <Input
                    type="date"
                    value={dataPrevista}
                    onChange={e => setDataPrevista(e.target.value)}
                    disabled={loading}
                    className="mt-1 h-8 text-sm w-36"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 font-bold"
            >
              {loading ? 'Processando...' : iniciarProxima ? 'Concluir e Iniciar' : 'Concluir Fase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
