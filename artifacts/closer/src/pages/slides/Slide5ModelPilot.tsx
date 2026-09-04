export default function Slide5ModelPilot() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center px-[7vw]">
      <div
        className="absolute right-0 top-0 w-[30vw] h-full"
        style={{ background: "radial-gradient(ellipse at top right, rgba(90,79,219,0.14) 0%, transparent 65%)" }}
      />

      <span
        className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        PLM — Desenvolvimento
      </span>
      <h2
        className="font-display font-black text-text leading-none tracking-tight mb-[4vh]"
        style={{ fontSize: "5.5vw", textWrap: "balance" }}
      >
        Modelagem até aprovação
      </h2>

      <div className="flex gap-[4vw]">
        <div className="flex flex-col gap-[2.5vh] w-[44vw]">
          <div className="flex items-start gap-[2vw]">
            <div
              className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex items-center justify-center bg-primary/20 border border-primary/30"
            >
              <span className="font-display font-black text-primary" style={{ fontSize: "1.6vw" }}>01</span>
            </div>
            <div>
              <p className="font-display font-bold text-text mb-[0.5vh]" style={{ fontSize: "2vw" }}>Modelagem</p>
              <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Controle de versões de moldes com histórico de alterações por peça</p>
            </div>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div
              className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex items-center justify-center bg-primary/20 border border-primary/30"
            >
              <span className="font-display font-black text-primary" style={{ fontSize: "1.6vw" }}>02</span>
            </div>
            <div>
              <p className="font-display font-bold text-text mb-[0.5vh]" style={{ fontSize: "2vw" }}>Pilotagem</p>
              <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Registro de peças piloto com acompanhamento de ajustes e aprovação final</p>
            </div>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div
              className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex items-center justify-center bg-accent/20 border border-accent/30"
            >
              <span className="font-display font-black text-accent" style={{ fontSize: "1.6vw" }}>03</span>
            </div>
            <div>
              <p className="font-display font-bold text-text mb-[0.5vh]" style={{ fontSize: "2vw" }}>Aprovações</p>
              <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Fluxo de aprovação interno com status por responsável e data</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center gap-[2.5vh]">
          <div className="bg-white/5 border border-white/8 rounded-2xl px-[2.5vw] py-[2.5vh]">
            <p className="font-display font-bold text-accent mb-[1vh]" style={{ fontSize: "1.8vw" }}>Clientes PLM</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>
              Associe cada produto a um cliente com histórico de desenvolvimento e referências aprovadas
            </p>
          </div>
          <div className="bg-white/5 border border-white/8 rounded-2xl px-[2.5vw] py-[2.5vh]">
            <p className="font-display font-bold text-accent mb-[1vh]" style={{ fontSize: "1.8vw" }}>Histórico completo</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>
              Log de todas as alterações por produto, com rastreabilidade de versão e responsável
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
