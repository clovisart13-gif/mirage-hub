import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  Factory, Star, CheckCircle2, ArrowRight, Users, MapPin,
  Zap, Shield, Sparkles, ChevronRight, Award, Globe,
  LayoutDashboard, DollarSign, ShoppingCart, Truck, BarChart3, MessageCircle,
  ChevronDown, HelpCircle, BookOpen,
} from 'lucide-react';

const STATS = [
  { value: '500+', label: 'Confeccionistas buscando fornecedores' },
  { value: '100%', label: 'Gratuito para cadastrar' },
  { value: '2 dias', label: 'Tempo médio de aprovação' },
  { value: '0%', label: 'Comissão sobre pedidos' },
];

const TIPOS = [
  { emoji: '✂️', nome: 'Costura & Facção' },
  { emoji: '🖨️', nome: 'Estamparia' },
  { emoji: '🧵', nome: 'Bordado' },
  { emoji: '🌊', nome: 'Lavanderia' },
  { emoji: '📐', nome: 'Modelagem & Risco' },
  { emoji: '📦', nome: 'Acabamento' },
  { emoji: '🧶', nome: 'Malharia & Tecelagem' },
  { emoji: '🎨', nome: 'Tinturaria' },
  { emoji: '🔩', nome: 'Aviamentos' },
  { emoji: '🪡', nome: 'Fios & Fibras' },
];

const STEPS = [
  { n: '01', title: 'Preencha seu perfil', desc: 'Informe seus tipos de serviço, maquinário, capacidade de produção e portfólio. Quanto mais completo, mais visibilidade.' },
  { n: '02', title: 'Análise em até 2 dias', desc: 'Nossa equipe valida seu cadastro e aprova seu perfil. Você recebe um convite por e-mail assim que aprovado.' },
  { n: '03', title: 'Apareça para confeccionistas', desc: 'Seu perfil fica visível no diretório filtrado por segmento, localidade e capacidade. Clientes encontram você.' },
];

const DIFERENCIAIS = [
  { icon: Users, title: 'Diretório especializado', desc: 'Focado 100% no setor de confecção brasileiro. Nada de plataformas genéricas.' },
  { icon: MapPin, title: 'Filtro por localidade', desc: 'Confeccionistas buscam por cidade, estado e distância. Você aparece para quem está perto.' },
  { icon: Zap, title: 'Busca por especialidade', desc: 'Filtros por tipo de serviço, maquinário, técnica e capacidade mínima de produção.' },
  { icon: Shield, title: 'Perfil verificado', desc: 'Fornecedores aprovados recebem selo de verificação, aumentando a confiança dos compradores.' },
  { icon: Globe, title: 'Visibilidade orgânica', desc: 'Seu perfil é indexado e aparece nas buscas da plataforma sem precisar de anúncios.' },
  { icon: Award, title: 'Sem comissão', desc: 'A conexão é direta entre você e o comprador. Não cobramos comissão sobre pedidos.' },
];

const HUB_FEATURES = [
  { icon: LayoutDashboard, title: 'Painel de controle', desc: 'Visão completa do seu negócio em um único dashboard — pedidos, finanças e clientes.' },
  { icon: ShoppingCart, title: 'Gestão de pedidos', desc: 'Kanban visual de produção: do orçamento à entrega, tudo organizado e rastreável.' },
  { icon: DollarSign, title: 'Financeiro', desc: 'Controle de contas a pagar e receber, fluxo de caixa e DRE simplificado para a confecção.' },
  { icon: Users, title: 'Clientes & CRM', desc: 'Cadastro completo de clientes, histórico de compras e gestão do relacionamento.' },
  { icon: Truck, title: 'Fornecedores', desc: 'Gerencie seus próprios fornecedores de insumos e matéria-prima dentro da mesma plataforma.' },
  { icon: BarChart3, title: 'Relatórios', desc: 'Relatórios de desempenho, curva ABC de clientes e análise de rentabilidade por coleção.' },
];

const MC_FAQ = [
  { q: 'O cadastro é realmente gratuito?', a: 'Sim. 100% gratuito para fornecedores. Sem taxa de cadastro, mensalidade obrigatória nem comissão sobre pedidos. Você só paga se decidir assinar o Hub Mirage após os 30 dias de teste.' },
  { q: 'Quanto tempo leva para ser aprovado?', a: 'Nossa equipe analisa o cadastro em até 2 dias úteis. Você recebe um e-mail com o link de acesso assim que aprovado.' },
  { q: 'Quem pode se cadastrar?', a: 'Qualquer fornecedor do setor têxtil brasileiro: facções, estamparias, bordados, lavanderias, modelagem, malharia, aviamentos, tinturaria e mais. Se você presta serviço para o setor de confecção, tem lugar aqui.' },
  { q: 'Como os confeccionistas encontram meu perfil?', a: 'Seu perfil aparece no diretório filtrado por tipo de serviço, cidade, estado e especialidade. Quanto mais completo o cadastro, maior a visibilidade. Perfis verificados recebem um selo de confiança.' },
  { q: 'O que inclui o período de 30 dias do Hub Mirage?', a: 'Acesso completo à plataforma de gestão: Kanban de produção, PLM, custos e orçamentos, CRM de clientes, relatórios financeiros e ERP. Sem limitações de funcionalidade e sem precisar cadastrar cartão.' },
];

function FaqRapido() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="bg-white py-20">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">Dúvidas frequentes</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-4 mb-3">Perguntas comuns</h2>
          <p className="text-muted-foreground">Respostas rápidas sobre o Moda Conecta e o Hub Mirage.</p>
        </div>
        <div className="space-y-2">
          {MC_FAQ.map((item, i) => (
            <div key={i} className={`rounded-xl border bg-white transition-all ${openIdx === i ? 'border-violet-200 shadow-sm' : 'border-gray-100 hover:border-gray-200'}`}>
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="w-full text-left px-5 py-4 flex items-start justify-between gap-3">
                <span className="text-sm font-semibold text-gray-800 leading-snug">{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 mt-0.5 transition-transform ${openIdx === i ? 'rotate-180' : ''}`} />
              </button>
              {openIdx === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/ajuda">
            <span className="inline-flex items-center gap-2 text-sm text-violet-600 font-semibold hover:text-violet-800 transition-colors cursor-pointer">
              <BookOpen className="w-4 h-4" /> Ver Central de Ajuda completa <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ComunidadeLanding() {
  return (
    <div className="min-h-screen bg-white text-foreground">

      {/* ─── HEADER ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/mirage-logo.png" alt="Mirage" className="h-8 object-contain" />
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">Moda Conecta</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#hub-mirage" className="text-sm font-medium text-muted-foreground hover:text-violet-600 transition-colors hidden sm:block">
              O que é o Hub Mirage?
            </a>
            <Link href="/hub/comunidade/cadastro-fornecedor">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                Cadastrar meu fornecimento <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ─── HERO ─── */}
      <section className="relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Badge oferta */}
        <div className="relative max-w-6xl mx-auto px-6 pt-8">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 rounded-full px-4 py-2 text-sm font-black">
            🎁 OFERTA DE LANÇAMENTO — 30 dias do Hub Mirage GRÁTIS para os 500 primeiros fornecedores
          </div>
        </div>

        <div className="relative max-w-6xl mx-auto px-6 py-16 lg:py-24 text-white">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <Sparkles className="w-3.5 h-3.5" /> Diretório exclusivo para o setor de confecção
              </div>
              <h1 className="text-4xl lg:text-6xl font-black leading-tight mb-6">
                Seus clientes<br />
                <span className="text-yellow-300">já estão</span><br />
                te buscando.
              </h1>
              <p className="text-violet-100 text-lg leading-relaxed mb-4 max-w-xl mx-auto lg:mx-0">
                A Moda Conecta conecta fornecedores do setor têxtil com confeccionistas que precisam exatamente do que você oferece. Cadastro gratuito, aprovação em 2 dias.
              </p>
              <p className="text-yellow-300 font-bold text-base mb-8 max-w-xl mx-auto lg:mx-0">
                + Ganhe 30 dias completos do Hub Mirage — a plataforma de gestão para confecções — sem pagar nada e sem cadastrar cartão.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/hub/comunidade/cadastro-fornecedor">
                  <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-2xl px-8 h-14 text-base w-full sm:w-auto">
                    Cadastrar gratuitamente <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <a href="#hub-mirage">
                  <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 rounded-2xl px-8 h-14 text-base w-full sm:w-auto">
                    Conhecer o Hub Mirage
                  </Button>
                </a>
              </div>
              <p className="text-xs text-violet-300 mt-4">🔒 Sem cartão de crédito · Você decide se assina só depois dos 30 dias</p>
            </div>

            {/* Card visual */}
            <div className="shrink-0 w-full max-w-xs lg:max-w-sm">
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-white/20">
                  <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center">
                    <Factory className="w-6 h-6 text-gray-900" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Estamparia Completa</p>
                    <p className="text-xs text-violet-200">São Paulo, SP · Verificado ✓</p>
                  </div>
                </div>
                {['Silk Screen', 'Sublimação', 'DTF', 'Transfer'].map(t => (
                  <div key={t} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-yellow-300 shrink-0" /> {t}
                  </div>
                ))}
                <div className="bg-white/10 rounded-xl p-3 text-xs text-center text-violet-100">
                  ⭐ 4.8 · 12 avaliações · Capacidade grande
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative h-16 bg-white">
          <svg className="absolute -top-1 w-full" viewBox="0 0 1440 65" fill="none" preserveAspectRatio="none">
            <path d="M0 65L1440 65L1440 0C1200 50 800 65 720 65C640 65 240 50 0 0L0 65Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-violet-50 border border-violet-100">
              <p className="text-3xl font-black text-violet-700 mb-1">{s.value}</p>
              <p className="text-sm text-muted-foreground leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HUB MIRAGE ─── */}
      <section id="hub-mirage" className="relative overflow-hidden bg-gray-950 py-24">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />

        <div className="relative max-w-6xl mx-auto px-6">
          {/* Badge oferta */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 rounded-full px-5 py-2.5 text-sm font-black">
              🎁 Você ganha tudo isso GRÁTIS por 30 dias ao se cadastrar no diretório
            </div>
          </div>

          <div className="text-center mb-4">
            <h2 className="text-3xl lg:text-5xl font-black text-white leading-tight">
              Conheça o <span className="text-violet-400">Hub Mirage</span>
            </h2>
            <p className="text-gray-400 text-lg mt-4 max-w-2xl mx-auto">
              A plataforma completa de gestão para confecções brasileiras. Tudo que você precisa para organizar, crescer e vender mais — em um único lugar.
            </p>
          </div>

          {/* Mockup visual de tela */}
          <div className="my-12 relative">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl shadow-violet-900/30">
              {/* Barra de título do browser */}
              <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex-1 bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400 text-center max-w-xs mx-auto">
                  mirage.app/hub
                </div>
              </div>

              {/* Conteúdo fake da tela — dashboard */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Sidebar */}
                <div className="hidden sm:block bg-gray-800/60 rounded-xl p-4 space-y-2">
                  <div className="h-6 bg-violet-600/40 rounded-lg w-3/4 mb-4" />
                  {['Painel', 'Pedidos', 'Financeiro', 'Clientes', 'Fornecedores', 'Relatórios'].map(m => (
                    <div key={m} className={`h-8 rounded-lg flex items-center px-3 text-xs font-medium ${m === 'Pedidos' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}>
                      {m === 'Pedidos' ? <span className="flex items-center gap-2"><ShoppingCart className="w-3 h-3" />{m}</span> : m}
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="sm:col-span-2 space-y-4">
                  {/* Stats strip */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Pedidos ativos', val: '12', color: 'text-violet-400' },
                      { label: 'Faturamento mês', val: 'R$ 18.400', color: 'text-emerald-400' },
                      { label: 'Clientes ativos', val: '34', color: 'text-amber-400' },
                    ].map(s => (
                      <div key={s.label} className="bg-gray-800/60 rounded-xl p-3">
                        <div className={`text-lg font-black ${s.color}`}>{s.val}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Kanban mini */}
                  <div className="bg-gray-800/60 rounded-xl p-4">
                    <div className="text-xs text-gray-400 font-semibold mb-3 uppercase tracking-wider">Kanban de Produção</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { col: 'Orçamento', cards: ['Coleção Verão', 'Blusa Básica'], color: 'border-gray-600' },
                        { col: 'Produção', cards: ['Vestido Floral', 'Calça Jeans'], color: 'border-blue-500/50' },
                        { col: 'Revisão', cards: ['Shorts Cargo'], color: 'border-yellow-500/50' },
                        { col: 'Entregue', cards: ['Coleção Inverno'], color: 'border-green-500/50' },
                      ].map(col => (
                        <div key={col.col} className={`border ${col.color} rounded-lg p-2 space-y-1.5`}>
                          <div className="text-xs text-gray-500 font-medium mb-2">{col.col}</div>
                          {col.cards.map(c => (
                            <div key={c} className="bg-gray-700/80 rounded p-1.5 text-xs text-gray-300">{c}</div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Glow embaixo */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-violet-600/20 blur-2xl rounded-full" />
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {HUB_FEATURES.map((f) => (
              <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-violet-600/50 hover:bg-gray-800/60 transition-all group">
                <div className="w-10 h-10 bg-violet-600/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-600/30 transition-colors">
                  <f.icon className="w-5 h-5 text-violet-400" />
                </div>
                <h3 className="font-bold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA dentro da seção */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-gray-900 border border-gray-700 rounded-2xl px-8 py-6">
              <p className="text-white font-bold text-lg mb-2">Quer testar antes de decidir?</p>
              <p className="text-gray-400 text-sm mb-5">Cadastre seu fornecimento no diretório — é gratuito — e ganhe 30 dias completos do Hub. <strong className="text-white">Sem cartão, sem cobrança surpresa.</strong></p>
              <Link href="/hub/comunidade/cadastro-fornecedor">
                <Button size="lg" className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl px-8 h-12">
                  Quero meu acesso grátis <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <p className="text-xs text-gray-600 mt-3">Você decide se assina só depois dos 30 dias · Vagas limitadas para 500 fornecedores</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TIPOS DE FORNECEDOR ─── */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">Quem pode se cadastrar</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-4 mb-3">Todos os elos da cadeia têxtil</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Se você presta algum serviço para o setor de confecção, tem lugar no nosso diretório.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {TIPOS.map((t) => (
              <div key={t.nome} className="bg-white border rounded-2xl p-4 text-center hover:border-violet-300 hover:shadow-md transition-all cursor-default">
                <div className="text-2xl mb-2">{t.emoji}</div>
                <p className="text-xs font-semibold text-foreground">{t.nome}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">Como funciona</span>
          <h2 className="text-3xl lg:text-4xl font-black mt-4">3 passos para aparecer</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n} className="relative">
              <div className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center font-black text-xl mb-5">{s.n}</div>
              <h3 className="text-lg font-bold mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DIFERENCIAIS ─── */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-3 py-1 rounded-full">Por que a Moda Conecta?</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-4">Feito para quem está na produção</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {DIFERENCIAIS.map((d) => (
              <div key={d.title} className="bg-white border rounded-2xl p-6 hover:border-violet-300 hover:shadow-md transition-all">
                <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center mb-4">
                  <d.icon className="w-5 h-5 text-violet-600" />
                </div>
                <h3 className="font-bold mb-2">{d.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-violet-700 to-indigo-700 text-white py-24">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-yellow-400 text-gray-900 rounded-full px-5 py-2 text-sm font-black mb-8">
            🎁 Oferta de lançamento · 500 vagas · Acaba logo
          </div>
          <h2 className="text-4xl lg:text-5xl font-black mb-4 leading-tight">
            Cadastre grátis.<br />
            Ganhe <span className="text-yellow-300">30 dias do Hub.</span><br />
            Decida depois.
          </h2>
          <p className="text-violet-200 text-lg mb-3 max-w-lg mx-auto">
            Preencha o formulário, apareça para 500+ confecções e acesse a plataforma completa de gestão — tudo sem colocar cartão.
          </p>
          <p className="text-violet-300 text-sm mb-8">
            Após os 30 dias, você decide com calma se assina ou não. Zero pressão.
          </p>
          <Link href="/hub/comunidade/cadastro-fornecedor">
            <Button size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-2xl px-10 h-14 text-base">
              Quero meu acesso grátis <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </Link>
          <p className="text-xs text-violet-300 mt-4">🔒 Sem cartão de crédito · Aprovação em até 2 dias úteis · Vagas limitadas</p>
        </div>
      </section>

      {/* ─── FAQ RÁPIDO ─── */}
      <FaqRapido />

      {/* ─── FOOTER ─── */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <img src="/mirage-logo.png" alt="Mirage" className="h-6 object-contain opacity-60" />
            <span>© 2026 Mirage Hub · Moda Conecta</span>
          </div>
          <div className="flex gap-6">
            <a href="/hub" className="hover:text-white transition-colors">Entrar na plataforma</a>
            <Link href="/hub/comunidade/fornecedores"><span className="hover:text-white transition-colors cursor-pointer">Ver diretório</span></Link>
            <Link href="/ajuda"><span className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"><HelpCircle className="w-3 h-3" />Central de Ajuda</span></Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
