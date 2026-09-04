export default function MidnightIndigo() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0C0E1F", fontFamily: "'Inter', sans-serif" }}>
      {/* Progress bar */}
      <div className="w-full h-px" style={{ background: "#1E2240" }}>
        <div className="h-full" style={{ width: "25%", background: "#C9A553" }} />
      </div>

      {/* Header */}
      <div className="px-7 pt-5 pb-2 flex items-center justify-between">
        <button className="text-xs flex items-center gap-1.5" style={{ color: "#5A6090" }}>
          ← Voltar
        </button>
        <img src="/onboarding-portal/logo-r2pb.png" alt="R2PB"
          className="h-7 w-auto object-contain absolute left-1/2 -translate-x-1/2"
          style={{ filter: "brightness(0) invert(1) sepia(1) hue-rotate(5deg) saturate(2) brightness(1.2)" }} />
        <span className="text-xs" style={{ color: "#C9A553", letterSpacing: "0.1em" }}>1/4</span>
      </div>

      {/* Subtitle */}
      <div className="px-7 pb-1 text-center">
        <p className="text-[9px] uppercase tracking-[0.25em]" style={{ color: "#3A3F6E" }}>
          R2PB · Cadastro de Fornecedor
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-7 py-6 max-w-md mx-auto w-full space-y-8">
        <div className="space-y-2">
          <div className="w-6 h-px mb-4" style={{ background: "#C9A553" }} />
          <h1 className="text-[25px] font-bold leading-snug" style={{ color: "#F0EDE6", letterSpacing: "-0.01em" }}>
            Vamos começar pelo básico
          </h1>
          <p className="text-sm" style={{ color: "#5A6090" }}>
            Nome, WhatsApp e empresa — para entrarmos em contato.
          </p>
        </div>

        <div className="space-y-3">
          {["Seu nome completo *", "WhatsApp com DDD *", "Nome da empresa ou ateliê (opcional)", "E-mail (opcional)"].map((p, i) => (
            <input
              key={i}
              readOnly
              placeholder={p}
              className="w-full px-4 py-3.5 text-sm outline-none rounded-xl"
              style={{
                background: "#12153A",
                border: "1px solid #1E2450",
                color: "#F0EDE6",
              }}
            />
          ))}
        </div>

        <button
          className="w-full py-4 rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
          style={{ background: "#C9A553", color: "#0C0E1F", opacity: 0.35 }}
        >
          Continuar →
        </button>
      </div>

      <div className="pb-6 text-center">
        <span className="text-[10px] tracking-[0.25em] uppercase" style={{ color: "#2A2E55" }}>R2PB</span>
      </div>
    </div>
  );
}
