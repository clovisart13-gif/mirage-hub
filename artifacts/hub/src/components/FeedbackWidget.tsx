import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageSquarePlus, X, Bug, Lightbulb, Zap, ChevronUp } from 'lucide-react';

type FeedbackType = 'bug' | 'sugestao' | 'melhoria';

const TYPES: { key: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { key: 'bug', label: 'Bug', icon: <Bug size={14} />, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { key: 'sugestao', label: 'Sugestão', icon: <Lightbulb size={14} />, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { key: 'melhoria', label: 'Melhoria', icon: <Zap size={14} />, color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
];

export function FeedbackWidget() {
  const { isAuthenticated, user } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('sugestao');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);

  // Auto-detector de erros JS
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleError = (event: ErrorEvent) => {
      apiFetch('/error-log', {
        method: 'POST',
        body: JSON.stringify({
          errorMessage: event.message,
          stack: event.error?.stack ?? null,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          userEmail: user?.email ?? null,
          context: { filename: event.filename, lineno: event.lineno, colno: event.colno },
        }),
      }).catch(() => {});
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? 'Unhandled promise rejection');
      apiFetch('/error-log', {
        method: 'POST',
        body: JSON.stringify({
          errorMessage: msg,
          stack: event.reason instanceof Error ? event.reason.stack ?? null : null,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
          userEmail: user?.email ?? null,
        }),
      }).catch(() => {});
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [isAuthenticated, user]);

  if (!isAuthenticated) return null;

  async function submit() {
    if (!title.trim()) return;
    setSending(true);
    try {
      await apiFetch('/feedback', {
        method: 'POST',
        body: JSON.stringify({ type, title: title.trim(), description: description.trim(), pageUrl: window.location.href }),
      });
      toast({ title: 'Feedback enviado! Obrigado.' });
      setOpen(false);
      setTitle('');
      setDescription('');
      setType('sugestao');
    } catch {
      toast({ title: 'Erro ao enviar feedback', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 bg-background border rounded-xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
            <span className="text-sm font-semibold">Enviar feedback</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    type === t.key ? t.color : 'border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div>
              <Input
                placeholder={type === 'bug' ? 'O que aconteceu?' : type === 'sugestao' ? 'Sua sugestão' : 'O que pode melhorar?'}
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="text-sm"
                maxLength={200}
              />
            </div>

            <Textarea
              placeholder="Descreva com mais detalhes (opcional)..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="text-sm resize-none"
              rows={3}
              maxLength={1000}
            />

            <p className="text-xs text-muted-foreground">
              Página: <span className="font-mono">{location || '/'}</span>
            </p>

            <Button onClick={submit} disabled={!title.trim() || sending} className="w-full" size="sm">
              {sending ? 'Enviando...' : 'Enviar feedback'}
            </Button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all text-sm font-medium"
        title="Enviar feedback"
      >
        {open ? <ChevronUp size={16} /> : <MessageSquarePlus size={16} />}
        <span className="hidden sm:inline">{open ? 'Fechar' : 'Feedback'}</span>
      </button>
    </div>
  );
}
