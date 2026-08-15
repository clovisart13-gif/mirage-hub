import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Clock, ExternalLink } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Notif {
  type: 'danger' | 'warning';
  title: string;
  desc: string;
  href: string;
}

const SUPER_ADMIN = 'clovisart13@gmail.com';

export function NotificationBell() {
  const { isAuthenticated, user } = useAuth();
  const [sub, setSub] = useState<any>(null);
  const [read, setRead] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.email === SUPER_ADMIN) return;
    apiFetch('/billing/assinatura').then(setSub).catch(() => {});
  }, [isAuthenticated, user]);

  if (!isAuthenticated || user?.email === SUPER_ADMIN || !sub) return null;

  const dias = sub.expira_em
    ? Math.ceil((new Date(sub.expira_em + 'T23:59:59').getTime() - Date.now()) / 86400000)
    : null;

  const notifs: Notif[] = [];

  if (sub.status === 'trial') {
    if (dias !== null && dias <= 0) {
      notifs.push({ type: 'danger', title: 'Trial expirado', desc: 'Seus apps foram suspensos. Assine agora.', href: '/planos' });
    } else if (dias !== null && dias <= 3) {
      notifs.push({ type: 'danger', title: `Trial expira em ${dias} dia${dias !== 1 ? 's' : ''}`, desc: 'Renove antes de perder o acesso.', href: '/planos' });
    } else if (dias !== null && dias <= 7) {
      notifs.push({ type: 'warning', title: `Trial expira em ${dias} dias`, desc: 'Escolha um plano com antecedência.', href: '/planos' });
    }
  }

  if (sub.status === 'vencido') {
    notifs.push({ type: 'danger', title: 'Assinatura vencida', desc: 'Renove para reativar seus apps.', href: '/hub/assinatura' });
  }

  if (notifs.length === 0) return null;

  const hasDanger = notifs.some(n => n.type === 'danger');

  return (
    <DropdownMenu onOpenChange={(open) => { if (open) setRead(true); }}>
      <DropdownMenuTrigger asChild>
        <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-4 h-4" />
          {!read && (
            <span className={cn(
              'absolute top-1 right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center',
              hasDanger ? 'bg-red-500' : 'bg-amber-500'
            )}>
              {notifs.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="font-semibold flex items-center justify-between">
          Notificações
          <span className="text-xs font-normal text-muted-foreground">{notifs.length} alerta{notifs.length !== 1 ? 's' : ''}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifs.map((n, i) => (
          <DropdownMenuItem key={i} asChild className="cursor-pointer py-3 focus:bg-muted/60">
            <Link href={n.href} className="flex items-start gap-3">
              {n.type === 'danger'
                ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                : <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/hub/assinatura" className="text-xs text-primary font-medium">
            Ver minha assinatura →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
