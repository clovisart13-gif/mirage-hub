export default function Slide14Seguranca() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div className="absolute top-0 left-0 w-full h-[0.5vh] bg-accent" />

      <div className="flex flex-col justify-center pl-[7vw] w-[52vw]">
        <span
          className="font-display font-bold text-accent uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.5vw" }}
        >
          Segurança e infraestrutura
        </span>
        <h2
          className="font-display font-black text-text leading-none tracking-tight mb-[3vh]"
          style={{ fontSize: "5vw", textWrap: "balance" }}
        >
          Dados da sua empresa só da sua empresa
        </h2>
        <p
          className="font-body text-muted"
          style={{ fontSize: "2vw", maxWidth: "40vw" }}
        >
          Arquitetura multi-tenant com isolamento total entre clientes. Suas informações são inacessíveis a outros usuários da plataforma.
        </p>
      </div>

      <div className="flex-1 flex flex-col justify-center pr-[7vw] gap-[2.5vh]">
        <div className="flex items-start gap-[2vw]">
          <div className="w-[0.4vw] h-[6vh] bg-primary flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2vw" }}>Multi-tenant isolado</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Dados completamente separados por empresa</p>
          </div>
        </div>
        <div className="flex items-start gap-[2vw]">
          <div className="w-[0.4vw] h-[6vh] bg-primary flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2vw" }}>Autenticação segura</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Sessões autenticadas com controle de acesso por perfil</p>
          </div>
        </div>
        <div className="flex items-start gap-[2vw]">
          <div className="w-[0.4vw] h-[6vh] bg-accent flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2vw" }}>Acesso granular</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Super admin com visibilidade de suporte sem acesso a dados sensíveis</p>
          </div>
        </div>
        <div className="flex items-start gap-[2vw]">
          <div className="w-[0.4vw] h-[6vh] bg-accent flex-shrink-0" />
          <div>
            <p className="font-display font-bold text-text" style={{ fontSize: "2vw" }}>Backup contínuo</p>
            <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Banco de dados com replicação e backup automático diário</p>
          </div>
        </div>
      </div>
    </div>
  );
}
