import React from "react";
import {
  LayoutDashboard, Calculator, Users, MessageCircle, Database,
  Layers, Handshake, BarChart3, ArrowRight, Package,
  FlaskConical, CheckSquare, FileText, Scissors, ShoppingBag,
  Clock, Activity, Plus, TrendingUp, ChevronLeft, ArrowLeft,
  Star, Shield, Zap, Briefcase, Receipt, ExternalLink,
  CheckCircle2, Copy,
} from "lucide-react";

/* ─── PLM Dashboard ─────────────────────────────────────────── */
function PLMView() {
  const kpis = [
    { label: "Produtos", value: 12, icon: Package, href: "#" },
    { label: "Fichas Técnicas", value: 8, icon: TrendingUp, href: "#" },
    { label: "Pilotos Ativos", value: 3, icon: FlaskConical, href: "#" },
    { label: "Aprovações Pendentes", value: 2, icon: CheckSquare, href: "#" },
  ];

  const quickLinks = [
    { label: "Produtos",     icon: Package,     color: "text-indigo-600 bg-indigo-50" },
    { label: "Fichas",       icon: FileText,    color: "text-blue-600 bg-blue-50" },
    { label: "Modelagem",    icon: Scissors,    color: "text-violet-600 bg-violet-50" },
    { label: "Materiais",    icon: ShoppingBag, color: "text-orange-600 bg-orange-50" },
    { label: "BOM / Custos", icon: Calculator,  color: "text-emerald-600 bg-emerald-50" },
    { label: "Pilotagem",    icon: FlaskConical,color: "text-amber-600 bg-amber-50" },
    { label: "Aprovações",   icon: CheckSquare, color: "text-green-600 bg-green-50" },
    { label: "Clientes PLM", icon: Users,       color: "text-pink-600 bg-pink-50" },
  ];

  const statusCols = [
    { label: "Rascunho", color: "bg-gray-500", count: 4, items: ["Blusa Linho Verão", "Calça Slim Fit"] },
    { label: "Desenvolvimento", color: "bg-blue-500", count: 3, items: ["Vestido Floral", "Jaqueta Jeans"] },
    { label: "Pilotagem", color: "bg-amber-500", count: 3, items: ["Camisa Oxford", "Moletom Unissex"] },
    { label: "Aprovado", color: "bg-green-500", count: 2, items: ["Short Cargo", "Saia Midi"] },
  ];

  const atividades = [
    { acao: "criacao", desc: "Produto 'Blusa Linho' criado", mod: "Produto", color: "bg-blue-100 text-blue-700" },
    { acao: "atualizacao", desc: "Ficha Técnica atualizada", mod: "Ficha Técnica", color: "bg-amber-100 text-amber-700" },
    { acao: "aprovacao", desc: "Piloto aprovado — Short Cargo", mod: "Pilotagem", color: "bg-green-100 text-green-700" },
    { acao: "upload", desc: "Molde v2 enviado para validação", mod: "Modelagem", color: "bg-purple-100 text-purple-700" },
    { acao: "criacao", desc: "BOM gerado com 8 materiais", mod: "BOM", color: "bg-blue-100 text-blue-700" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* PLM Sidebar */}
      <aside className="w-56 bg-slate-800 flex flex-col shrink-0">
        <div className="px-3 py-4 border-b border-slate-700">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-3">
            <ArrowLeft className="w-3 h-3" /> Voltar ao Hub
          </div>
          <div className="text-white font-bold text-sm">PLM Mirage</div>
          <div className="text-slate-400 text-xs">Gestão de Produtos</div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Módulos</p>
          {[
            { label: "Dashboard", icon: LayoutDashboard, active: true },
            { label: "Produtos", icon: Package },
            { label: "Fichas Técnicas", icon: FileText },
            { label: "Modelagem", icon: Scissors },
            { label: "Materiais", icon: ShoppingBag },
            { label: "BOM / Custos", icon: Calculator },
            { label: "Pilotagem", icon: FlaskConical },
            { label: "Aprovações", icon: CheckSquare },
            { label: "Histórico", icon: Activity },
            { label: "Clientes", icon: Users },
          ].map(({ label, icon: Icon, active }) => (
            <div key={label} className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium ${active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"}`}>
              <Icon className="w-4 h-4 shrink-0" /> {label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {/* Gradient header */}
        <div className="bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 px-6 py-8 text-white">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">PLM Mirage</h1>
                <p className="text-indigo-200 text-sm">Gestão do ciclo de vida de produtos</p>
              </div>
            </div>
            <button className="flex items-center gap-2 bg-white text-indigo-700 text-sm font-semibold px-4 py-2 rounded-lg shadow-sm">
              <Plus className="w-4 h-4" /> Novo Produto
            </button>
          </div>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {kpis.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/15 backdrop-blur rounded-xl px-4 py-3 group">
                <div className="flex items-center justify-between mb-1">
                  <Icon className="w-4 h-4 text-white/70" />
                  <ArrowRight className="w-3 h-3 text-white/40" />
                </div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-indigo-200">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Acesso rápido */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Acesso Rápido</h2>
            <div className="grid grid-cols-8 gap-2">
              {quickLinks.map(({ label, icon: Icon, color }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-white hover:shadow-md transition-all">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-medium text-center text-gray-500 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status + Atividades */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status dos Produtos</h2>
                <span className="text-xs text-indigo-600">Ver todos →</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {statusCols.map(({ label, color, count, items }) => (
                  <div key={label} className="bg-white rounded-xl border overflow-hidden">
                    <div className={`h-1 ${color}`} />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold">{label}</span>
                        <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{count}</span>
                      </div>
                      {items.map(item => (
                        <div key={item} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer group mb-1.5">
                          <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center">
                            <Package className="w-3 h-3 text-indigo-600" />
                          </div>
                          <p className="text-xs font-medium text-gray-800 flex-1 truncate">{item}</p>
                          <ArrowRight className="w-3 h-3 text-gray-300" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Atividades</h2>
                <span className="text-xs text-indigo-600">Histórico →</span>
              </div>
              <div className="bg-white rounded-xl border divide-y">
                {atividades.map((a, i) => (
                  <div key={i} className="px-4 py-3 flex gap-3 items-start">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 mt-0.5 ${a.color}`}>{a.acao}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700">{a.desc}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {a.mod} · hoje
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Partners Page ─────────────────────────────────────────── */
function PartnersView() {
  const diferenciais = [
    { icon: Shield, title: "Certificados Mirage", desc: "Selecionados pela equipe Mirage." },
    { icon: Star, title: "NPS 9+ garantido", desc: "Satisfação dos clientes validada." },
    { icon: Zap, title: "Integração nativa", desc: "Trabalham com o ecossistema Mirage." },
    { icon: Users, title: "30+ parceiros", desc: "Rede em crescimento no Brasil." },
  ];

  const partners = [
    {
      icon: Receipt, gradient: "from-blue-600 to-cyan-600", border: "border-blue-200",
      bgLight: "bg-blue-50", badge: "bg-blue-100 text-blue-700", iconBg: "bg-blue-100 text-blue-600",
      tag: "Financeiro & Fiscal", title: "Contador / BPO Fiscal",
      desc: "Escritórios contábeis com experiência comprovada no setor têxtil.",
      items: ["Emissão de NF-e integrada ao ERP", "SPED Fiscal e Contribuições", "Folha de pagamento", "Relatórios mensais"],
      stat: "40+", statLabel: "confecções atendidas",
    },
    {
      icon: TrendingUp, gradient: "from-orange-500 to-rose-500", border: "border-orange-200",
      bgLight: "bg-orange-50", badge: "bg-orange-100 text-orange-700", iconBg: "bg-orange-100 text-orange-600",
      tag: "Marketing & Vendas", title: "Marketing & Performance",
      desc: "Agências especializadas em moda e confecção.",
      items: ["Tráfego pago (Meta, Google)", "Branding para confecção", "Social media B2B", "Estratégia digital"],
      stat: "3x", statLabel: "mais leads qualificados",
    },
    {
      icon: Briefcase, gradient: "from-violet-600 to-purple-700", border: "border-violet-200",
      bgLight: "bg-violet-50", badge: "bg-violet-100 text-violet-700", iconBg: "bg-violet-100 text-violet-600",
      tag: "Gestão & Processos", title: "Consultoria de Gestão",
      desc: "Consultores que já estruturaram dezenas de confecções.",
      items: ["Mapeamento de processos", "Custo de produção", "Implantação Mirage", "Mentoria para gestores"],
      stat: "60d", statLabel: "para ver resultados",
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar igual KanbanLayout */}
      <aside className="w-56 border-r bg-white flex flex-col shrink-0">
        <div className="flex items-center justify-between p-3 border-b min-h-[56px]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-violet-600 flex items-center justify-center text-white font-bold text-xs">M</div>
            <span className="font-semibold text-sm">Mirage</span>
          </div>
          <ChevronLeft className="w-4 h-4 text-gray-400" />
        </div>
        <div className="px-2 py-1 border-b border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-400 py-1 px-1">
            <ArrowLeft className="w-3 h-3" /> Voltar ao Hub
          </div>
        </div>
        <nav className="flex-1 py-2 px-1.5 space-y-0.5 text-sm text-gray-500">
          {["CRM", "Orçamento", "Kanban", "ERP Mirage", "Comunidade", "Relatórios"].map(l => (
            <div key={l} className="px-2 py-2 rounded-lg hover:bg-gray-100 cursor-pointer">{l}</div>
          ))}
          <div className="px-2 py-2 rounded-lg bg-violet-50 text-violet-700 font-semibold">Partners Mirage</div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-violet-700 via-purple-700 to-indigo-700 overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-white/30" />
            <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-white/20" />
          </div>
          <div className="relative px-8 py-8 text-white">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/20 flex items-center justify-center shrink-0">
                <Handshake size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold">Partners Mirage</h1>
                  <span className="text-[10px] font-bold bg-white/20 border border-white/30 px-2 py-0.5 rounded-full">CERTIFICADOS</span>
                </div>
                <p className="text-violet-200 text-sm max-w-lg">Contadores, agências e consultores especializados no setor têxtil.</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {diferenciais.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/15">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} className="text-violet-200" />
                    <span className="text-xs font-semibold">{title}</span>
                  </div>
                  <p className="text-[10px] text-violet-300 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Aviso cupom */}
        <div className="mx-6 mt-5">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Copy size={13} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">
              <strong>Cupom Mirage:</strong> ao clicar em "Visitar Parceiro" você recebe um cupom exclusivo — ex: <strong>MIRAGE-SUA-EMPRESA</strong>.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="px-6 py-4 space-y-4">
          {partners.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.title} className={`rounded-2xl border-2 bg-white overflow-hidden shadow-sm ${p.border}`}>
                <div className={`h-1.5 bg-gradient-to-r ${p.gradient}`} />
                <div className="p-5 flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${p.iconBg}`}>
                    <Icon size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${p.badge}`}>{p.tag}</span>
                    </div>
                    <h3 className="text-base font-bold mb-1">{p.title}</h3>
                    <p className="text-xs text-gray-500 mb-3">{p.desc}</p>
                    <div className="flex gap-4">
                      <ul className="flex-1 space-y-1.5">
                        {p.items.map(item => (
                          <li key={item} className="flex items-center gap-2 text-xs text-gray-500">
                            <CheckCircle2 size={11} className="text-green-500 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                      <div className={`rounded-xl px-4 py-3 text-center shrink-0 ${p.bgLight}`}>
                        <p className={`text-2xl font-black bg-gradient-to-br ${p.gradient} bg-clip-text text-transparent`}>{p.stat}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 max-w-[80px] leading-tight">{p.statLabel}</p>
                      </div>
                    </div>
                    <button className={`mt-3 flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-gradient-to-r ${p.gradient}`}>
                      <ExternalLink size={12} /> Visitar Parceiro
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Main export com tabs ──────────────────────────────────── */
export function HubLight() {
  const [view, setView] = React.useState<"plm" | "partners">("plm");

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 bg-white border-b shadow-sm">
        <span className="text-xs font-bold text-slate-400 mr-3">Preview:</span>
        <button
          onClick={() => setView("plm")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${view === "plm" ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          PLM Dashboard
        </button>
        <button
          onClick={() => setView("partners")}
          className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${view === "partners" ? "bg-violet-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
        >
          Partners Mirage
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === "plm" ? <PLMView /> : <PartnersView />}
      </div>
    </div>
  );
}
