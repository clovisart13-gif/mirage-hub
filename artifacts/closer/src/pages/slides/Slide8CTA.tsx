const base = import.meta.env.BASE_URL;

export default function Slide8CTA() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0E0F11 0%, #1a1730 50%, #0E0F11 100%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(245,166,35,0.12) 0%, transparent 60%)" }} />

      <div className="relative flex flex-col justify-center pl-[8vw] w-[55vw]">
        <div className="w-[5vw] h-[0.5vh] bg-accent mb-[3vh]" />
        <h2
          className="font-display font-black text-text leading-none tracking-tight mb-[3vh]"
          style={{ fontSize: "7vw" }}
        >
          COMECE<br />AGORA
        </h2>
        <p
          className="font-body text-muted mb-[4vh]"
          style={{ fontSize: "2.1vw" }}
        >
          Acesso imediato após assinatura.
        </p>

        <div className="flex flex-col gap-[1.5vh]">
          <div className="flex items-center gap-[1.5vw]">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-accent flex-shrink-0" />
            <span className="font-body font-semibold text-text" style={{ fontSize: "2vw" }}>
              gestaomirage.com.br
            </span>
          </div>
          <div className="flex items-center gap-[1.5vw]">
            <div className="w-[0.5vw] h-[0.5vw] rounded-full bg-accent flex-shrink-0" />
            <span className="font-body font-semibold text-text" style={{ fontSize: "2vw" }}>
              Planos a partir de R$ [valor] / mês
            </span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col justify-center items-center pr-[6vw] gap-[3vh]">
        <div
          className="w-[26vw] h-[26vw] rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.12) 0%, rgba(90,79,219,0.18) 100%)", border: "0.15vw solid rgba(245,166,35,0.3)" }}
        >
          <img
            src={`${base}logo.png`}
            crossOrigin="anonymous"
            alt="Mirage Hub"
            style={{ width: "16vw", height: "auto" }}
          />
        </div>
      </div>
    </div>
  );
}
