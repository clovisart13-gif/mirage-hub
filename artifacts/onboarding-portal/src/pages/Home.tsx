import { useLocation } from "wouter";

const base = import.meta.env.BASE_URL;

const MODULES = [
  {
    id: "geral",
    route: "/geral",
    tag: "ONBOARDING GERAL",
    title: "Hub Mirage",
    subtitle: "Visão completa do ecossistema",
    description: "Apresentação de até 30 minutos cobrindo todos os apps Mirage de forma resumida. Ideal para o primeiro contato de novos clientes e vendedores.",
    duration: "~30 min",
    slides: 15,
    gradient: "from-[#1e1b4b] to-[#4338ca]",
    badge: "bg-indigo-100 text-indigo-700",
    cta: "Iniciar apresentação",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect width="48" height="48" rx="12" fill="white" fillOpacity=".15" />
        <path d="M14 24L22 32L34 16" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    available: true,
  },
  {
    id: "erp",
    route: "/erp",
    tag: "ERP",
    title: "ERP Mirage",
    subtitle: "Onboarding avançado · VhSys",
    description: "Guia completo de implantação do ERP: configuração, produtos, pedidos, financeiro e integração com o Kanban de produção.",
    duration: "~45 min",
    slides: 8,
    gradient: "from-[#0a2e1a] to-[#16a34a]",
    badge: "bg-green-100 text-green-700",
    cta: "Iniciar apresentação",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect width="48" height="48" rx="12" fill="white" fillOpacity=".15" />
        <rect x="10" y="14" width="28" height="20" rx="3" stroke="white" strokeWidth="2.5"/>
        <path d="M18 22h12M18 27h8" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    available: true,
  },
  {
    id: "helena",
    route: "/helena",
    tag: "CRM",
    title: "CRM Mirage",
    subtitle: "Onboarding avançado · Helena",
    description: "Da precificação à execução: modelos de preço, cronograma de 30 dias, playbook de onboarding e checklists prontos para vendedores.",
    duration: "~30 min",
    slides: 8,
    gradient: "from-[#0c1445] to-[#1d4ed8]",
    badge: "bg-blue-100 text-blue-700",
    cta: "Iniciar apresentação",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect width="48" height="48" rx="12" fill="white" fillOpacity=".15" />
        <circle cx="24" cy="20" r="7" stroke="white" strokeWidth="2.5"/>
        <path d="M12 36c0-6.627 5.373-12 12-12s12 5.373 12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
    available: true,
  },
];

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0f0f1a] via-[#1e1b4b] to-[#1a0d2e] pt-16 pb-20">
        {/* Decorative blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Voltar ao Hub */}
        <div className="absolute top-4 left-4 z-10">
          <a
            href="/hub"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/60 hover:text-white/90 text-xs font-semibold transition-all"
          >
            ← Voltar ao Hub
          </a>
        </div>

        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <img
            src={`${base}logo.png`}
            alt="Mirage Hub"
            className="h-10 w-auto mx-auto mb-8 opacity-90"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/70 text-xs font-semibold uppercase tracking-widest mb-6">
            Portal de Onboarding
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mb-4" style={{ textWrap: "balance" } as React.CSSProperties}>
            Tudo que você precisa<br />para crescer com a Mirage
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto leading-relaxed">
            Materiais de onboarding para vendedores e assinantes — visão geral do ecossistema e guias avançados por aplicativo.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="max-w-5xl mx-auto px-6 -mt-12 pb-20">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((mod) => (
            <div
              key={mod.id}
              onClick={() => mod.available && navigate(mod.route)}
              className={`group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-200 ${
                mod.available
                  ? "cursor-pointer hover:border-white/25 hover:bg-white/8 hover:shadow-2xl hover:-translate-y-0.5"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
              {/* Card gradient header */}
              <div className={`bg-gradient-to-br ${mod.gradient} p-6 flex items-start justify-between`}>
                {mod.icon}
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 bg-white/15 px-2 py-1 rounded-full">
                  {mod.tag}
                </span>
              </div>

              {/* Card body */}
              <div className="p-5">
                <h2 className="text-white font-bold text-lg leading-tight mb-1">{mod.title}</h2>
                <p className="text-white/50 text-xs font-semibold uppercase tracking-wide mb-3">{mod.subtitle}</p>
                <p className="text-white/60 text-sm leading-relaxed mb-5">{mod.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${mod.badge}`}>
                      {mod.duration}
                    </span>
                    {mod.slides && (
                      <span className="text-[11px] text-white/40">{mod.slides} slides</span>
                    )}
                  </div>
                  {mod.available && (
                    <span className="text-white/40 group-hover:text-white/80 transition-colors text-sm">
                      →
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-12 text-center">
          <p className="text-white/30 text-xs">
            Mirage Hub · Gestão & Tecnologia para Confecção · {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
