import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  LayoutDashboard, Package, FileText, Scissors, ShoppingBag,
  Calculator, FlaskConical, CheckSquare, History, BarChart3,
  Users, Truck, ChevronLeft, ChevronRight, Menu, X,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { label: 'Dashboard',      href: '/hub/plm',                icon: LayoutDashboard },
  { label: 'Produtos',       href: '/hub/plm/produtos',       icon: Package },
  { label: 'Fichas Técnicas',href: '/hub/plm/fichas',         icon: FileText },
  { label: 'Modelagem',      href: '/hub/plm/modelagem',      icon: Scissors },
  { label: 'Materiais',      href: '/hub/plm/materiais',      icon: ShoppingBag },
  { label: 'Fornecedores',   href: '/hub/plm/fornecedores',   icon: Truck },
  { label: 'Custos',   href: '/hub/plm/bom',            icon: Calculator },
  { label: 'Pilotagem',      href: '/hub/plm/pilotagem',      icon: FlaskConical },
  { label: 'Aprovações',     href: '/hub/plm/aprovacoes',     icon: CheckSquare },
  { label: 'Histórico',      href: '/hub/plm/historico',      icon: History },
  { label: 'Clientes',       href: '/hub/plm/clientes',       icon: Users },
];

interface Props {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export default function PLMLayout({ children, fullWidth = false }: Props) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === '/hub/plm' ? location === href : location.startsWith(href);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-4 border-b border-slate-700">
        <Link href="/hub">
          <div className="flex items-center gap-2 text-slate-400 hover:text-white text-xs mb-3 cursor-pointer transition-colors">
            <ArrowLeft className="w-3 h-3" /> Voltar ao Hub
          </div>
        </Link>
        {!collapsed && (
          <div>
            <div className="text-white font-bold text-sm">PLM Mirage</div>
            <div className="text-slate-400 text-xs">Gestão de Produtos</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Módulos</p>
        )}
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-all",
              collapsed ? "justify-center" : "",
              isActive(href)
                ? "bg-indigo-600 text-white"
                : "text-slate-300 hover:bg-slate-700 hover:text-white"
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!collapsed && label}
          </Link>
        ))}
      </nav>

      {/* Collapse toggle (desktop only) */}
      <div className="px-2 py-3 border-t border-slate-700 hidden lg:block">
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-white text-xs py-1.5 rounded hover:bg-slate-700 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && 'Recolher'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col bg-slate-800 shrink-0 transition-all duration-200",
          collapsed ? "w-14" : "w-56"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex flex-col w-56 bg-slate-800 z-10">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-800 border-b border-slate-700">
          <button onClick={() => setMobileOpen(true)} className="text-slate-400 hover:text-white">
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-bold text-sm">PLM Mirage</span>
        </header>

        <main className={cn("flex-1 overflow-y-auto", fullWidth ? "" : "")}>
          {children}
        </main>
      </div>
    </div>
  );
}
