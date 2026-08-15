import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  ClipboardList, FileImage, X, MapPin, Phone,
  Search, Filter, Loader2, Send, ArrowLeft, ChevronRight,
  CheckCircle2, Users2,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Parceiro {
  id: string;
  nome: string;
  whatsapp: string;
  area: string;
  subtipo: string | null;
  cidade: string | null;
  bairro: string | null;
  status: string;
  especialidades?: string[];
}

const AREAS: Record<string, string> = {
  Costura:        'Costura',
  Estamparia:     'Estamparia',
  Corte:          'Corte',
  Modelagem:      'Modelagem',
  Pilotagem:      'Pilotagem',
  Beneficiamento: 'Beneficiamento',
  Lavanderia:     'Lavanderia',
  Acabamento:     'Acabamento',
  producao:       'Produção (legado)',
  fornecedor:     'Fornecedor (legado)',
};

function fmtPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) {
    const l = d.slice(2);
    return `(${l.slice(0, 2)}) ${l.slice(2, 7)}-${l.slice(7)}`;
  }
  return p;
}

// Barra de progresso dos passos
function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < step ? 'bg-violet-600' : i === step ? 'bg-violet-300' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );
}

export default function CotacaoNova() {
  const [, nav] = useLocation();
  const qc = useQueryClient();

  // lê IDs pré-selecionados da URL query string (?ids=id1,id2)
  const preSelectedIds = (() => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    const raw = params.get('ids');
    return raw ? raw.split(',').filter(Boolean) : [];
  })();

  // estado do wizard
  const [step, setStep] = useState(0); // 0: título, 1: mensagem+foto, 2: parceiros, 3: confirmar
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [imagens, setImagens] = useState<{ base64: string; preview: string }[]>([]);
  const [selected, setSelected] = useState<Set<string>>(
    preSelectedIds.length > 0 ? new Set(preSelectedIds) : new Set()
  );

  // filtros parceiros
  const [pSearch, setPSearch] = useState('');
  const [pArea, setPArea] = useState('');
  const [pSubtipo, setPSubtipo] = useState('');
  const [pCidade, setPCidade] = useState('');
  const [pBairro, setPBairro] = useState('');
  const [pEsp, setPEsp] = useState('');

  const [sending, setSending] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  // busca parceiros quando chega no step 2
  const { data: parcData, isLoading: parcLoading } = useQuery({
    queryKey: ['parceiros-select-all'],
    queryFn: () => apiFetch('/kanban/parceiros?limit=500') as Promise<{ parceiros: Parceiro[] }>,
    enabled: step >= 2,
  });

  const allParceiros = (parcData?.parceiros ?? []) as Parceiro[];

  const parceiros = allParceiros.filter(p => {
    if (pSearch) {
      const q = pSearch.toLowerCase();
      if (!p.nome.toLowerCase().includes(q) &&
        !(p.cidade ?? '').toLowerCase().includes(q) &&
        !(p.bairro ?? '').toLowerCase().includes(q) &&
        !(p.subtipo ?? '').toLowerCase().includes(q)) return false;
    }
    if (pArea && p.area.toLowerCase() !== pArea.toLowerCase()) return false;
    if (pSubtipo && (p.subtipo ?? '').toLowerCase() !== pSubtipo.toLowerCase()) return false;
    if (pCidade && (p.cidade ?? '').toLowerCase() !== pCidade.toLowerCase()) return false;
    if (pBairro && (p.bairro ?? '').toLowerCase() !== pBairro.toLowerCase()) return false;
    if (pEsp) {
      const esp = (p.especialidades ?? []) as string[];
      if (!esp.some(e => e.toLowerCase() === pEsp.toLowerCase())) return false;
    }
    return true;
  });

  const cidadeOpts = Array.from(new Set(allParceiros.map(p => p.cidade).filter(Boolean) as string[])).sort();
  const bairroOpts = Array.from(new Set(
    allParceiros.filter(p => !pCidade || (p.cidade ?? '').toLowerCase() === pCidade.toLowerCase())
      .map(p => p.bairro).filter(Boolean) as string[]
  )).sort();
  const subtipoOpts = Array.from(new Set(allParceiros.map(p => p.subtipo).filter(Boolean) as string[])).sort();
  const espOpts = Array.from(new Set(
    allParceiros.flatMap(p => p.especialidades ?? []).filter(Boolean)
  )).sort();

  const addImagens = async (files: FileList) => {
    const novos = await Promise.all(
      Array.from(files).slice(0, 5 - imagens.length).map(file =>
        new Promise<{ base64: string; preview: string }>(resolve => {
          const reader = new FileReader();
          reader.onload = e => {
            const b64 = (e.target?.result as string) ?? '';
            resolve({ base64: b64, preview: b64 });
          };
          reader.readAsDataURL(file);
        })
      )
    );
    setImagens(v => [...v, ...novos]);
  };

  const toggle = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleAll = () => setSelected(prev =>
    prev.size === parceiros.length ? new Set() : new Set(parceiros.map(p => p.id))
  );

  const enviar = async () => {
    setSending(true);
    try {
      const res = await apiFetch('/kanban/cotacoes/criar-e-enviar', {
        method: 'POST',
        body: JSON.stringify({
          titulo: titulo.trim(),
          mensagem: mensagem.trim() || undefined,
          imagens: imagens.map(i => i.base64),
          parceiro_ids: Array.from(selected),
        }),
      }) as { ok: boolean; cotacao: { numero: string }; succeeded: number; failed: number };
      if (res.failed === 0) {
        toast.success(`${res.cotacao.numero} criada — enviada para ${res.succeeded} parceiro${res.succeeded > 1 ? 's' : ''}`);
      } else {
        toast.warning(`${res.cotacao.numero} criada — ${res.succeeded} enviados, ${res.failed} falhou`);
      }
      qc.invalidateQueries({ queryKey: ['cotacoes'] });
      nav('/hub/kanban/cotacoes');
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao criar cotação');
    } finally {
      setSending(false);
    }
  };

  const parceirosSelecionados = allParceiros.filter(p => selected.has(p.id));

  return (
    <KanbanLayout>
      <div className="min-h-screen flex flex-col items-center justify-start px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Voltar */}
          <button
            onClick={() => step === 0 ? nav('/hub/kanban/cotacoes') : setStep(s => s - 1)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={15} /> {step === 0 ? 'Voltar para Cotações' : 'Passo anterior'}
          </button>

          {/* Barra */}
          <StepBar step={step} total={4} />

          {/* ── Passo 0: Título ── */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Passo 1 de 4</p>
                <h1 className="text-2xl font-bold">Qual o nome deste projeto?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Dê um título curto que identifique a peça ou projeto.
                </p>
              </div>
              <Input
                autoFocus
                className="text-base h-12"
                placeholder="ex: Blusa Manga Longa — 500 pcs"
                value={titulo}
                onChange={e => setTitulo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && titulo.trim() && setStep(1)}
              />
              <Button
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 gap-2"
                disabled={!titulo.trim()}
                onClick={() => setStep(1)}
              >
                Continuar <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* ── Passo 1: Mensagem + Foto ── */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Passo 2 de 4</p>
                <h1 className="text-2xl font-bold">Mensagem e foto do projeto</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Escreva o que os parceiros precisam saber e, se quiser, adicione uma foto da peça.
                </p>
              </div>

              <Textarea
                autoFocus
                className="text-base min-h-[140px] resize-none"
                placeholder="Descreva a peça, quantidade, prazo, detalhes importantes..."
                value={mensagem}
                onChange={e => setMensagem(e.target.value)}
              />

              {/* Upload de foto */}
              <div>
                <button
                  type="button"
                  onClick={() => imgRef.current?.click()}
                  className="w-full border-2 border-dashed rounded-xl p-5 text-center hover:border-violet-400 hover:bg-violet-50/50 transition-colors flex flex-col items-center gap-2"
                >
                  <FileImage className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {imagens.length === 0
                      ? 'Clique para adicionar foto da peça (opcional)'
                      : `${imagens.length} foto${imagens.length > 1 ? 's' : ''} adicionada${imagens.length > 1 ? 's' : ''} — clique para adicionar mais`}
                  </span>
                </button>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && addImagens(e.target.files)}
                />
                {imagens.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {imagens.map((img, i) => (
                      <div key={i} className="relative group">
                        <img src={img.preview} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                        <button
                          onClick={() => setImagens(v => v.filter((_, j) => j !== i))}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground -mt-2">
                O sistema envia sua mensagem e foto automaticamente com os botões ✅ SIM / ❌ NÃO para o parceiro responder.
              </p>

              <Button
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 gap-2"
                disabled={!mensagem.trim() && imagens.length === 0}
                onClick={() => setStep(2)}
              >
                Continuar <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* ── Passo 2: Selecionar parceiros ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Passo 3 de 4</p>
                <h1 className="text-2xl font-bold">Para quais parceiros enviar?</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Selecione quem vai receber a cotação <strong>"{titulo}"</strong>.
                </p>
              </div>

              {/* Filtros */}
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[160px]">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-7 h-9 text-sm"
                    placeholder="Buscar nome, cidade, serviço..."
                    value={pSearch}
                    onChange={e => setPSearch(e.target.value)}
                  />
                </div>
                <Select value={pArea || 'all'} onValueChange={v => { setPArea(v === 'all' ? '' : v); setPSubtipo(''); }}>
                  <SelectTrigger className="h-9 text-sm w-36">
                    <Filter size={12} className="mr-1 shrink-0" /><SelectValue placeholder="Área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas áreas</SelectItem>
                    {Object.entries(AREAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                {subtipoOpts.length > 0 && (
                  <Select value={pSubtipo || 'all'} onValueChange={v => setPSubtipo(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Serviço" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos serviços</SelectItem>
                      {subtipoOpts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {espOpts.length > 0 && (
                  <Select value={pEsp || 'all'} onValueChange={v => setPEsp(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Especialidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {espOpts.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {cidadeOpts.length > 0 && (
                  <Select value={pCidade || 'all'} onValueChange={v => { setPCidade(v === 'all' ? '' : v); setPBairro(''); }}>
                    <SelectTrigger className="h-9 text-sm w-32"><SelectValue placeholder="Cidade" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas cidades</SelectItem>
                      {cidadeOpts.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                {bairroOpts.length > 0 && (
                  <Select value={pBairro || 'all'} onValueChange={v => setPBairro(v === 'all' ? '' : v)}>
                    <SelectTrigger className="h-9 text-sm w-36"><SelectValue placeholder="Bairro" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos bairros</SelectItem>
                      {bairroOpts.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Seleção global */}
              {!parcLoading && parceiros.length > 0 && (
                <div className="flex items-center gap-3">
                  <button onClick={toggleAll} className="text-xs text-violet-600 hover:underline">
                    {selected.size === parceiros.length ? 'Desmarcar todos' : `Selecionar todos (${parceiros.length})`}
                  </button>
                  {selected.size > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {selected.size} selecionado{selected.size > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              )}

              {/* Lista */}
              <div className="border rounded-xl divide-y max-h-72 overflow-y-auto">
                {parcLoading ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" /> Carregando parceiros...
                  </div>
                ) : parceiros.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum parceiro com esses filtros
                  </div>
                ) : parceiros.map(p => (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
                      selected.has(p.id) ? 'bg-violet-50' : 'hover:bg-muted/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="rounded shrink-0"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{p.nome}</div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {p.subtipo && (
                          <span className="bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded text-[10px] border border-violet-100">
                            {p.subtipo}
                          </span>
                        )}
                        {(p.cidade || p.bairro) && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {[p.bairro, p.cidade].filter(Boolean).join(', ')}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <Phone size={10} />
                          {fmtPhone(p.whatsapp)}
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>

              <Button
                className="w-full h-11 bg-violet-600 hover:bg-violet-700 gap-2"
                disabled={selected.size === 0}
                onClick={() => setStep(3)}
              >
                Continuar com {selected.size} parceiro{selected.size !== 1 ? 's' : ''} <ChevronRight size={16} />
              </Button>
            </div>
          )}

          {/* ── Passo 3: Confirmar e enviar ── */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-violet-600 uppercase tracking-widest mb-2">Passo 4 de 4</p>
                <h1 className="text-2xl font-bold">Tudo certo — confirme o envio</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Revise antes de enviar. Não é possível editar depois.
                </p>
              </div>

              <div className="rounded-xl border bg-muted/30 divide-y">
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground">Título</p>
                  <p className="font-semibold mt-0.5">{titulo}</p>
                </div>
                {mensagem && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground">Mensagem</p>
                    <p className="text-sm mt-0.5 whitespace-pre-wrap">{mensagem}</p>
                  </div>
                )}
                {imagens.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      {imagens.length} foto{imagens.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {imagens.map((img, i) => (
                        <img key={i} src={img.preview} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                      ))}
                    </div>
                  </div>
                )}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users2 size={14} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      {parceirosSelecionados.length} parceiro{parceirosSelecionados.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parceirosSelecionados.map(p => (
                      <span key={p.id} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={10} /> {p.nome}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-12 bg-violet-600 hover:bg-violet-700 gap-2 text-base"
                disabled={sending}
                onClick={enviar}
              >
                {sending
                  ? <><Loader2 size={16} className="animate-spin" /> Enviando...</>
                  : <><Send size={16} /> Enviar para {parceirosSelecionados.length} parceiro{parceirosSelecionados.length !== 1 ? 's' : ''}</>
                }
              </Button>
            </div>
          )}

        </div>
      </div>
    </KanbanLayout>
  );
}
