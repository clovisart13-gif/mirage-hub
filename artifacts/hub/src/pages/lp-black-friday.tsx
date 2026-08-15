import { useState } from 'react';
import { ArrowRight, CheckCircle, ChevronDown, ChevronUp, Menu, X } from 'lucide-react';
const mirageLogo = `${import.meta.env.BASE_URL}mirage_logo_dark_transparent.png`;
import { Link } from 'wouter';

const PLANOS = [
  {
    nome: 'Starter', preco: 147, precoCheio: 197,
    desc: 'Para confecções que estão começando',
    items: ['Kanban de Produção', 'Orçamento Mirage', 'Moda Conecta — acesso gratuito', 'Suporte por chat'],
  },
  {
    nome: 'Pro', preco: 297, precoCheio: 397,
    desc: 'Para confecções em crescimento', destaque: true,
    items: ['Tudo do Starter', 'CRM Mirage + Robô SDR', 'PLM — Fichas técnicas', 'Relatórios avançados', 'Suporte prioritário'],
  },
  {
    nome: 'Enterprise', preco: 597, precoCheio: 797,
    desc: 'Para grandes operações e redes',
    items: ['Tudo do Pro', 'ERP Integrado (VhSys)', 'Usuários ilimitados', 'API exclusiva', 'Gerente de conta dedicado'],
  },
];

const FRENTES = [
  {
    tag: 'MODA CONECTA',
    title: 'Acesse oportunidades exclusivas',
    color: '#10b981',
    items: ['Fornecedores verificados de tecido e aviamento', 'Vagas especializadas no setor têxtil', 'Anúncios B2B de maquinário e matéria-prima', 'Rede exclusiva de donos de confecção'],
  },
  {
    tag: 'SISTEMA MIRAGE',
    title: 'Fortaleça seu negócio com gestão',
    color: '#8b5cf6',
    items: ['Kanban de produção com 14 fases', 'CRM com Robô SDR no WhatsApp', 'PLM para fichas técnicas e BOM', 'Orçamento preciso por referência', 'Integração ERP para NF-e e estoque'],
  },
];

const MODULOS = [
  { n: '01', l: 'CRM e Captação', c: '#f97316' },
  { n: '02', l: 'Funil Comercial', c: '#10b981' },
  { n: '03', l: 'PLM e Prototipagem', c: '#8b5cf6' },
  { n: '04', l: 'Orçamento', c: '#3b82f6' },
  { n: '05', l: 'Aprovação e Criação do Pedido', c: '#ec4899' },
];

const DEPOIMENTOS = [
  { quote: '"O Mirage transformou completamente o controle da nossa produção. Antes vivia apagando incêndio."', autor: 'Ricardo M.', cargo: 'Confecção RM — São Paulo' },
  { quote: '"O Funil Kanban nos ajudou a enxergar quais clientes valiam mais a pena. Resultado: dobrei a margem."', autor: 'Patrícia S.', cargo: 'Moda Sul — RS' },
  { quote: '"Nunca mais vendi com prejuízo. O Orçamento Mirage me mostrou onde eu estava perdendo dinheiro."', autor: 'Carlos O.', cargo: 'CariocaWear — RJ' },
];

const FAQS = [
  { q: 'O que está incluído na condição de Black Friday?', r: 'A condição inclui desconto de 25% no plano escolhido por 12 meses, acesso à Moda Conecta gratuitamente e onboarding guiado pela equipe Mirage.' },
  { q: 'Por quanto tempo o desconto é válido?', r: 'O desconto é mantido durante 12 meses consecutivos a partir da data de ativação. Após esse período, o valor retorna ao preço regular.' },
  { q: 'O Mirage Virage realmente substitui planilha?', r: 'Sim. O Kanban de produção, Orçamento e PLM foram desenhados para substituir planilhas, e-mail e WhatsApp como ferramentas de gestão.' },
  { q: 'O Mirage Virage conecta com o meu ERP atual?', r: 'Sim. No plano Enterprise há integração nativa com o VhSys (ERP parceiro). Para outros ERPs, consulte nossa equipe.' },
];

export default function LpBlackFriday() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: '', empresa: '', whatsapp: '' });

  return (
    <div className="min-h-screen" style={{ background: '#080c18', color: '#ffffff', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10" style={{ background: 'rgba(8,12,24,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={mirageLogo} alt="Mirage" className="h-8 w-auto" />
          <div className="hidden md:flex items-center gap-6">
            {['HOME', 'A COMUNIDADE', 'O SISTEMA MIRAGE', 'PREÇOS'].map(l => (
              <a key={l} href="#" className="text-xs font-semibold text-white/50 hover:text-white transition-colors tracking-wide">{l}</a>
            ))}
          </div>
          <a href="#oferta" className="hidden md:inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm px-4 py-2 rounded-lg font-bold transition-colors">
            OFERTA DE BLACK FRIDAY
          </a>
          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-[#080c18] border-t border-white/10 px-4 py-4 space-y-3">
            {['HOME', 'A COMUNIDADE', 'O SISTEMA MIRAGE', 'PREÇOS'].map(l => (
              <a key={l} href="#" className="block text-sm text-white/60">{l}</a>
            ))}
            <a href="#oferta" className="block bg-red-600 text-white text-sm px-4 py-2 rounded-lg text-center font-bold">OFERTA DE BLACK FRIDAY</a>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block text-xs font-bold tracking-widest text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 rounded-full mb-6">
              BLACK FRIDAY MIRAGE
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Oportunidades na comunidade{' '}
              <span className="text-violet-400">+ Sistema Mirage</span>{' '}
              para o crescimento da sua confecção.
            </h1>
            <p className="text-white/60 text-lg mb-4">
              Organize sua operação, enxergue custos e prazos e ainda acesse uma rede estratégica de profissionais do setor.
            </p>
            <p className="text-white/40 text-sm mb-8">
              Condição especial disponível por tempo limitado — vagas com desconto se esgotam rápido.
            </p>
            <a href="#oferta" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors">
              QUERO RESERVAR MINHA CONDIÇÃO <ArrowRight className="w-5 h-5" />
            </a>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/5 blur-3xl rounded-full" />
            <img
              src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80"
              alt="Confecção"
              className="relative rounded-2xl w-full object-cover h-80 lg:h-96"
            />
          </div>
        </div>
      </section>

      {/* DUAS FRENTES */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Duas frentes para fortalecer sua operação</h2>
            <p className="text-white/50">O Mirage une sistema de gestão e comunidade B2B em uma única plataforma.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FRENTES.map((f, i) => (
              <div key={i} className="rounded-xl p-6 border" style={{ background: f.color + '08', borderColor: f.color + '30' }}>
                <span className="text-xs font-bold tracking-widest px-2 py-1 rounded-full mb-4 inline-block" style={{ color: f.color, background: f.color + '20' }}>{f.tag}</span>
                <h3 className="text-xl font-bold mb-4">{f.title}</h3>
                <ul className="space-y-2.5">
                  {f.items.map((item, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-white/70">
                      <CheckCircle className="w-4 h-4 shrink-0" style={{ color: f.color }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* O FLUXO */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <span className="inline-block text-xs font-bold tracking-widest text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-4">
              O SISTEMA MIRAGE
            </span>
            <h2 className="text-3xl font-bold mb-2">O fluxo correto para apresentar o Sistema Mirage</h2>
            <p className="text-white/50">Cada módulo conectado ao próximo — do lead ao pedido entregue.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {MODULOS.map((m, i) => (
              <div key={i} className="rounded-xl p-5 text-center border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-sm font-bold" style={{ background: m.c + '20', color: m.c, border: `1px solid ${m.c}40` }}>{m.n}</div>
                <p className="text-xs font-semibold text-white/80 leading-tight">{m.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* OFERTA */}
      <section className="py-20 px-4 border-t border-white/5" id="oferta">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <span className="inline-block text-xs font-bold tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full mb-6">
              CONDIÇÃO ESPECIAL DE BLACK FRIDAY
            </span>
            <h2 className="text-3xl font-bold mb-4">Condição especial de Black Friday</h2>
            <ul className="space-y-3 mb-8">
              {['Acesse a comunidade Moda CONECTA gratuitamente', '25% de desconto no Sistema Mirage por 12 meses', 'Onboarding guiado pela equipe'].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-white/70">
                  <CheckCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-3 gap-3">
              {PLANOS.map((p, i) => (
                <div key={i} className={`rounded-xl p-4 border text-center ${p.destaque ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-white/5'}`}>
                  <p className="text-xs font-bold text-white/50 mb-2">{p.nome}</p>
                  <p className="text-white/30 text-xs line-through mb-0.5">R${p.precoCheio}/mês</p>
                  <p className="text-xl font-bold" style={{ color: p.destaque ? '#8b5cf6' : '#ffffff' }}>R${p.preco}</p>
                  <p className="text-white/30 text-[10px]">/mês</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-6">Reserve sua vaga e o desconto</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/50 mb-1.5">Nome completo</label>
                <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" placeholder="Seu nome" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">Nome da confecção</label>
                <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" placeholder="Nome da sua empresa" value={form.empresa} onChange={e => setForm({...form, empresa: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-1.5">WhatsApp</label>
                <input className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500" placeholder="(11) 99999-9999" value={form.whatsapp} onChange={e => setForm({...form, whatsapp: e.target.value})} />
              </div>
              <a href={`/moda-conecta/fundadores?nome=${encodeURIComponent(form.nome)}&empresa=${encodeURIComponent(form.empresa)}&wa=${encodeURIComponent(form.whatsapp)}&utm_source=lp-black-friday`}
                className="block w-full bg-red-600 hover:bg-red-500 text-white py-3.5 rounded-lg font-bold text-center transition-colors">
                QUERO RESERVAR MINHA CONDIÇÃO
              </a>
              <p className="text-white/30 text-xs text-center">Sem compromisso. Você é contatado pela equipe Mirage.</p>
            </div>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Quem vive a confecção precisa de controle e oportunidade</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {DEPOIMENTOS.map((d, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <p className="text-white/70 text-sm italic mb-4">{d.quote}</p>
                <p className="text-white font-semibold text-sm">{d.autor}</p>
                <p className="text-white/40 text-xs">{d.cargo}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-10">Perguntas frequentes</h2>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-4 text-left" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span className="font-medium text-sm">{faq.q}</span>
                  {faqOpen === i ? <ChevronUp className="w-4 h-4 shrink-0 text-white/40" /> : <ChevronDown className="w-4 h-4 shrink-0 text-white/40" />}
                </button>
                {faqOpen === i && (
                  <div className="px-5 pb-4 text-sm text-white/50 border-t border-white/10 pt-3">{faq.r}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 px-4 border-t border-white/5 text-center">
        <h2 className="text-3xl font-bold mb-4">Não perca a condição de Black Friday.</h2>
        <p className="text-white/50 mb-6">Vagas com desconto são limitadas. Reserve a sua agora.</p>
        <a href="#oferta" className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-lg font-bold text-lg transition-colors">
          QUERO RESERVAR MINHA CONDIÇÃO <ArrowRight className="w-5 h-5" />
        </a>
      </section>

      <footer className="border-t border-white/5 py-8 px-4 text-center">
        <p className="text-white/20 text-sm">© 2025 Mirage Hub. Gestão & Tecnologia para Confecção.</p>
      </footer>
    </div>
  );
}
