import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { X, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY = 'mirage_nps_v1';

const LABEL = (n: number) => {
  if (n <= 6) return 'Pouco satisfeito 😕';
  if (n <= 8) return 'Satisfeito 🙂';
  return 'Muito satisfeito! 🤩';
};

const COLOR = (n: number) => {
  if (n <= 6) return 'bg-red-500 text-white';
  if (n <= 8) return 'bg-amber-400 text-white';
  return 'bg-green-500 text-white';
};

interface Props {
  show: boolean;
}

export function NPSSurvey({ show }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [sent, setSent] = useState(false);
  const [nota, setNota] = useState<number | null>(null);
  const [comentario, setComentario] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if (s.dismissed || s.sent) setDismissed(true);
    } catch {}
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ dismissed: true })); } catch {}
  };

  const handleSend = async () => {
    if (nota === null) return;
    setLoading(true);
    try {
      await apiFetch('/billing/nps', {
        method: 'POST',
        body: JSON.stringify({ nota, comentario }),
      });
      setSent(true);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ sent: true })); } catch {}
      toast({ title: '🙏 Obrigado pelo feedback!' });
      setTimeout(() => setDismissed(true), 2500);
    } catch {
      toast({ title: 'Erro ao enviar avaliação', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (!show || dismissed) return null;

  return (
    <div className="border rounded-xl bg-card shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
            <p className="text-sm font-semibold">Avalie o Mirage Hub</p>
          </div>
          <button
            onClick={dismiss}
            className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {sent ? (
          <div className="py-4 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-sm font-medium text-green-700">Resposta enviada! Muito obrigado.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              De 0 a 10, o quanto você indicaria o Mirage Hub para outro confeccionista?
            </p>

            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setNota(i)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border ${
                    nota === i
                      ? COLOR(i) + ' border-transparent scale-110 shadow-sm'
                      : 'bg-muted border-transparent hover:bg-muted/80 text-foreground'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
              <span>Não indicaria</span>
              <span>Indicaria com certeza</span>
            </div>

            {nota !== null && (
              <>
                <p className="text-xs font-medium mt-2 text-center">{LABEL(nota)}</p>
                <div className="mt-2 space-y-2">
                  <textarea
                    className="w-full text-xs p-2.5 border rounded-lg resize-none h-16 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="O que poderia melhorar? (opcional)"
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                  />
                  <Button
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={handleSend}
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Enviar avaliação'}
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
