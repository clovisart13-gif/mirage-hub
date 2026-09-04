export default function Slide2Problema() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div className="absolute left-0 top-0 w-[0.6vw] h-full bg-primary" />

      <div className="flex flex-col justify-center pl-[8vw] pr-[6vw] w-full">
        <span
          className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.6vw" }}
        >
          O problema
        </span>
        <h2
          className="font-display font-black text-text leading-none tracking-tight mb-[5vh]"
          style={{ fontSize: "5.5vw", textWrap: "balance" }}
        >
          A confecção brasileira ainda gerencia no improviso
        </h2>

        <div className="grid grid-cols-2 gap-[3vh] w-[80%]">
          <div className="border-l-[0.3vw] border-primary pl-[2vw] py-[1vh]">
            <p className="font-body font-semibold text-text" style={{ fontSize: "2.2vw" }}>
              Planilhas, WhatsApp e sistemas isolados
            </p>
          </div>
          <div className="border-l-[0.3vw] border-primary pl-[2vw] py-[1vh]">
            <p className="font-body font-semibold text-text" style={{ fontSize: "2.2vw" }}>
              Custo real do produto desconhecido
            </p>
          </div>
          <div className="border-l-[0.3vw] border-accent pl-[2vw] py-[1vh]">
            <p className="font-body font-semibold text-text" style={{ fontSize: "2.2vw" }}>
              Produção sem visibilidade de etapas
            </p>
          </div>
          <div className="border-l-[0.3vw] border-accent pl-[2vw] py-[1vh]">
            <p className="font-body font-semibold text-text" style={{ fontSize: "2.2vw" }}>
              Decisões no feeling, não em dados
            </p>
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 w-[30vw] h-[30vh]"
        style={{ background: "radial-gradient(ellipse at bottom right, rgba(90,79,219,0.18) 0%, transparent 70%)" }}
      />
    </div>
  );
}
