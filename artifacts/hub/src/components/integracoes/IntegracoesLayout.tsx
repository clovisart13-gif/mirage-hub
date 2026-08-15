import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Puzzle, LayoutGrid, ArrowLeft,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

const NAV = [
  { label: 'Todas as Integrações', icon: LayoutGrid, href: '/hub/integracoes' },
];

interface Props { children: React.ReactNode }

export default function IntegracoesLayout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  const { data: empresa } = useQuery<{ nome_empresa?: string; logo_url?: string }>({
    queryKey: ['empresa'],
    queryFn: () => apiFetch('/tenants/empresa'),
    staleTime: 10 * 60 * 1000,
  });

  const isActive = (href: string) => location === href || location.startsWith(href + '/');

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
    <Link
      href={href}
      className={cn(
        'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive(href)
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        collapsed && 'justify-center px-0',
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className={cn(
        'flex flex-col border-r bg-card transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-56',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b min-h-[56px]">
          {!collapsed ? (
            <Link href="/hub" className="flex items-center gap-2 min-w-0">
              {empresa?.logo_url
                ? <img src={empresa.logo_url} alt={empresa.nome_empresa ?? ''} className="h-7 object-contain max-w-[120px]" />
                : <img src="/mirage-logo.png" alt="Mirage" className="h-7 object-contain" />
              }
            </Link>
          ) : (
            <Link href="/hub" className="mx-auto" title="Mirage Hub">
              {empresa?.logo_url
                ? <img src={empresa.logo_url} alt="" className="h-6 w-6 object-contain" />
                : <img src="/mirage-logo.png" alt="Mirage" className="h-6 w-6 object-contain" />
              }
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted text-muted-foreground ml-auto shrink-0"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Módulo badge */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-1.5">
              <Puzzle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Integrações</span>
            </div>
          </div>
        )}

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
          {NAV.map(item => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t p-2">
          {!collapsed && (
            <p className="text-[10px] text-muted-foreground text-center">Integrações Mirage</p>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
