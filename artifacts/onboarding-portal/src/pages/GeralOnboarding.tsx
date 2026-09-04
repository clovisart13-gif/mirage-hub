import { useLocation } from "wouter";

const base = import.meta.env.BASE_URL;
const SLIDES_URL = "/onboarding/";

export default function GeralOnboarding() {
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
        <span className="text-white/50 text-sm">Onboarding Geral</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#1e1b4b] to-[#4338ca] px-6 pt-14 pb-16 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0f0f1a]/40" />
        <div className="relative">
          <img src={`${base}logo.png`} alt="Mirage Hub" className="h-10 w-auto mx-auto mb-6" />
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white/80 text-xs font-semibold uppercase tracking-widest mb-5">
            Onboarding Geral · Hub Mirage
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ textWrap: "balance" }}>
            Apresentação completa do ecossistema
          </h1>
          <p className="text-white/60 text-base max-w-lg mx-auto mb-8">
            15 slides cobrindo todos os módulos Mirage em até 30 minutos. Perfeito para o primeiro contato.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={SLIDES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 transition-colors text-sm shadow-lg"
            >
              ▶ Iniciar apresentação
            </a>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm"
            >
              Ver outros kits
            </button>
          </div>
        </div>
      </div>

      {/* Slides index */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-white font-bold text-xl mb-6">O que está incluído</h2>
        <div className="grid gap-3">
          {[
            { n: 1, title: "Bem-vindo ao Mirage Hub", desc: "Boas-vindas e visão geral" },
            { n: 2, title: "O Hub Central", desc: "Acesso a todos os módulos em um só lugar" },
            { n: 3, title: "PLM — Produto", desc: "Cadastro e gestão do ciclo de vida do produto" },
            { n: 4, title: "PLM — BOM e Custo Real", desc: "Calcule o custo real de cada peça" },
            { n: 5, title: "PLM — Modelagem e Pilotagem", desc: "Desenvolvimento e aprovação formal" },
            { n: 6, title: "Produção — Kanban", desc: "14 etapas de controle de produção" },
            { n: 7, title: "Produção — Contas a Pagar", desc: "Automação financeira integrada" },
            { n: 8, title: "Custos e Orçamentos", desc: "Cálculo e geração de propostas" },
            { n: 9, title: "Fluxo de Aprovação do Cliente", desc: "Do PDF ao aprovado em 4 passos" },
            { n: 10, title: "Relatórios", desc: "6 abas de relatório integradas" },
            { n: 11, title: "BI de Vendas", desc: "Análise com exportação Excel" },
            { n: 12, title: "Moda Conecta", desc: "Fornecedores verificados e comunidade" },
            { n: 13, title: "CRM — Carteira de Clientes", desc: "Histórico e análise por cliente" },
            { n: 14, title: "Configurações da Conta", desc: "Empresa, usuários e plano" },
            { n: 15, title: "Próximos passos", desc: "3 passos para começar agora" },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
              <span className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {n}
              </span>
              <div>
                <p className="text-white font-semibold text-sm">{title}</p>
                <p className="text-white/50 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <a
            href={SLIDES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors text-sm"
          >
            ▶ Abrir slides em tela cheia
          </a>
        </div>
      </div>
    </div>
  );
}
