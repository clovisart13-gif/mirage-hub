import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  LayoutDashboard, Calculator, Users, HeadphonesIcon, FileText,
  ArrowRight, CheckCircle, Star, Zap,
  MessageCircle, ChevronRight, Menu, X, Calendar,
  TrendingUp, Package, Layers, BarChart3,
  ChevronDown, Cpu, BookOpen, DollarSign, LineChart, Sparkles,
  Bot, Send, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
const mirageLogo = `${import.meta.env.BASE_URL}mirage_logo_dark_transparent.png`;

const TRIAL_LINK = '/moda-conecta/fundadores';
const DEMO_LINK = '/moda-conecta/fundadores';
const FOUNDER_LINK = '/moda-conecta/fundadores';
const WA_LINK = '/moda-conecta/fundadores';

const APPS = [
  {
    icon: LayoutDashboard,
    name: 'Kanban Mirage',
    desc: 'Saiba onde está cada pedido — do corte à expedição, em tempo real.',
    color: 'from-violet-500 to-purple-700',
    badge: 'Mais usado',
    href: null,
  },
  {
    icon: Calculator,
    name: 'Orçamento Mirage',
    desc: 'Calcule o custo real de cada peça e nunca mais venda com prejuízo.',
    color: 'from-blue-500 to-blue-700',
    href: null,
  },
  {
    icon: Users,
    name: 'Moda Conecta',
    desc: 'Rede B2B com fornecedores verificados, vagas e negócios do setor têxtil. Acesso público.',
    color: 'from-emerald-500 to-green-700',
    badge: 'Acesso gratuito',
    href: '/hub/comunidade/fornecedores',
  },
  {
    icon: HeadphonesIcon,
    name: 'CRM Mirage',
    desc: 'Robô SDR qualifica leads 24h no WhatsApp. Humanos só fecham negócio.',
    color: 'from-orange-500 to-red-600',
    badge: 'Mais popular',
    href: null,
  },
  {
    icon: FileText,
    name: 'ERP Mirage',
    desc: 'Gestão completa: financeiro, estoque, fiscal e NF-e integrados.',
    color: 'from-slate-500 to-slate-700',
    href: null,
  },
];

const PLANOS = [
  {
    id: 'starter',
    nome: 'Starter',
    preco: 197,
    desc: 'Para confecções que estão começando',
    apps: ['Kanban Mirage', 'Orçamento Mirage'],
    destaque: false,
  },
  {
    id: 'pro',
    nome: 'Pro',
    preco: 397,
    desc: 'Para confecções em crescimento',
    apps: ['Kanban Mirage', 'Orçamento Mirage', 'Moda Conecta', 'CRM Mirage'],
    destaque: true,
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    preco: 797,
    desc: 'Para grandes operações e redes',
    apps: ['Todos os apps', 'Suporte prioritário', 'Usuários ilimitados', 'API exclusiva'],
    destaque: false,
  },
];

const STATS = [
  { valor: '+500', label: 'Confecções ativas' },
  { valor: '14', label: 'Fases de produção' },
  { valor: '60%', label: 'Menos atrasos' },
  { valor: '3x', label: 'Mais controle' },
];

const DEPOIMENTOS = [
  {
    nome: 'Ricardo Mendes',
    cargo: 'Dono, Confecção RM',
    texto: 'Antes eu não sabia onde estava nenhum pedido sem ligar pra todo mundo. Hoje abro o Kanban e vejo tudo em tempo real.',
    estrelas: 5,
  },
  {
    nome: 'Patrícia Souza',
    cargo: 'Gestora, Moda Sul',
    texto: 'O Orçamento Mirage me mostrou que eu estava vendendo com prejuízo há anos. Em 2 semanas já ajustei o preço de toda a coleção.',
    estrelas: 5,
  },
  {
    nome: 'Carlos Oliveira',
    cargo: 'Sócio, CariocaWear',
    texto: 'O CRM com o robô SDR mudou o jogo. Antes perdia leads por demora. Agora o robô responde na hora e meu time só fecha.',
    estrelas: 5,
  },
];

// ── Telas visuais dos 4 módulos ──────────────────────────────────────────────

function ScreenKanban() {
  const stages = [
    { label: 'Corte', count: 4, color: 'bg-violet-500' },
    { label: 'Costura', count: 7, color: 'bg-purple-500' },
    { label: 'Acabamento', count: 3, color: 'bg-indigo-500' },
    { label: 'Expedição', count: 2, color: 'bg-blue-500' },
  ];
  const cards = [
    { op: 'OP-2341', cliente: 'Studio Moda', pcs: 120, prazo: '28/05', late: false },
    { op: 'OP-2338', cliente: 'Ateliê SP', pcs: 80, prazo: '26/05', late: true },
    { op: 'OP-2335', cliente: 'Top Fashion', pcs: 200, prazo: '30/05', late: false },
  ];
  return (
    <div className="w-full h-full bg-[#0f0e17] rounded-b-xl overflow-hidden p-3 flex flex-col gap-3">
      <div className="flex gap-2">
        {stages.map(s => (
          <div key={s.label} className="flex-1 bg-white/5 rounded-lg p-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold text-white/60">{s.label}</span>
              <span className={`text-[9px] ${s.color} text-white px-1.5 rounded-full font-bold`}>{s.count}</span>
            </div>
            <div className="space-y-1">
              {Array.from({ length: Math.min(s.count, 2) }).map((_, i) => (
                <div key={i} className="h-1.5 rounded-full bg-white/10" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-1.5 flex-1">
        {cards.map(c => (
          <div key={c.op} className={`flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-2 border ${c.late ? 'border-red-500/40' : 'border-white/5'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${c.late ? 'bg-red-400' : 'bg-green-400'} shrink-0`} />
            <span className="text-[10px] font-mono text-violet-300 w-14 shrink-0">{c.op}</span>
            <span className="text-[10px] text-white/70 flex-1 truncate">{c.cliente}</span>
            <span className="text-[10px] text-white/40">{c.pcs} pcs</span>
            <span className={`text-[10px] font-medium ${c.late ? 'text-red-400' : 'text-white/50'}`}>{c.prazo}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenPLM() {
  const stages = ['Briefing', 'Modelagem', 'Pilotagem', 'Aprovação', 'Produção'];
  const products = [
    { cod: 'CAM-0041', nome: 'Camisa Oxford Slim', fase: 3, status: 'Em aprovação' },
    { cod: 'FT-0018', nome: 'Calça Alfaiataria', fase: 2, status: 'Modelagem' },
    { cod: 'CAM-0039', nome: 'Polo Performance', fase: 4, status: 'Aprovado' },
  ];
  return (
    <div className="w-full h-full bg-[#0f0e17] rounded-b-xl overflow-hidden p-3 flex flex-col gap-3">
      <div className="flex gap-1 mb-1">
        {stages.map((s, i) => (
          <div key={s} className={`flex-1 text-center text-[9px] py-1 rounded font-medium ${i < 3 ? 'bg-violet-600/30 text-violet-300' : 'bg-white/5 text-white/30'}`}>{s}</div>
        ))}
      </div>
      <div className="space-y-1.5 flex-1">
        {products.map(p => (
          <div key={p.cod} className="bg-white/5 rounded-lg px-2.5 py-2 border border-white/5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3 text-violet-400 shrink-0" />
                <span className="text-[10px] font-mono text-violet-300">{p.cod}</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${p.fase === 4 ? 'bg-green-600/20 text-green-300' : p.fase === 3 ? 'bg-amber-600/20 text-amber-300' : 'bg-blue-600/20 text-blue-300'}`}>{p.status}</span>
            </div>
            <p className="text-[10px] text-white/60">{p.nome}</p>
            <div className="mt-1.5 flex gap-0.5">
              {stages.map((_, i) => (
                <div key={i} className={`flex-1 h-1 rounded-full ${i < p.fase ? 'bg-violet-500' : 'bg-white/10'}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenCustos() {
  const rows = [
    { ref: 'CAM-0041', desc: 'Camisa Oxford', mp: 'R$ 38,40', mo: 'R$ 24,00', total: 'R$ 62,40', margem: '38%' },
    { ref: 'FT-0018', desc: 'Calça Alfaiataria', mp: 'R$ 72,10', mo: 'R$ 36,50', total: 'R$ 108,60', margem: '31%' },
    { ref: 'CAM-0039', desc: 'Polo Performance', mp: 'R$ 28,90', mo: 'R$ 18,00', total: 'R$ 46,90', margem: '44%' },
  ];
  return (
    <div className="w-full h-full bg-[#0f0e17] rounded-b-xl overflow-hidden p-3 flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 mb-1">
        {[
          { label: 'Custo médio/peça', valor: 'R$ 72,63', icon: Package },
          { label: 'Margem bruta', valor: '37,8%', icon: TrendingUp },
          { label: 'Orç. pendentes', valor: '5', icon: Calculator },
        ].map(({ label, valor, icon: Icon }) => (
          <div key={label} className="bg-white/5 rounded-lg p-2 border border-white/5">
            <Icon className="w-3 h-3 text-violet-400 mb-1" />
            <div className="text-xs font-bold text-white">{valor}</div>
            <div className="text-[9px] text-white/40 leading-tight">{label}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-5 text-[9px] text-white/30 font-semibold uppercase px-1 mb-1">
          <span>Ref</span><span className="col-span-2">Descrição</span><span className="text-right">Total</span><span className="text-right">Margem</span>
        </div>
        <div className="space-y-1">
          {rows.map(r => (
            <div key={r.ref} className="grid grid-cols-5 items-center bg-white/5 rounded px-1.5 py-1.5 border border-white/5">
              <span className="text-[9px] font-mono text-violet-300 truncate">{r.ref}</span>
              <span className="col-span-2 text-[9px] text-white/60 truncate">{r.desc}</span>
              <span className="text-[9px] text-white/80 text-right">{r.total}</span>
              <span className="text-[9px] text-green-400 text-right font-semibold">{r.margem}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenRelatorios() {
  const bars = [72, 55, 88, 64, 91, 78, 83];
  const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  return (
    <div className="w-full h-full bg-[#0f0e17] rounded-b-xl overflow-hidden p-3 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Faturamento', valor: 'R$ 284.760', delta: '+18%', up: true },
          { label: 'OPs concluídas', valor: '142', delta: '+23', up: true },
          { label: 'Ticket médio', valor: 'R$ 2.005', delta: '-3%', up: false },
          { label: 'Prazo no prazo', valor: '89%', delta: '+5pp', up: true },
        ].map(k => (
          <div key={k.label} className="bg-white/5 rounded-lg px-2.5 py-2 border border-white/5">
            <div className="text-[9px] text-white/40 mb-0.5">{k.label}</div>
            <div className="text-xs font-bold text-white">{k.valor}</div>
            <div className={`text-[9px] font-semibold ${k.up ? 'text-green-400' : 'text-red-400'}`}>{k.delta}</div>
          </div>
        ))}
      </div>
      <div className="flex-1 bg-white/5 rounded-lg border border-white/5 p-2">
        <div className="flex items-center gap-1 mb-1.5">
          <BarChart3 className="w-3 h-3 text-violet-400" />
          <span className="text-[9px] text-white/50 font-medium">Volume semanal</span>
        </div>
        <div className="flex items-end gap-1 h-10">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-sm bg-violet-500/70" style={{ height: `${h}%` }} />
              <span className="text-[8px] text-white/30">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const MODULOS = [
  {
    icon: LayoutDashboard,
    label: 'Kanban de Produção',
    desc: 'Visibilidade total de cada ordem de produção em tempo real, com alertas de prazo automáticos.',
    color: 'from-violet-500 to-purple-600',
    screen: ScreenKanban,
  },
  {
    icon: Layers,
    label: 'PLM — Desenvolvimento',
    desc: 'Gerencie o ciclo completo de cada peça: briefing, modelagem, pilotagem e aprovação.',
    color: 'from-indigo-500 to-blue-600',
    screen: ScreenPLM,
  },
  {
    icon: Calculator,
    label: 'Custos e Orçamentos',
    desc: 'Ficha de custo precisa por referência, margem em tempo real e orçamentos enviados por e-mail.',
    color: 'from-blue-500 to-cyan-600',
    screen: ScreenCustos,
  },
  {
    icon: BarChart3,
    label: 'Relatórios e BI',
    desc: 'Dashboard operacional com faturamento, OPs, prazo de entrega e exportação para Excel.',
    color: 'from-emerald-500 to-teal-600',
    screen: ScreenRelatorios,
  },
];

// ── Componente principal ─────────────────────────────────────────────────────

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeModulo, setActiveModulo] = useState(0);
  const [openObjecao, setOpenObjecao] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: 'Olá! Sou o assistente do Mirage Hub. Posso explicar o produto, tirar dúvidas e ajudar você a entender se o Mirage é para sua confecção. O que você quer saber?' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendChatMessage = useCallback(async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const newHistory = [...chatMessages, { role: 'user' as const, content: msg }];
    setChatMessages(newHistory);
    setChatLoading(true);
    try {
      const res = await fetch('/api/mirage/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history: newHistory.slice(-10) }),
      });
      if (!res.ok || !res.body) throw new Error('Erro na resposta');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantMsg = '';
      setChatMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        for (const line of text.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMsg += data.content;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantMsg };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, tive um problema técnico. Tente novamente em instantes.' }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatMessages, chatLoading]);

  useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      setLocation('/hub');
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) return null;
  if (isAuthenticated) return null;

  const ActiveScreen = MODULOS[activeModulo].screen;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <img src={mirageLogo} alt="Mirage" style={{ height: '44px', width: 'auto' }} />
          <div className="hidden md:flex items-center gap-6 text-sm text-white/70">
            <a href="#o-que-fazemos" className="hover:text-white transition-colors">Sobre</a>
            <a href="#produto" className="hover:text-white transition-colors">Produto</a>
            <a href="#demo" className="hover:text-white transition-colors">Demo</a>
            <a href="#fase-fundadora" className="hover:text-white transition-colors text-amber-400 hover:text-amber-300 font-medium">Fase Fundadora</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
            <Link href="/hub/comunidade/fornecedores" className="hover:text-white transition-colors text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> Comunidade
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => setChatOpen(true)} className="text-sm text-violet-300 hover:text-violet-200 transition-colors flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" /> IA Mirage
            </button>
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">Entrar</Button>
            </Link>
            <Link href={TRIAL_LINK}>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white border-0 gap-1.5">
                Começar grátis
              </Button>
            </Link>
          </div>
          <button className="md:hidden text-white/70" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#0a0a0f] border-t border-white/5 px-4 py-4 flex flex-col gap-4">
            <a href="#produto" className="text-white/70 text-sm" onClick={() => setMenuOpen(false)}>Produto</a>
            <a href="#apps" className="text-white/70 text-sm" onClick={() => setMenuOpen(false)}>Apps</a>
            <a href="#planos" className="text-white/70 text-sm" onClick={() => setMenuOpen(false)}>Planos</a>
            <Link href="/hub/comunidade/fornecedores" className="text-emerald-400 text-sm font-medium flex items-center gap-1" onClick={() => setMenuOpen(false)}>
              <Users className="w-3.5 h-3.5" /> Comunidade (acesso gratuito)
            </Link>
            <Link href="/login"><Button variant="outline" size="sm" className="w-full border-white/20 text-white">Entrar</Button></Link>
            <Link href={TRIAL_LINK} className="w-full">
              <Button size="sm" className="w-full bg-violet-600 hover:bg-violet-700 border-0 gap-1.5">
                Começar teste gratuito
              </Button>
            </Link>
            <Button size="sm" variant="outline" onClick={() => { setChatOpen(true); setMenuOpen(false); }} className="w-full border-violet-500/30 text-violet-300 gap-1.5">
              <Bot className="w-3.5 h-3.5" /> Falar com a IA do Mirage
            </Button>
            <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer" className="w-full text-center text-xs text-white/30 hover:text-white/50 transition-colors pt-1">
              Agendar demonstração com humano
            </a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-violet-600/20 rounded-full blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-purple-800/15 rounded-full blur-[80px]" />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 rounded-full px-4 py-1.5 text-sm text-violet-300 mb-8">
            <Zap className="w-3.5 h-3.5" />
            O ecossistema completo para confecções brasileiras
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-6">
            O software que organiza a{' '}
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              confecção de ponta a ponta.
            </span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Produção, desenvolvimento, custos, relatórios e operação em um único ecossistema para a confecção brasileira.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={TRIAL_LINK}>
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white border-0 h-13 px-8 text-base font-semibold w-full sm:w-auto gap-2">
                Começar teste gratuito <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" onClick={() => setChatOpen(true)} className="w-full sm:w-auto border-violet-500/40 text-violet-300 hover:bg-violet-600/10 hover:border-violet-400/60 h-13 px-8 text-base gap-2">
              <Bot className="w-4 h-4" /> Falar com a IA do Mirage
            </Button>
          </div>
          <p className="text-sm text-white/40 mt-4">
            Sem cartão de crédito • 14 dias grátis •{' '}
            <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/60 transition-colors">
              Agendar demonstração com humano
            </a>
          </p>

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-20 pt-10 border-t border-white/5">
            {STATS.map(s => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-black text-violet-400">{s.valor}</div>
                <div className="text-sm text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O QUE FAZEMOS */}
      <section id="o-que-fazemos" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 rounded-full px-3 py-1 text-xs text-violet-300 font-semibold mb-6">
                <Cpu className="w-3 h-3" /> O que fazemos
              </div>
              <h2 className="text-4xl font-black mb-6 leading-tight">
                Gestão integrada para<br />
                <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">confecção brasileira</span>
              </h2>
              <p className="text-white/60 leading-relaxed mb-6">
                Ajudamos confecções a centralizar produção, desenvolvimento de produto, custos, relatórios e rotina operacional em um único software.
              </p>
              <div className="bg-white/3 border border-violet-500/20 rounded-xl px-5 py-4">
                <p className="text-sm font-semibold text-violet-300 mb-1">Pitch em uma frase</p>
                <p className="text-white/80 italic leading-relaxed">
                  "O Mirage Hub organiza a confecção de ponta a ponta em um único sistema."
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  icon: Cpu,
                  title: 'Nasceu de operação real',
                  desc: 'O Mirage foi construído dentro de uma operação de confecção. Não é teoria — é solução para dor que a equipe viveu na prática.',
                  color: 'bg-violet-600/20 text-violet-400',
                },
                {
                  icon: CheckCircle,
                  title: 'Já está validado em uso',
                  desc: 'Está rodando em operação real. Os módulos foram testados e ajustados no campo antes de qualquer lançamento.',
                  color: 'bg-green-600/20 text-green-400',
                },
                {
                  icon: Sparkles,
                  title: 'Lançamento controlado',
                  desc: 'A fase fundadora abre com entrada acompanhada — implantação guiada e proximidade com os primeiros clientes.',
                  color: 'bg-amber-600/20 text-amber-400',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex items-start gap-4 bg-white/3 border border-white/8 rounded-xl p-4">
                    <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white mb-1">{item.title}</p>
                      <p className="text-xs text-white/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* PRODUTO EM AÇÃO */}
      <section id="produto" className="py-28 px-4 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4">Produto em ação</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">4 módulos integrados que cobrem todo o fluxo da confecção — da peça ao pedido, do custo ao relatório.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
            {/* Seletor de módulo */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {MODULOS.map((m, i) => {
                const Icon = m.icon;
                const active = i === activeModulo;
                return (
                  <button
                    key={m.label}
                    onClick={() => setActiveModulo(i)}
                    className={`text-left rounded-xl p-4 border transition-all duration-200 ${active ? 'bg-white/8 border-violet-500/40 ring-1 ring-violet-500/20' : 'bg-white/3 border-white/8 hover:bg-white/5 hover:border-white/15'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="w-4.5 h-4.5 text-white" />
                      </div>
                      <div>
                        <div className={`text-sm font-bold mb-0.5 ${active ? 'text-white' : 'text-white/70'}`}>{m.label}</div>
                        <div className="text-xs text-white/40 leading-relaxed">{m.desc}</div>
                      </div>
                    </div>
                    {active && (
                      <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${m.color} opacity-60`} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Preview da tela */}
            <div className="lg:col-span-3 sticky top-24">
              <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-violet-900/20">
                {/* Browser chrome */}
                <div className="bg-[#1a1828] px-3 py-2.5 flex items-center gap-2 border-b border-white/8">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="bg-white/5 rounded-md px-4 py-1 text-[11px] text-white/30 font-mono">
                      app.mirage.com.br/hub
                    </div>
                  </div>
                  <div className="w-12" />
                </div>
                {/* Tela do módulo */}
                <div className="h-72">
                  <ActiveScreen />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                {MODULOS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveModulo(i)}
                    className={`rounded-full transition-all ${i === activeModulo ? 'w-6 h-1.5 bg-violet-500' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O QUE ESTÁ NO TRIAL */}
      <section id="trial" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black mb-3">O que você acessa no teste gratuito</h2>
            <p className="text-white/50">14 dias, sem cartão de crédito, ativação em menos de 1 minuto.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Módulos incluídos */}
            <div className="lg:col-span-2 bg-white/3 border border-green-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm font-bold text-green-300">Disponível imediatamente no trial</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: LayoutDashboard, label: 'Kanban de Produção', desc: '14 fases, controle total de OPs' },
                  { icon: Layers, label: 'PLM — Desenvolvimento', desc: 'Fichas técnicas, pilotagem, aprovação' },
                  { icon: Calculator, label: 'Custos e Orçamentos', desc: 'Ficha de custo, margem, envio por e-mail' },
                  { icon: BarChart3, label: 'Relatórios e BI', desc: 'Dashboard gerencial, exportação Excel' },
                  { icon: Users, label: 'Comunidade Moda Conecta', desc: 'Rede B2B, fornecedores verificados' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-600/15 border border-green-500/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{label}</p>
                      <p className="text-xs text-white/40">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Link href={TRIAL_LINK}>
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white border-0 gap-2 w-full sm:w-auto">
                    Começar teste gratuito <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            {/* Módulos manuais */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="w-3.5 h-3.5 text-white/40" />
                <span className="text-sm font-bold text-white/50">Ativação manual</span>
              </div>
              <div className="space-y-4 mb-6">
                {[
                  { icon: HeadphonesIcon, label: 'CRM Mirage', desc: 'Robô SDR no WhatsApp — requer configuração específica' },
                  { icon: FileText, label: 'ERP Mirage', desc: 'Financeiro, fiscal e NF-e — integração VhSys, requer onboarding' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-white/30" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white/60">{label}</p>
                      <p className="text-xs text-white/35 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full border-white/20 text-white/60 hover:text-white hover:bg-white/5 gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Agendar conversa
                </Button>
              </a>
              <p className="text-[11px] text-white/25 mt-2 text-center">Para ativar CRM e ERP, fale com a equipe</p>
            </div>
          </div>
        </div>
      </section>

      {/* DEMO FLOW */}
      <section id="demo" className="py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-violet-600/10 border border-violet-500/20 rounded-full px-3 py-1 text-xs text-violet-300 font-semibold mb-4">
              <BookOpen className="w-3 h-3" /> Roteiro de demonstração
            </div>
            <h2 className="text-4xl font-black mb-4">Como mostramos o Mirage</h2>
            <p className="text-white/50 max-w-xl mx-auto">O problema da maioria das confecções é operar com informação espalhada, baixa visibilidade e retrabalho. O Mirage nasce para centralizar isso.</p>
          </div>

          <div className="space-y-6">
            {/* Passo 0 — Contexto */}
            <div className="flex items-start gap-5 bg-white/3 border border-white/8 rounded-2xl p-6">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-9 h-9 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-sm font-black text-white/50">0</div>
                <div className="w-px h-6 bg-white/10" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-wide mb-1">Contexto</p>
                <h3 className="text-lg font-bold text-white mb-2">O problema da confecção fragmentada</h3>
                <p className="text-sm text-white/55 leading-relaxed">Produção no WhatsApp, planilhas de custo desatualizadas, desenvolvimento de produto em e-mail, relatórios que ninguém olha. O Mirage substitui esse caos por um sistema integrado e visível.</p>
              </div>
            </div>

            {/* Passos com tela */}
            {[
              {
                step: 1,
                label: 'Produção',
                title: 'Kanban de Produção',
                desc: 'Mostre o board com as OPs em cada etapa — corte, costura, acabamento, expedição. Status em tempo real, alertas de prazo automáticos, zero ligação para saber onde está o pedido.',
                icon: LayoutDashboard,
                color: 'from-violet-500 to-purple-600',
                screen: ScreenKanban,
              },
              {
                step: 2,
                label: 'Desenvolvimento',
                title: 'PLM — Fichas e Evolução',
                desc: 'Gerencie o ciclo de cada referência: briefing, modelagem, pilotagem e aprovação. Ficha técnica estruturada, histórico de revisões e rastreabilidade do desenvolvimento.',
                icon: Layers,
                color: 'from-indigo-500 to-blue-600',
                screen: ScreenPLM,
              },
              {
                step: 3,
                label: 'Custos',
                title: 'Ficha de Custo e Margem',
                desc: 'Custo real de cada peça — matéria-prima, mão de obra, margem calculada. Orçamentos gerados e enviados por e-mail. Decisão de precificação baseada em dado, não em chute.',
                icon: DollarSign,
                color: 'from-blue-500 to-cyan-600',
                screen: ScreenCustos,
              },
              {
                step: 4,
                label: 'Gestão',
                title: 'Relatórios e Leitura Gerencial',
                desc: 'Dashboard consolidado: faturamento, OPs concluídas, prazo de entrega e ticket médio. Visão gerencial que qualquer gestor consegue ler sem precisar de analista.',
                icon: LineChart,
                color: 'from-emerald-500 to-teal-600',
                screen: ScreenRelatorios,
              },
            ].map(({ step, label, title, desc, icon: Icon, color, screen: Screen }) => (
              <div key={step} className="grid grid-cols-1 lg:grid-cols-5 gap-6 bg-white/3 border border-white/8 rounded-2xl p-6">
                <div className="lg:col-span-2 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-white/8 border border-white/15 flex items-center justify-center text-sm font-black text-white/50">{step}</div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${color} text-white`}>{label}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="text-base font-bold text-white">{title}</h3>
                  </div>
                  <p className="text-sm text-white/50 leading-relaxed">{desc}</p>
                </div>
                <div className="lg:col-span-3">
                  <div className="rounded-xl overflow-hidden border border-white/10 shadow-xl">
                    <div className="bg-[#1a1828] px-3 py-2 flex items-center gap-2 border-b border-white/8">
                      <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-red-500/60" /><div className="w-2 h-2 rounded-full bg-amber-500/60" /><div className="w-2 h-2 rounded-full bg-green-500/60" /></div>
                      <div className="flex-1 flex justify-center"><div className="bg-white/5 rounded px-3 py-0.5 text-[10px] text-white/25 font-mono">app.mirage.com.br/hub</div></div>
                      <div className="w-8" />
                    </div>
                    <div className="h-52"><Screen /></div>
                  </div>
                </div>
              </div>
            ))}

            {/* Passo 5 — Fechamento */}
            <div className="flex items-start gap-5 bg-gradient-to-r from-violet-600/10 to-purple-900/10 border border-violet-500/20 rounded-2xl p-6">
              <div className="flex flex-col items-center gap-1 shrink-0">
                <div className="w-9 h-9 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-sm font-black text-violet-300">5</div>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-violet-400 uppercase tracking-wide mb-1">Fechamento</p>
                <h3 className="text-lg font-bold text-white mb-2">Gestão integrada e visível</h3>
                <p className="text-sm text-white/60 leading-relaxed mb-4">A proposta do Mirage é substituir operação fragmentada por gestão integrada e visível. Um sistema, todos os módulos, toda a confecção no controle.</p>
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <Link href={TRIAL_LINK}>
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white border-0 gap-1.5">
                      Começar teste gratuito <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setChatOpen(true)} className="border-violet-500/30 text-violet-300 hover:bg-violet-600/10 gap-1.5">
                    <Bot className="w-3.5 h-3.5" /> Falar com a IA
                  </Button>
                  <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer" className="text-xs text-white/30 hover:text-white/50 transition-colors self-center">
                    Agendar demonstração
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* APPS */}
      <section id="apps" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">5 apps. 1 ecossistema.</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Cada app resolve um problema real da sua confecção — e todos conversam entre si.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {APPS.map((app, i) => {
              const Icon = app.icon;
              const isComunidade = !!app.href;
              const inner = (
                <div className={`relative group bg-white/3 border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${i === 0 ? 'lg:col-span-2' : ''} ${isComunidade ? 'border-emerald-500/30 hover:border-emerald-400/50 cursor-pointer' : 'border-white/8 hover:border-white/15'}`}>
                  {app.badge && (
                    <span className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full border ${isComunidade ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30' : 'bg-violet-600/20 text-violet-300 border-violet-500/30'}`}>
                      {app.badge}
                    </span>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{app.name}</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{app.desc}</p>
                  {isComunidade && (
                    <div className="mt-4 flex items-center gap-1 text-emerald-400 text-sm font-medium">
                      Acessar diretório <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
              return app.href
                ? <Link key={i} href={app.href}>{inner}</Link>
                : <div key={i}>{inner}</div>;
            })}
          </div>
        </div>
      </section>

      {/* PROBLEMA / SOLUÇÃO */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent via-violet-950/20 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6 leading-tight">
                Chega de gestão por<br />
                <span className="text-red-400 line-through opacity-60">papel e WhatsApp</span>
              </h2>
              <div className="space-y-4">
                {[
                  'Não sabe onde está cada pedido sem perguntar',
                  'Perde prazo de entrega e paga multa para o cliente',
                  'Vende peças abaixo do custo real sem perceber',
                  'Perde leads no WhatsApp por não responder a tempo',
                  'Fecha o mês sem saber se teve lucro ou prejuízo',
                ].map((problema, i) => (
                  <div key={i} className="flex items-start gap-3 text-white/60">
                    <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <span className="text-sm">{problema}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-black mb-6 leading-tight">
                Com Mirage você<br />
                <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">controla tudo</span>
              </h2>
              <div className="space-y-4">
                {[
                  'Board visual com todas as OPs em tempo real',
                  'Alertas automáticos de prazo antes de atrasar',
                  'Ficha de custo precisa com margem real em segundos',
                  'Robô SDR atende leads 24h e qualifica automaticamente',
                  'DRE, fluxo de caixa e NF-e integrados ao processo',
                ].map((solucao, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-white/80">{solucao}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OBJEÇÕES */}
      <section id="objecoes" className="py-24 px-4 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black mb-4">Perguntas diretas, respostas diretas</h2>
            <p className="text-white/50">As dúvidas mais comuns de quem está avaliando o Mirage.</p>
          </div>
          <div className="space-y-3">
            {[
              { q: 'Já funciona de verdade?', a: 'Sim. O Mirage já roda em operação real e está sendo lançado de forma controlada. Não é MVP — é produto que saiu de dentro de uma confecção em funcionamento.' },
              { q: 'É muito complexo para implantar?', a: 'Não. A implantação inicial é guiada e focada no que gera valor primeiro. A entrada na fase fundadora é acompanhada — não é você sozinho com um manual.' },
              { q: 'Serve para o tamanho da minha empresa?', a: 'Se sua operação está no universo da confecção, o Mirage foi desenhado exatamente para isso. Pequenas, médias e grandes confecções — o que muda é o plano, não a proposta.' },
              { q: 'Por que confiar agora?', a: 'Porque o produto nasceu de dor operacional real, foi construído de dentro de uma confecção e já está validado em uso prático. Não é aposta — é solução que já resolve.' },
              { q: 'Vocês acompanham a entrada?', a: 'Sim. A fase fundadora prevê entrada acompanhada e próxima. Os primeiros clientes têm acesso direto à equipe durante a implantação.' },
            ].map(({ q, a }, i) => (
              <button
                key={i}
                onClick={() => setOpenObjecao(openObjecao === i ? null : i)}
                className="w-full text-left bg-white/3 hover:bg-white/5 border border-white/8 hover:border-white/15 rounded-xl px-6 py-4 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-sm text-white">{q}</span>
                  <ChevronDown className={`w-4 h-4 text-white/40 shrink-0 transition-transform duration-200 ${openObjecao === i ? 'rotate-180' : ''}`} />
                </div>
                {openObjecao === i && (
                  <p className="mt-3 text-sm text-white/55 leading-relaxed border-t border-white/8 pt-3">{a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FASE FUNDADORA */}
      <section id="fase-fundadora" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-950/30 via-[#0a0a0f] to-violet-950/30 p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-[60px]" />
            <div className="relative z-10">
              <div className="flex flex-col lg:flex-row gap-10 items-start">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs text-amber-300 font-semibold mb-5">
                    <Sparkles className="w-3 h-3" /> Fase Fundadora — vagas limitadas
                  </div>
                  <h2 className="text-3xl font-black text-white mb-4 leading-tight">
                    Entrada acompanhada.<br />
                    <span className="text-amber-400">Implantação prática.</span>
                  </h2>
                  <p className="text-white/60 leading-relaxed mb-6">
                    O Mirage Hub está abrindo a fase fundadora com entrada acompanhada, foco em implantação prática e proximidade com os primeiros clientes. Os fundadores entram com a equipe do lado — do onboarding até os primeiros resultados.
                  </p>
                  <div className="space-y-3">
                    {[
                      'Implantação guiada do início ao fim',
                      'Acesso direto à equipe durante a entrada',
                      'Prioridade na definição do roadmap',
                      'Condições de fundador (preço e contrato)',
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-3 text-sm text-white/70">
                        <CheckCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:w-72 w-full">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                    <div className="text-xs text-white/40 uppercase tracking-wide font-semibold mb-2">Lançamento</div>
                    <div className="text-5xl font-black text-white mb-1">01<span className="text-amber-400">/</span>07</div>
                    <div className="text-sm text-white/40 mb-6">Abertura oficial — 2025</div>
                    <div className="space-y-3">
                      <Link href={TRIAL_LINK} className="block">
                        <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold border-0 gap-1.5">
                          Começar teste gratuito <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button variant="outline" onClick={() => setChatOpen(true)} className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-600/10 gap-1.5">
                        <Bot className="w-4 h-4" /> Falar com a IA do Mirage
                      </Button>
                      <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer" className="block text-center text-[11px] text-white/30 hover:text-white/50 transition-colors pt-1">
                        Agendar demonstração com humano
                      </a>
                    </div>
                    <p className="text-[11px] text-white/25 mt-2">Vagas limitadas para a fase fundadora</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section id="depoimentos" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Quem já usa, não abre mão</h2>
            <p className="text-white/50">Confecções de todo o Brasil transformando a gestão com o Mirage.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((d, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-6">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: d.estrelas }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-white/70 text-sm leading-relaxed mb-6">"{d.texto}"</p>
                <div>
                  <div className="font-semibold text-sm">{d.nome}</div>
                  <div className="text-white/40 text-xs">{d.cargo}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Planos para cada fase do negócio</h2>
            <p className="text-white/50">Comece pequeno, cresça sem trocar de sistema.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANOS.map((plano) => (
              <div key={plano.id} className={`relative rounded-2xl p-6 border ${plano.destaque ? 'bg-violet-600/10 border-violet-500/40 ring-1 ring-violet-500/30' : 'bg-white/3 border-white/8'}`}>
                {plano.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    Mais escolhido
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-lg font-bold mb-1">{plano.nome}</h3>
                  <p className="text-white/50 text-xs mb-4">{plano.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-white/40 text-sm">R$</span>
                    <span className="text-4xl font-black">{plano.preco}</span>
                    <span className="text-white/40 text-sm">/mês</span>
                  </div>
                </div>
                <ul className="space-y-3 mb-8">
                  {plano.apps.map((app, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                      <span className="text-white/70">{app}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/comecar">
                  <Button className={`w-full border-0 ${plano.destaque ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-white/8 hover:bg-white/12 text-white'}`}>
                    Começar agora <ChevronRight className="ml-1 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-white/30 text-sm mt-8">14 dias grátis em qualquer plano • Sem cartão de crédito</p>
        </div>
      </section>

      {/* CTA FINAL — LANÇAMENTO */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="relative bg-gradient-to-br from-violet-600/20 to-purple-900/20 border border-violet-500/20 rounded-3xl p-12 overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 text-xs text-amber-300 font-semibold mb-6">
                <Zap className="w-3 h-3" /> Vagas limitadas — Fase Fundadora aberta
              </div>
              <h2 className="text-4xl font-black mb-4">O software que organiza a confecção de ponta a ponta.</h2>
              <p className="text-white/50 mb-8 leading-relaxed">
                Produção, desenvolvimento, custos, relatórios e operação em um único ecossistema para a confecção brasileira.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href={TRIAL_LINK}>
                  <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white border-0 h-13 px-8 text-base font-semibold w-full sm:w-auto gap-2">
                    Começar teste gratuito <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" onClick={() => setChatOpen(true)} className="w-full sm:w-auto border-violet-500/40 text-violet-300 hover:bg-violet-600/10 h-13 px-8 text-base gap-2">
                  <Bot className="w-4 h-4" /> Falar com a IA do Mirage
                </Button>
              </div>
              <p className="text-sm text-white/30 mt-4">
                <a href={DEMO_LINK} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white/50 transition-colors">
                  Prefere falar com um humano? Agende uma demonstração.
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FLOATING CHAT BUTTON */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full px-4 py-3 shadow-lg shadow-violet-900/40 transition-all hover:scale-105 active:scale-95"
        aria-label="Falar com a IA do Mirage"
      >
        <Bot className="w-5 h-5" />
        <span className="text-sm font-semibold hidden sm:block">Falar com a IA</span>
      </button>

      {/* AI CHAT MODAL */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-6 pointer-events-none">
          <div className="pointer-events-auto w-full sm:w-[400px] bg-[#0f0f1a] border border-violet-500/30 rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-violet-900/40 flex flex-col" style={{ maxHeight: '80vh' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">IA do Mirage</p>
                  <p className="text-xs text-white/40">Assistente comercial</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-full hover:bg-white/8 flex items-center justify-center text-white/50 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white/8 text-white/85 rounded-bl-sm border border-white/6'
                  }`}>
                    {msg.content || (chatLoading && i === chatMessages.length - 1 ? (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    ) : '')}
                  </div>
                </div>
              ))}
              {chatLoading && chatMessages[chatMessages.length - 1]?.role !== 'assistant' && (
                <div className="flex justify-start">
                  <div className="bg-white/8 border border-white/6 rounded-2xl rounded-bl-sm px-4 py-3">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {/* Quick prompts */}
            {chatMessages.length <= 1 && (
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {['O que tem no trial?', 'Qual o preço?', 'Funciona para minha confecção?'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setChatInput(q); setTimeout(() => sendChatMessage(), 50); }}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white/80 rounded-full px-3 py-1 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-white/8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
                  placeholder="Faça uma pergunta…"
                  disabled={chatLoading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
              <p className="text-[11px] text-white/20 mt-2 text-center">IA para dúvidas comerciais — não acessa sua conta</p>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <img src={mirageLogo} alt="Mirage" style={{ height: '34px', width: 'auto', opacity: 0.7 }} />
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/login" className="hover:text-white/70 transition-colors">Entrar</Link>
            <Link href={TRIAL_LINK} className="hover:text-white/70 transition-colors">Planos</Link>
            <a href="mailto:diretoria@gestaomirage.com.br" className="hover:text-white/70 transition-colors">Contato</a>
            <Link href="/termos" className="hover:text-white/70 transition-colors">Termos</Link>
            <Link href="/privacidade" className="hover:text-white/70 transition-colors">Privacidade</Link>
          </div>
          <div className="text-center md:text-right">
            <p className="text-white/30 text-xs">© 2026 Mirage Hub. Todos os direitos reservados.</p>
            <p className="text-white/20 text-xs mt-1">Mirage Gestão & Tecnologia Ltda · CNPJ 67.660.591/0001-02</p>
            <p className="text-white/20 text-xs">São Paulo/SP · diretoria@gestaomirage.com.br</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
