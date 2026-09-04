const base = import.meta.env.BASE_URL;

const DIFERENCIAIS = [
  {
    titulo: "Já incluso no Hub Mirage",
    desc: "Sem contrato separado, sem licença extra. O ERP faz parte do ecossistema — você não precisa gerenciar dois fornecedores.",
    icon: "✅",
  },
  {
    titulo: "Integrado à produção (Kanban)",
    desc: "Cada etapa de produção concluída no Kanban gera automaticamente as contas a pagar no ERP. Zero trabalho manual.",
    icon: "🏭",
  },
  {
    titulo: "NF-e direto do pedido",
    desc: "Emita nota fiscal a partir do pedido de venda com um clique — sem abrir outro sistema, sem digitar dados duas vezes.",
    icon: "📄",
  },
  {
    titulo: "Suporte e implantação Mirage",
    desc: "A Mirage acompanha a implantação, configura o sistema e treina a equipe. Você não está sozinho na virada.",
    icon: "🤝",
  },
];

const COMPARATIVO = [
  ["ERP avulso no mercado", "Contrato separado", "Sem integração com produção", "Suporte do fornecedor do ERP"],
  ["ERP Mirage (Hub)", "Incluso no Hub Mirage", "Integrado ao Kanban de produção", "Suporte + implantação Mirage"],
];

export default function ERP7Diferenciais() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }} />
      <div className="absolute top-0 left-0 w-[50vw] h-[50vh] opacity-15" style={{ background: "radial-gradient(ellipse at 10% 10%, #16a34a 0%, transparent 55%)" }} />

      {/* Esquerda — diferenciais */}
      <div className="relative flex flex-col justify-center pl-[7vw] w-[54vw] pr-[4vw]">
        <img src={`${base}logo-dark.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4.5vh", width: "auto", maxWidth: "22vw", objectFit: "contain", display: "block", marginBottom: "3vh", opacity: 0.85 }} />
        <span className="font-body font-bold uppercase tracking-widest text-green-400 bg-green-900/30 px-[1.2vw] py-[0.5vh] rounded-full inline-block" style={{ fontSize: "1.1vw", width: "fit-content", marginBottom: "2vh" }}>Por que ERP Mirage</span>

        <h2 className="font-display font-extrabold text-white leading-tight mb-[3vh]" style={{ fontSize: "3.8vw" }}>
          Não é mais um ERP.<br />
          <span style={{ color: "#22c55e" }}>É o ERP que faz parte<br />do seu Hub.</span>
        </h2>

        <div className="grid grid-cols-2 gap-[1.5vw]">
          {DIFERENCIAIS.map(({ titulo, desc, icon }) => (
            <div key={titulo} className="rounded-[1.2vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "2.2vw" }}>{icon}</span>
              <p className="font-display font-bold text-white mt-[1vh] mb-[0.5vh]" style={{ fontSize: "1.5vw" }}>{titulo}</p>
              <p className="font-body text-white/55" style={{ fontSize: "1.2vw" }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direita — comparativo */}
      <div className="relative flex-1 flex flex-col justify-center px-[4vw]">
        <div className="rounded-[1.5vw] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
          {/* Header */}
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="px-[2vw] py-[1.5vh] text-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <p className="font-display font-bold text-white/50" style={{ fontSize: "1.3vw" }}>ERP avulso</p>
            </div>
            <div className="px-[2vw] py-[1.5vh] text-center" style={{ background: "rgba(34,197,94,0.15)", borderLeft: "1px solid rgba(34,197,94,0.3)" }}>
              <p className="font-display font-bold text-green-300" style={{ fontSize: "1.3vw" }}>✓ ERP Mirage</p>
            </div>
          </div>
          {/* Rows */}
          {[
            ["Contrato separado", "Incluso no Hub Mirage"],
            ["Sem integração com produção", "Integrado ao Kanban de produção"],
            ["Suporte do fornecedor do ERP", "Implantação + suporte Mirage"],
            ["NF-e em sistema externo", "NF-e direto do pedido"],
          ].map(([erp, mirage], i) => (
            <div key={i} className="grid border-t" style={{ gridTemplateColumns: "1fr 1fr", borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="px-[2vw] py-[1.3vh]" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="font-body text-white/40 flex items-center gap-[0.5vw]" style={{ fontSize: "1.2vw" }}>
                  <span style={{ color: "#f87171" }}>✗</span> {erp}
                </p>
              </div>
              <div className="px-[2vw] py-[1.3vh] border-l" style={{ background: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.2)" }}>
                <p className="font-body text-white/80 flex items-center gap-[0.5vw]" style={{ fontSize: "1.2vw" }}>
                  <span style={{ color: "#4ade80" }}>✓</span> {mirage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
