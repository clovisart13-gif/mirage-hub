const base = import.meta.env.BASE_URL;

const RECURSOS = [
  { icon: "🛒", titulo: "Gestão de Vendas", desc: "Crie pedidos, acompanhe status e gere histórico completo por cliente." },
  { icon: "🖥️", titulo: "PDV — Frente de Caixa", desc: "Vendas presenciais com controle de caixa, sangria e fechamento." },
  { icon: "📄", titulo: "Emissão de NF-e", desc: "Nota fiscal eletrônica integrada — emita direto do pedido, sem sistema separado." },
];

export default function ERP4Vendas() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }} />
      <div className="absolute top-0 right-0 w-[70vw] h-[50vh] opacity-20" style={{ background: "radial-gradient(ellipse at 80% 10%, #16a34a 0%, transparent 50%)" }} />

      {/* Esquerda */}
      <div className="relative flex flex-col justify-center pl-[7vw] w-[44vw] pr-[3vw]">
        <img src={`${base}logo-dark.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4.5vh", width: "auto", maxWidth: "22vw", objectFit: "contain", display: "block", marginBottom: "3vh", opacity: 0.85 }} />
        <span className="font-body font-bold uppercase tracking-widest text-green-400 bg-green-900/30 px-[1.2vw] py-[0.5vh] rounded-full inline-block" style={{ fontSize: "1.1vw", width: "fit-content", marginBottom: "2vh" }}>Vendas & Fiscal</span>

        <h2 className="font-display font-extrabold text-white leading-tight mb-[3vh]" style={{ fontSize: "4vw" }}>
          Do pedido à nota fiscal,<br />
          <span style={{ color: "#22c55e" }}>sem sair do sistema</span>
        </h2>

        <div className="flex flex-col gap-[2.5vh]">
          {RECURSOS.map(({ icon, titulo, desc }) => (
            <div key={titulo} className="flex items-start gap-[1.5vw] rounded-[1vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: "2.5vw" }}>{icon}</span>
              <div>
                <p className="font-display font-bold text-white" style={{ fontSize: "1.7vw" }}>{titulo}</p>
                <p className="font-body text-white/55" style={{ fontSize: "1.3vw", marginTop: "0.4vh" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direita — mockup NF-e + Pedido */}
      <div className="relative flex-1 flex flex-col justify-center px-[4vw] gap-[2vh]">
        {/* Pedido */}
        <div className="rounded-[1.5vw] p-[2vw]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <div className="flex items-center justify-between mb-[1.5vh]">
            <p className="font-display font-bold text-white" style={{ fontSize: "1.6vw" }}>🛒 Pedido #2847</p>
            <span className="font-body font-bold text-green-300 bg-green-900/40 px-[1vw] py-[0.3vh] rounded-full" style={{ fontSize: "1.1vw" }}>Aprovado</span>
          </div>
          <div className="grid grid-cols-2 gap-[1vw]">
            {[["Cliente", "Boutique Elegance SP"], ["Valor", "R$ 8.400,00"], ["Itens", "12 referências — 340 peças"], ["Entrega", "20/08/2026"]].map(([k, v]) => (
              <div key={k}>
                <p className="font-body text-white/40" style={{ fontSize: "1.1vw" }}>{k}</p>
                <p className="font-body font-semibold text-white/90" style={{ fontSize: "1.35vw" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* NF-e */}
        <div className="rounded-[1.5vw] p-[2vw]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div className="flex items-center justify-between mb-[1.5vh]">
            <p className="font-display font-bold text-white" style={{ fontSize: "1.6vw" }}>📄 NF-e #000847</p>
            <span className="font-body font-bold text-green-300 bg-green-900/40 px-[1vw] py-[0.3vh] rounded-full" style={{ fontSize: "1.1vw" }}>✓ Autorizada — SEFAZ</span>
          </div>
          <div className="flex gap-[2vw]">
            {[["Chave de acesso", "35260814...8470"], ["Valor total", "R$ 8.400,00"], ["CFOP", "5.102 — Venda"], ["Emitida em", "15/08/2026 14:22"]].map(([k, v]) => (
              <div key={k}>
                <p className="font-body text-white/40" style={{ fontSize: "1.1vw" }}>{k}</p>
                <p className="font-body font-semibold text-white/80" style={{ fontSize: "1.2vw" }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* PDV */}
        <div className="rounded-[1.5vw] p-[1.8vw]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <p className="font-display font-bold text-white mb-[1vh]" style={{ fontSize: "1.6vw" }}>🖥️ PDV — Resumo do Caixa</p>
          <div className="flex gap-[3vw]">
            {[["Vendas hoje", "R$ 14.200", "#4ade80"], ["Abertura", "R$ 300,00", "#94a3b8"], ["Sangrias", "R$ 1.200", "#f87171"]].map(([l, v, c]) => (
              <div key={l}>
                <p className="font-body text-white/50" style={{ fontSize: "1.1vw" }}>{l}</p>
                <p className="font-display font-black" style={{ fontSize: "1.8vw", color: c }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
