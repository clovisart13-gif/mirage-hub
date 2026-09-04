export default function OB7Comunidade() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "#F7F8FC" }}>
      <div
        className="w-[40vw] h-full flex flex-col justify-center pl-[7vw] pr-[4vw]"
        style={{ background: "linear-gradient(180deg, #06B6D4 0%, #0891B2 100%)" }}
      >
        <span className="font-display font-bold text-white/70 uppercase tracking-widest mb-[2vh]" style={{ fontSize: "1.5vw" }}>
          Módulo 5
        </span>
        <h2 className="font-display font-extrabold text-white leading-tight tracking-tight mb-[2vh]" style={{ fontSize: "4.8vw" }}>
          Moda<br />Conecta
        </h2>
        <p className="font-body text-white/80" style={{ fontSize: "1.85vw", maxWidth: "28vw" }}>
          A maior rede B2B do vestuário. Fornecedores verificados, fórum e vagas em um só lugar.
        </p>
        <div className="mt-[3vh] flex flex-col gap-[1.5vh]">
          {[
            { n: '500+', l: 'fornecedores' },
            { n: '1 clique', l: 'para cotar' },
            { n: 'Grátis', l: 'para fornecedores' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-[1.5vw]">
              <span className="font-display font-black text-white" style={{ fontSize: "2.5vw" }}>{s.n}</span>
              <span className="font-body text-white/70" style={{ fontSize: "1.7vw" }}>{s.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Painel do sistema */}
      <div className="flex-1 flex flex-col justify-center px-[4vw] gap-[2vh]">
        {/* Barra de busca */}
        <div className="bg-white rounded-xl px-[2vw] py-[1.2vh] flex items-center gap-[1vw] shadow-sm border border-slate-100">
          <span className="text-slate-400" style={{ fontSize: "1.8vw" }}>🔍</span>
          <span className="font-body text-slate-400" style={{ fontSize: "1.5vw" }}>Buscar fornecedor ou categoria...</span>
        </div>

        {/* Cards de fornecedor */}
        {[
          { name: 'TecidosBR Premium', tag: 'Tecidos planos · SP', stars: 5, cor: '#06B6D4' },
          { name: 'FastFacção Sul', tag: 'Facção completa · RS', stars: 5, cor: '#0891B2' },
          { name: 'AviaModa Center', tag: 'Aviamentos · MG', stars: 4, cor: '#0E7490' },
        ].map(s => (
          <div key={s.name} className="bg-white rounded-xl px-[2vw] py-[1.8vh] shadow-sm border border-slate-100 flex items-center gap-[2vw]">
            <div className="w-[5vw] h-[5vw] rounded-xl flex items-center justify-center shrink-0" style={{ background: s.cor + '22' }}>
              <span className="font-display font-black" style={{ fontSize: "1.8vw", color: s.cor }}>{s.name.slice(0,2)}</span>
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-slate-800" style={{ fontSize: "1.7vw" }}>{s.name}</p>
              <p className="font-body text-slate-500" style={{ fontSize: "1.45vw" }}>{s.tag}</p>
              <div className="flex gap-[0.25vw] mt-[0.5vh]">
                {Array.from({length: s.stars}).map((_,i) => <span key={i} style={{ fontSize:"1.3vw", color: '#F59E0B' }}>★</span>)}
              </div>
            </div>
            <div className="flex flex-col items-end gap-[0.8vh]">
              <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-[1vw] py-[0.3vh] font-body" style={{ fontSize: "1.3vw" }}>✓ Verificado</span>
              <span className="bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-lg px-[1.2vw] py-[0.5vh] font-display font-bold" style={{ fontSize: "1.4vw" }}>Cotar agora</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
