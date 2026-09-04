const base = import.meta.env.BASE_URL;

export default function OB8Passos() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex flex-col justify-center items-center text-center"
      style={{ background: "linear-gradient(135deg, #4338CA 0%, #6366F1 50%, #4338CA 100%)" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 65%)" }}
      />

      <div className="relative mb-[3vh]">
        <img
          src={`${base}logo.png`}
          crossOrigin="anonymous"
          alt="Mirage Hub"
          style={{ height: "6vh", width: "auto", filter: "brightness(0) invert(1)", opacity: 0.9 }}
        />
      </div>

      <h2
        className="relative font-display font-extrabold text-white leading-tight tracking-tight mb-[5vh]"
        style={{ fontSize: "5vw" }}
      >
        Próximos passos
      </h2>

      <div className="relative flex gap-[4vw] mb-[5vh]">
        <div className="flex flex-col items-center gap-[1.5vh] w-[18vw]">
          <div
            className="w-[8vw] h-[8vw] rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", border: "0.15vw solid rgba(255,255,255,0.3)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "3.5vw" }}>1</span>
          </div>
          <p className="font-body font-semibold text-white" style={{ fontSize: "1.9vw" }}>Configure seu perfil e dados da empresa</p>
        </div>
        <div className="flex flex-col items-center gap-[1.5vh] w-[18vw]">
          <div
            className="w-[8vw] h-[8vw] rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)", border: "0.15vw solid rgba(255,255,255,0.3)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "3.5vw" }}>2</span>
          </div>
          <p className="font-body font-semibold text-white" style={{ fontSize: "1.9vw" }}>Cadastre seus materiais no PLM</p>
        </div>
        <div className="flex flex-col items-center gap-[1.5vh] w-[18vw]">
          <div
            className="w-[8vw] h-[8vw] rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.25)", border: "0.15vw solid rgba(255,255,255,0.5)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "3.5vw" }}>3</span>
          </div>
          <p className="font-body font-semibold text-white" style={{ fontSize: "1.9vw" }}>Crie seu primeiro pedido de produção</p>
        </div>
      </div>

      <p className="relative font-body text-white/70" style={{ fontSize: "1.8vw" }}>
        suporte@gestaomirage.com.br
      </p>
    </div>
  );
}
