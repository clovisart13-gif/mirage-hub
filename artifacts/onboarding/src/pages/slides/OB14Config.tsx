export default function OB14Config() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-center px-[7vw]"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div
        className="absolute right-0 top-0 w-[35vw] h-full"
        style={{ background: "radial-gradient(ellipse at top right, rgba(67,56,202,0.07) 0%, transparent 65%)" }}
      />

      <span
        className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        Conta e configurações
      </span>
      <h2
        className="font-display font-extrabold text-text leading-tight tracking-tight mb-[4vh]"
        style={{ fontSize: "4.5vw" }}
      >
        Configure sua empresa
      </h2>

      <div className="grid grid-cols-2 gap-[2.5vw]" style={{ maxWidth: "78vw" }}>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-primary mb-[0.8vh]" style={{ fontSize: "2vw" }}>Dados da empresa</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>CNPJ, razão social, endereço e logo para seus documentos</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-primary mb-[0.8vh]" style={{ fontSize: "2vw" }}>Usuários e acessos</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Convide sua equipe e controle o nível de acesso de cada pessoa</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-accent mb-[0.8vh]" style={{ fontSize: "2vw" }}>Assinatura e plano</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Veja seu plano atual, histórico de pagamentos e adicione módulos</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl px-[2.5vw] py-[2.5vh] shadow-sm">
          <p className="font-display font-bold text-accent mb-[0.8vh]" style={{ fontSize: "2vw" }}>Recuperação de acesso</p>
          <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Redefina sua senha pela tela de login a qualquer momento</p>
        </div>
      </div>
    </div>
  );
}
