import { useLocation } from "wouter";

export default function HelenaOnboarding() {
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
        <span className="text-white/50 text-sm">Onboarding CRM Mirage</span>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0c1445] to-[#1d4ed8] px-6 pt-14 pb-16 text-center">
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
            Onboarding CRM · Mirage
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4" style={{ textWrap: "balance" } as React.CSSProperties}>
            Da precificação à execução
          </h1>
          <p className="text-white/60 text-base max-w-lg mx-auto mb-8">
            Guia completo de implantação: como precificar, cronograma de 30 dias, playbook de onboarding e checklists prontos.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/30 text-white font-semibold rounded-xl hover:bg-white/10 transition-colors text-sm"
          >
            Ver outros kits
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">

        {/* 1. Modelos de Precificação */}
        <section>
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">1</span>
            Modelos de Precificação
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-blue-300 font-bold text-sm mb-2 uppercase tracking-wider">Precificação Fixa</p>
              <p className="text-white/70 text-sm">Setup com o mesmo valor para todos os planos.</p>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-blue-300 font-bold text-sm mb-2 uppercase tracking-wider">Precificação Escalonada</p>
              <p className="text-white/70 text-sm">Valor diferenciado para cada plano, de acordo com especificidade e funcionalidades liberadas.</p>
            </div>
          </div>
        </section>

        {/* 2. O que levar em conta */}
        <section>
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">2</span>
            O que levar em conta na hora de precificar
          </h2>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {["Custo Operacional", "Imposto", "Margem de lucro"].map((item) => (
              <div key={item} className="p-4 rounded-xl bg-blue-900/20 border border-blue-600/20 text-center">
                <p className="text-white font-semibold text-sm">{item}</p>
              </div>
            ))}
          </div>
          <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-3">Custo Operacional — considere:</p>
            {[
              ["1. Reunião de kickoff", "Diagnóstico de estratégia que será usada"],
              ["2. Configuração", "Horas de equipe para configurar a ferramenta"],
              ["3. Treinamento", "Tempo destinado ao treinamento (faseado ou único)"],
              ["4. Suporte", "Atendimentos, manutenções e dúvidas iniciais"],
              ["5. Integrações", "Alinhamento, desenvolvimento e testes da solução"],
            ].map(([title, desc]) => (
              <div key={title} className="flex gap-3">
                <p className="text-blue-300 font-semibold text-sm w-40 shrink-0">{title}</p>
                <p className="text-white/60 text-sm">{desc}</p>
              </div>
            ))}
            <p className="text-white/40 text-xs pt-2 border-t border-white/10">Para o cálculo: horas utilizadas × valor da hora da sua equipe.</p>
          </div>
          <div className="mt-3 p-4 rounded-xl bg-blue-600/10 border border-blue-600/30 text-center">
            <p className="text-blue-200 font-semibold text-sm">💡 Seu lucro começa no preço mínimo certo!</p>
          </div>
        </section>

        {/* 3. Cronograma 7 etapas */}
        <section>
          <h2 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">3</span>
            Cronograma de implantação
          </h2>
          <p className="text-white/50 text-sm mb-5">7 etapas para chegar ao primeiro valor em até 30 dias</p>
          <div className="space-y-3">
            {[
              { n: "01", label: "Boas-vindas", desc: "Mensagem em até 24h. Agendar kickoff." },
              { n: "02", label: "Kickoff", desc: "Analise a estratégia, colete informações, defina próximos passos." },
              { n: "03", label: "Configuração da conta", desc: "Cronograma faseado conforme estratégia definida. Agilidade e assertividade." },
              { n: "04", label: "Treinamento", desc: "Faseado ou único. Transmitir todas as funcionalidades desejadas. → Primeiro Valor" },
              { n: "05", label: "Conexão do canal", desc: "Conecte os canais definidos. API Oficial: boas práticas e ambiente preparado." },
              { n: "06", label: "Reuniões de tira-dúvidas", desc: "Check-ins D3, D7, D14. Silêncio = Risco." },
              { n: "07", label: "Revisão de 90 dias", desc: "Resultados, NPS e oportunidades de expansão." },
            ].map(({ n, label, desc }) => (
              <div key={n} className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="w-8 h-8 rounded-full bg-blue-700/40 text-blue-200 text-xs font-bold flex items-center justify-center shrink-0">{n}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-white/50 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Kickoff */}
        <section>
          <h2 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">4</span>
            Etapa 01 — Reunião de Kickoff
          </h2>
          <p className="text-white/50 text-sm mb-5">45 min – 1h · Máximo 45 min. Foque nos objetivos, não em todas as funcionalidades.</p>
          <div className="space-y-2">
            {[
              ["5 min",  "Boas-vindas e apresentações", "Crie um ambiente acolhedor"],
              ["5 min",  "Alinhamento de objetivos",    "O que o cliente quer alcançar?"],
              ["20 min", "Mapeamento do processo atual","Como o cliente trabalha hoje?"],
              ["10 min", "Apresentação da plataforma",  "Demo das funcionalidades relevantes"],
              ["5 min",  "Próximos passos",             "Cronograma, responsáveis e ações"],
            ].map(([time, title, desc]) => (
              <div key={title} className="flex gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-blue-300 font-bold text-xs w-12 shrink-0 pt-0.5">{time}</span>
                <div>
                  <p className="text-white text-sm font-semibold">{title}</p>
                  <p className="text-white/50 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-xs mt-3 pl-1">📧 Envie resumo por e-mail/WhatsApp em até 2h após o kickoff.</p>
        </section>

        {/* 5. Configurações iniciais */}
        <section>
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">5</span>
            Etapa 02 — Configurações iniciais
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              {
                title: "🏢 Criação da conta",
                items: ["Dados contábeis (CNPJ, Razão Social)", "Tipo de ambiente e status", "Liberar funções conforme contrato", "Chatbots, Sequências, Painéis, Canais"],
              },
              {
                title: "📡 Conexão do canal",
                items: ["API Oficial: BM sem restrições", "Número desvinculado do WhatsApp", "Cartão de crédito internacional", "Testes de troca de mensagens"],
              },
              {
                title: "⚙ Configuração",
                items: ["Horário de atendimento", "Ao menos 1 chatbot básico", "1 modelo de mensagem (API Oficial)", "Equipes e usuários com perfis"],
              },
              {
                title: "✅ Após conexão",
                items: ["Modelos aprovados pela Meta (API Oficial)", "Chatbot ativado no canal", "Tempo de segurança por usuário", "Reunião de tira-dúvidas agendada"],
              },
            ].map(({ title, items }) => (
              <div key={title} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-white font-semibold text-sm mb-3">{title}</p>
                <ul className="space-y-1.5">
                  {items.map((item) => (
                    <li key={item} className="text-white/60 text-xs flex gap-2">
                      <span className="text-blue-400 shrink-0">✓</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Acompanhamento */}
        <section>
          <h2 className="text-white font-bold text-xl mb-2 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">6</span>
            Etapa 03 — Acompanhamento & Revisão
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { day: "Dia 3",  label: "Primeiro contato",  desc: "Verificar se conseguiu usar a plataforma e se há dúvidas" },
              { day: "Dia 7",  label: "Engajamento",       desc: "Entender uso, remover obstáculos. Se silêncio: ação imediata" },
              { day: "Dia 14", label: "Objetivos",         desc: "Verificar se objetivos iniciais estão sendo alcançados" },
              { day: "Dia 30", label: "Revisão completa",  desc: "Resultados, NPS, metas novas e oportunidades de expansão" },
            ].map(({ day, label, desc }) => (
              <div key={day} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-blue-300 font-bold text-lg">{day}</p>
                <p className="text-white font-semibold text-xs mt-1">{label}</p>
                <p className="text-white/50 text-xs mt-2">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 p-4 rounded-xl bg-yellow-900/20 border border-yellow-600/30">
            <p className="text-yellow-200 text-sm font-semibold">⚠ Silêncio do cliente = Abandono Silencioso</p>
            <p className="text-yellow-200/60 text-xs mt-1">Aja imediatamente se não houver resposta no D7.</p>
          </div>
        </section>

        {/* 7. Playbook + Checklists */}
        <section>
          <h2 className="text-white font-bold text-xl mb-5 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-blue-600/30 text-blue-300 text-xs font-bold flex items-center justify-center">7</span>
            Playbook completo & Checklists
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white font-bold text-sm mb-3">📖 Playbook do Onboarding & Implantação</p>
              <ul className="space-y-1.5 text-white/60 text-xs">
                <li>• Guia de Implantação</li>
                <li>• Implantação Estratégica</li>
                <li>• Encontro Pós-venda (Próximos passos)</li>
              </ul>
            </div>
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white font-bold text-sm mb-3">✅ Checklists prontos</p>
              <ul className="space-y-1.5 text-white/60 text-xs">
                <li>• Checklist para Kickoff</li>
                <li>• Checklist para Criação de Contas</li>
                <li>• Checklist para Treinamento de Usuários</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Contato */}
        <section className="pb-4">
          <div className="p-5 rounded-xl bg-blue-900/20 border border-blue-600/20 text-center">
            <p className="text-white font-bold text-sm mb-3">Entre em contato com o suporte Mirage CRM</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center text-white/60 text-sm">
              <span>📞 CS: (31) 95347-0031</span>
              <span className="hidden sm:inline text-white/20">·</span>
              <span>🎧 Suporte: (31) 4003-7752</span>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
