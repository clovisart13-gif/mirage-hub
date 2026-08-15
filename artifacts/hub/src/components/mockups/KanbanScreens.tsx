export function KanbanScreen1() {
  const cols = [
    { name: 'Corte', color: 'bg-blue-500', cards: [
      { op: 'OP-0047', client: 'Moda Sul', qty: '240 pcs', dead: '2d', urgent: true },
      { op: 'OP-0048', client: 'BrasFash', qty: '120 pcs', dead: '5d', urgent: false },
    ]},
    { name: 'Costura', color: 'bg-violet-500', cards: [
      { op: 'OP-0044', client: 'Atacado MG', qty: '380 pcs', dead: '1d', urgent: true },
      { op: 'OP-0045', client: 'R2PB', qty: '95 pcs', dead: '3d', urgent: false },
      { op: 'OP-0046', client: 'Estilo SP', qty: '160 pcs', dead: '4d', urgent: false },
    ]},
    { name: 'Acabamento', color: 'bg-amber-500', cards: [
      { op: 'OP-0041', client: 'GoodWear', qty: '500 pcs', dead: '0d', urgent: true },
      { op: 'OP-0042', client: 'FashMode', qty: '75 pcs', dead: '2d', urgent: false },
    ]},
    { name: 'Expedição', color: 'bg-emerald-500', cards: [
      { op: 'OP-0038', client: 'Centro SP', qty: '600 pcs', dead: '0d', urgent: false },
    ]},
  ];
  return (
    <div className="bg-slate-900 rounded-lg p-2.5 text-[10px] select-none h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-red-500"/><div className="w-2 h-2 rounded-full bg-yellow-500"/><div className="w-2 h-2 rounded-full bg-green-500"/>
        <span className="text-slate-400 ml-1 text-[9px]">Kanban de Produção — R2PB Confecções</span>
      </div>
      <div className="grid grid-cols-4 gap-1 mb-2">
        {[{l:'Em produção',v:'R$48.200',c:'text-violet-400'},{l:'OPs abertas',v:'8',c:'text-blue-400'},{l:'No prazo',v:'6',c:'text-emerald-400'},{l:'Urgentes',v:'3',c:'text-red-400'}].map((s,i)=>(
          <div key={i} className="bg-slate-800 rounded p-1.5 text-center">
            <p className={`font-bold ${s.c}`}>{s.v}</p>
            <p className="text-slate-500 text-[8px]">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {cols.map(col=>(
          <div key={col.name}>
            <div className={`${col.color} rounded px-1.5 py-0.5 flex justify-between mb-1`}>
              <span className="text-white font-bold">{col.name}</span>
              <span className="bg-white/30 text-white rounded-full px-1">{col.cards.length}</span>
            </div>
            {col.cards.map(c=>(
              <div key={c.op} className="bg-slate-800 border border-slate-700 rounded p-1 mb-1">
                <div className="flex justify-between">
                  <span className="text-slate-300 font-bold">{c.op}</span>
                  {c.urgent && <span className="bg-red-900 text-red-400 rounded px-0.5 text-[7px] font-bold">URG</span>}
                </div>
                <p className="text-slate-400 text-[8px]">{c.client}</p>
                <p className="text-slate-300 font-medium">{c.qty}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanScreen2() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 text-[10px] select-none h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="font-bold text-slate-800 text-xs">OP-0044 — Detalhe</p>
          <p className="text-slate-500 text-[9px]">Atacado MG · Camiseta Básica M/F</p>
        </div>
        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold text-[9px]">URGENTE</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {[{l:'Quantidade',v:'380 pcs'},{l:'Prazo',v:'Amanhã'},{l:'Fase atual',v:'Costura'},{l:'Progresso',v:'62%'}].map((i,k)=>(
          <div key={k} className="bg-slate-50 rounded p-1.5">
            <p className="text-slate-400 text-[8px]">{i.l}</p>
            <p className="font-semibold text-slate-700">{i.v}</p>
          </div>
        ))}
      </div>
      <p className="font-semibold text-slate-600 mb-1 text-[9px] uppercase tracking-wide">Progresso por fase</p>
      {[{n:'Corte',p:100,c:'bg-emerald-500'},{n:'Costura',p:62,c:'bg-violet-500'},{n:'Acabamento',p:0,c:'bg-slate-200'},{n:'Expedição',p:0,c:'bg-slate-200'}].map((f,i)=>(
        <div key={i} className="mb-1.5">
          <div className="flex justify-between text-[8px] text-slate-500 mb-0.5">
            <span>{f.n}</span><span>{f.p}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full">
            <div className={`h-full rounded-full ${f.c}`} style={{width:`${f.p}%`}}/>
          </div>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-slate-100">
        <p className="font-semibold text-slate-600 mb-1 text-[9px] uppercase tracking-wide">Histórico</p>
        {[{t:'10:32','a':'Costura — 237 pcs finalizadas'},{t:'08:14','a':'Corte concluído (380 pcs)'}].map((h,i)=>(
          <div key={i} className="flex gap-2 text-[9px] text-slate-500 mb-0.5">
            <span className="text-slate-300 shrink-0">{h.t}</span>{h.a}
          </div>
        ))}
      </div>
    </div>
  );
}

export function KanbanScreen3() {
  return (
    <div className="bg-slate-900 rounded-lg p-2.5 text-[10px] select-none h-full">
      <p className="text-slate-300 font-bold mb-2">Dashboard Financeiro</p>
      <div className="grid grid-cols-3 gap-1 mb-2">
        {[{l:'Faturamento mês',v:'R$184.500',c:'text-emerald-400'},{l:'Custo produção',v:'R$112.300',c:'text-amber-400'},{l:'Margem bruta',v:'39%',c:'text-violet-400'}].map((s,i)=>(
          <div key={i} className="bg-slate-800 rounded p-1.5 text-center">
            <p className={`font-bold ${s.c}`}>{s.v}</p>
            <p className="text-slate-500 text-[8px]">{s.l}</p>
          </div>
        ))}
      </div>
      <p className="text-slate-400 text-[9px] mb-1.5">OPs por status — Abril 2026</p>
      <div className="flex gap-1 items-end h-16 mb-2">
        {[{l:'Semana 1',v1:12,v2:9},{l:'Semana 2',v1:15,v2:14},{l:'Semana 3',v1:18,v2:16},{l:'Semana 4',v1:11,v2:11}].map((b,i)=>(
          <div key={i} className="flex-1 flex flex-col gap-0.5 items-center">
            <div className="w-full flex gap-0.5 items-end" style={{height:48}}>
              <div className="flex-1 bg-violet-500 rounded-t" style={{height:`${b.v1/18*100}%`}}/>
              <div className="flex-1 bg-emerald-500 rounded-t" style={{height:`${b.v2/18*100}%`}}/>
            </div>
            <p className="text-slate-500 text-[7px]">{b.l}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-violet-500 rounded"/><span className="text-slate-400 text-[8px]">Abertas</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-500 rounded"/><span className="text-slate-400 text-[8px]">Concluídas</span></div>
      </div>
    </div>
  );
}
