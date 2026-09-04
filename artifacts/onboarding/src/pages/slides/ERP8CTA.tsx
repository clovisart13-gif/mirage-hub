const base = import.meta.env.BASE_URL;

const PASSOS = [
  { n: "01", titulo: "Assine o Hub Mirage", desc: "O ERP já está incluso — sem custo adicional de licença." },
  { n: "02", titulo: "Implantação guiada", desc: "Equipe Mirage configura o ERP com seus dados: CNPJ, produtos e regime tributário." },
  { n: "03", titulo: "Treinamento da equipe", desc: "Sessão de treinamento online para financeiro, vendas e estoque." },
  { n: "04", titulo: "Operação ativa", desc: "Sistema em produção com suporte Mirage nos primeiros 30 dias." },
];

export default function ERP8CTA() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)" }} />
      <div className="absolute right-0 top-0 w-[44vw] h-full" style={{ background: "linear-gradient(145deg, #14532d 0%, #166534 50%, #22c55e 100%)" }} />
      <div className="absolute right-0 top-0 w-[44vw] h-full opacity-20" style={{ background: "radial-gradient(ellipse at 70% 30%, #86efac 0%, transparent 55%)" }} />

      {/* Esquerda */}
      <div className="relative flex flex-col justify-center pl-[7vw] w-[53vw] pr-[4vw]">
        <img src={`${base}logo-color.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4.5vh", width: "auto", maxWidth: "22vw", objectFit: "contain", display: "block", marginBottom: "3.5vh" }} />
        <span className="font-body font-bold uppercase tracking-widest text-green-700 bg-green-100 px-[1.2vw] py-[0.5vh] rounded-full inline-block" style={{ fontSize: "1.1vw", width: "fit-content", marginBottom: "2vh" }}>Próximos passos</span>

        <h2 className="font-display font-extrabold text-slate-900 leading-tight mb-[2vh]" style={{ fontSize: "3vw" }}>
          Pronto para ter um ERP<br />
          <span style={{ color: "#16a34a" }}>integrado ao seu Hub?</span>
        </h2>

        <div className="flex flex-col gap-[1.4vh]">
          {PASSOS.map(({ n, titulo, desc }) => (
            <div key={n} className="flex items-start gap-[1.5vw]">
              <div className="w-[3vw] h-[3vw] rounded-full flex items-center justify-center shrink-0" style={{ background: "#dcfce7", border: "2px solid #16a34a" }}>
                <span className="font-display font-black" style={{ fontSize: "1.2vw", color: "#16a34a" }}>{n}</span>
              </div>
              <div className="pt-[0.2vh]">
                <p className="font-display font-bold text-slate-800" style={{ fontSize: "1.5vw" }}>{titulo}</p>
                <p className="font-body text-slate-500" style={{ fontSize: "1.2vw" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direita */}
      <div className="relative flex-1 flex flex-col justify-center items-center px-[4vw] gap-[3vh]">
        <div className="w-[14vw] h-[14vw] rounded-[2.5vw] flex items-center justify-center" style={{ background: "rgba(255,255,255,0.18)" }}>
          <img src={`${base}logo.png`} crossOrigin="anonymous" alt="Mirage" style={{ width: "10vw", height: "auto" }} />
        </div>

        <div className="text-center">
          <p className="font-display font-extrabold text-white" style={{ fontSize: "2.2vw" }}>ERP Mirage</p>
          <p className="font-body text-white/60 mt-[0.5vh]" style={{ fontSize: "1.4vw" }}>Incluso no Hub Mirage</p>
        </div>

        <div className="w-full flex flex-col gap-[1.2vh] max-w-[28vw]">
          {["Controle Financeiro completo", "NF-e integrada ao pedido", "PDV — Frente de Caixa", "Open Banking Stone", "Loja de Integrações", "Implantação guiada Mirage"].map((item) => (
            <div key={item} className="flex items-center gap-[1vw]" style={{ background: "rgba(255,255,255,0.12)", borderRadius: "0.8vw", padding: "0.8vh 1.4vw" }}>
              <span className="font-body font-bold" style={{ color: "#4ade80", fontSize: "1.3vw" }}>✓</span>
              <span className="font-body text-white/90" style={{ fontSize: "1.3vw" }}>{item}</span>
            </div>
          ))}
        </div>

        <div className="text-center mt-[1vh]">
          <p className="font-body text-white/50" style={{ fontSize: "1.2vw" }}>
            mirage.com.br · contato@mirage.com.br
          </p>
        </div>
      </div>
    </div>
  );
}
