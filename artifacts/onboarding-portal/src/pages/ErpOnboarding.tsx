import { useLocation } from "wouter";

// Slides ERP nativos — hospedados no artifacts/onboarding a partir da posição 20
const SLIDES_URL = `${import.meta.env.BASE_URL.replace(/onboarding-portal\/?/, "")}onboarding/slide20`;
const SLIDES_OPEN = SLIDES_URL;

const TOPICOS = [
  { n: 1, title: "Visão geral do ERP Mirage", desc: "Módulos disponíveis e integração com o sistema" },
  { n: 2, title: "Configuração inicial", desc: "Conta, usuários, CNPJ e dados contábeis" },
  { n: 3, title: "Produtos e estoque", desc: "Cadastro de itens, variações e controle de inventário" },
  { n: 4, title: "Pedidos de venda", desc: "Criação, aprovação e envio ao ERP" },
  { n: 5, title: "Financeiro — Contas a receber", desc: "Geração automática a partir dos pedidos" },
  { n: 6, title: "Financeiro — Contas a pagar", desc: "Automação via Kanban de produção" },
  { n: 7, title: "Integração com Kanban", desc: "Fluxo produção → estoque → ERP" },
  { n: 8, title: "NF-e e fiscal", desc: "Emissão de nota fiscal integrada" },
];

export default function ErpOnboarding() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Nav */}
      <nav className="flex items-center gap-3 px-6 py-4 border-b border-white/10">
        <button
          onClick={() => navigate("/")}
          className="text-white/50 hover:text-white/90 text-sm flex items-center gap-1.5 transition-colors"
        >
          ← Voltar
        </button>
        <span className="text-white/20">·</span>
        <span className="text-white/50 text-sm">Onboarding ERP Mirage</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a2e1a] to-[#16a34a] px-6 pt-14 pb-16 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f1a]/40" />
        <div className="relative">
          <div className="flex items-center justify-center mb-6">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Mirage"
              className="h-10 w-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white/80 text-xs font-semibold uppercase tracking-widest mb-5">
            Onboarding ERP · Mirage
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ textWrap: "balance" } as React.CSSProperties}>
            Implantação completa do ERP
          </h1>
          <p className="text-white/60 text-base max-w-lg mx-auto mb-8">
            Do cadastro inicial à integração com produção — guia passo a passo para o primeiro valor com o ERP Mirage.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {SLIDES_OPEN && (
              <a
                href={SLIDES_OPEN}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-700 font-bold rounded-xl hover:bg-green-50 transition-colors text-sm shadow-lg"
              >
                ▶ Abrir apresentação
              </a>
            )}
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Ver outros kits
            </button>
          </div>
        </div>
      </div>

      {/* Slides embed */}
      {SLIDES_URL && (
        <div className="max-w-4xl mx-auto px-6 py-10">
          <h2 className="text-white font-bold text-xl mb-4">Visualizar slides</h2>
          <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl aspect-video w-full">
            <iframe
              src={SLIDES_URL}
              width="100%"
              height="100%"
              allowFullScreen
              className="w-full h-full"
              title="Onboarding ERP Mirage"
            />
          </div>
        </div>
      )}

      {/* Tópicos */}
      <div className="max-w-3xl mx-auto px-6 pb-14">
        <h2 className="text-white font-bold text-xl mb-6">O que está incluído</h2>
        <div className="grid gap-3">
          {TOPICOS.map(({ n, title, desc }) => (
            <div key={n} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
              <span className="w-7 h-7 rounded-full bg-green-600/30 text-green-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </span>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-white/50 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {SLIDES_OPEN && (
          <div className="mt-8 text-center">
            <a
              href={SLIDES_OPEN}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors text-sm"
            >
              ▶ Abrir em tela cheia
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
