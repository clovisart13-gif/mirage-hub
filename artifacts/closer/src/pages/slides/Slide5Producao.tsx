const FASES = ['Corte', 'Costura', 'Bordado', 'Acabam.', 'QC', 'Expedição'];
const OPS = [
  { op: 'OP-0241', cliente: 'Moda Feminina SP', qtd: 320, fase: 2, prazo: '14/05', urgente: false },
  { op: 'OP-0238', cliente: 'Atacado Rio Branco', qtd: 180, fase: 4, prazo: '12/05', urgente: true },
  { op: 'OP-0236', cliente: 'Boutique Ana Lima', qtd: 60, fase: 5, prazo: '16/05', urgente: false },
  { op: 'OP-0234', cliente: 'Fashion Week BR', qtd: 450, fase: 1, prazo: '10/05', urgente: true },
];

export default function Slide5Producao() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col pl-[6vw] pr-[6vw] justify-center">
      <div className="absolute top-0 right-0 w-[35vw] h-full" style={{ background: "radial-gradient(ellipse at top right, rgba(245,166,35,0.1) 0%, transparent 65%)" }} />

      <div className="flex items-end justify-between mb-[3vh]">
        <div>
          <span className="font-display font-bold text-accent uppercase tracking-widest" style={{ fontSize: "1.5vw" }}>Produção</span>
          <h2 className="font-display font-black text-text leading-none tracking-tight" style={{ fontSize: "5vw" }}>
            Kanban em tempo real
          </h2>
        </div>
        <div className="flex gap-[3vw]">
          {[['14', 'etapas', 'text-primary'], ['100%', 'visível', 'text-accent'], ['Auto', 'financeiro', 'text-text']].map(([n, l, c]) => (
            <div key={l} className="text-right">
              <p className={`font-display font-black ${c}`} style={{ fontSize: "3.5vw" }}>{n}</p>
              <p className="font-body text-muted" style={{ fontSize: "1.5vw" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline de fases */}
      <div className="flex gap-[1vw] mb-[2.5vh] items-center">
        {FASES.map((fase, i) => (
          <div key={fase} className="flex items-center gap-[1vw]">
            <div className={`px-[1.5vw] py-[1vh] rounded-lg border text-center ${i < 2 ? 'bg-accent/15 border-accent/40' : 'bg-white/5 border-white/10'}`}>
              <p className={`font-display font-bold ${i < 2 ? 'text-accent' : 'text-muted'}`} style={{ fontSize: "1.5vw" }}>{fase}</p>
            </div>
            {i < FASES.length - 1 && <span className="text-muted/50" style={{ fontSize: "1.5vw" }}>→</span>}
          </div>
        ))}
        <span className="text-muted font-body ml-[1vw]" style={{ fontSize: "1.5vw" }}>+ 8 fases</span>
      </div>

      {/* Tabela de OPs */}
      <div className="bg-white/4 border border-white/10 rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 px-[2vw] py-[1.2vh] border-b border-white/10 bg-white/3">
          {['Ordem', 'Cliente', 'Qtd', 'Fase', 'Prazo'].map(h => (
            <span key={h} className="font-display font-bold text-muted uppercase tracking-wider" style={{ fontSize: "1.3vw" }}>{h}</span>
          ))}
        </div>
        {OPS.map(op => (
          <div key={op.op} className="grid grid-cols-5 px-[2vw] py-[1.4vh] border-b border-white/5 items-center hover:bg-white/3 transition-colors">
            <span className="font-display font-bold text-accent" style={{ fontSize: "1.5vw" }}>{op.op}</span>
            <span className="font-body text-text" style={{ fontSize: "1.45vw" }}>{op.cliente}</span>
            <span className="font-body text-muted" style={{ fontSize: "1.45vw" }}>{op.qtd} pç</span>
            <div className="flex items-center gap-[0.8vw]">
              <div className="flex gap-[0.3vw]">
                {FASES.map((_, i) => (
                  <div key={i} className={`h-[0.8vh] w-[1.2vw] rounded-sm ${i < op.fase ? 'bg-accent' : 'bg-white/15'}`} />
                ))}
              </div>
            </div>
            <span className={`font-body font-semibold ${op.urgente ? 'text-red-400' : 'text-muted'}`} style={{ fontSize: "1.45vw" }}>
              {op.urgente ? '🔴 ' : ''}{op.prazo}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
