export default function OB5bModelagem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#F7F8FC" }}
    >
      <div
        className="w-[38vw] h-full flex flex-col justify-center pl-[7vw] pr-[4vw]"
        style={{ background: "linear-gradient(180deg, #4338CA 0%, #6366F1 100%)" }}
      >
        <span
          className="font-display font-bold text-white/70 uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.5vw" }}
        >
          PLM — Desenvolvimento
        </span>
        <h2
          className="font-display font-extrabold text-white leading-tight tracking-tight"
          style={{ fontSize: "4.5vw" }}
        >
          Modelagem e Pilotagem
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center px-[5vw] gap-[3vh]">
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-text mb-[0.8vh]" style={{ fontSize: "2vw" }}>Controle de versões</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Cada alteração de molde fica registrada com data e responsável</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-text mb-[0.8vh]" style={{ fontSize: "2vw" }}>Ficha da piloto</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Registre ajustes, medidas e observações de cada peça piloto desenvolvida</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-accent mb-[0.8vh]" style={{ fontSize: "2vw" }}>Aprovação formal</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Fluxo de aprovação com status por responsável — do ateliê à diretoria</p>
        </div>
      </div>
    </div>
  );
}
