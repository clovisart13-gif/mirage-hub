import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2, PhoneCall, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const API_URL = import.meta.env.VITE_API_URL || '/api';
const WHATSAPP_NUMBER = '5511992436154';
const WHATSAPP_MSG = encodeURIComponent('Olá! Quero conhecer melhor os apps da Mirage e saber qual plano é ideal para minha confecção.');
const LEAD_MARKER = /\[\[LEAD:(\{.*?\})\]\]/s;

async function saveLead(lead: { nome: string; whatsapp: string; email: string }, appContext?: string) {
  try {
    await fetch(`${API_URL}/chat/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, app_context: appContext }),
    });
  } catch { /* silencioso — não interrompe a conversa */ }
}

export function ChatWidget({ appContext }: { appContext?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Oi! Sou a **Mira**, especialista Mirage 👋\n\nAntes de começar, como é o seu nome?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadSalvo, setLeadSalvo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    let assistantContent = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          appContext,
        }),
      });

      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      // Detectar marcador de lead [[LEAD:{...}]] ao final do streaming
      const match = LEAD_MARKER.exec(assistantContent);
      if (match && !leadSalvo) {
        try {
          const lead = JSON.parse(match[1]);
          if (lead.nome && (lead.whatsapp || lead.email)) {
            await saveLead(lead, appContext);
            setLeadSalvo(true);
          }
        } catch {}
        // Remover marcador da mensagem exibida
        const displayContent = assistantContent.replace(LEAD_MARKER, '').trim();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: displayContent };
          return updated;
        });
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Desculpe, tive um problema técnico. Fale com nosso time pelo WhatsApp! 😊',
        };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      {open && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm shadow-2xl rounded-2xl border bg-background flex flex-col overflow-hidden" style={{ height: '480px' }}>
          <div className="bg-primary px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Mira — Especialista Mirage</p>
                <p className="text-white/70 text-xs flex items-center gap-1">
                  {leadSalvo ? <><CheckCircle2 className="w-3 h-3 text-green-300" /> Dados salvos</> : 'IA treinada para confecções'}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) || (loading && i === messages.length - 1 ? '<span class="animate-pulse">...</span>' : '') }}
                />
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t p-3 space-y-2 shrink-0">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Falar com humano no WhatsApp
            </a>
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Digite sua dúvida..."
                className="flex-1 h-9 text-sm"
                disabled={loading}
              />
              <Button onClick={sendMessage} disabled={loading || !input.trim()} size="sm" className="h-9 w-9 p-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center"
        title="Falar com a Mira"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
