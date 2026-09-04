const base = import.meta.env.BASE_URL;

const ITENS_ESTOQUE = [
  { ref: "BL-001", nome: "Blusa Cropped Modal P/M/G", estoque: 480, minimo: 100, status: "ok" },
  { ref: "CA-012", nome: "Calça Jogger Feminina P/M", estoque: 67, minimo: 100, status: "baixo" },
  { ref: "VE-034", nome: "Vestido Linho Midi Único", estoque: 220, minimo: 50, status: "ok" },
  { ref: "JA-019", nome: "Jaqueta Jeans Cropped P/M/G/GG", estoque: 12, minimo: 80, status: "critico" },
];

const statusStyle: Record<string, { label: string; color: string; bg: string }> = {
  ok: { label: "Normal", color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
  baixo: { label: "Baixo", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  critico: { label: "Crítico", color: "#f87171", bg: "rgba(248,113,113,0.15)" },
};

export default function ERP5Estoque() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)" }} />
      <div className="absolute right-0 top-0 w-[46vw] h-full" style={{ background: "linear-gradient(145deg, #14532d 0%, #166534 50%, #15803d 100%)" }} />

      {/* Esquerda */}
      <div className="relative flex flex-col justify-center pl-[7vw] w-[51vw] pr-[4vw]">
        <img src={`${base}logo-color.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4.5vh", width: "auto", maxWidth: "22vw", objectFit: "contain", display: "block", marginBottom: "3vh" }} />
        <span className="font-body font-bold uppercase tracking-widest text-green-700 bg-green-100 px-[1.2vw] py-[0.5vh] rounded-full inline-block" style={{ fontSize: "1.1vw", width: "fit-content", marginBottom: "2vh" }}>Estoque & Compras</span>

        <h2 className="font-display font-extrabold text-slate-900 leading-tight mb-[2.5vh]" style={{ fontSize: "4vw" }}>
          Inventário em tempo real,<br />
          <span style={{ color: "#16a34a" }}>compras no momento certo</span>
        </h2>

        <div className="flex flex-col gap-[1.8vh] mb-[3.5vh]">
          {[
            { icon: "📦", t: "Controle de Estoque", d: "Movimentações automáticas a cada venda, produção ou compra cadastrada." },
            { icon: "🛍️", t: "Controle de Compras", d: "Pedidos de compra para fornecedores com aprovação e rastreamento." },
            { icon: "⚠️", t: "Alertas de nível mínimo", d: "Receba alertas quando o estoque cair abaixo do limite definido." },
          ].map(({ icon, t, d }) => (
            <div key={t} className="flex items-start gap-[1vw]">
              <span style={{ fontSize: "2vw", marginTop: "0.2vh" }}>{icon}</span>
              <div>
                <p className="font-display font-bold text-slate-800" style={{ fontSize: "1.6vw" }}>{t}</p>
                <p className="font-body text-slate-500" style={{ fontSize: "1.25vw" }}>{d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-[3vw]">
          {[["Automático", "movimentações via venda/prod"], ["Alerta", "de nível mínimo"], ["Multi-dep.", "estoque por depósito"]].map(([n, l]) => (
            <div key={l}>
              <p className="font-display font-black" style={{ fontSize: "2vw", color: "#16a34a" }}>{n}</p>
              <p className="font-body text-slate-500" style={{ fontSize: "1.15vw", maxWidth: "10vw" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direita — tabela de estoque */}
      <div className="relative flex-1 flex flex-col justify-center px-[3.5vw] gap-[1.5vh]">
        <div className="rounded-[1.5vw] overflow-hidden" style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <div className="px-[2vw] py-[1.5vh] border-b border-white/15">
            <p className="font-display font-bold text-white" style={{ fontSize: "1.6vw" }}>📦 Inventário — Posição atual</p>
          </div>
          <div className="flex flex-col">
            <div className="grid px-[2vw] py-[1vh] border-b border-white/10" style={{ gridTemplateColumns: "1fr 3fr 1fr 1fr 1fr" }}>
              {["Ref.", "Produto", "Estoque", "Mínimo", "Status"].map((h) => (
                <p key={h} className="font-body text-white/40 uppercase tracking-wider" style={{ fontSize: "1vw" }}>{h}</p>
              ))}
            </div>
            {ITENS_ESTOQUE.map(({ ref, nome, estoque, minimo, status }) => {
              const s = statusStyle[status];
              return (
                <div key={ref} className="grid px-[2vw] py-[1.4vh] border-b border-white/8 items-center" style={{ gridTemplateColumns: "1fr 3fr 1fr 1fr 1fr" }}>
                  <p className="font-body text-white/50" style={{ fontSize: "1.15vw" }}>{ref}</p>
                  <p className="font-body text-white/90" style={{ fontSize: "1.2vw" }}>{nome}</p>
                  <p className="font-display font-bold text-white" style={{ fontSize: "1.4vw" }}>{estoque}</p>
                  <p className="font-body text-white/50" style={{ fontSize: "1.2vw" }}>{minimo}</p>
                  <span className="font-body font-bold px-[0.8vw] py-[0.3vh] rounded-full inline-block" style={{ fontSize: "1.05vw", color: s.color, background: s.bg, width: "fit-content" }}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[1.5vw] p-[1.8vw]" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <p className="font-body font-semibold text-yellow-200" style={{ fontSize: "1.3vw" }}>
            ⚠️ <strong>2 itens abaixo do estoque mínimo</strong> — pedido de compra gerado automaticamente para aprovação
          </p>
        </div>
      </div>
    </div>
  );
}
