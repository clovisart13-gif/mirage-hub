export default function Slide7FinancAuto() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div className="absolute top-0 left-0 w-full h-[0.5vh] bg-accent" />

      <div className="flex flex-col justify-center pl-[7vw] w-[48vw]">
        <span
          className="font-display font-bold text-accent uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.5vw" }}
        >
          Produção — Financeiro
        </span>
        <h2
          className="font-display font-black text-text leading-none tracking-tight mb-[3vh]"
          style={{ fontSize: "5vw", textWrap: "balance" }}
        >
          Contas a pagar geradas automaticamente
        </h2>
        <p
          className="font-body text-muted"
          style={{ fontSize: "2vw", maxWidth: "38vw" }}
        >
          Cada etapa do Kanban que avança gera as obrigações financeiras correspondentes sem nenhuma digitação manual.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center pr-[7vw] gap-[2.5vh]">
        <div className="flex items-center gap-[2vw]">
          <div className="w-[0.4vw] h-[7vh] bg-primary flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2.1vw" }}>Facção terceirizada</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Pagamento ao faccionista na conclusão de cada fase</p>
          </div>
        </div>
        <div className="flex items-center gap-[2vw]">
          <div className="w-[0.4vw] h-[7vh] bg-primary flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2.1vw" }}>Serviços de acabamento</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Lavanderia, bordado e estamparia registrados por pedido</p>
          </div>
        </div>
        <div className="flex items-center gap-[2vw]">
          <div className="w-[0.4vw] h-[7vh] bg-accent flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2.1vw" }}>Zero retrabalho financeiro</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>O financeiro vê o que foi gerado em produção em tempo real</p>
          </div>
        </div>

        <div
          className="mt-[1vh] rounded-2xl px-[2.5vw] py-[2.5vh] flex items-center gap-[3vw]"
          style={{ background: "rgba(245,166,35,0.08)", border: "0.1vw solid rgba(245,166,35,0.3)" }}
        >
          <div>
            <p className="font-display font-black text-accent" style={{ fontSize: "4vw" }}>0</p>
            <p className="font-body text-muted" style={{ fontSize: "1.7vw" }}>digitações manuais</p>
          </div>
          <div className="w-[0.1vw] h-[8vh] bg-white/10" />
          <div>
            <p className="font-display font-black text-text" style={{ fontSize: "4vw" }}>100%</p>
            <p className="font-body text-muted" style={{ fontSize: "1.7vw" }}>rastreabilidade</p>
          </div>
        </div>
      </div>
    </div>
  );
}
