export default function Slide4PLM() {
  const fichas = [
    { cod: 'CAM-0041', nome: 'Camisa Social Slim', status: 'Aprovado', statusColor: '#10B981', prog: 100 },
    { cod: 'FT-0028', nome: 'Vestido Linho Premium', status: 'Pilotagem', statusColor: '#F59E0B', prog: 75 },
    { cod: 'BLU-0019', nome: 'Blusa Cropped Elastano', status: 'BOM', statusColor: '#6366F1', prog: 50 },
    { cod: 'CAL-0033', nome: 'Calça Alfaiataria', status: 'Ficha Técnica', statusColor: '#8B5CF6', prog: 25 },
  ];
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div
        className="w-[42vw] h-full flex flex-col justify-center pl-[7vw] pr-[4vw]"
        style={{ background: "linear-gradient(180deg, #0E0F11 0%, rgba(90,79,219,0.12) 100%)" }}
      >
        <span className="font-display font-bold text-accent uppercase tracking-widest mb-[2vh]" style={{ fontSize: "1.5vw" }}>
          PLM — Produto
        </span>
        <h2 className="font-display font-black text-text leading-none tracking-tight mb-[3vh]" style={{ fontSize: "5.2vw", textWrap: "balance" }}>
          Do conceito ao produto aprovado
        </h2>
        <div className="flex flex-col gap-[2vh]">
          {[
            { t: 'Fichas Técnicas', d: 'Medidas, componentes, instruções — tudo versionado.' },
            { t: 'BOM e Custos', d: 'Lista de materiais com custo real por peça, automático.' },
            { t: 'Modelagem e Pilotagem', d: 'Do molde ao piloto aprovado com rastreio completo.' },
          ].map(f => (
            <div key={f.t} className="bg-white/5 border border-white/10 rounded-xl px-[2.5vw] py-[2vh]">
              <p className="font-display font-bold text-accent mb-[0.6vh]" style={{ fontSize: "1.7vw" }}>{f.t}</p>
              <p className="font-body text-muted" style={{ fontSize: "1.75vw" }}>{f.d}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mockup do dashboard PLM */}
      <div className="flex-1 flex flex-col justify-center pr-[4vw] pl-[3vw] gap-[1.5vh]">
        {/* Header do painel */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-[2vw] py-[1.5vh] flex items-center justify-between">
          <span className="font-display font-bold text-text" style={{ fontSize: "1.7vw" }}>📦 PLM Dashboard</span>
          <div className="flex gap-[1vw]">
            {[['4', 'Aprovados', '#10B981'], ['2', 'Em Piloto', '#F59E0B'], ['3', 'Rascunho', '#6366F1']].map(([n, l, c]) => (
              <div key={l} className="text-center px-[1.2vw] py-[0.6vh] rounded-lg bg-white/5 border border-white/10">
                <p className="font-display font-black" style={{ fontSize: "2vw", color: c }}>{n}</p>
                <p className="font-body text-muted" style={{ fontSize: "1.2vw" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de fichas */}
        {fichas.map(f => (
          <div key={f.cod} className="bg-white/6 border border-white/10 rounded-xl px-[2vw] py-[1.8vh] flex items-center gap-[2vw]">
            <div className="flex flex-col w-[5vw] shrink-0 items-center justify-center bg-white/5 rounded-lg py-[1vh] px-[0.5vw]">
              <span className="font-display font-black text-accent" style={{ fontSize: "1.2vw" }}>{f.cod.split('-')[0]}</span>
              <span className="font-body text-muted" style={{ fontSize: "1vw" }}>{f.cod.split('-')[1]}</span>
            </div>
            <div className="flex-1">
              <p className="font-display font-bold text-text" style={{ fontSize: "1.6vw" }}>{f.nome}</p>
              <div className="flex items-center gap-[1vw] mt-[0.6vh]">
                <div className="flex-1 bg-white/10 rounded-full h-[0.6vh]">
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.prog}%`, background: f.statusColor }} />
                </div>
                <span className="font-body shrink-0" style={{ fontSize: "1.3vw", color: f.statusColor }}>{f.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute left-[42vw] top-[10vh] bottom-[10vh] w-[0.15vw] bg-primary/40" />
    </div>
  );
}
