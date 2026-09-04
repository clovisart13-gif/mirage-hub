export default function OB7bContasPagar() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-center px-[7vw]"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div className="absolute top-0 right-0 w-[40vw] h-full" style={{ background: "radial-gradient(ellipse at top right, rgba(6,182,212,0.09) 0%, transparent 60%)" }} />

      <span
        className="font-display font-bold text-accent uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        Produção — Financeiro
      </span>
      <h2
        className="font-display font-extrabold text-text leading-tight tracking-tight mb-[4vh]"
        style={{ fontSize: "4.5vw", textWrap: "balance" }}
      >
        Contas a pagar geradas na produção
      </h2>

      <div className="flex gap-[4vw]">
        <div className="flex-1">
          <p
            className="font-body text-muted mb-[3vh]"
            style={{ fontSize: "2vw", maxWidth: "40vw" }}
          >
            Ao avançar uma etapa no Kanban, o sistema gera automaticamente as obrigações financeiras do fornecedor ou faccionista responsável.
          </p>
          <div className="flex flex-col gap-[1.8vh]">
            <div className="flex items-center gap-[2vw]">
              <div className="w-[0.4vw] h-[5vh] bg-primary flex-shrink-0" />
              <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Costura concluída → pagamento ao faccionista</p>
            </div>
            <div className="flex items-center gap-[2vw]">
              <div className="w-[0.4vw] h-[5vh] bg-primary flex-shrink-0" />
              <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Lavanderia → conta registrada automaticamente</p>
            </div>
            <div className="flex items-center gap-[2vw]">
              <div className="w-[0.4vw] h-[5vh] bg-accent flex-shrink-0" />
              <p className="font-body font-semibold text-text" style={{ fontSize: "1.9vw" }}>Acabamento → valor lançado no financeiro</p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl px-[3vw] py-[3vh] flex flex-col items-center justify-center gap-[2vh]"
          style={{ background: "white", border: "0.1vw solid #E5E7EB", minWidth: "22vw", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        >
          <p className="font-display font-black text-primary text-center" style={{ fontSize: "5vw" }}>0</p>
          <p className="font-body text-muted text-center" style={{ fontSize: "1.8vw" }}>digitações manuais</p>
          <div className="h-[0.1vh] w-full bg-gray-100" />
          <p className="font-display font-black text-accent text-center" style={{ fontSize: "5vw" }}>100%</p>
          <p className="font-body text-muted text-center" style={{ fontSize: "1.8vw" }}>rastreável por pedido</p>
        </div>
      </div>
    </div>
  );
}
