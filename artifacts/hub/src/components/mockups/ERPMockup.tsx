export function ERPMockup() {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const revenue = [42, 55, 48, 70, 63, 88];
  const costs = [28, 35, 31, 45, 40, 55];
  const maxVal = Math.max(...revenue);

  return (
    <div className="w-full rounded-xl overflow-hidden bg-slate-900 select-none">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <span className="text-white font-bold text-xs">ERP Mirage — Painel Financeiro</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <div className="w-2 h-2 rounded-full bg-green-500" />
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* KPI cards */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { label: 'Faturamento', value: 'R$88.400', sub: '+23% vs mês ant.', color: 'text-emerald-400', trend: '↑' },
            { label: 'Custo total', value: 'R$55.200', sub: '+8% vs mês ant.', color: 'text-amber-400', trend: '↑' },
            { label: 'Lucro líquido', value: 'R$33.200', sub: 'Margem 37,6%', color: 'text-blue-400', trend: '↑' },
            { label: 'NFs emitidas', value: '47', sub: 'Mês atual', color: 'text-violet-400', trend: '' },
          ].map((k, i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-400 text-[9px]">{k.label}</p>
              <p className={`text-sm font-bold ${k.color} mt-0.5`}>{k.value}</p>
              <p className="text-slate-500 text-[8px]">{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Revenue chart */}
          <div className="col-span-2 bg-slate-800 rounded-lg p-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-slate-300 text-[10px] font-medium">Faturamento vs Custo (R$ mil)</p>
              <div className="flex gap-2 text-[8px]">
                <span className="flex items-center gap-0.5"><span className="w-2 h-0.5 bg-emerald-500 inline-block rounded" /> Receita</span>
                <span className="flex items-center gap-0.5"><span className="w-2 h-0.5 bg-amber-500 inline-block rounded" /> Custo</span>
              </div>
            </div>
            <div className="flex items-end gap-1 h-16">
              {months.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div className="w-full flex items-end gap-0.5" style={{ height: '52px' }}>
                    <div
                      className="flex-1 bg-emerald-500 rounded-t opacity-80"
                      style={{ height: `${(revenue[i] / maxVal) * 52}px` }}
                    />
                    <div
                      className="flex-1 bg-amber-500 rounded-t opacity-70"
                      style={{ height: `${(costs[i] / maxVal) * 52}px` }}
                    />
                  </div>
                  <span className="text-[7px] text-slate-500">{m}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pie chart + NF */}
          <div className="space-y-1.5">
            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-300 text-[10px] font-medium mb-1.5">Composição receita</p>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="4" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="53 35" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="22 66" strokeDashoffset="-53" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="13 75" strokeDashoffset="-75" />
                </svg>
                <div className="space-y-0.5">
                  {[
                    { label: 'Confecção', pct: '60%', color: 'bg-violet-500' },
                    { label: 'Revenda', pct: '25%', color: 'bg-amber-500' },
                    { label: 'Serviços', pct: '15%', color: 'bg-emerald-500' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.color}`} />
                      <span className="text-[8px] text-slate-400">{s.label}</span>
                      <span className="text-[8px] text-slate-300 ml-auto">{s.pct}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-slate-300 text-[10px] font-medium mb-1">NF-e Recentes</p>
              {[
                { num: '000.047', val: 'R$4.200', status: 'Autorizada' },
                { num: '000.046', val: 'R$1.850', status: 'Autorizada' },
              ].map((nf, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="text-[8px] text-slate-400">NF {nf.num}</span>
                  <span className="text-[8px] text-slate-300">{nf.val}</span>
                  <span className="text-[7px] bg-emerald-500/20 text-emerald-400 px-1 rounded">{nf.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
