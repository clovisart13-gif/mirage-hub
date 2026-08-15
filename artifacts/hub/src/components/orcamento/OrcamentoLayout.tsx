import { Link, useLocation } from 'wouter';
import { FileText, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface Props {
  children: React.ReactNode;
}

export default function OrcamentoLayout({ children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200 shrink-0',
          collapsed ? 'w-14' : 'w-52',
        )}
      >
        <div className="flex items-center justify-between p-3 border-b min-h-[56px]">
          {!collapsed && (
            <Link
              href="/hub"
              className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Hub
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-muted text-muted-foreground ml-auto"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="px-3 py-3 border-b">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 leading-tight">CustoPlus</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Orçamentos</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-2 space-y-1">
          <Link
            href="/hub/custos/orcamentos"
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              location.startsWith('/hub/custos')
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <FileText className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Orçamentos</span>}
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
