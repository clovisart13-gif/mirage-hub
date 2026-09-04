export default function Slide12Planos() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center px-[7vw]">
      <div className="absolute top-0 left-0 w-full h-[0.5vh] bg-primary" />

      <span
        className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        Planos
      </span>
      <h2
        className="font-display font-black text-text leading-none tracking-tight mb-[4vh]"
        style={{ fontSize: "5vw" }}
      >
        Pague pelo que usar
      </h2>

      <div className="flex gap-[2.5vw]">
        <div
          className="flex-1 rounded-2xl px-[2.5vw] py-[3vh] flex flex-col gap-[1.5vh]"
          style={{ background: "rgba(255,255,255,0.04)", border: "0.1vw solid rgba(255,255,255,0.1)" }}
        >
          <p className="font-display font-bold text-text" style={{ fontSize: "2.2vw" }}>Essencial</p>
          <div className="flex items-baseline gap-[0.5vw]">
            <span className="font-display font-black text-primary" style={{ fontSize: "3.5vw" }}>Hub</span>
            <span className="font-body text-muted" style={{ fontSize: "1.6vw" }}>+ 1 módulo</span>
          </div>
          <div className="flex flex-col gap-[0.8vh] mt-[1vh]">
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Hub Central</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>1 módulo à escolha</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>1 tenant</span>
            </div>
          </div>
        </div>
        <div
          className="flex-1 rounded-2xl px-[2.5vw] py-[3vh] flex flex-col gap-[1.5vh]"
          style={{ background: "rgba(90,79,219,0.15)", border: "0.1vw solid rgba(90,79,219,0.4)" }}
        >
          <p className="font-display font-bold text-text" style={{ fontSize: "2.2vw" }}>Profissional</p>
          <div className="flex items-baseline gap-[0.5vw]">
            <span className="font-display font-black text-primary" style={{ fontSize: "3.5vw" }}>Hub</span>
            <span className="font-body text-muted" style={{ fontSize: "1.6vw" }}>+ módulos PLM e Produção</span>
          </div>
          <div className="flex flex-col gap-[0.8vh] mt-[1vh]">
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>PLM completo</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Produção Kanban</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-primary flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Custos e Relatórios</span>
            </div>
          </div>
        </div>
        <div
          className="flex-1 rounded-2xl px-[2.5vw] py-[3vh] flex flex-col gap-[1.5vh]"
          style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.18) 0%, rgba(90,79,219,0.12) 100%)", border: "0.1vw solid rgba(245,166,35,0.4)" }}
        >
          <p className="font-display font-bold text-accent" style={{ fontSize: "2.2vw" }}>Ecossistema</p>
          <div className="flex items-baseline gap-[0.5vw]">
            <span className="font-display font-black text-accent" style={{ fontSize: "3.5vw" }}>Full</span>
            <span className="font-body text-muted" style={{ fontSize: "1.6vw" }}>acesso completo</span>
          </div>
          <div className="flex flex-col gap-[0.8vh] mt-[1vh]">
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-accent flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Todos os 6 módulos</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-accent flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Moda Conecta prioritária</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-accent flex-shrink-0" />
              <span className="font-body text-muted" style={{ fontSize: "1.8vw" }}>Integração ERP Mirage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
