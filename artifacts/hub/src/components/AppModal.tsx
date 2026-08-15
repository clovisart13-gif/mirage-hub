import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, MessageCircle, ExternalLink, ArrowRight, Star, Bot, Send, Loader2, Sparkles, User, ChevronDown, ChevronUp } from 'lucide-react';

const WHATSAPP_NUMBER = '5511992436154';
const API_URL = import.meta.env.VITE_API_URL || '/api';

type Message = { role: 'user' | 'assistant'; content: string };

type AppDetail = {
  id: string;
  name: string;
  icon: any;
  tagline: string;
  description: string;
  features: Array<{ title: string; description: string }>;
  benefits: Array<{ stat: string; label: string }>;
  useCases: string[];
  plans: string[];
  color: string;
  mockup?: React.ComponentType;
  link?: string;
  externalLink?: string;
};

type AppModalProps = {
  app: AppDetail | null;
  open: boolean;
  onClose: () => void;
  hasAccess: boolean;
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

function AppChat({ appName }: { appName: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: `Olá! Sou especialista em **${appName}**. Pode perguntar qualquer coisa sobre esse app — funcionalidades, preços, como funciona na prática! 👋` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMsgs);
    setInput('');
    setLoading(true);
    let content = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs, appContext: appName }),
      });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                content += data.content;
                setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content }; return u; });
              }
            } catch {}
          }
        }
      }
    } catch {
      setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Desculpe, tive um erro. Tente pelo WhatsApp!' }; return u; });
    } finally {
      setLoading(false);
    }
  };

  const fmt = (s: string) => s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');

  return (
    <div className="border rounded-xl overflow-hidden bg-muted/30">
      <div className="bg-primary/10 px-3 py-2 flex items-center gap-2 border-b">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Especialista IA — {appName}</p>
          <p className="text-[10px] text-muted-foreground">Tire suas dúvidas agora</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span className="text-[10px] text-muted-foreground">online</span>
        </div>
      </div>
      <div className="h-36 overflow-y-auto p-3 space-y-2">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3 h-3 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-2.5 py-1.5 text-xs leading-relaxed ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-white border text-foreground'}`}
              dangerouslySetInnerHTML={{ __html: fmt(m.content) || (loading && i === messages.length - 1 ? '<span class="animate-pulse opacity-50">digitando...</span>' : '') }}
            />
            {m.role === 'user' && (
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3 h-3 text-primary" />
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="border-t px-2 py-2 flex gap-2 bg-white">
        <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder={`Pergunte sobre o ${appName}...`} className="flex-1 h-8 text-xs" disabled={loading} />
        <Button onClick={send} disabled={loading || !input.trim()} size="sm" className="h-8 w-8 p-0">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function AppModal({ app, open, onClose, hasAccess }: AppModalProps) {
  const [showChat, setShowChat] = useState(false);

  if (!app) return null;
  const Icon = app.icon;
  const Mockup = app.mockup;
  const waMsg = encodeURIComponent(`Olá! Tenho interesse em conhecer melhor o ${app.name} da Mirage. Podem me ajudar?`);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`;

  return (
    <Dialog open={open} onOpenChange={v => { onClose(); setShowChat(false); }}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto p-0">
        {/* Hero */}
        <div className={`${app.color} p-5 text-white`}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-white text-xl font-bold mb-0.5">{app.name}</DialogTitle>
              <p className="text-white/80 text-sm">{app.tagline}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {app.plans.map(p => (
                  <Badge key={p} variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                    {PLAN_LABELS[p]}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Benefits */}
          {app.benefits.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {app.benefits.map((b, i) => (
                <div key={i} className="bg-white/15 rounded-xl p-2.5 text-center backdrop-blur-sm">
                  <p className="text-xl font-bold text-white">{b.stat}</p>
                  <p className="text-white/70 text-[10px] mt-0.5">{b.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 space-y-5">
          {/* Mockup preview */}
          {Mockup && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Veja como funciona na prática
              </p>
              <Mockup />
            </div>
          )}

          {/* Description */}
          <p className="text-muted-foreground leading-relaxed text-sm">{app.description}</p>

          {/* Features */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2 text-sm">
              <Star className="w-4 h-4 text-primary" />
              Funcionalidades completas
            </h3>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {app.features.map((f, i) => (
                <div key={i} className="flex gap-2.5 p-3 rounded-xl border bg-card hover:border-primary/30 transition-colors">
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Use cases */}
          {app.useCases.length > 0 && (
            <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
              <h3 className="font-semibold text-foreground mb-2 text-sm">Ideal para quem:</h3>
              <ul className="space-y-1.5">
                {app.useCases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    {uc}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Chat toggle */}
          <div>
            <button
              onClick={() => setShowChat(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-sm font-medium text-primary"
            >
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Perguntar para IA especialista em {app.name}
              </div>
              {showChat ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showChat && (
              <div className="mt-2">
                <AppChat appName={app.name} />
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm transition-colors shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              Falar com especialista no WhatsApp
            </a>
            {hasAccess && app.externalLink && (
              <Button asChild variant="outline" className="flex-1">
                <a href={app.externalLink} target="_blank" rel="noopener noreferrer">
                  Acessar o app <ExternalLink className="ml-1 w-4 h-4" />
                </a>
              </Button>
            )}
            {hasAccess && app.link && (
              <Button asChild className="flex-1">
                <a href={app.link}>Acessar o app <ArrowRight className="ml-1 w-4 h-4" /></a>
              </Button>
            )}
            {!hasAccess && (
              <Button asChild variant="outline" className="flex-1">
                <a href="/planos">Ver planos para liberar acesso</a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
