export default function Slide7Publico() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center items-center text-center">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center, rgba(90,79,219,0.15) 0%, transparent 65%)" }}
      />

      <span
        className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        Para quem é
      </span>

      <h2
        className="font-display font-black text-text leading-none tracking-tight mb-[5vh]"
        style={{ fontSize: "5.5vw", textWrap: "balance" }}
      >
        Para confecções que querem crescer
      </h2>

      <div className="flex gap-[4vw] mb-[5vh]">
        <div className="flex flex-col items-center gap-[1.5vh]">
          <div
            className="w-[16vw] py-[2.5vh] flex flex-col items-center justify-center"
            style={{ border: "0.15vw solid rgba(90,79,219,0.5)", borderRadius: "1vw" }}
          >
            <span className="font-display font-black text-primary" style={{ fontSize: "2.5vw" }}>PME</span>
            <span className="font-body text-muted mt-[0.5vh]" style={{ fontSize: "1.7vw" }}>Porte médio e pequeno</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-[1.5vh]">
          <div
            className="w-[16vw] py-[2.5vh] flex flex-col items-center justify-center"
            style={{ border: "0.15vw solid rgba(90,79,219,0.5)", borderRadius: "1vw" }}
          >
            <span className="font-display font-black text-primary" style={{ fontSize: "2.5vw" }}>Indústria</span>
            <span className="font-body text-muted mt-[0.5vh]" style={{ fontSize: "1.7vw" }}>Moda própria ou terceirizada</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-[1.5vh]">
          <div
            className="w-[16vw] py-[2.5vh] flex flex-col items-center justify-center"
            style={{ border: "0.15vw solid rgba(245,166,35,0.5)", borderRadius: "1vw" }}
          >
            <span className="font-display font-black text-accent" style={{ fontSize: "2.5vw" }}>Facção</span>
            <span className="font-body text-muted mt-[0.5vh]" style={{ fontSize: "1.7vw" }}>Prestadores de serviço</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-[1.5vh]">
          <div
            className="w-[16vw] py-[2.5vh] flex flex-col items-center justify-center"
            style={{ border: "0.15vw solid rgba(245,166,35,0.5)", borderRadius: "1vw" }}
          >
            <span className="font-display font-black text-accent" style={{ fontSize: "2.5vw" }}>Ateliê</span>
            <span className="font-body text-muted mt-[0.5vh]" style={{ fontSize: "1.7vw" }}>Desenvolvimento de produto</span>
          </div>
        </div>
      </div>

      <p
        className="font-body text-muted"
        style={{ fontSize: "2vw" }}
      >
        Assine e ative apenas os módulos que precisa.
      </p>
    </div>
  );
}
