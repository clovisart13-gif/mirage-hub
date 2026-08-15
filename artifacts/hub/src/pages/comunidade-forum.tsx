import { useState } from 'react';
import { Link } from 'wouter';
import KanbanLayout from '@/components/kanban/KanbanLayout';
import ComunidadeNav from '@/components/comunidade/ComunidadeNav';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare, Search, Plus, Eye, ThumbsUp, Clock,
  ChevronRight, Flame, BookOpen, TrendingUp, ArrowLeft, Send,
} from 'lucide-react';

const CATEGORIAS = [
  { id: 'todos', label: 'Todos', count: 0 },
  { id: 'tecidos', label: 'Tecidos & Malhas', count: 0 },
  { id: 'modelagem', label: 'Modelagem', count: 0 },
  { id: 'estamparia', label: 'Estamparia', count: 0 },
  { id: 'gestao', label: 'Gestão', count: 0 },
  { id: 'marketing', label: 'Marketing', count: 0 },
  { id: 'vendas', label: 'Vendas', count: 0 },
  { id: 'bordado', label: 'Bordado', count: 0 },
  { id: 'private-label', label: 'Private Label', count: 0 },
  { id: 'maquinario', label: 'Maquinário', count: 0 },
];

const TOPICOS_EXEMPLO = [
  { id: 1, titulo: 'Como calcular o preço de venda considerando todos os custos?', categoria: 'Gestão', autor: 'Maria S.', data: 'há 2h', visualizacoes: 145, respostas: 12, curtidas: 23, quente: true,
    conteudo: 'Olá pessoal! Sempre tenho dúvidas na hora de precificar. Quero entender como vocês calculam o preço de venda levando em conta matéria-prima, mão de obra, custos fixos e margem. Alguém tem uma planilha ou método que funciona bem?' },
  { id: 2, titulo: 'Qual a melhor malha para fitness com boa durabilidade?', categoria: 'Tecidos & Malhas', autor: 'Carlos F.', data: 'há 4h', visualizacoes: 89, respostas: 7, curtidas: 15, quente: false,
    conteudo: 'Estou produzindo uma linha fitness e quero indicações de malha que tenha boa durabilidade, não deforma após lavagens e tem boa elasticidade. Qual vocês recomendam?' },
  { id: 3, titulo: 'Dicas para aumentar a produtividade na costura reta', categoria: 'Gestão', autor: 'Ana P.', data: 'há 1 dia', visualizacoes: 234, respostas: 18, curtidas: 41, quente: true,
    conteudo: 'Estou tentando otimizar o processo de costura reta na minha oficina. Temos 4 máquinas e 3 costureiras. Como vocês organizam a linha para reduzir tempo de troca de peça?' },
  { id: 4, titulo: 'Fornecedor de galoneira boa em SP — alguém indica?', categoria: 'Maquinário', autor: 'Roberto M.', data: 'há 2 dias', visualizacoes: 67, respostas: 5, curtidas: 9, quente: false,
    conteudo: 'Preciso comprar uma galoneira para expandir a produção. Quero algo confiável com assistência técnica em SP. Alguém tem alguma indicação de revendedor ou marca?' },
  { id: 5, titulo: 'Private Label: como estruturar os contratos com clientes?', categoria: 'Private Label', autor: 'Fernanda L.', data: 'há 3 dias', visualizacoes: 312, respostas: 24, curtidas: 56, quente: true,
    conteudo: 'Estou iniciando no Private Label e não sei como estruturar contrato com cliente. O que deve constar? Prazo de entrega, penalidades, propriedade do molde? Alguém tem um modelo?' },
];

const RESPOSTAS_MOCK: Record<number, { autor: string; texto: string; data: string }[]> = {
  1: [
    { autor: 'João K.', texto: 'Uso a fórmula: (CMV + custo fixo rateado) / (1 - margem). Funciona bem!', data: 'há 1h' },
    { autor: 'Silvia M.', texto: 'Recomendo controlar o custo por peça antes de definir preço. Excel simples já resolve.', data: 'há 30min' },
  ],
  3: [
    { autor: 'Pedro A.', texto: 'Organizamos por lote de 20 peças. Cada costureira pega um lote completo, reduz movimentação.', data: 'há 12h' },
  ],
};

export default function ComunidadeForum() {
  const { toast } = useToast();
  const [catAtiva, setCatAtiva] = useState('todos');
  const [busca, setBusca] = useState('');
  const [topicoAberto, setTopicoAberto] = useState<typeof TOPICOS_EXEMPLO[0] | null>(null);
  const [novoTopicoOpen, setNovoTopicoOpen] = useState(false);
  const [form, setForm] = useState({ titulo: '', categoria: 'gestao', mensagem: '' });
  const [resposta, setResposta] = useState('');

  const topicosFiltrados = TOPICOS_EXEMPLO.filter(t =>
    (catAtiva === 'todos' || t.categoria.toLowerCase().includes(catAtiva.replace('-', ' '))) &&
    (!busca || t.titulo.toLowerCase().includes(busca.toLowerCase()))
  );

  function enviarTopico() {
    if (!form.titulo.trim() || !form.mensagem.trim()) {
      toast({ title: 'Preencha o título e a mensagem', variant: 'destructive' });
      return;
    }
    setNovoTopicoOpen(false);
    setForm({ titulo: '', categoria: 'gestao', mensagem: '' });
    toast({ title: '✅ Tópico enviado!', description: 'Seu tópico será publicado após revisão da equipe.' });
  }

  function enviarResposta() {
    if (!resposta.trim()) return;
    setResposta('');
    toast({ title: '✅ Resposta enviada!', description: 'Sua resposta foi publicada no tópico.' });
  }

  return (
    <KanbanLayout>
      <ComunidadeNav />
      <div className="p-6 space-y-6 w-full">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-blue-600" /> Fórum da Comunidade
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Troque experiências com confeccionistas do Brasil</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setNovoTopicoOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Novo Tópico
          </Button>
        </div>

        {/* Busca */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar tópicos..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar categorias */}
          <div className="lg:w-52 shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Categorias</p>
            <div className="space-y-0.5">
              {CATEGORIAS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setCatAtiva(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between
                    ${catAtiva === c.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  {c.label}
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </button>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-100 space-y-2 text-sm">
              <p className="font-semibold text-blue-700 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Estatísticas</p>
              <div className="text-muted-foreground space-y-1 text-xs">
                <div className="flex justify-between"><span>Tópicos</span><span className="font-medium text-foreground">127</span></div>
                <div className="flex justify-between"><span>Respostas</span><span className="font-medium text-foreground">1.043</span></div>
                <div className="flex justify-between"><span>Membros</span><span className="font-medium text-foreground">342</span></div>
              </div>
            </div>
          </div>

          {/* Lista de tópicos */}
          <div className="flex-1 space-y-3">
            {topicosFiltrados.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
                <p className="font-semibold">Nenhum tópico encontrado</p>
                <p className="text-sm text-muted-foreground">Seja o primeiro a criar um tópico nesta categoria!</p>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 mt-2" onClick={() => setNovoTopicoOpen(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Criar tópico
                </Button>
              </div>
            ) : (
              topicosFiltrados.map(t => (
                <div
                  key={t.id}
                  onClick={() => setTopicoAberto(t)}
                  className="bg-card border rounded-xl p-4 hover:shadow-sm hover:border-blue-200 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors leading-snug flex-1">
                          {t.titulo}
                        </h3>
                        {t.quente && (
                          <Badge className="bg-rose-100 text-rose-600 border-0 text-xs shrink-0 flex items-center gap-0.5">
                            <Flame className="w-3 h-3" /> Em alta
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-xs px-1.5 py-0">{t.categoria}</Badge>
                        <span>por <strong>{t.autor}</strong></span>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{t.data}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1 justify-end"><Eye className="w-3 h-3" />{t.visualizacoes}</p>
                      <p className="flex items-center gap-1 justify-end"><MessageSquare className="w-3 h-3" />{t.respostas}</p>
                      <p className="flex items-center gap-1 justify-end"><ThumbsUp className="w-3 h-3" />{t.curtidas}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dialog: Novo Tópico */}
      <Dialog open={novoTopicoOpen} onOpenChange={setNovoTopicoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" /> Novo Tópico
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-sm font-medium mb-1 block">Título do tópico</label>
              <Input
                placeholder="Ex: Como calcular o custo por peça..."
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria</label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.filter(c => c.id !== 'todos').map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Mensagem</label>
              <Textarea
                placeholder="Descreva sua dúvida ou experiência em detalhes..."
                rows={4}
                value={form.mensagem}
                onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNovoTopicoOpen(false)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={enviarTopico}>
                <Send className="w-4 h-4 mr-1.5" /> Publicar Tópico
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver Tópico */}
      {topicoAberto && (
        <Dialog open onOpenChange={() => setTopicoAberto(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-start gap-2 leading-snug">
                <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                {topicoAberto.titulo}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-1">
              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <Badge variant="outline" className="text-xs px-1.5 py-0">{topicoAberto.categoria}</Badge>
                <span>por <strong>{topicoAberto.autor}</strong></span>
                <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{topicoAberto.data}</span>
                {topicoAberto.quente && (
                  <Badge className="bg-rose-100 text-rose-600 border-0 text-xs flex items-center gap-0.5">
                    <Flame className="w-3 h-3" /> Em alta
                  </Badge>
                )}
              </div>

              {/* Conteúdo */}
              <div className="bg-muted/40 rounded-xl p-4 text-sm leading-relaxed">
                {topicoAberto.conteudo}
              </div>

              {/* Stats */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{topicoAberto.visualizacoes} visualizações</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{topicoAberto.respostas} respostas</span>
                <button
                  className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                  onClick={() => toast({ title: '👍 Curtido!' })}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />{topicoAberto.curtidas} curtidas
                </button>
              </div>

              {/* Respostas existentes */}
              {(RESPOSTAS_MOCK[topicoAberto.id] ?? []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Respostas</p>
                  {(RESPOSTAS_MOCK[topicoAberto.id] ?? []).map((r, i) => (
                    <div key={i} className="bg-card border rounded-lg p-3 text-sm">
                      <p className="font-semibold text-xs mb-1">{r.autor} <span className="text-muted-foreground font-normal">· {r.data}</span></p>
                      <p>{r.texto}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Responder */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Sua resposta</p>
                <Textarea
                  placeholder="Compartilhe sua experiência ou conhecimento..."
                  rows={3}
                  value={resposta}
                  onChange={e => setResposta(e.target.value)}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={enviarResposta} disabled={!resposta.trim()}>
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Responder
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </KanbanLayout>
  );
}
