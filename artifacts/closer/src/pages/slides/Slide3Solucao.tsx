export default function Slide3Solucao() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center items-center">
      <div className="absolute top-0 left-0 w-full h-[0.5vh] bg-primary" />

      <span
        className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.6vw" }}
      >
        A solução
      </span>

      <h2
        className="font-display font-black text-text text-center leading-none tracking-tight mb-[2vh]"
        style={{ fontSize: "5vw", textWrap: "balance" }}
      >
        Um único hub com 6 módulos integrados
      </h2>

      <p
        className="font-body text-muted text-center mb-[5vh]"
        style={{ fontSize: "2vw" }}
      >
        Cada módulo resolve um problema real da confecção.
      </p>

      <div className="grid grid-cols-6 gap-[2vw] w-[86vw]">
        <div className="flex flex-col items-center gap-[1vh]">
          <div className="w-[8vw] h-[8vw] rounded-full bg-primary flex items-center justify-center">
            <span className="font-display font-black text-text" style={{ fontSize: "1.8vw" }}>PLM</span>
          </div>
          <span className="font-body font-semibold text-text text-center" style={{ fontSize: "1.7vw" }}>Produto</span>
        </div>
        <div className="flex flex-col items-center gap-[1vh]">
          <div className="w-[8vw] h-[8vw] rounded-full bg-primary flex items-center justify-center">
            <span className="font-display font-black text-text" style={{ fontSize: "1.5vw" }}>PROD</span>
          </div>
          <span className="font-body font-semibold text-text text-center" style={{ fontSize: "1.7vw" }}>Produção</span>
        </div>
        <div className="flex flex-col items-center gap-[1vh]">
          <div className="w-[8vw] h-[8vw] rounded-full bg-accent flex items-center justify-center">
            <span className="font-display font-black text-bg" style={{ fontSize: "1.5vw" }}>CUSTO</span>
          </div>
          <span className="font-body font-semibold text-text text-center" style={{ fontSize: "1.7vw" }}>Custos</span>
        </div>
        <div className="flex flex-col items-center gap-[1vh]">
          <div className="w-[8vw] h-[8vw] rounded-full bg-primary flex items-center justify-center">
            <span className="font-display font-black text-text" style={{ fontSize: "1.5vw" }}>REL</span>
          </div>
          <span className="font-body font-semibold text-text text-center" style={{ fontSize: "1.7vw" }}>Relatórios</span>
        </div>
        <div className="flex flex-col items-center gap-[1vh]">
          <div className="w-[8vw] h-[8vw] rounded-full bg-primary flex items-center justify-center">
            <span className="font-display font-black text-text" style={{ fontSize: "1.3vw" }}>MC</span>
          </div>
          <span className="font-body font-semibold text-text text-center" style={{ fontSize: "1.7vw" }}>Moda Conecta</span>
        </div>
        <div className="flex flex-col items-center gap-[1vh]">
          <div className="w-[8vw] h-[8vw] rounded-full bg-primary flex items-center justify-center">
            <span className="font-display font-black text-text" style={{ fontSize: "1.8vw" }}>CRM</span>
          </div>
          <span className="font-body font-semibold text-text text-center" style={{ fontSize: "1.7vw" }}>CRM</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[0.5vh] bg-accent" />
    </div>
  );
}
