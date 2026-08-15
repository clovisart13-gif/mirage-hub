export function OrcamentoMockup() {
  const items = [
    { desc: 'Tecido Malha PV (2,3m/pç)', unit: 'R$18,50', total: 'R$42,55' },
    { desc: 'Linha e aviamentos', unit: 'R$2,10', total: 'R$2,10' },
    { desc: 'Etiqueta bordada', unit: 'R$1,80', total: 'R$1,80' },
    { desc: 'Mão de obra (costura)', unit: 'R$8,00', total: 'R$8,00' },
    { desc: 'Overhead (15%)', unit: '—', total: 'R$8,17' },
  ];

  return (
    <div className="w-full rounded-xl overflow-hidden bg-white border border-slate-200 select-none">
      {/* Header */}
      <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">Orçamento #ORÇ-2847</p>
          <p className="text-blue-200 text-xs">Camiseta Polo Masculina — Grade P/M/G/GG</p>
        </div>
        <div className="bg-white/20 rounded-lg px-3 py-1.5 text-center">
          <p className="text-white font-bold text-sm">R$89,90</p>
          <p className="text-blue-200 text-[10px]">preço final/pç</p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Cost breakdown */}
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Ficha de Custo</p>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
              <span className="col-span-2">Descrição</span>
              <span className="text-right">Custo</span>
            </div>
            {items.map((item, i) => (
              <div key={i} className={`grid grid-cols-3 px-2 py-1 text-[10px] ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <span className="col-span-2 text-slate-600">{item.desc}</span>
                <span className="text-right text-slate-700 font-medium">{item.total}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 grid grid-cols-3 gap-2">
          {[
            { label: 'Custo total', value: 'R$62,62', color: 'text-slate-700' },
            { label: 'Margem (30%)', value: 'R$18,79', color: 'text-emerald-600' },
            { label: 'Preço final', value: 'R$89,90', color: 'text-blue-700' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[9px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart visual */}
        <div>
          <p className="text-[10px] font-semibold text-slate-500 mb-1">Composição do custo</p>
          <div className="flex items-end gap-1 h-12">
            {[
              { label: 'Tecido', pct: 68, color: 'bg-blue-500' },
              { label: 'MO', pct: 13, color: 'bg-violet-500' },
              { label: 'Aviamentos', pct: 6, color: 'bg-amber-500' },
              { label: 'Overhead', pct: 13, color: 'bg-slate-400' },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[8px] text-slate-500">{bar.pct}%</span>
                <div
                  className={`w-full rounded-t ${bar.color}`}
                  style={{ height: `${bar.pct * 0.6}px` }}
                />
                <span className="text-[8px] text-slate-400">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* PDF button */}
        <div className="flex gap-2">
          <div className="flex-1 bg-blue-600 text-white text-xs text-center py-1.5 rounded-lg font-medium">
            📄 Gerar PDF
          </div>
          <div className="flex-1 bg-green-500 text-white text-xs text-center py-1.5 rounded-lg font-medium">
            📱 Enviar WhatsApp
          </div>
        </div>
      </div>
    </div>
  );
}
