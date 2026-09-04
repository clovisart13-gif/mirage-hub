const base = import.meta.env.BASE_URL;

export default function OB1Boas() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
      />
      <div
        className="absolute right-0 top-0 w-[45vw] h-full"
        style={{ background: "linear-gradient(135deg, #4338CA 0%, #6366F1 100%)" }}
      />

      <div className="relative flex flex-col justify-center pl-[7vw] w-[52vw]">
        <img
          src={`${base}logo-color.png`}
          crossOrigin="anonymous"
          alt="Mirage Hub"
          className="mb-[4vh]"
          style={{ height: "5vh", width: "auto", maxWidth: "28vw", objectFit: "contain", display: "block" }}
        />
        <h1
          className="font-display font-extrabold text-text leading-none tracking-tight mb-[3vh]"
          style={{ fontSize: "5.5vw", textWrap: "balance" }}
        >
          Bem-vindo ao<br />Mirage Hub
        </h1>
        <p
          className="font-body text-muted"
          style={{ fontSize: "2.1vw", maxWidth: "38vw" }}
        >
          Você agora tem acesso ao seu ecossistema de gestão. Nesta apresentação você vai conhecer cada módulo e dar os primeiros passos.
        </p>
      </div>

      <div className="relative flex-1 flex flex-col justify-center items-center">
        <div className="flex flex-col items-center gap-[3vh]">
          <div
            className="w-[14vw] h-[14vw] rounded-[2vw] flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <img
              src={`${base}logo.png`}
              crossOrigin="anonymous"
              alt="Mirage Hub"
              style={{ width: "10vw", height: "auto" }}
            />
          </div>
          <span className="font-body text-white/70" style={{ fontSize: "1.6vw" }}>Gestão para confecção</span>
        </div>
      </div>
    </div>
  );
}
