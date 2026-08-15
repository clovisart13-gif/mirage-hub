import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { AlertTriangle, Zap, ArrowRight, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'mirage_trial_expired_dismissed_v1';

const PLANOS = [
  { id: 'starter', nome: 'Starter', preco: 197, desc: 'Kanban de Produção + Gerador de Custos' },
  { id: 'pro', nome: 'Pro', preco: 397, desc: '+ Moda Conecta + CRM Mirage', destaque: true },
  { id: 'enterprise', nome: 'Enterprise', preco: 797, desc: 'Todos os apps incluídos' },
];

interface Props {
  open: boolean;
}

export function TrialExpiredModal({ open }: Props) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (saved.dismissed) setDismissed(true);
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true })); } catch {}
  };

  if (dismissed) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <button
          onClick={handleDismiss}
          className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
        >
          <X className="w-4 h-4" />
        </button>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Seu trial de 14 dias encerrou</DialogTitle>
              <DialogDescription className="text-sm mt-0.5">
                Seus dados estão preservados. Escolha um plano para continuar.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2.5 my-2">
          {PLANOS.map(p => (
            <Link key={p.id} href={`/checkout?plano=${p.id}`} onClick={handleDismiss}>
              <div className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all ${
                p.destaque ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' : 'border-border'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{p.nome}</p>
                    {p.destaque && (
                      <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div className="text-right">
                    <p className="text-sm font-bold whitespace-nowrap">R$ {p.preco}</p>
                    <p className="text-[10px] text-muted-foreground">/mês</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 text-sm" onClick={handleDismiss}>
            Continuar sem plano
          </Button>
          <Button className="flex-1 text-sm" asChild>
            <Link href="/planos" onClick={handleDismiss}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Ver todos os planos
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
