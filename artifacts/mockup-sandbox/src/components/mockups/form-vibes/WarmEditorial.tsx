export default function WarmEditorial() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F3EC", fontFamily: "'Inter', sans-serif" }}>
      {/* Progress bar */}
      <div className="w-full h-0.5" style={{ background: "#E8E0D0" }}>
        <div className="h-full" style={{ width: "25%", background: "#C4956A" }} />
      </div>

      {/* Header */}
      <div className="px-8 pt-6 pb-3 flex items-center justify-between">
        <button className="text-xs flex items-center gap-1.5" style={{ color: "#A0907A" }}>
          ← Voltar
        </button>
        <img src="/onboarding-portal/logo-r2pb.png" alt="R2PB"
          className="h-7 w-auto object-contain absolute left-1/2 -translate-x-1/2"
          style={{ filter: "brightness(0) sepia(1) hue-rotate(10deg) saturate(0.3)" }} />
        <span className="text-xs" style={{ color: "#C4956A", letterSpacing: "0.12em" }}>1 / 4</span>
      </div>

      {/* Subtitle */}
      <div className="px-8 pb-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.22em]" style={{ color: "#C4956A" }}>
          R2PB · Cadastro de Fornecedor
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6 max-w-md mx-auto w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-[26px] font-bold leading-snug" style={{ color: "#2C1F12", letterSpacing: "-0.01em" }}>
            Vamos começar pelo básico
          </h1>
          <p className="text-sm" style={{ color: "#9A8878" }}>
            Nome, WhatsApp e empresa — para entrarmos em contato.
          </p>
        </div>

        <div className="space-y-3">
          {["Seu nome completo *", "WhatsApp com DDD *", "Nome da empresa ou ateliê (opcional)", "E-mail (opcional)"].map((p, i) => (
            <input
              key={i}
              readOnly
              placeholder={p}
              className="w-full px-4 py-3.5 text-sm rounded-lg outline-none"
              style={{
                background: "#FDF9F3",
                border: "1px solid #DDD5C5",
                color: "#2C1F12",
              }}
            />
          ))}
        </div>

        <button
          className="w-full py-4 rounded-lg text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
          style={{ background: "#2C1F12", color: "#F7F3EC", opacity: 0.4 }}
        >
          Continuar →
        </button>
      </div>

      <div className="pb-6 text-center">
        <span className="text-[10px] tracking-[0.22em] uppercase" style={{ color: "#C4956A" }}>R2PB</span>
      </div>
    </div>
  );
}
