export default function ERP9Fluxo() {
  const STEPS = [
    {
      icon: "📋",
      label: "Orçamento aprovado",
      sub: "Cliente aprova o orçamento no Hub",
      detail: ["Referência", "Cores & Grades", "Qtd & Preço"],
      color: "#1e40af",
      bg: "#dbeafe",
    },
    {
      icon: "📦",
      label: "Pedido gerado no Kanban",
      sub: "Produção entra em linha automaticamente",
      detail: ["14 etapas de produção", "Rastreamento por grade", "Prazos de entrega"],
      color: "#7c3aed",
      bg: "#ede9fe",
    },
    {
      icon: "🔄",
      label: "ERP recebe os dados",
      sub: "Nenhum dado precisa ser redigitado",
      detail: ["Produtos e grades", "Entrada de estoque", "NF-e gerada do pedido"],
      color: "#15803d",
      bg: "#dcfce7",
    },
    {
      icon: "✅",
      label: "Nota emitida, estoque atualizado",
      sub: "Financeiro e fiscal fechados no mesmo sistema",
      detail: ["Contas a receber", "Fluxo de caixa", "Relatório fiscal"],
      color: "#b45309",
      bg: "#fef3c7",
    },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "#0f172a" }}>
      {/* Fundo decorativo */}
      <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at 20% 50%, #22c55e 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, #3b82f6 0%, transparent 50%)" }} />

      {/* Header */}
      <div className="relative flex-none pt-[4vh] px-[7vw]">
        <span className="font-body font-bold uppercase tracking-widest text-green-400 bg-green-900/40 px-[1.2vw] py-[0.5vh] rounded-full inline-block" style={{ fontSize: "1vw" }}>
          Fluxo integrado
        </span>
        <h2 className="font-display font-extrabold text-white mt-[1.5vh]" style={{ fontSize: "3.2vw", lineHeight: 1.1 }}>
          Do pedido ao ERP:<br />
          <span style={{ color: "#4ade80" }}>zero dupla entrada de dados</span>
        </h2>
        <p className="font-body text-slate-400 mt-[1vh]" style={{ fontSize: "1.4vw" }}>
          Para quem ainda não tem ERP — o Hub já gerou os dados, o ERP só os usa.
        </p>
      </div>

      {/* Fluxo */}
      <div className="relative flex-1 flex items-center px-[6vw] gap-0 mt-[1vh]">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center flex-1">
            {/* Card */}
            <div className="flex-1 flex flex-col rounded-[1.2vw] overflow-hidden" style={{ border: `2px solid ${s.color}22` }}>
              {/* Topo colorido */}
              <div className="flex items-center gap-[0.8vw] px-[1.2vw] py-[1.2vh]" style={{ background: s.bg }}>
                <span style={{ fontSize: "2.2vw" }}>{s.icon}</span>
                <div>
                  <p className="font-display font-bold leading-tight" style={{ fontSize: "1.3vw", color: s.color }}>{s.label}</p>
                  <p className="font-body" style={{ fontSize: "1vw", color: s.color + "bb" }}>{s.sub}</p>
                </div>
              </div>
              {/* Dados que fluem */}
              <div className="flex flex-col gap-[0.6vh] px-[1.2vw] py-[1.4vh]" style={{ background: "#1e293b" }}>
                {s.detail.map((d) => (
                  <div key={d} className="flex items-center gap-[0.7vw]">
                    <div className="w-[0.5vw] h-[0.5vw] rounded-full shrink-0" style={{ background: s.color }} />
                    <span className="font-body text-slate-300" style={{ fontSize: "1.1vw" }}>{d}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Seta */}
            {i < STEPS.length - 1 && (
              <div className="flex-none flex flex-col items-center px-[1vw]">
                <div className="font-display font-black text-slate-500" style={{ fontSize: "2.5vw" }}>→</div>
                <span className="font-body text-slate-600" style={{ fontSize: "0.8vw" }}>auto</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Rodapé — dois cenários */}
      <div className="relative flex-none px-[6vw] pb-[3.5vh] mt-[1.5vh] grid grid-cols-2 gap-[2vw]">
        <div className="rounded-[1vw] px-[1.5vw] py-[1.2vh]" style={{ background: "#1e293b", border: "1px solid #334155" }}>
          <p className="font-display font-bold text-white" style={{ fontSize: "1.2vw" }}>🆕 Cliente sem ERP</p>
          <p className="font-body text-slate-400 mt-[0.3vh]" style={{ fontSize: "1vw" }}>
            Começa pelo Hub → Kanban já alimenta o ERP. Produtos, cores e grades cadastrados uma única vez.
          </p>
        </div>
        <div className="rounded-[1vw] px-[1.5vw] py-[1.2vh]" style={{ background: "#1e293b", border: "1px solid #334155" }}>
          <p className="font-display font-bold text-white" style={{ fontSize: "1.2vw" }}>🔁 Cliente migrando de outro ERP</p>
          <p className="font-body text-slate-400 mt-[0.3vh]" style={{ fontSize: "1vw" }}>
            Implantação guiada Mirage: importação via planilha dos produtos, clientes e histórico financeiro do ERP anterior.
          </p>
        </div>
      </div>
    </div>
  );
}
