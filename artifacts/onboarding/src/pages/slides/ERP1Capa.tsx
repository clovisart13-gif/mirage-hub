const base = import.meta.env.BASE_URL;

const NUMS = [
  { n: "10", label: "módulos integrados" },
  { n: "NF-e", label: "emissão fiscal nativa" },
  { n: "100%", label: "integrado ao Hub Mirage" },
];

export default function ERP1Capa() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)" }} />
      <div className="absolute right-0 top-0 w-[45vw] h-full" style={{ background: "linear-gradient(145deg, #14532d 0%, #16a34a 60%, #22c55e 100%)" }} />
      <div className="absolute right-0 top-0 w-[45vw] h-full opacity-30" style={{ background: "radial-gradient(ellipse at 60% 40%, #4ade80 0%, transparent 60%)" }} />

      {/* Esquerda */}
      <div className="relative flex flex-col justify-center pl-[7vw] w-[52vw]">
        <img
          src={`${base}logo-color.png`}
          crossOrigin="anonymous"
          alt="Mirage"
          className="mb-[4vh]"
          style={{ height: "5vh", width: "auto", maxWidth: "26vw", objectFit: "contain", display: "block" }}
        />

        <div className="flex items-center gap-[1vw] mb-[2.5vh]">
          <span className="font-body font-bold uppercase tracking-widest text-green-700 bg-green-100 px-[1.2vw] py-[0.5vh] rounded-full" style={{ fontSize: "1.2vw" }}>
            ERP Mirage
          </span>
          <span className="font-body text-slate-400" style={{ fontSize: "1.1vw" }}>powered by VhSys</span>
        </div>

        <h1
          className="font-display font-extrabold leading-none tracking-tight mb-[2.5vh]"
          style={{ fontSize: "5vw", color: "#0f172a", textWrap: "balance" }}
        >
          Gestão financeira<br />e comercial<br />
          <span style={{ color: "#16a34a" }}>integrada</span>
        </h1>

        <p className="font-body mb-[4vh]" style={{ fontSize: "1.9vw", color: "#475569", maxWidth: "36vw" }}>
          Controle financeiro, emissão de NF-e, PDV e gestão de vendas — tudo conectado ao Hub Mirage.
        </p>

        <div className="flex gap-[2.5vw]">
          {NUMS.map(({ n, label }) => (
            <div key={label}>
              <p className="font-display font-black" style={{ fontSize: "3vw", color: "#16a34a" }}>{n}</p>
              <p className="font-body" style={{ fontSize: "1.3vw", color: "#64748b" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direita */}
      <div className="relative flex-1 flex flex-col justify-center items-center gap-[2.5vh] px-[4vw]">
        <div className="w-[14vw] h-[14vw] rounded-[2.5vw] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
          <img
            src={`${base}logo.png`}
            crossOrigin="anonymous"
            alt="Mirage ERP"
            style={{ width: "10vw", height: "auto" }}
          />
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-white" style={{ fontSize: "1.8vw" }}>ERP Mirage</p>
          <p className="font-body text-white/60" style={{ fontSize: "1.3vw" }}>Gestão & Tecnologia para Confecção</p>
        </div>

        <div className="mt-[2vh] flex flex-col gap-[1.2vh] w-full max-w-[28vw]">
          {["Controle Financeiro completo", "Emissão de NF-e integrada", "PDV e Frente de Caixa", "Open Banking Stone"].map((item) => (
            <div key={item} className="flex items-center gap-[1vw]" style={{ background: "rgba(255,255,255,0.12)", borderRadius: "0.8vw", padding: "0.8vh 1.2vw" }}>
              <span style={{ fontSize: "1.5vw" }}>✓</span>
              <span className="font-body text-white/90" style={{ fontSize: "1.4vw" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
