export default function OB13CRM() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#F7F8FC" }}
    >
      <div
        className="w-[38vw] h-full flex flex-col justify-center pl-[7vw] pr-[4vw]"
        style={{ background: "linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)" }}
      >
        <span
          className="font-display font-bold text-white/70 uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.5vw" }}
        >
          Módulo CRM
        </span>
        <h2
          className="font-display font-extrabold text-white leading-tight tracking-tight"
          style={{ fontSize: "5vw" }}
        >
          Carteira de clientes
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center px-[5vw] gap-[2.8vh]">
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-text mb-[0.8vh]" style={{ fontSize: "2vw" }}>Histórico completo</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Todos os pedidos, orçamentos e interações por cliente em uma linha do tempo</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-text mb-[0.8vh]" style={{ fontSize: "2vw" }}>Ticket médio e recorrência</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Identifique os clientes mais rentáveis e os que precisam de atenção</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-accent mb-[0.8vh]" style={{ fontSize: "2vw" }}>Vinculado ao PLM</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Veja os produtos desenvolvidos para cada cliente com histórico de aprovações</p>
        </div>
      </div>
    </div>
  );
}
