const STEPS = [
  {
    n: '1', t: 'Cadastre materiais e fornecedores',
    d: 'Base para calcular o custo real de cada peça automaticamente.',
    tag: 'MAT-0012 · Tricoline 100% algodão · R$ 18,50/m',
    cor: '#4338CA',
  },
  {
    n: '2', t: 'Crie produtos e fichas técnicas',
    d: 'Especificações, referências, galeria e histórico de versões.',
    tag: 'CAM-0041 · Camisa Social · 42 componentes',
    cor: '#6366F1',
  },
  {
    n: '3', t: 'Monte o BOM com custo real',
    d: 'Lista de materiais com cálculo automático por peça e grade.',
    tag: 'BOM gerado · Custo: R$ 41,67/pç · Margem: 42%',
    cor: '#4338CA',
  },
];

export default function OB3PLM() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "#F7F8FC" }}>

      {/* Coluna colorida */}
      <div
        className="w-[38vw] h-full flex flex-col justify-center pl-[7vw] pr-[4vw]"
        style={{ background: "linear-gradient(180deg, #4338CA 0%, #6366F1 100%)" }}
      >
        <span className="font-display font-bold text-white/70 uppercase tracking-widest mb-[2vh]" style={{ fontSize: "1.5vw" }}>
          Módulo 1
        </span>
        <h2 className="font-display font-extrabold text-white leading-tight tracking-tight mb-[3vh]" style={{ fontSize: "5vw" }}>
          PLM<br />Produto
        </h2>
        <p className="font-body text-white/80" style={{ fontSize: "1.85vw", maxWidth: "26vw" }}>
          Do cadastro de materiais ao produto aprovado com rastreio completo.
        </p>
        {/* KPIs */}
        <div className="mt-[3vh] grid grid-cols-2 gap-[1.5vh]">
          {[['100%', 'fichas rastreadas'], ['0', 'fichas perdidas'], ['5 etapas', 'de aprovação'], ['Auto', 'custo calculado']].map(([n, l]) => (
            <div key={l} className="bg-white/10 rounded-xl px-[1.5vw] py-[1.2vh]">
              <p className="font-display font-black text-white" style={{ fontSize: "2vw" }}>{n}</p>
              <p className="font-body text-white/70" style={{ fontSize: "1.3vw" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direita: passos com preview */}
      <div className="flex-1 flex flex-col justify-center px-[4vw] gap-[2.2vh]">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-start gap-[2vw]">
            <div
              className="w-[3vw] h-[3vw] rounded-full flex items-center justify-center shrink-0 mt-[0.3vh]"
              style={{ background: s.cor }}
            >
              <span className="font-display font-black text-white" style={{ fontSize: "1.5vw" }}>{s.n}</span>
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-text mb-[0.4vh]" style={{ fontSize: "2vw" }}>{s.t}</p>
              <p className="font-body text-muted mb-[1vh]" style={{ fontSize: "1.65vw" }}>{s.d}</p>
              <div className="bg-white border border-slate-200 rounded-lg px-[1.5vw] py-[0.8vh] shadow-sm inline-flex items-center gap-[0.8vw]">
                <span style={{ fontSize: "1.3vw" }}>✓</span>
                <span className="font-body text-slate-600" style={{ fontSize: "1.3vw", fontFamily: 'monospace' }}>{s.tag}</span>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="absolute left-[44.5vw] mt-[4.5vh] w-[0.15vw] h-[3.5vh] bg-slate-200" style={{ position: 'relative', left: '-59vw', marginTop: '4vh' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
