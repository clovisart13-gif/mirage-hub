export function KanbanMockup() {
  const columns = [
    {
      name: 'Corte',
      color: 'bg-blue-500',
      light: 'bg-blue-50 border-blue-200',
      cards: [
        { op: 'OP-0047', client: 'Moda Sul', qty: '240 pcs', deadline: '2d', urgent: true },
        { op: 'OP-0048', client: 'BrasFash', qty: '120 pcs', deadline: '5d', urgent: false },
      ],
    },
    {
      name: 'Costura',
      color: 'bg-violet-500',
      light: 'bg-violet-50 border-violet-200',
      cards: [
        { op: 'OP-0044', client: 'Atacado MG', qty: '380 pcs', deadline: '1d', urgent: true },
        { op: 'OP-0045', client: 'R2PB', qty: '95 pcs', deadline: '3d', urgent: false },
        { op: 'OP-0046', client: 'Estilo SP', qty: '160 pcs', deadline: '4d', urgent: false },
      ],
    },
    {
      name: 'Acabamento',
      color: 'bg-amber-500',
      light: 'bg-amber-50 border-amber-200',
      cards: [
        { op: 'OP-0041', client: 'GoodWear', qty: '500 pcs', deadline: '0d', urgent: true },
        { op: 'OP-0042', client: 'FashMode', qty: '75 pcs', deadline: '2d', urgent: false },
      ],
    },
    {
      name: 'Expedição',
      color: 'bg-emerald-500',
      light: 'bg-emerald-50 border-emerald-200',
      cards: [
        { op: 'OP-0038', client: 'Centro SP', qty: '600 pcs', deadline: '0d', urgent: false },
      ],
    },
  ];

  return (
    <div className="w-full rounded-xl overflow-hidden bg-slate-900 p-3 select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="text-slate-400 text-xs font-medium">Kanban de Produção — R2PB Confecções</div>
        <div className="text-slate-500 text-xs">8 OPs ativas</div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: 'Em produção', value: 'R$48.200', color: 'text-violet-400' },
          { label: 'OPs abertas', value: '8', color: 'text-blue-400' },
          { label: 'No prazo', value: '6', color: 'text-emerald-400' },
          { label: 'Urgentes', value: '3', color: 'text-red-400' },
        ].map((s, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-2 text-center">
            <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
            <p className="text-slate-500 text-[10px]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-4 gap-1.5">
        {columns.map((col) => (
          <div key={col.name} className="flex flex-col gap-1.5">
            <div className={`${col.color} rounded-md px-2 py-1 flex items-center justify-between`}>
              <span className="text-white text-[10px] font-bold">{col.name}</span>
              <span className="bg-white/30 text-white text-[10px] rounded-full px-1.5">{col.cards.length}</span>
            </div>
            {col.cards.map((card) => (
              <div key={card.op} className={`border ${col.light} rounded-md p-1.5`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-slate-700 text-[10px] font-bold">{card.op}</span>
                  {card.urgent && (
                    <span className="bg-red-100 text-red-600 text-[8px] font-bold px-1 rounded">URGENTE</span>
                  )}
                </div>
                <p className="text-slate-500 text-[9px]">{card.client}</p>
                <p className="text-slate-600 text-[10px] font-medium">{card.qty}</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className={`w-1 h-1 rounded-full ${card.urgent ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className={`text-[9px] ${card.urgent ? 'text-red-500' : 'text-slate-400'}`}>
                    {card.deadline === '0d' ? 'Entrega hoje' : `${card.deadline} restantes`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
