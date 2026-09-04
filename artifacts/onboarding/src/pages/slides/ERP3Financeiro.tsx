const base = import.meta.env.BASE_URL;

const RECURSOS = [
  { titulo: "Fluxo de caixa em tempo real", desc: "Visualize entradas e saídas do dia, semana e mês." },
  { titulo: "Antecipação de Recebíveis", desc: "Transforme duplicatas em capital de giro imediato." },
  { titulo: "Open Banking Stone", desc: "Conta bancária PJ integrada ao ERP — sem conciliar planilhas." },
  { titulo: "Conta PJ integrada", desc: "Pagamentos, cobranças e extratos dentro do sistema." },
];

const STATS = [
  { n: "100%", label: "conciliação automática" },
  { n: "0", label: "planilhas extras" },
  { n: "D+0", label: "antecipação de recebíveis" },
];

export default function ERP3Financeiro() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)" }} />
      <div className="absolute right-0 top-0 w-[48vw] h-full" style={{ background: "linear-gradient(145deg, #14532d 0%, #166534 50%, #15803d 100%)" }} />

      {/* Esquerda */}
      <div className="relative flex flex-col justify-center pl-[7vw] w-[50vw] pr-[3vw]">
        <img src={`${base}logo-color.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4.5vh", width: "auto", maxWidth: "22vw", objectFit: "contain", display: "block", marginBottom: "3vh" }} />
        <span className="font-body font-bold uppercase tracking-widest text-green-700 bg-green-100 px-[1.2vw] py-[0.5vh] rounded-full inline-block" style={{ fontSize: "1.1vw", width: "fit-content", marginBottom: "2vh" }}>Módulo Financeiro</span>

        <h2 className="font-display font-extrabold text-slate-900 leading-tight mb-[2.5vh]" style={{ fontSize: "4vw" }}>
          Financeiro completo,<br />
          <span style={{ color: "#16a34a" }}>sem planilha auxiliar</span>
        </h2>

        <div className="flex flex-col gap-[1.8vh] mb-[4vh]">
          {RECURSOS.map(({ titulo, desc }) => (
            <div key={titulo} className="flex items-start gap-[1vw]">
              <div className="w-[1.8vw] h-[1.8vw] rounded-full flex items-center justify-center shrink-0 mt-[0.2vh]" style={{ background: "#dcfce7" }}>
                <span style={{ fontSize: "1vw", color: "#16a34a" }}>✓</span>
              </div>
              <div>
                <p className="font-display font-bold text-slate-800" style={{ fontSize: "1.6vw" }}>{titulo}</p>
                <p className="font-body text-slate-500" style={{ fontSize: "1.3vw" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-[3vw]">
          {STATS.map(({ n, label }) => (
            <div key={label}>
              <p className="font-display font-black" style={{ fontSize: "2.8vw", color: "#16a34a" }}>{n}</p>
              <p className="font-body text-slate-500" style={{ fontSize: "1.2vw" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direita — mockup financeiro */}
      <div className="relative flex-1 flex flex-col justify-center px-[4vw] gap-[1.5vh]">
        <div className="rounded-[1.5vw] p-[2vw]" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <p className="font-display font-bold text-white mb-[1.5vh]" style={{ fontSize: "1.6vw" }}>💰 Fluxo de Caixa — Agosto 2026</p>
          <div className="flex gap-[2vw]">
            {[["Entradas", "R$ 184.320", "#4ade80"], ["Saídas", "R$ 97.680", "#f87171"], ["Saldo", "R$ 86.640", "#a3e635"]].map(([l, v, c]) => (
              <div key={l} className="flex-1 rounded-[1vw] p-[1.5vw]" style={{ background: "rgba(255,255,255,0.08)" }}>
                <p className="font-body text-white/60" style={{ fontSize: "1.2vw" }}>{l}</p>
                <p className="font-display font-black" style={{ fontSize: "2vw", color: c }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5vw] p-[2vw]" style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <p className="font-display font-bold text-white mb-[1.5vh]" style={{ fontSize: "1.6vw" }}>🏦 Open Banking — Conta PJ Stone</p>
          <div className="flex flex-col gap-[1vh]">
            {[["Pix recebido — Cliente Atacado SP", "+ R$ 12.400", "#4ade80"], ["Boleto pago — Fornecedor XYZ", "- R$ 3.200", "#f87171"], ["Antecipação aprovada — Recebíveis", "+ R$ 28.000", "#4ade80"]].map(([desc, val, c]) => (
              <div key={desc} className="flex items-center justify-between py-[0.8vh] border-b border-white/10">
                <span className="font-body text-white/70" style={{ fontSize: "1.25vw" }}>{desc}</span>
                <span className="font-display font-bold" style={{ fontSize: "1.4vw", color: c }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5vw] p-[1.5vw]" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}>
          <p className="font-body text-green-300" style={{ fontSize: "1.3vw" }}>
            ⚡ <strong>Recebível antecipado hoje:</strong> R$ 28.000 — taxa 1,8% — disponível em 2h
          </p>
        </div>
      </div>
    </div>
  );
}
