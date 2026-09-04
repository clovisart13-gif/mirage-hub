export default function OB9bAprovacao() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#F7F8FC" }}
    >
      <div className="flex flex-col justify-center pl-[7vw] w-[48vw]">
        <span
          className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.5vw" }}
        >
          Orçamentos — Aprovação
        </span>
        <h2
          className="font-display font-extrabold text-text leading-tight tracking-tight mb-[3vh]"
          style={{ fontSize: "4.8vw", textWrap: "balance" }}
        >
          Fluxo de aprovação do cliente
        </h2>
        <p
          className="font-body text-muted"
          style={{ fontSize: "2vw", maxWidth: "38vw" }}
        >
          Do cálculo ao "aprovado" do cliente, tudo dentro da plataforma — sem WhatsApp, sem e-mail avulso.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center pr-[7vw] gap-[1.8vh]">
        <div className="flex items-center gap-[2vw]">
          <div
            className="w-[4.5vw] h-[4.5vw] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4338CA, #6366F1)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>1</span>
          </div>
          <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Calcule o custo e monte o orçamento</p>
        </div>
        <div className="ml-[2.25vw] w-[0.15vw] h-[3vh] bg-gray-200" />
        <div className="flex items-center gap-[2vw]">
          <div
            className="w-[4.5vw] h-[4.5vw] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4338CA, #6366F1)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>2</span>
          </div>
          <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Gere o PDF com 1 clique</p>
        </div>
        <div className="ml-[2.25vw] w-[0.15vw] h-[3vh] bg-gray-200" />
        <div className="flex items-center gap-[2vw]">
          <div
            className="w-[4.5vw] h-[4.5vw] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #4338CA, #6366F1)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>3</span>
          </div>
          <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Envie por e-mail com link de aprovação</p>
        </div>
        <div className="ml-[2.25vw] w-[0.15vw] h-[3vh] bg-gray-200" />
        <div className="flex items-center gap-[2vw]">
          <div
            className="w-[4.5vw] h-[4.5vw] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}
          >
            <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>4</span>
          </div>
          <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Cliente aprova — histórico salvo automaticamente</p>
        </div>
      </div>
    </div>
  );
}
