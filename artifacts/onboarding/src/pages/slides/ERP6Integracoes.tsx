const base = import.meta.env.BASE_URL;

const INTEGRACOES = [
  { icon: "🔗", nome: "Loja de Integrações", desc: "Conecte marketplaces, ERPs de terceiros e plataformas de e-commerce via API.", badge: "40+ integrações" },
  { icon: "🏦", nome: "Open Banking Stone", desc: "Conta bancária PJ integrada com Pix, TED, boleto e extrato automático.", badge: "Sem conciliar" },
  { icon: "💳", nome: "Conta PJ Integrada", desc: "Financeiro e conta no mesmo painel — débito, crédito e cobranças centralizados.", badge: "Nativo" },
  { icon: "🏭", nome: "Hub Mirage — Kanban", desc: "Produção avança → contas a pagar geradas automaticamente no ERP.", badge: "Integração nativa" },
];

export default function ERP6Integracoes() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <div className="absolute bottom-0 right-0 w-[60vw] h-[60vh] opacity-15" style={{ background: "radial-gradient(ellipse at 80% 80%, #16a34a 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-[7vw] pt-[5vh] pb-[3.5vh]">
        <div>
          <span className="font-body font-bold uppercase tracking-widest text-green-400 bg-green-900/30 px-[1.2vw] py-[0.5vh] rounded-full" style={{ fontSize: "1.1vw" }}>Ecossistema conectado</span>
          <h2 className="font-display font-extrabold text-white mt-[1vh]" style={{ fontSize: "3.6vw" }}>
            O ERP Mirage<br />
            <span style={{ color: "#22c55e" }}>não trabalha sozinho</span>
          </h2>
        </div>
        <img src={`${base}logo-dark.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4vh", width: "auto", opacity: 0.7 }} />
      </div>

      {/* Grid */}
      <div className="relative flex-1 grid grid-cols-2 gap-[2vw] px-[7vw] pb-[5vh]">
        {INTEGRACOES.map(({ icon, nome, desc, badge }) => (
          <div
            key={nome}
            className="flex flex-col justify-between rounded-[1.5vw] p-[2.5vw]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div>
              <div className="flex items-start justify-between mb-[2vh]">
                <span style={{ fontSize: "3vw" }}>{icon}</span>
                <span className="font-body font-bold text-green-300 bg-green-900/40 px-[1vw] py-[0.4vh] rounded-full" style={{ fontSize: "1.05vw" }}>{badge}</span>
              </div>
              <p className="font-display font-bold text-white mb-[1vh]" style={{ fontSize: "1.8vw" }}>{nome}</p>
              <p className="font-body text-white/55" style={{ fontSize: "1.35vw" }}>{desc}</p>
            </div>
            <div className="mt-[2vh] flex items-center gap-[0.6vw]">
              <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-green-400 animate-pulse" />
              <span className="font-body text-green-400" style={{ fontSize: "1.1vw" }}>Ativo no Hub Mirage</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
