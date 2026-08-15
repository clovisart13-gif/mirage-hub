import { useState, useRef, useEffect } from 'react';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import ComunidadeNav from '@/components/comunidade/ComunidadeNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Send, User, Sparkles, RefreshCw } from 'lucide-react';

interface Mensagem { role: 'user' | 'assistant'; content: string; }

const SUGESTOES = [
  'Como calcular o preço de venda de uma camiseta?',
  'Quais máquinas preciso para montar uma facção de moda fitness?',
  'O que é Private Label e como funciona?',
  'Como precificar o custo por hora de mão de obra?',
  'Qual a diferença entre malha plana e malha circular?',
  'Como estruturar um contrato com cliente de Private Label?',
];

const RESPOSTAS_MOCK: Record<string, string> = {
  default: `Ótima pergunta! Para te dar a resposta mais precisa, preciso entender melhor o contexto do seu negócio. 

No geral, no setor de confecção, os principais pontos a considerar são:

• **Custo de matéria-prima** — tecidos, aviamentos, embalagens
• **Mão de obra** — custo por hora × tempo de confecção  
• **Custos fixos** — aluguel, energia, manutenção rateados por peça
• **Margem de lucro** — entre 30% e 60% dependendo do segmento

Quer que eu detalhe algum desses pontos para o seu caso específico?`,
};

export default function ComunidadeIA() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    {
      role: 'assistant',
      content: 'Olá! Sou a IA especializada em confecção da R2PB. Pode me perguntar sobre gestão, precificação, tecidos, maquinário, Private Label — qualquer dúvida do setor têxtil. Como posso te ajudar?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  const enviar = async (texto?: string) => {
    const msg = (texto ?? input).trim();
    if (!msg) return;
    setInput('');
    setMensagens(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);

    await new Promise(r => setTimeout(r, 1200));

    const resposta = RESPOSTAS_MOCK[msg.toLowerCase()] ?? RESPOSTAS_MOCK.default;
    setMensagens(prev => [...prev, { role: 'assistant', content: resposta }]);
    setLoading(false);
  };

  const reiniciar = () => {
    setMensagens([{
      role: 'assistant',
      content: 'Olá! Sou a IA especializada em confecção da R2PB. Como posso te ajudar?',
    }]);
    setInput('');
  };

  return (
    <KanbanLayout fullWidth>
      <ComunidadeNav />
      <div className="flex flex-col flex-1 w-full min-h-0">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Bot className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-bold text-base flex items-center gap-1.5">
                IA R2PB <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              </h1>
              <p className="text-xs text-muted-foreground">Especialista em confecção e gestão têxtil</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reiniciar} className="gap-1.5 text-muted-foreground">
            <RefreshCw className="w-4 h-4" /> Nova conversa
          </Button>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {mensagens.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0
                ${m.role === 'assistant' ? 'bg-emerald-100' : 'bg-violet-100'}`}>
                {m.role === 'assistant' ? (
                  <Bot className="w-4 h-4 text-emerald-600" />
                ) : (
                  <User className="w-4 h-4 text-violet-600" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${m.role === 'assistant'
                  ? 'bg-card border text-foreground rounded-tl-none'
                  : 'bg-violet-600 text-white rounded-tr-none'
                }`}>
                {m.content.split('\n').map((line, j) => (
                  <p key={j} className={line === '' ? 'h-2' : ''}
                    dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
                  />
                ))}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="bg-card border rounded-2xl rounded-tl-none px-4 py-3">
                <div className="flex gap-1 items-center h-5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Sugestões (só quando 1 mensagem) */}
        {mensagens.length === 1 && (
          <div className="px-6 pb-3">
            <p className="text-xs text-muted-foreground mb-2">Perguntas frequentes:</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map(s => (
                <button
                  key={s}
                  onClick={() => enviar(s)}
                  className="text-xs bg-muted hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-transparent px-3 py-1.5 rounded-full transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 py-4 border-t bg-card">
          <form onSubmit={e => { e.preventDefault(); enviar(); }} className="flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte qualquer coisa sobre confecção..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !input.trim()} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-center text-muted-foreground mt-2">
            IA especializada em confecção — respostas são orientativas e não substituem consultoria profissional
          </p>
        </div>
      </div>
    </KanbanLayout>
  );
}
