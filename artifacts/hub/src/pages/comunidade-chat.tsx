import { useState } from 'react';
import { useLocation } from 'wouter';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import ComunidadeNav from '@/components/comunidade/ComunidadeNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, Search, Send, Users, Lock } from 'lucide-react';

const CONTATOS = [
  { id: 1, nome: 'Facção Bella Donna', tipo: 'Fornecedor', online: true, ultima: 'Tudo bem, pode enviar a ficha técnica', hora: '14:32' },
  { id: 2, nome: 'Tecidos Horizonte', tipo: 'Fornecedor', online: false, ultima: 'O pedido mínimo é de 50kg', hora: 'Ontem' },
  { id: 3, nome: 'Bordados Cris Arte', tipo: 'Fornecedor', online: true, ultima: 'Sim, trabalhamos com entrega nacional', hora: '10:15' },
  { id: 4, nome: 'Ana Paula Costa', tipo: 'Confeccionista', online: false, ultima: 'Você tem alguma indicação de facção em MG?', hora: 'Seg' },
];

const HISTORICO: Record<number, { de: 'eu' | 'outro'; texto: string; hora: string }[]> = {
  1: [
    { de: 'outro', texto: 'Olá! Como posso ajudar?', hora: '14:20' },
    { de: 'eu', texto: 'Preciso de um orçamento para 500 peças de camiseta básica.', hora: '14:22' },
    { de: 'outro', texto: 'Tudo bem, pode enviar a ficha técnica', hora: '14:32' },
  ],
  3: [
    { de: 'eu', texto: 'Vocês fazem bordado em cap?', hora: '10:10' },
    { de: 'outro', texto: 'Sim, trabalhamos com entrega nacional', hora: '10:15' },
  ],
};

export default function ComunidadeChat() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [contatoAtivo, setContatoAtivo] = useState<typeof CONTATOS[0] | null>(null);
  const [busca, setBusca] = useState('');
  const [msg, setMsg] = useState('');
  const [mensagens, setMensagens] = useState<Record<number, { de: 'eu' | 'outro'; texto: string; hora: string }[]>>(HISTORICO);

  const contatosFiltrados = CONTATOS.filter(c =>
    !busca || c.nome.toLowerCase().includes(busca.toLowerCase())
  );

  function enviar() {
    if (!msg.trim() || !contatoAtivo) return;
    const nova = { de: 'eu' as const, texto: msg.trim(), hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
    setMensagens(prev => ({
      ...prev,
      [contatoAtivo.id]: [...(prev[contatoAtivo.id] ?? []), nova],
    }));
    setMsg('');
    // Simula resposta
    setTimeout(() => {
      setMensagens(prev => ({
        ...prev,
        [contatoAtivo.id]: [...(prev[contatoAtivo.id] ?? []), {
          de: 'outro',
          texto: 'Obrigado pela mensagem! Retornaremos em breve.',
          hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }],
      }));
    }, 1500);
  }

  const historico = contatoAtivo ? (mensagens[contatoAtivo.id] ?? []) : [];

  return (
    <KanbanLayout fullWidth>
      <ComunidadeNav />
      <div className="flex flex-1 min-h-0">

        {/* Sidebar de contatos */}
        <div className="w-72 shrink-0 border-r flex flex-col bg-card">
          <div className="p-4 border-b">
            <h2 className="font-bold flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-cyan-600" /> Mensagens
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                className="pl-8 h-8 text-sm"
                placeholder="Buscar conversas..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {contatosFiltrados.map(c => (
              <div
                key={c.id}
                onClick={() => setContatoAtivo(c)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-border/50 transition-colors
                  ${contatoAtivo?.id === c.id ? 'bg-cyan-50 border-l-2 border-l-cyan-500' : 'hover:bg-muted/50'}`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm">
                    {c.nome.charAt(0)}
                  </div>
                  {c.online && (
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm truncate">{c.nome}</p>
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">{c.hora}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.ultima}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Área do chat */}
        {contatoAtivo ? (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Header da conversa */}
            <div className="px-5 py-3 border-b bg-card flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-sm">
                  {contatoAtivo.nome.charAt(0)}
                </div>
                {contatoAtivo.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm">{contatoAtivo.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {contatoAtivo.online ? <span className="text-emerald-600">Online agora</span> : contatoAtivo.tipo}
                </p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/10">
              {historico.length === 0 && (
                <p className="text-center text-sm text-muted-foreground mt-8">Inicie uma conversa com {contatoAtivo.nome}</p>
              )}
              {historico.map((m, i) => (
                <div key={i} className={`flex ${m.de === 'eu' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm
                    ${m.de === 'eu'
                      ? 'bg-cyan-600 text-white rounded-tr-none'
                      : 'bg-white border text-foreground rounded-tl-none'
                    }`}>
                    <p>{m.texto}</p>
                    <p className={`text-xs mt-1 ${m.de === 'eu' ? 'text-cyan-200' : 'text-muted-foreground'}`}>{m.hora}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-card">
              <form onSubmit={e => { e.preventDefault(); enviar(); }} className="flex gap-2">
                <Input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  placeholder={`Mensagem para ${contatoAtivo.nome}...`}
                  className="flex-1"
                />
                <Button type="submit" disabled={!msg.trim()} className="bg-cyan-600 hover:bg-cyan-700">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* Estado vazio */
          <div className="flex-1 flex flex-col items-center justify-center gap-5 bg-muted/20 p-8 text-center">
            <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center">
              <MessageSquare className="w-8 h-8 text-cyan-600" />
            </div>
            <div className="space-y-2 max-w-sm">
              <h3 className="font-bold text-lg">Chat da Moda Conecta</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Converse diretamente com fornecedores e outros membros. Selecione uma conversa ao lado ou inicie uma nova.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm max-w-sm">
              <Lock className="w-4 h-4 shrink-0" />
              <p>Apenas membros verificados podem iniciar conversas. Acesso liberado após aprovação do cadastro.</p>
            </div>
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() => navigate('/hub/comunidade/fornecedores')}
            >
              <Users className="w-4 h-4 mr-2" /> Ver Fornecedores
            </Button>
          </div>
        )}
      </div>
    </KanbanLayout>
  );
}
