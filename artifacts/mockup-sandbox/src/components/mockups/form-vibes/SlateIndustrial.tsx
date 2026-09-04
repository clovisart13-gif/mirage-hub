export default function SlateIndustrial() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
      {/* Progress bar */}
      <div className="w-full h-[2px]" style={{ background: "#F0F0F0" }}>
        <div className="h-full" style={{ width: "25%", background: "#3B5BDB" }} />
      </div>

      {/* Header */}
      <div className="px-8 pt-5 pb-3 flex items-center justify-between border-b" style={{ borderColor: "#F0F0F0" }}>
        <button className="text-xs flex items-center gap-1.5" style={{ color: "#888" }}>
          ← Voltar
        </button>
        <img src="/onboarding-portal/logo-r2pb.png" alt="R2PB"
          className="h-6 w-auto object-contain absolute left-1/2 -translate-x-1/2"
          style={{ filter: "brightness(0)" }} />
        <span className="text-[10px] font-mono" style={{ color: "#3B5BDB", letterSpacing: "0.08em" }}>01 / 04</span>
      </div>

      {/* Subtitle */}
      <div className="px-8 pt-2 pb-1">
        <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: "#ABABAB" }}>
          R2PB · Cadastro de Fornecedor
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-5 max-w-md mx-auto w-full space-y-7">
        <div className="space-y-1">
          <div className="text-[9px] font-mono uppercase tracking-[0.25em] mb-3" style={{ color: "#3B5BDB" }}>
            ETAPA 1 — IDENTIFICAÇÃO
          </div>
          <h1 className="text-[22px] font-bold leading-tight" style={{ color: "#0F0F0F", letterSpacing: "-0.02em" }}>
            Vamos começar<br />pelo básico
          </h1>
          <p className="text-xs" style={{ color: "#888" }}>
            Nome, WhatsApp e empresa — para entrarmos em contato.
          </p>
        </div>

        <div className="space-y-2">
          {["Seu nome completo *", "WhatsApp com DDD *", "Nome da empresa ou ateliê (opcional)", "E-mail (opcional)"].map((p, i) => (
            <div key={i} className="relative">
              <input
                readOnly
                placeholder={p}
                className="w-full px-3 py-3 text-sm outline-none"
                style={{
                  background: "#FAFAFA",
                  border: "1px solid #E5E5E5",
                  borderRadius: "4px",
                  color: "#0F0F0F",
                }}
              />
            </div>
          ))}
        </div>

        <button
          className="w-full py-3.5 text-sm font-semibold tracking-wide flex items-center justify-center gap-2"
          style={{ background: "#3B5BDB", color: "#FFFFFF", borderRadius: "4px", opacity: 0.35 }}
        >
          Continuar →
        </button>

        <p className="text-[10px] text-center" style={{ color: "#CCCCCC" }}>
          Nenhum dado é compartilhado com terceiros.
        </p>
      </div>

      <div className="pb-5 px-8 border-t" style={{ borderColor: "#F0F0F0" }}>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-center mt-4" style={{ color: "#CCCCCC" }}>R2PB</p>
      </div>
    </div>
  );
}
