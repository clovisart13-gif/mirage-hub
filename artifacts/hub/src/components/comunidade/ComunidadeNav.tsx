import { Link, useLocation } from 'wouter';
import { Users, MessageSquare, Bot, Briefcase, Megaphone, FileText, Globe, ArrowLeft } from 'lucide-react';

const TABS = [
  { href: '/hub/comunidade/fornecedores', label: 'Fornecedores', icon: Users },
  { href: '/hub/comunidade/forum', label: 'Fórum', icon: MessageSquare },
  { href: '/hub/comunidade/ia', label: 'IA', icon: Bot },
  { href: '/hub/comunidade/chat', label: 'Chat', icon: MessageSquare },
  { href: '/hub/comunidade/vagas', label: 'Vagas', icon: Briefcase },
  { href: '/hub/comunidade/anuncios', label: 'Anúncios', icon: Megaphone },
  { href: '/hub/comunidade/curriculos', label: 'Currículos', icon: FileText },
];

export default function ComunidadeNav() {
  const [location] = useLocation();

  return (
    <div className="border-b bg-white sticky top-0 z-20 shadow-sm">
      {/* Linha superior: logo + voltar */}
      <div className="max-w-6xl mx-auto px-4 pt-3 pb-0 flex items-center gap-3">
        <Link href="/hub/comunidade">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-violet-600 transition-colors font-medium group">
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Voltar
          </button>
        </Link>
        <div className="h-4 w-px bg-border" />
        <Link href="/hub/comunidade">
          <span className="flex items-center gap-1.5 text-sm font-bold text-violet-700 hover:text-violet-800 transition-colors">
            <Globe className="w-4 h-4" />
            Moda Conecta
          </span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => {
            const active = location.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href}>
                <button
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap
                    ${active
                      ? 'border-violet-600 text-violet-700'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
