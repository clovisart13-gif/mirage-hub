import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, ShoppingBag, Package, ArrowDownCircle, ArrowUpCircle,
  Users, Factory, ArrowLeft, ChevronLeft, ChevronRight,
  MessageCircle, Calculator, FileText, Settings, Database,
  Globe, BarChart3, ChevronDown, ChevronUp, Handshake, Layers, BookOpen,
  Bell, Wallet, BarChart2, Users2, UserCheck, ClipboardList, Brain,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// ─── Estrutura de navegação ──────────────────────────────────────────────────

const KANBAN_SUBMENU = [
  { label: 'Quadro',           icon: LayoutDashboard,  href: '/hub/kanban' },
  { label: 'Pedidos',          icon: ShoppingBag,       href: '/hub/kanban/pedidos' },
  { label: 'Estoque',          icon: Package,           href: '/hub/kanban/estoque' },
  { label: 'Contas a Pagar',   icon: ArrowDownCircle,   href: '/hub/kanban/contas-a-pagar' },
  { label: 'Contas a Receber', icon: ArrowUpCircle,     href: '/hub/kanban/contas-a-receber' },
  { label: 'Fornecedores',     icon: Factory,           href: '/hub/kanban/fornecedores' },
  { label: 'Banco de Parceiros', icon: Users2,           href: '/hub/kanban/parceiros' },
  { label: 'Clientes',         icon: Users,             href: '/hub/kanban/clientes' },
  { label: 'Prod. por Fase',   icon: BarChart2,         href: '/hub/kanban/relatorio-fases' },
  { label: 'Gerir Aviamentos', icon: Layers,            href: '/hub/kanban/gerir-aviamentos' },
];

const ORCAMENTO_SUBMENU = [
  { label: 'Fichas de Custo',  icon: FileText,          href: '/hub/custos/fichas' },
  { label: 'Orçamentos',       icon: Calculator,        href: '/hub/custos/orcamentos' },
  { label: 'Configurações',    icon: Settings,          href: '/hub/custos/configuracoes' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface Props {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function KanbanLayout({ children, fullWidth = false }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  const { data: empresa } = useQuery<{ nome_empresa?: string; logo_url?: string; slug?: string }>({
    queryKey: ['empresa'],
    queryFn: () => apiFetch('/tenants/empresa'),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const isR2pb   = empresa?.slug === 'r2pb';
  const isMirage = empresa?.slug === 'mirage';

  // Contagem de novos leads — polling silencioso, falha ignorada (não-super-admin vê 403)
  const { data: leadStats } = useQuery<{ novo: number }>({
    queryKey: ['mc-leads-notify'],
    queryFn: () => apiFetch('/moda-conecta/leads/stats?companySlug=mirage'),
    refetchInterval: 60_000,
    retry: false,
    throwOnError: false,
  });
  const novosLeads = leadStats?.novo ?? 0;

  const inKanban    = location.startsWith('/hub/kanban');
  const inOrcamento = location.startsWith('/hub/custos');

  const [kanbanOpen,    setKanbanOpen]    = useState(inKanban);
  const [orcamentoOpen, setOrcamentoOpen] = useState(inOrcamento);

  const isActive = (href: string) =>
    href === '/hub/kanban' ? location === href : location.startsWith(href);

  const isSection = (prefix: string) => location.startsWith(prefix);

  // ─── Link principal ───────────────────────────────────────────────────────
  const NavLink = ({ href, icon: Icon, label, className = '' }: {
    href: string; icon: any; label: string; className?: string;
  }) => (
    <Link
      href={href}
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive(href)
          ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-0',
        className,
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  // ─── Grupo expansível ─────────────────────────────────────────────────────
  const NavGroup = ({ icon: Icon, label, open, onToggle, active, children: sub }: {
    icon: any; label: string; open: boolean; onToggle: () => void;
    active: boolean; children: React.ReactNode;
  }) => (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/20'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          collapsed && 'justify-center px-0',
        )}
        title={collapsed ? label : undefined}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{label}</span>
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="ml-3 pl-2 border-l border-border/60 mt-0.5 space-y-0.5">
          {sub}
        </div>
      )}
    </div>
  );

  // ─── Item de submenu ──────────────────────────────────────────────────────
  const SubLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors',
        isActive(href)
          ? 'text-violet-700 font-semibold bg-violet-50'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-56',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b min-h-[56px]">
          {!collapsed ? (
            <Link href="/hub" className="flex items-center gap-2 min-w-0 group">
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt={empresa.nome_empresa ?? 'Empresa'} className="h-7 object-contain max-w-[120px]" />
              ) : (
                <img src="/mirage-logo.png" alt="Mirage" className="h-7 object-contain" />
              )}
            </Link>
          ) : (
            <Link href="/hub" className="mx-auto" title={empresa?.nome_empresa ?? 'Mirage Hub'}>
              {empresa?.logo_url ? (
                <img src={empresa.logo_url} alt={empresa.nome_empresa ?? 'Empresa'} className="h-6 w-6 object-contain object-center" />
              ) : (
                <img src="/mirage-logo.png" alt="Mirage" className="h-6 w-6 object-contain object-left" />
              )}
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted text-muted-foreground ml-auto shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Voltar ao Hub */}
        {!collapsed && (
          <div className="px-2 pb-1 pt-1 border-b border-border/50">
            <Link
              href="/hub"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-1 rounded hover:bg-muted"
            >
              <ArrowLeft className="w-3 h-3" /> Voltar ao Hub
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-1.5">

          {/* ── Alerta de leads Moda Conecta (só aparece para super admin) ── */}
          {leadStats && (
            <Link
              href="/hub/comunidade"
              className={cn(
                'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors relative',
                novosLeads > 0
                  ? 'bg-purple-500/15 text-purple-600 hover:bg-purple-500/15 border border-purple-300 dark:text-purple-300 dark:border-purple-500/30'
                  : isActive('/hub/comunidade')
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                collapsed && 'justify-center px-0',
              )}
              title={collapsed ? `Moda Conecta${novosLeads > 0 ? ` — ${novosLeads} novo${novosLeads > 1 ? 's' : ''}` : ''}` : undefined}
            >
              <span className="relative shrink-0">
                <Bell className="w-4 h-4" />
                {novosLeads > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 flex items-center justify-center rounded-full bg-purple-500 text-white text-[9px] font-bold leading-none animate-pulse">
                    {novosLeads > 9 ? '9+' : novosLeads}
                  </span>
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">Moda Conecta</span>
                  {novosLeads > 0 && (
                    <span className="text-[10px] font-bold bg-purple-500 text-white px-1.5 py-0.5 rounded-full">
                      {novosLeads} novo{novosLeads > 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </Link>
          )}

          <NavLink href="/hub/crm" icon={MessageCircle} label="CRM" />
          <NavLink href="/hub/contatos-comerciais" icon={Users} label="Contatos Comerciais" />

          <NavLink href="/hub/plm" icon={Layers} label="PLM Mirage" />

          <NavGroup
            icon={Calculator}
            label="Orçamento"
            open={orcamentoOpen}
            onToggle={() => setOrcamentoOpen(v => !v)}
            active={isSection('/hub/custos')}
          >
            {ORCAMENTO_SUBMENU.map(item => (
              <SubLink key={item.href} {...item} />
            ))}
          </NavGroup>

          <NavGroup
            icon={LayoutDashboard}
            label="Kanban"
            open={kanbanOpen}
            onToggle={() => setKanbanOpen(v => !v)}
            active={isSection('/hub/kanban')}
          >
            {KANBAN_SUBMENU.filter(item =>
              (item.href !== '/hub/kanban/parceiros' && item.href !== '/hub/kanban/candidatos-rh') || isR2pb
            ).map(item => (
              <SubLink key={item.href} {...item} />
            ))}
          </NavGroup>

          <NavLink href="/hub/erp" icon={Database} label="ERP Mirage" />
          {isMirage && <NavLink href="/hub/texintel" icon={Brain} label="TexIntel AI" />}
          {isR2pb && <NavLink href="/hub/kanban/candidatos-rh" icon={UserCheck} label="Candidatos RH" />}
          {isR2pb && <NavLink href="/hub/kanban/cotacoes" icon={ClipboardList} label="Cotações" />}

          <Link
            href="/hub/comunidade"
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
              isActive('/hub/comunidade')
                ? 'bg-purple-100 text-purple-700'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Comunidade' : undefined}
          >
            <Globe className="w-4 h-4 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1 truncate">Comunidade</span>
                <span className="text-[9px] font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200">Beta</span>
              </>
            )}
          </Link>

          <NavLink href="/hub/financeiro" icon={Wallet} label="Financeiro Mirage" />

          <NavLink href="/hub/relatorios" icon={BarChart3} label="Relatórios" />

          <NavLink href="/hub/partners" icon={Handshake} label="Partners Mirage" />

          <a
            href="/onboarding-portal/"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground',
              collapsed && 'justify-center px-0',
            )}
            title={collapsed ? 'Portal de Onboarding' : undefined}
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="flex-1 truncate">Portal de Onboarding</span>}
          </a>

        </nav>
      </aside>

      {/* Main content */}
      <main className={cn('flex-1 overflow-auto', fullWidth && 'overflow-hidden flex flex-col')}>
        {children}
      </main>
    </div>
  );
}
