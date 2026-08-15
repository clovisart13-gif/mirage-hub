import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import PLMLayout from '@/components/plm/PLMLayout';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import {
  Package, FlaskConical, CheckSquare, TrendingUp,
  Clock, ArrowRight, Plus, Activity, FileText,
  Layers, Scissors, ShoppingBag, Calculator, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  rascunho:      { label: 'Rascunho',      color: 'bg-gray-500',  light: 'bg-gray-50 border-gray-200 text-gray-700' },
  desenvolvimento:{ label: 'Desenvolvimento', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200 text-blue-700' },
  pilotagem:     { label: 'Pilotagem',     color: 'bg-amber-500', light: 'bg-amber-50 border-amber-200 text-amber-700' },
  aprovado:      { label: 'Aprovado',      color: 'bg-green-500', light: 'bg-green-50 border-green-200 text-green-700' },
} as const;

const CATEGORIA_LABEL: Record<string, string> = {
  camiseta: 'Camiseta', camisa: 'Camisa', calca: 'Calça', short: 'Short',
  vestido: 'Vestido', saia: 'Saia', jaqueta: 'Jaqueta', casaco: 'Casaco',
  blusa: 'Blusa', moletom: 'Moletom', macacao: 'Macacão', outro: 'Outro',
};

const MODULO_LABEL: Record<string, string> = {
  produto: 'Produto', ficha_tecnica: 'Ficha Técnica', modelagem: 'Modelagem',
  material: 'Material', bom: 'Materiais & Custos', pilotagem: 'Pilotagem',
  aprovacao: 'Aprovação', tenant: 'Empresa', usuario: 'Usuário',
};

const ACAO_COLOR: Record<string, string> = {
  criacao:     'bg-blue-100 text-blue-700',
  atualizacao: 'bg-amber-100 text-amber-700',
  aprovacao:   'bg-green-100 text-green-700',
  reprovacao:  'bg-red-100 text-red-700',
  upload:      'bg-purple-100 text-purple-700',
  exclusao:    'bg-red-100 text-red-700',
};

const QUICK_LINKS = [
  { label: 'Produtos',       href: '/hub/plm/produtos',    icon: Package,    color: 'text-indigo-600 bg-indigo-50' },
  { label: 'Fichas',         href: '/hub/plm/fichas',      icon: FileText,   color: 'text-blue-600 bg-blue-50' },
  { label: 'Modelagem',      href: '/hub/plm/modelagem',   icon: Scissors,   color: 'text-violet-600 bg-violet-50' },
  { label: 'Materiais',      href: '/hub/plm/materiais',   icon: ShoppingBag,color: 'text-orange-600 bg-orange-50' },
  { label: 'Custos',         href: '/hub/plm/bom',         icon: Calculator, color: 'text-emerald-600 bg-emerald-50' },
  { label: 'Pilotagem',      href: '/hub/plm/pilotagem',   icon: FlaskConical,color: 'text-amber-600 bg-amber-50' },
  { label: 'Aprovações',     href: '/hub/plm/aprovacoes',  icon: CheckSquare,color: 'text-green-600 bg-green-50' },
  { label: 'Clientes PLM',   href: '/hub/plm/clientes',    icon: Users,      color: 'text-pink-600 bg-pink-50' },
];

export default function PLMDashboard() {
  const [, navigate] = useLocation();

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ['plm-dashboard-kpis'],
    queryFn: () => apiFetch('/plm/dashboard/kpis'),
  });

  const { data: kanban, isLoading: kanbanLoading } = useQuery({
    queryKey: ['plm-dashboard-kanban'],
    queryFn: () => apiFetch('/plm/dashboard/kanban'),
  });

  const { data: atividades, isLoading: atividadesLoading } = useQuery({
    queryKey: ['plm-dashboard-atividades'],
    queryFn: () => apiFetch('/plm/dashboard/atividades?limit=10'),
  });

  const totalProdutos   = kpis?.totalProdutos ?? 0;
  const totalFichas     = kpis?.totalFichas ?? 0;
  const pilotosAtivos   = kpis?.pilotosAtivos ?? 0;
  const aprovsPendentes = kpis?.aprovacoesPendentes ?? 0;

  return (
    <PLMLayout>
      {/* ── Cabeçalho gradiente ─────────────────────────────────────────────── */}
      <div className="rounded-2xl mx-6 mt-6 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white">
        <div className="max-w-screen-xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">PLM Mirage</h1>
                <p className="text-indigo-200 text-sm">Gestão do ciclo de vida de produtos</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/hub/plm/produtos/novo')}
              className="flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>

          {/* KPIs inline no header */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            {kpiLoading ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white/10 rounded-xl h-20 animate-pulse" />
            )) : [
              { label: 'Produtos', value: totalProdutos, icon: Package, href: '/hub/plm/produtos' },
              { label: 'Fichas Técnicas', value: totalFichas, icon: TrendingUp, href: '/hub/plm/fichas' },
              { label: 'Pilotos Ativos', value: pilotosAtivos, icon: FlaskConical, href: '/hub/plm/pilotagem' },
              { label: 'Aprovações Pendentes', value: aprovsPendentes, icon: CheckSquare, href: '/hub/plm/aprovacoes' },
            ].map(({ label, value, icon: Icon, href }) => (
              <button
                key={label}
                onClick={() => navigate(href)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur rounded-xl px-4 py-3 text-left transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <Icon className="w-4 h-4 text-white/70" />
                  <ArrowRight className="w-3 h-3 text-white/40 group-hover:text-white/70 transition-colors" />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-indigo-200">{label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Corpo principal ─────────────────────────────────────────────────── */}
      <div className="p-6 max-w-screen-xl mx-auto space-y-6">

        {/* Acesso rápido */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</h2>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {QUICK_LINKS.map(({ label, href, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all group"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-medium text-center text-muted-foreground group-hover:text-foreground leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Kanban status + Atividades */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Kanban de status dos produtos */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Status dos Produtos</h2>
              <Link href="/hub/plm/produtos" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {kanbanLoading ? <Skeleton className="h-64 rounded-xl" /> : (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                  const items = kanban?.[status] ?? [];
                  return (
                    <div key={status} className="bg-card rounded-xl border overflow-hidden">
                      <div className={cn('h-1', cfg.color)} />
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-foreground">{cfg.label}</span>
                          <Badge variant="secondary" className={cn('text-xs font-bold', cfg.light)}>
                            {items.length}
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          {items.slice(0, 3).map((p: any) => (
                            <div
                              key={p.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => navigate(`/hub/plm/produtos/${p.id}`)}
                              onKeyDown={e => e.key === 'Enter' && navigate(`/hub/plm/produtos/${p.id}`)}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted cursor-pointer group"
                            >
                              <div className={cn('w-6 h-6 rounded flex items-center justify-center shrink-0', cfg.color.replace('bg-', 'bg-').replace('500', '100'))}>
                                <Package className={cn('w-3 h-3', cfg.color.replace('bg-', 'text-'))} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{p.nome}</p>
                                <p className="text-[10px] text-muted-foreground">{CATEGORIA_LABEL[p.categoria] ?? p.categoria}</p>
                              </div>
                              <ArrowRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground" />
                            </div>
                          ))}
                          {items.length > 3 && (
                            <button
                              onClick={() => navigate('/hub/plm/produtos')}
                              className="w-full text-xs text-indigo-600 hover:underline text-center pt-1"
                            >
                              +{items.length - 3} mais
                            </button>
                          )}
                          {items.length === 0 && (
                            <div className="text-center py-4">
                              <Package className="w-6 h-6 mx-auto text-muted-foreground/30 mb-1" />
                              <p className="text-xs text-muted-foreground">Nenhum produto</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Atividades recentes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Atividades</h2>
              <Link href="/hub/plm/historico" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Ver histórico <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-card rounded-xl border overflow-hidden">
              {atividadesLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
                </div>
              ) : (atividades ?? []).length === 0 ? (
                <div className="p-8 text-center">
                  <Activity className="w-10 h-10 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Nenhuma atividade ainda</p>
                  <p className="text-xs text-muted-foreground mt-1">As ações ficam registradas aqui</p>
                </div>
              ) : (
                <div className="divide-y">
                  {(atividades ?? []).map((a: any) => (
                    <div key={a.id} className="px-4 py-3 flex gap-3 items-start hover:bg-muted/50 transition-colors">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 whitespace-nowrap', ACAO_COLOR[a.acao] ?? 'bg-gray-100 text-gray-600')}>
                        {a.acao}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-foreground line-clamp-2">{a.descricao}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {MODULO_LABEL[a.modulo] ?? a.modulo} · {new Date(a.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PLMLayout>
  );
}
