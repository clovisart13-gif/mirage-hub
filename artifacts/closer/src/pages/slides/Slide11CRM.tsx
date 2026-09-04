export default function Slide11CRM() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center px-[7vw]">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at bottom left, rgba(245,166,35,0.09) 0%, transparent 60%)" }}
      />

      <span
        className="relative font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        CRM
      </span>
      <h2
        className="relative font-display font-black text-text leading-none tracking-tight mb-[4vh]"
        style={{ fontSize: "5.5vw", textWrap: "balance" }}
      >
        Carteira de clientes centralizada
      </h2>

      <div className="relative flex gap-[3vw]">
        <div className="flex-1 flex flex-col gap-[2.5vh]">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-[2.5vw] py-[2.5vh]">
            <p className="font-display font-bold text-text mb-[0.8vh]" style={{ fontSize: "2vw" }}>Histórico por cliente</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>
              Todos os pedidos, orçamentos e interações em uma linha do tempo
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-[2.5vw] py-[2.5vh]">
            <p className="font-display font-bold text-text mb-[0.8vh]" style={{ fontSize: "2vw" }}>Ticket médio e recorrência</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>
              Analise quais clientes compram mais e com qual frequência
            </p>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-[2.5vh]">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-[2.5vw] py-[2.5vh]">
            <p className="font-display font-bold text-accent mb-[0.8vh]" style={{ fontSize: "2vw" }}>Integração PLM</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>
              Clientes vinculados a produtos e fichas técnicas do desenvolvimento
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl px-[2.5vw] py-[2.5vh]">
            <p className="font-display font-bold text-accent mb-[0.8vh]" style={{ fontSize: "2vw" }}>Integração ERP</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>
              Sincronização nativa de pedidos e faturamento via ERP Mirage
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
