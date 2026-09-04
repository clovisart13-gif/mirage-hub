const base = import.meta.env.BASE_URL;

export default function Slide1Capa() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg">
      <img
        src={`${base}hero.png`}
        crossOrigin="anonymous"
        alt="Fábrica de confecção"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(14,15,17,0.90) 0%, rgba(90,79,219,0.50) 60%, rgba(14,15,17,0.80) 100%)" }}
      />

      <div className="absolute top-[5vh] left-[5vw]">
        <img
          src={`${base}logo.png`}
          crossOrigin="anonymous"
          alt="Mirage Hub"
          style={{ height: "6vh", width: "auto" }}
        />
      </div>

      <div className="absolute inset-0 flex flex-col justify-end pb-[9vh] pl-[7vw]">
        <div className="w-[4vw] h-[0.4vh] bg-accent mb-[2.5vh]" />
        <h1
          className="font-display font-black text-text leading-none tracking-tighter"
          style={{ fontSize: "9vw", textWrap: "balance" }}
        >
          MIRAGE HUB
        </h1>
        <p
          className="font-body font-semibold text-text mt-[2vh]"
          style={{ fontSize: "2.4vw", opacity: 0.85 }}
        >
          O ecossistema de gestão para confecção brasileira
        </p>
        <p
          className="font-body text-muted mt-[1.2vh]"
          style={{ fontSize: "1.8vw" }}
        >
          Produção · Produto · Custos · Vendas — em um só lugar.
        </p>
      </div>

      <div className="absolute top-[5vh] right-[5vw]">
        <span
          className="font-display font-bold text-accent tracking-widest uppercase"
          style={{ fontSize: "1.6vw" }}
        >
          gestaomirage.com.br
        </span>
      </div>
    </div>
  );
}
