import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import {
  ClipboardList, Plus, Loader2, CheckCircle2,
  Clock, XCircle, ChevronRight, Users2, Archive,
  ArrowLeft, MapPin, Phone, Trash2, ThumbsUp, ThumbsDown,
} from 'lucide-react';

interface Cotacao {
  id: string;
  numero: string;
  titulo: string;
  mensagem: string | null;
  status: string;
  created_at: string;
  total: number;
  sim: number;
  nao: number;
  pendente: number;
}

interface Destinatario {
  id: string;
  parceiro_id: string;
  parceiro_nome: string;
  parceiro_whatsapp: string;
  area: string | null;
  subtipo: string | null;
  cidade: string | null;
  bairro: string | null;
  enviado_at: string | null;
  resposta: 'sim' | 'nao' | null;
  resposta_at: string | null;
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function fmtPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('55') && d.length >= 12) {
    const l = d.slice(2);
    return `(${l.slice(0, 2)}) ${l.slice(2, 7)}-${l.slice(7)}`;
  }
  return p;
}

function RespostaBadge({ resposta }: { resposta: 'sim' | 'nao' | null }) {
  if (resposta === 'sim') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 size={10} /> Interessado
    </span>
  );
  if (resposta === 'nao') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle size={10} /> Não disponível
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Aguardando
    </span>
  );
}

// ── Detalhe da cotação ─────────────────────────────────────────────────────────
function CotacaoDetalhe({ cotacao, onBack }: { cotacao: Cotacao; onBack: () => void }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cotacao-detalhe', cotacao.id],
    queryFn: () => apiFetch(`/kanban/cotacoes/${cotacao.id}`) as Promise<{ cotacao: Cotacao; destinatarios: Destinatario[] }>,
    refetchInterval: 10_000,
  });

  const encerrar = useMutation({
    mutationFn: () => apiFetch(`/kanban/cotacoes/${cotacao.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'encerrada' }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cotacoes'] }); toast.success('Cotação encerrada'); },
  });
  const excluir = useMutation({
    mutationFn: () => apiFetch(`/kanban/cotacoes/${cotacao.id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cotacoes'] }); toast.success('Cotação excluída'); onBack(); },
  });

  const responderManual = useMutation({
    mutationFn: ({ destId, resposta }: { destId: string; resposta: 'sim' | 'nao' }) =>
      apiFetch(`/kanban/cotacoes/${cotacao.id}/destinatarios/${destId}/resposta`, {
        method: 'PATCH',
        body: JSON.stringify({ resposta }),
      }),
    onSuccess: (_data, vars) => {
      toast.success(vars.resposta === 'sim' ? '✅ Marcado como Interessado' : '❌ Marcado como Não disponível');
      qc.invalidateQueries({ queryKey: ['cotacao-detalhe', cotacao.id] });
      qc.invalidateQueries({ queryKey: ['cotacoes'] });
      qc.invalidateQueries({ queryKey: ['banco-parceiros'] });
    },
    onError: () => toast.error('Erro ao registrar resposta'),
  });

  const dest = (data as any)?.detail?.destinatarios ?? (data as any)?.destinatarios ?? [];
  const sim = dest.filter((d: Destinatario) => d.resposta === 'sim').length;
  const nao = dest.filter((d: Destinatario) => d.resposta === 'nao').length;
  const pendente = dest.filter((d: Destinatario) => d.resposta === null).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft size={14} /> Voltar
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{cotacao.numero}</span>
            {cotacao.status === 'encerrada' && <Badge variant="outline" className="text-xs">Encerrada</Badge>}
          </div>
          <h2 className="text-xl font-bold">{cotacao.titulo}</h2>
          <p className="text-xs text-muted-foreground">{fmtDate(cotacao.created_at)}</p>
        </div>
        <div className="flex gap-2">
          {cotacao.status !== 'encerrada' && (
            <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => encerrar.mutate()}>
              <Archive size={12} /> Encerrar
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs text-red-600 hover:text-red-700 border-red-200"
            onClick={() => { if (confirm('Excluir esta cotação?')) excluir.mutate(); }}>
            <Trash2 size={12} /> Excluir
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', val: dest.length, color: 'text-gray-600' },
          { label: 'Interessados', val: sim, color: 'text-green-600' },
          { label: 'Não disponível', val: nao, color: 'text-red-500' },
          { label: 'Aguardando', val: pendente, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {cotacao.mensagem && (
        <div className="rounded-lg bg-muted/40 border px-4 py-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Mensagem enviada</p>
          <p className="text-sm whitespace-pre-wrap">{cotacao.mensagem}</p>
        </div>
      )}

      {/* Tabela de destinatários */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" /> Carregando...
          </div>
        ) : dest.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Nenhum destinatário</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Parceiro</th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Serviço / Local</th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Enviado</th>
                <th className="text-left py-2.5 px-4 font-medium text-muted-foreground text-xs">Resposta</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dest.map((d: Destinatario) => (
                <tr key={d.id} className="hover:bg-muted/20">
                  <td className="py-2.5 px-4">
                    <div className="font-medium">{d.parceiro_nome}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Phone size={10} />
                      <a href={`https://wa.me/${d.parceiro_whatsapp}`} target="_blank" rel="noopener noreferrer"
                        className="hover:text-green-600">{fmtPhone(d.parceiro_whatsapp)}</a>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    {d.subtipo && <div className="text-xs bg-violet-50 text-violet-700 border border-violet-100 px-1.5 py-0.5 rounded inline-block">{d.subtipo}</div>}
                    {(d.bairro || d.cidade) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <MapPin size={10} /> {[d.bairro, d.cidade].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground">{fmtDate(d.enviado_at)}</td>
                  <td className="py-2.5 px-4">
                    {d.resposta === null ? (
                      /* Aguardando — botões manuais de resposta */
                      <div className="space-y-1.5">
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          <Clock size={10} /> Aguardando
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => responderManual.mutate({ destId: d.id, resposta: 'sim' })}
                            disabled={responderManual.isPending}
                            title="Marcar como Interessado"
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            {responderManual.isPending && (responderManual.variables as any)?.destId === d.id
                              ? <Loader2 size={10} className="animate-spin" />
                              : <ThumbsUp size={10} />}
                            Sim
                          </button>
                          <button
                            onClick={() => responderManual.mutate({ destId: d.id, resposta: 'nao' })}
                            disabled={responderManual.isPending}
                            title="Marcar como Não disponível"
                            className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            {responderManual.isPending && (responderManual.variables as any)?.destId === d.id
                              ? <Loader2 size={10} className="animate-spin" />
                              : <ThumbsDown size={10} />}
                            Não
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <RespostaBadge resposta={d.resposta} />
                        {d.resposta_at && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">{fmtDate(d.resposta_at)}</div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Card de cotação ───────────────────────────────────────────────────────────
function CotacaoCard({ cotacao: c, onClick }: { cotacao: Cotacao; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="text-left rounded-xl border bg-card p-4 hover:border-violet-300 hover:shadow-sm transition-all group w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-violet-600">{c.numero}</span>
            {c.status === 'encerrada' && <span className="text-[10px] text-muted-foreground border rounded px-1">encerrada</span>}
          </div>
          <p className="font-semibold text-sm mt-0.5 truncate">{c.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(c.created_at)}</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground mt-1 shrink-0 group-hover:text-violet-600 transition-colors" />
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle2 size={12} /> <span className="font-semibold">{c.sim}</span> sim
        </div>
        <div className="flex items-center gap-1 text-xs text-red-500">
          <XCircle size={12} /> <span className="font-semibold">{c.nao}</span> não
        </div>
        <div className="flex items-center gap-1 text-xs text-amber-600">
          <Clock size={12} /> <span className="font-semibold">{c.pendente}</span> aguard.
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
          <Users2 size={11} /> {c.total}
        </div>
      </div>

      {c.total > 0 && (
        <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full flex">
            {c.sim > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(c.sim / c.total) * 100}%` }} />}
            {c.nao > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(c.nao / c.total) * 100}%` }} />}
          </div>
        </div>
      )}
    </button>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Cotacoes() {
  const [, nav] = useLocation();
  const [selected, setSelected] = useState<Cotacao | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cotacoes'],
    queryFn: () => apiFetch('/kanban/cotacoes') as Promise<{ cotacoes: Cotacao[] }>,
    refetchInterval: 15_000,
  });

  const cotacoes = data?.cotacoes ?? [];
  const ativas = cotacoes.filter(c => c.status === 'enviada');
  const encerradas = cotacoes.filter(c => c.status === 'encerrada');

  return (
    <KanbanLayout>
      <div className="px-6 py-8 space-y-6">
        {selected ? (
          <CotacaoDetalhe cotacao={selected} onBack={() => setSelected(null)} />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <ClipboardList className="w-6 h-6 text-violet-600" /> Cotações
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Envie projetos para múltiplos parceiros e acompanhe as respostas
                </p>
              </div>
              <Button onClick={() => nav('/hub/kanban/cotacoes/nova')} className="bg-violet-600 hover:bg-violet-700 gap-2">
                <Plus size={16} /> Nova Cotação
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" /> Carregando...
              </div>
            ) : cotacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <ClipboardList size={40} className="opacity-20" />
                <p className="text-sm">Nenhuma cotação ainda</p>
                <Button onClick={() => nav('/hub/kanban/cotacoes/nova')} className="bg-violet-600 hover:bg-violet-700 gap-1">
                  <Plus size={14} /> Criar primeira cotação
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {ativas.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Em andamento ({ativas.length})
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {ativas.map(c => <CotacaoCard key={c.id} cotacao={c} onClick={() => setSelected(c)} />)}
                    </div>
                  </div>
                )}
                {encerradas.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Encerradas ({encerradas.length})
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {encerradas.map(c => <CotacaoCard key={c.id} cotacao={c} onClick={() => setSelected(c)} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </KanbanLayout>
  );
}
