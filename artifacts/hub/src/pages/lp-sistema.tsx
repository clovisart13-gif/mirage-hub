import { useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, CheckCircle, Menu, X, Play, ChevronDown, ChevronUp } from 'lucide-react';
const mirageLogo = `${import.meta.env.BASE_URL}mirage_logo_dark_transparent.png`;

const NAV_LINKS = [
  { label: 'Sistema', href: '#sistema' },
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Recursos', href: '#recursos' },
  { label: 'Moda Conecta', href: '#moda-conecta' },
  { label: 'Solicitar demonstração', href: '#demo' },
];

const MODULES = [
  {
    step: '01',
    title: 'CRM e Captação',
    desc: 'Robô SDR qualifica leads 24h no WhatsApp. Sua equipe comercial só entra quando o lead está pronto — sem perder tempo com contatos frios.',
    bullets: ['Qualificação automática via IA', 'Histórico completo de cada lead', 'Handoff inteligente para o closer', 'Funil com visibilidade em tempo real'],
    color: '#f97316',
    side: 'right',
    screen: <ScreenCRM />,
  },
  {
    step: '02',
    title: 'Funil Comercial',
    desc: 'Acompanhe cada negociação do primeiro contato ao pedido fechado. Saiba exatamente onde está cada oportunidade e quanto vale seu pipeline.',
    bullets: ['Kanban de negociações', 'Alertas de oportunidades paradas', 'Previsão de faturamento', 'Integração direta com o Kanban de produção'],
    color: '#10b981',
    side: 'left',
    screen: <ScreenFunil />,
  },
  {
    step: '03',
    title: 'PLM e Prototipagem',
    desc: 'Centralize fichas técnicas, BOM, modelagem e aprovação de coleção. Da ideia à aprovação do cliente sem e-mail, sem planilha.',
    bullets: ['Ficha técnica digital', 'Gestão de BOM por referência', 'Aprovação de amostras online', 'Histórico de versões do produto'],
    color: '#8b5cf6',
    side: 'right',
    screen: <ScreenPLM />,
  },
  {
    step: '04',
    title: 'Orçamento',
    desc: 'Calcule o custo real de cada peça — matéria-prima, CMO, embalagem e margem. Nunca mais venda com prejuízo sem perceber.',
    bullets: ['Custo por referência e quantidade', 'CMO integrado ao Kanban', 'Simulação de margem e precificação', 'Histórico de orçamentos aprovados'],
    color: '#3b82f6',
    side: 'left',
    screen: <ScreenOrcamento />,
  },
];

const FEATURES = [
  { icon: '⚡', title: 'Tempo real', desc: 'Dados atualizados ao vivo — sem F5, sem aguardar relatório.' },
  { icon: '🔗', title: 'Tudo integrado', desc: 'CRM → Kanban → PLM → Orçamento → ERP em um único fluxo.' },
  { icon: '🤖', title: 'IA no processo', desc: 'Robô SDR, classificação de leads e alertas automáticos.' },
];

// ── Telas mockup ──────────────────────────────────────────────────────────────

function ScreenCRM() {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-[#1a0a00] border border-orange-500/20 p-3 text-[10px]">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500" /><div className="w-2 h-2 rounded-full bg-yellow-500" /><div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-orange-400/60 ml-1">CRM Mirage — Leads</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[{l:'Leads hoje',v:'12',c:'text-orange-400'},{l:'Qualificados',v:'8',c:'text-green-400'},{l:'Fechamentos',v:'3',c:'text-blue-400'}].map((s,i)=>(
          <div key={i} className="bg-white/5 rounded-lg p-2 text-center">
            <p className={`font-bold text-sm ${s.c}`}>{s.v}</p>
            <p className="text-white/40 text-[8px]">{s.l}</p>
          </div>
        ))}
      </div>
      {[
        {name:'Ateliê do Sul',msg:'Preciso de 500 camisetas',tag:'Novo',tc:'bg-orange-500'},
        {name:'Moda Fácil SP',msg:'Qual o prazo de entrega?',tag:'Qualificado',tc:'bg-green-500'},
        {name:'R2PB Confecções',msg:'Vamos fechar o contrato',tag:'Fechando',tc:'bg-blue-500'},
      ].map((l,i)=>(
        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-2 mb-1.5">
          <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold shrink-0">{l.name[0]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-[10px] font-semibold">{l.name}</p>
            <p className="text-white/40 text-[9px] truncate">{l.msg}</p>
          </div>
          <span className={`text-[8px] text-white px-1.5 py-0.5 rounded-full ${l.tc}`}>{l.tag}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenFunil() {
  const cols = [{n:'Prospecção',c:'#6366f1',items:3},{n:'Proposta',c:'#f59e0b',items:2},{n:'Negociação',c:'#10b981',items:2},{n:'Fechado',c:'#3b82f6',items:1}];
  return (
    <div className="w-full rounded-xl overflow-hidden bg-[#0a1a0a] border border-emerald-500/20 p-3 text-[10px]">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500" /><div className="w-2 h-2 rounded-full bg-yellow-500" /><div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-emerald-400/60 ml-1">Funil Comercial</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {cols.map(col=>(
          <div key={col.n}>
            <div className="rounded-md px-1.5 py-1 text-center mb-1.5" style={{background:col.c+'33',border:`1px solid ${col.c}44`}}>
              <span className="font-bold" style={{color:col.c}}>{col.n}</span>
            </div>
            {Array.from({length:col.items}).map((_,i)=>(
              <div key={i} className="bg-white/5 border border-white/10 rounded-md p-1.5 mb-1">
                <div className="h-1.5 bg-white/20 rounded mb-1 w-3/4"/>
                <div className="h-1 bg-white/10 rounded w-1/2"/>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenPLM() {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-[#0d0a1a] border border-violet-500/20 p-3 text-[10px]">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500" /><div className="w-2 h-2 rounded-full bg-yellow-500" /><div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-violet-400/60 ml-1">PLM — Ficha Técnica</span>
      </div>
      <div className="bg-white/5 rounded-lg p-2 mb-2">
        <p className="text-violet-300 font-bold mb-1">Camiseta Polo Slim — REF-042</p>
        <div className="grid grid-cols-2 gap-1">
          {[{l:'Tecido',v:'Piquet 220g'},{l:'Cor base',v:'Branco off'},{l:'Tamanhos',v:'P ao GG'},{l:'Status',v:'Aprovada ✓'}].map((f,i)=>(
            <div key={i} className="bg-white/5 rounded p-1">
              <p className="text-white/40 text-[8px]">{f.l}</p>
              <p className="text-white text-[9px] font-medium">{f.v}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-white/40 text-[9px] mb-1">BOM — Materiais</p>
      {[{m:'Piquet branco',q:'2.5m/pç'},{m:'Botões perola',q:'5 un/pç'},{m:'Linha 120',q:'200m/pç'}].map((b,i)=>(
        <div key={i} className="flex justify-between bg-white/5 rounded px-2 py-1 mb-1">
          <span className="text-white/70">{b.m}</span>
          <span className="text-violet-400">{b.q}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenOrcamento() {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-[#0a0f1a] border border-blue-500/20 p-3 text-[10px]">
      <div className="flex items-center gap-1.5 mb-3">
        <div className="w-2 h-2 rounded-full bg-red-500" /><div className="w-2 h-2 rounded-full bg-yellow-500" /><div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-blue-400/60 ml-1">Orçamento — REF-042</span>
      </div>
      {[{l:'Matéria-prima',v:'R$18,40',c:'text-white'},{l:'CMO (mão de obra)',v:'R$12,00',c:'text-white'},{l:'Embalagem',v:'R$2,80',c:'text-white'},{l:'Custo total',v:'R$33,20',c:'text-blue-400 font-bold'},{l:'Preço sugerido (40%)',v:'R$55,33',c:'text-green-400 font-bold'}].map((r,i)=>(
        <div key={i} className={`flex justify-between px-2 py-1.5 mb-0.5 rounded ${i>=3?'bg-white/10':'bg-white/5'}`}>
          <span className="text-white/60">{r.l}</span>
          <span className={r.c}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenAprovacao() {
  return (
    <div className="w-full rounded-xl overflow-hidden bg-[#0f172a] border border-white/10 p-3 text-[10px]">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-red-500" /><div className="w-2 h-2 rounded-full bg-yellow-500" /><div className="w-2 h-2 rounded-full bg-green-500" />
        <span className="text-white/40 ml-1">Aprovação do Pedido</span>
      </div>
      <div className="space-y-2">
        {[{s:'Orçamento',ok:true},{s:'Ficha técnica',ok:true},{s:'Aprovação cliente',ok:true},{s:'Geração pedido',ok:true},{s:'Kanban iniciado',ok:false}].map((s,i)=>(
          <div key={i} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] ${s.ok?'bg-green-500':'bg-white/10'}`}>{s.ok?'✓':''}</div>
            <div className="flex-1 h-0.5 bg-white/10 rounded-full">
              <div className={`h-full rounded-full bg-green-500 ${s.ok?'w-full':'w-0'}`}/>
            </div>
            <span className={`text-[9px] ${s.ok?'text-white':'text-white/30'}`}>{s.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Componentes de seção ──────────────────────────────────────────────────────

function Navbar({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10" style={{ background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <img src={mirageLogo} alt="Mirage" className="h-8 w-auto" />
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.slice(0, 4).map(l => (
            <a key={l.label} href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">{l.label}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <a href="/login" className="text-sm text-white/60 hover:text-white transition-colors">Entrar</a>
          <a href="#demo" className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5">
            Quero conhecer o Mirage <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>
        <button className="md:hidden text-white" onClick={() => setOpen(!open)}>
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden bg-[#0a0a14] border-t border-white/10 px-4 py-4 space-y-3">
          {NAV_LINKS.map(l => <a key={l.label} href={l.href} className="block text-sm text-white/70">{l.label}</a>)}
          <a href="#demo" className="block bg-violet-600 text-white text-sm px-4 py-2 rounded-lg text-center font-medium">Quero conhecer o Mirage</a>
        </div>
      )}
    </nav>
  );
}

// ── Tela do App (browser mockup) ──────────────────────────────────────────────
function AppMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden shadow-2xl border border-white/10">
      <div className="bg-[#1e1e2e] px-4 py-3 flex items-center gap-2 border-b border-white/10">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
        <div className="flex-1 mx-3 bg-white/10 rounded text-[10px] text-white/40 px-3 py-1">app.mirage.com.br</div>
      </div>
      <div className="bg-[#0f0e17]">{children}</div>
    </div>
  );
}

export default function LpSistema() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen" style={{ background: '#0a0a14', color: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Navbar open={menuOpen} setOpen={setMenuOpen} />

      {/* HERO */}
      <section className="pt-32 pb-24 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-6">
              PLATAFORMA DE GESTÃO COMERCIAL & PLM
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Sua confecção, conectada do{' '}
              <span className="text-violet-400">primeiro contato</span>{' '}
              à geração do pedido.
            </h1>
            <p className="text-lg text-white/60 mb-8 max-w-lg">
              Centralize a operação comercial e o desenvolvimento do produto em um sistema feito para a realidade da moda.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <a href="#demo" className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors">
                Quero conhecer o Mirage <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#como-funciona" className="flex items-center gap-2 text-white/60 hover:text-white px-4 py-3 transition-colors">
                <Play className="w-4 h-4" /> Ver como funciona
              </a>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-2xl font-bold text-white">+200</p>
                <p className="text-sm text-white/40">Confecções conectadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">+1M</p>
                <p className="text-sm text-white/40">Pedidos processados</p>
              </div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/10 blur-3xl rounded-full" />
            <div className="relative space-y-3">
              <AppMockup>
                <ScreenFunil />
              </AppMockup>
              <div className="grid grid-cols-2 gap-3">
                <AppMockup><ScreenCRM /></AppMockup>
                <AppMockup><ScreenPLM /></AppMockup>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="py-20 px-4 border-t border-white/5" id="sistema">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full mb-6">
              O PROBLEMA DA FRAGMENTAÇÃO
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Pare de gerenciar cada etapa em um lugar diferente.
            </h2>
            <p className="text-white/60 mb-6">
              WhatsApp para leads, planilha para orçamento, outro sistema para produção, e-mail para aprovação de ficha técnica. Cada ferramenta gera retrabalho, ruído e custo invisível.
            </p>
            <div className="space-y-3">
              {['CRM desconectado da produção', 'Ficha técnica em e-mail e PDF', 'Orçamento feito no Excel sem integração', 'Pedido gerado manualmente no ERP'].map((p, i) => (
                <div key={i} className="flex items-center gap-3 text-white/50">
                  <div className="w-5 h-5 rounded-full border border-red-500/40 flex items-center justify-center text-red-400 text-xs shrink-0">✕</div>
                  <span className="text-sm">{p}</span>
                </div>
              ))}
            </div>
          </div>
          <AppMockup><ScreenAprovacao /></AppMockup>
        </div>
      </section>

      {/* JORNADA */}
      <section className="py-20 px-4" id="como-funciona">
        <div className="max-w-6xl mx-auto text-center mb-12">
          <span className="inline-block text-xs font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-4">
            A JORNADA COMPLETA
          </span>
          <h2 className="text-3xl md:text-4xl font-bold">A Jornada do Escritório à entrega do Pedido</h2>
        </div>
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { n: '01', l: 'CRM e Captação', c: '#f97316' },
            { n: '02', l: 'Funil Comercial', c: '#10b981' },
            { n: '03', l: 'PLM e Prototipagem', c: '#8b5cf6' },
            { n: '04', l: 'Orçamento', c: '#3b82f6' },
            { n: '05', l: 'Aprovação e Pedido', c: '#ec4899' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 text-center border border-white/10 bg-white/5">
              <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-sm" style={{ background: s.c + '22', color: s.c, border: `1px solid ${s.c}44` }}>{s.n}</div>
              <p className="text-sm font-semibold text-white/80">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* MÓDULOS */}
      <section className="pb-8" id="recursos">
        {MODULES.map((mod, i) => (
          <div key={i} className="py-20 px-4 border-t border-white/5">
            <div className={`max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center ${mod.side === 'left' ? 'lg:flex-row-reverse' : ''}`}>
              <div className={mod.side === 'left' ? 'lg:order-2' : ''}>
                <span className="inline-block text-xs font-bold tracking-widest px-3 py-1.5 rounded-full mb-4 border" style={{ color: mod.color, background: mod.color + '15', borderColor: mod.color + '30' }}>
                  {mod.step}
                </span>
                <h2 className="text-3xl font-bold mb-4">{mod.title}</h2>
                <p className="text-white/60 mb-6">{mod.desc}</p>
                <ul className="space-y-2.5">
                  {mod.bullets.map((b, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/70">
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: mod.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={mod.side === 'left' ? 'lg:order-1' : ''}>
                <AppMockup>{mod.screen}</AppMockup>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* OPERAÇÃO */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full mb-4">
              A OPERAÇÃO CONTINUA
            </span>
            <h2 className="text-3xl md:text-4xl font-bold">Depois do pedido, o sistema não para.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-white/50 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODA CONECTA */}
      <section className="py-20 px-4 border-t border-white/5" id="moda-conecta">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full mb-6">
              MODA CONECTA
            </span>
            <h2 className="text-3xl font-bold mb-4">Além do sistema, acesso a uma rede toda feita para você.</h2>
            <p className="text-white/60 mb-6">Moda Conecta: além do sistema, acesso a uma comunidade B2B com fornecedores verificados, vagas especializadas e negócios do setor têxtil — tudo integrado ao Hub.</p>
            <div className="space-y-3 mb-8">
              {['Fornecedores verificados de tecido, aviamento e facção', 'Vagas e banco de talentos do setor têxtil', 'Anúncios B2B para maquinário e matéria-prima', 'Fórum exclusivo para donos de confecção'].map((b, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-white/70">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  {b}
                </div>
              ))}
            </div>
            <a href="/hub/comunidade/fornecedores" className="inline-flex items-center gap-2 text-emerald-400 font-medium hover:text-emerald-300 transition-colors">
              Acessar a comunidade <ArrowRight className="w-4 h-4" />
            </a>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-xl p-8">
            <div className="grid grid-cols-2 gap-4">
              {[{l:'Fornecedores',v:'+1.200',c:'text-emerald-400'},{l:'Vagas ativas',v:'48',c:'text-blue-400'},{l:'Anúncios',v:'340',c:'text-amber-400'},{l:'Membros',v:'+3.000',c:'text-violet-400'}].map((s,i)=>(
                <div key={i} className="bg-white/5 rounded-lg p-4 text-center">
                  <p className={`text-2xl font-bold ${s.c}`}>{s.v}</p>
                  <p className="text-white/40 text-xs mt-1">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest text-white/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full mb-4">PERGUNTAS FREQUENTES</span>
            <h2 className="text-3xl font-bold">Dúvidas sobre o Sistema Mirage</h2>
          </div>
          <div className="space-y-3">
            {[
              { q: 'Qual o melhor sistema de Kanban para confecção?', r: 'O Kanban Mirage foi desenvolvido especificamente para o fluxo da confecção — com 14 fases configuráveis (corte, costura, acabamento, bordado, embalagem, expedição), alertas de atraso por OP e rastreabilidade em tempo real. Diferente de ferramentas genéricas como Trello ou Asana, cada campo e relatório usa o vocabulário da indústria têxtil.' },
              { q: 'Como o CRM com IA funciona para confecção?', r: 'O Robô SDR do CRM Mirage opera 24h no WhatsApp: recebe o lead, qualifica automaticamente com perguntas sobre volume, produto e prazo, e só passa para o closer humano quando o lead está pronto. Isso elimina o tempo perdido com leads frios e aumenta a taxa de conversão sem ampliar o time.' },
              { q: 'O que é PLM e por que minha confecção precisa?', r: 'PLM (Product Lifecycle Management) é a gestão digital do ciclo de vida do produto. Com o PLM Mirage você cria fichas técnicas estruturadas, monta o BOM (lista de materiais) por referência, envia aprovações de amostras online e mantém histórico de versões — tudo sem PDF, e-mail ou WhatsApp.' },
              { q: 'Como calcular o preço certo de cada peça?', r: 'O Orçamento Mirage calcula o custo real por referência considerando matéria-prima, CMO (custo de mão de obra integrado ao Kanban) e embalagem. Você vê exatamente quanto custa cada peça e simula diferentes margens antes de fechar o preço com o cliente.' },
              { q: 'O Mirage tem integração com ERP e NF-e?', r: 'Sim. No plano Enterprise há integração nativa com o VhSys (ERP parceiro), cobrindo financeiro, estoque, fiscal e emissão de NF-e. O pedido gerado no Kanban alimenta automaticamente o ERP sem reentrada de dados.' },
              { q: 'Serve para facção terceirista?', r: 'Sim. Facções usam o Kanban para rastrear OPs de múltiplos clientes simultaneamente, comunicar prazo de entrega em tempo real e gerar relatórios de capacidade por setor — sem ligação ou WhatsApp manual.' },
            ].map((faq, i) => {
              const [open, setOpen] = [faqOpen === i, () => setFaqOpen(faqOpen === i ? null : i)];
              return (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={setOpen}>
                    <span className="font-medium text-sm pr-4">{faq.q}</span>
                    {open ? <ChevronUp className="w-4 h-4 shrink-0 text-white/40" /> : <ChevronDown className="w-4 h-4 shrink-0 text-white/40" />}
                  </button>
                  {open && <div className="px-5 pb-5 text-sm text-white/50 border-t border-white/10 pt-3 leading-relaxed">{faq.r}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 border-t border-white/5" id="demo">
        <div className="max-w-2xl mx-auto text-center">
          <span className="inline-block text-xs font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-6">
            COMECE AGORA
          </span>
          <h2 className="text-4xl font-bold mb-4">Converta sua confecção em um único fluxo.</h2>
          <p className="text-white/50 mb-8">Do lead à entrega, tudo no mesmo sistema. Sem planilha, sem WhatsApp, sem retrabalho.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/planos" className="bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors">
              Ver planos e preços <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/cadastro" className="border border-white/20 hover:border-white/40 text-white px-8 py-3.5 rounded-lg font-semibold transition-colors">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-8 px-4 text-center">
        <p className="text-white/20 text-sm">© 2025 Mirage Hub. Gestão & Tecnologia para Confecção.</p>
      </footer>
    </div>
  );
}
