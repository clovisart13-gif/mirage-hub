import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, X, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'mirage_onboarding_v1';

interface ChecklistItem {
  id: string;
  label: string;
  desc: string;
  href?: string;
  autoComplete?: boolean;
}

const ITEMS: ChecklistItem[] = [
  { id: 'conta', label: 'Conta criada', desc: 'Você já está aqui! 🎉', autoComplete: true },
  { id: 'empresa', label: 'Configure sua empresa', desc: 'Adicione nome, CNPJ e dados da confecção', href: '/hub/configuracoes' },
  { id: 'kanban', label: 'Crie seu primeiro pedido', desc: 'Abra o Kanban e cadastre uma ordem de produção', href: '/hub/kanban' },
  { id: 'orcamento', label: 'Explore o orçamento', desc: 'Gere uma ficha de custo para um produto', href: '/hub/custos/orcamentos' },
  { id: 'financeiro', label: 'Configure o financeiro', desc: 'Cadastre uma conta bancária ou importe seu primeiro extrato OFX', href: '/hub/financeiro/dashboard' },
];

interface OnboardingChecklistProps {
  show: boolean;
}

export function OnboardingChecklist({ show }: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({ conta: true });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.dismissed) { setDismissed(true); return; }
      if (saved.checked) setChecked({ conta: true, ...saved.checked });
      if (saved.minimized) setMinimized(true);
    } catch {}
  }, []);

  const save = (updates: Partial<{ dismissed: boolean; checked: Record<string, boolean>; minimized: boolean }>) => {
    try {
      const cur = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...updates }));
    } catch {}
  };

  const handleCheck = (id: string) => {
    const next = { ...checked, [id]: true };
    setChecked(next);
    save({ checked: next });
  };

  const handleDismiss = () => {
    setDismissed(true);
    save({ dismissed: true });
  };

  const handleMinimize = () => {
    const next = !minimized;
    setMinimized(next);
    save({ minimized: next });
  };

  if (!show || dismissed) return null;

  const done = ITEMS.filter(i => checked[i.id]).length;
  const total = ITEMS.length;
  const pct = Math.round((done / total) * 100);
  const allDone = done === total;

  return (
    <div className={cn(
      'border rounded-xl shadow-sm overflow-hidden transition-all',
      allDone ? 'bg-green-50 border-green-200' : 'bg-card border-border'
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
        onClick={handleMinimize}
      >
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
            allDone ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'
          )}>
            {allDone ? <CheckCircle2 className="w-4 h-4" /> : <Rocket className="w-3.5 h-3.5" />}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {allDone ? '🎉 Primeiros passos concluídos!' : 'Primeiros passos'}
            </p>
            <p className="text-xs text-muted-foreground">{done}/{total} concluídos · {pct}%</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {minimized
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronUp className="w-4 h-4 text-muted-foreground" />
          }
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!minimized && (
        <div className="px-4 pb-1">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', allDone ? 'bg-green-500' : 'bg-primary')}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Items */}
      {!minimized && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          {ITEMS.map((item) => {
            const done = !!checked[item.id];
            const content = (
              <div
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg transition-colors',
                  done ? 'opacity-60' : 'hover:bg-muted/50 cursor-pointer',
                  item.autoComplete && 'cursor-default'
                )}
                onClick={() => !done && !item.autoComplete && handleCheck(item.id)}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {done
                    ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                    : <Circle className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', done && 'line-through')}>{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            );

            if (item.href && !done) {
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => handleCheck(item.id)}
                >
                  {content}
                </Link>
              );
            }
            return <div key={item.id}>{content}</div>;
          })}

          {allDone && (
            <div className="pt-1 text-center">
              <Button size="sm" variant="outline" className="border-green-300 text-green-700 hover:bg-green-50" onClick={handleDismiss}>
                Fechar checklist
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
