const OPS = [
  { op: 'OP-0241', cliente: 'Moda Feminina SP', prod: 'Blusa cropped P/M/G', qtd: 320, fase: 3, faseNome: 'Acabamento', urgente: false },
  { op: 'OP-0238', cliente: 'Atacado Rio Branco', prod: 'Calça social masculina', qtd: 180, fase: 4, faseNome: 'QC', urgente: true },
  { op: 'OP-0236', cliente: 'Boutique Ana Lima', prod: 'Vestido floral midi', qtd: 60, fase: 5, faseNome: 'Expedição', urgente: false },
];
const FASES = ['Corte', 'Costura', 'Acab.', 'QC', 'Expd.'];

export default function OB4Kanban() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div className="absolute top-0 right-0 w-[40vw] h-full" style={{ background: "radial-gradient(ellipse at top right, rgba(6,182,212,0.07) 0%, transparent 60%)" }} />

      {/* Esquerda */}
      <div className="w-[40vw] flex flex-col justify-center pl-[7vw] pr-[3vw]">
        <span className="font-display font-bold text-accent uppercase tracking-widest mb-[1.5vh]" style={{ fontSize: "1.5vw" }}>Módulo 2</span>
        <h2 className="font-display font-extrabold text-text leading-tight tracking-tight mb-[2.5vh]" style={{ fontSize: "4.5vw" }}>
          Produção —<br />Kanban
        </h2>
        <p className="font-body text-muted mb-[3vh]" style={{ fontSize: "1.9vw", maxWidth: "30vw" }}>
          Cada pedido percorre 14 etapas visuais do corte à expedição.
        </p>

        {/* Etapas */}
        <div className="flex items-center gap-[0.8vw] flex-wrap mb-[3vh]">
          {FASES.map((f, i) => (
            <div key={f} className="flex items-center gap-[0.8vw]">
              <div className={`px-[1.2vw] py-[0.8vh] rounded-lg ${i < 3 ? 'bg-primary text-white' : 'bg-white border border-slate-200 text-slate-500'}`}>
                <p className="font-display font-bold" style={{ fontSize: "1.5vw" }}>{f}</p>
              </div>
              {i < FASES.length - 1 && <span className="text-slate-300 font-body" style={{ fontSize: "1.5vw" }}>→</span>}
            </div>
          ))}
          <span className="font-body text-muted ml-[0.5vw]" style={{ fontSize: "1.4vw" }}>+ 9 etapas</span>
        </div>

        <div className="bg-white rounded-xl px-[2vw] py-[1.8vh] shadow-sm border border-slate-100">
          <p className="font-body text-slate-600" style={{ fontSize: "1.75vw" }}>
            Ao avançar uma etapa, as <strong>contas a pagar</strong> correspondentes são geradas automaticamente.
          </p>
        </div>
      </div>

      {/* Mockup do Kanban */}
      <div className="flex-1 flex flex-col justify-center pr-[5vw] pl-[2vw] gap-[1.5vh]">
        <div className="bg-white rounded-xl px-[2vw] py-[1.4vh] flex items-center justify-between shadow-sm border border-slate-100">
          <span className="font-display font-bold text-slate-800" style={{ fontSize: "1.7vw" }}>🏭 Kanban de Produção</span>
          <div className="flex gap-[1vw]">
            {[['12', 'Em produção', '#7C3AED'], ['3', 'No prazo', '#10B981'], ['2', 'Atrasadas', '#EF4444']].map(([n, l, c]) => (
              <div key={l} className="text-center px-[1.2vw] py-[0.5vh] rounded-lg border border-slate-100">
                <p className="font-display font-black" style={{ fontSize: "1.8vw", color: c }}>{n}</p>
                <p className="font-body text-slate-500" style={{ fontSize: "1.1vw" }}>{l}</p>
              </div>
            ))}
          </div>
        </div>

        {OPS.map(op => (
          <div key={op.op} className={`bg-white rounded-xl px-[2vw] py-[1.8vh] shadow-sm border ${op.urgente ? 'border-red-200' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between mb-[1.2vh]">
              <div>
                <div className="flex items-center gap-[1vw]">
                  <span className="font-display font-bold text-primary" style={{ fontSize: "1.55vw" }}>{op.op}</span>
                  {op.urgente && <span className="bg-red-50 text-red-600 border border-red-200 rounded-full px-[0.8vw] py-[0.2vh] font-body" style={{ fontSize: "1.1vw" }}>🔴 Urgente</span>}
                </div>
                <p className="font-body text-slate-600" style={{ fontSize: "1.4vw" }}>{op.cliente} · {op.prod}</p>
              </div>
              <span className="bg-slate-50 border border-slate-200 rounded-lg px-[1.2vw] py-[0.5vh] font-body text-slate-600" style={{ fontSize: "1.35vw" }}>{op.qtd} peças</span>
            </div>
            <div className="flex items-center gap-[1vw]">
              <div className="flex-1 bg-slate-100 rounded-full h-[0.7vh]">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(op.fase / 5) * 100}%` }} />
              </div>
              <span className="font-display font-bold text-primary shrink-0" style={{ fontSize: "1.4vw" }}>{op.faseNome}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
