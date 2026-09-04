export default function Slide13Integracao() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center items-center text-center">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at center top, rgba(90,79,219,0.12) 0%, transparent 60%)" }}
      />

      <span
        className="relative font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        Integrações
      </span>
      <h2
        className="relative font-display font-black text-text leading-tight tracking-tight mb-[4vh]"
        style={{ fontSize: "5.5vw", textWrap: "balance" }}
      >
        Conectado ao seu ERP
      </h2>

      <div className="relative flex gap-[5vw] items-center mb-[4vh]">
        <div className="flex flex-col items-center gap-[2vh]">
          <div
            className="w-[16vw] h-[10vh] rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.1vw solid rgba(255,255,255,0.12)" }}
          >
            <span className="font-display font-black text-text" style={{ fontSize: "3vw" }}>Mirage</span>
          </div>
          <span className="font-body text-muted" style={{ fontSize: "1.7vw" }}>PLM · Produção · Custos</span>
        </div>

        <div className="flex flex-col items-center gap-[0.5vh]">
          <div className="w-[8vw] h-[0.15vh] bg-primary" />
          <span className="font-display font-bold text-primary" style={{ fontSize: "1.6vw" }}>API</span>
          <div className="w-[8vw] h-[0.15vh] bg-primary" />
        </div>

        <div className="flex flex-col items-center gap-[2vh]">
          <div
            className="w-[16vw] h-[10vh] rounded-2xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.05)", border: "0.1vw solid rgba(255,255,255,0.12)" }}
          >
            <span className="font-display font-black text-accent" style={{ fontSize: "3vw" }}>ERP Mirage</span>
          </div>
          <span className="font-body text-muted" style={{ fontSize: "1.7vw" }}>ERP · NF-e · Financeiro</span>
        </div>
      </div>

      <div className="relative flex gap-[3vw]">
        <div
          className="rounded-xl px-[2.5vw] py-[1.8vh]"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.1vw solid rgba(255,255,255,0.1)" }}
        >
          <p className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Pedidos sincronizados</p>
        </div>
        <div
          className="rounded-xl px-[2.5vw] py-[1.8vh]"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.1vw solid rgba(255,255,255,0.1)" }}
        >
          <p className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Clientes unificados</p>
        </div>
        <div
          className="rounded-xl px-[2.5vw] py-[1.8vh]"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.1vw solid rgba(255,255,255,0.1)" }}
        >
          <p className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Estoque em tempo real</p>
        </div>
      </div>
    </div>
  );
}
