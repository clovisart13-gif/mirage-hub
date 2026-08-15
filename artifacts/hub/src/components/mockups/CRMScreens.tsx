export function CRMScreen1() {
  const pipeline = [
    { stage: 'Novo Lead', color: 'bg-slate-500', count: 8 },
    { stage: 'Contato feito', color: 'bg-blue-500', count: 5 },
    { stage: 'Proposta enviada', color: 'bg-amber-500', count: 3 },
    { stage: 'Fechado ✅', color: 'bg-emerald-500', count: 6 },
  ];
  const leads = [
    { name: 'Moda Sul LTDA', stage: 'Proposta enviada', value: '500 pçs', tag: 'bg-amber-100 text-amber-700' },
    { name: 'Ricardo Atacado', stage: 'Contato feito', value: '1.200 pçs', tag: 'bg-blue-100 text-blue-700' },
    { name: 'EstiloFash SP', stage: 'Fechado ✅', value: '800 pçs', tag: 'bg-emerald-100 text-emerald-700' },
    { name: 'BrasTêxtil', stage: 'Novo Lead', value: '300 pçs', tag: 'bg-slate-100 text-slate-600' },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-orange-600 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">CRM Mirage</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full">22 leads ativos</span>
      </div>
      <div className="grid grid-cols-4 gap-1 px-2 py-1.5 border-b border-slate-100">
        {pipeline.map(p => (
          <div key={p.stage} className="text-center">
            <div className={`${p.color} text-white rounded px-1 py-0.5 mb-0.5`}>
              <span className="font-bold text-[10px]">{p.count}</span>
            </div>
            <p className="text-[7px] text-slate-500 leading-tight">{p.stage}</p>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {leads.map((l, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 text-[9px] font-bold shrink-0">
              {l.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-700 truncate">{l.name}</p>
              <p className="text-[8px] text-slate-400">{l.value}</p>
            </div>
            <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${l.tag}`}>{l.stage}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CRMScreen2() {
  const stages = [
    { name: 'Novo Lead', color: 'bg-slate-500', cards: [{ n: 'João Silva', c: 'Marca Própria - SP', v: '500pcs' }, { n: 'Maria Souza', c: 'Revenda - MG', v: '1000pcs' }] },
    { name: 'Qualificado ✅', color: 'bg-orange-500', cards: [{ n: 'Carlos Lima', c: 'Atacado - RS', v: '2000pcs' }, { n: 'Ana Costa', c: 'Marca Própria - PR', v: '800pcs' }] },
    { name: 'Proposta', color: 'bg-blue-500', cards: [{ n: 'Fábio Ramos', c: 'Loja Virtual - RJ', v: '300pcs' }] },
    { name: 'Fechado 🎉', color: 'bg-emerald-500', cards: [{ n: 'BrasTêxtil SC', c: 'Cliente Fixo - SC', v: '5000pcs' }] },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden">
      <div className="px-2.5 py-2 border-b border-slate-100 flex items-center justify-between">
        <p className="font-bold text-slate-700 text-[10px]">Pipeline CRM Mirage</p>
        <span className="text-slate-400 text-[8px]">6 leads ativos</span>
      </div>
      <div className="p-1.5 grid grid-cols-4 gap-1 h-[calc(100%-36px)]">
        {stages.map(s => (
          <div key={s.name}>
            <div className={`${s.color} text-white rounded px-1.5 py-0.5 mb-1 flex items-center justify-between`}>
              <span className="font-semibold text-[8px]">{s.name}</span>
              <span className="bg-white/30 rounded-full px-1 text-[7px]">{s.cards.length}</span>
            </div>
            {s.cards.map((c, i) => (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded p-1 mb-1">
                <p className="font-semibold text-slate-700">{c.n}</p>
                <p className="text-slate-400 text-[8px]">{c.c}</p>
                <p className="text-slate-500 font-medium">{c.v}</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CRMScreen3() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full">
      <div className="px-2.5 py-2 border-b border-slate-100">
        <p className="font-bold text-slate-700 text-[10px]">Relatório de Vendas — Abril 2026</p>
      </div>
      <div className="p-2 space-y-2">
        <div className="grid grid-cols-3 gap-1">
          {[
            { l: 'Leads recebidos', v: '47', c: 'text-slate-700' },
            { l: 'Propostas enviadas', v: '31', c: 'text-orange-600' },
            { l: 'Conversões', v: '12', c: 'text-emerald-600' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 rounded p-1.5 text-center">
              <p className={`font-bold text-sm ${s.c}`}>{s.v}</p>
              <p className="text-[8px] text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[9px] font-semibold text-slate-500 uppercase mb-1">Desempenho por vendedor</p>
          {[
            { n: 'Ana Lima', conv: 5, taxa: '83%', c: 'bg-emerald-500' },
            { n: 'Carlos M.', conv: 4, taxa: '67%', c: 'bg-blue-500' },
            { n: 'Juliana R.', conv: 3, taxa: '50%', c: 'bg-orange-500' },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[7px] font-bold shrink-0">{a.n[0]}</div>
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-slate-600">{a.n}</span>
                  <span className="text-slate-500">{a.taxa}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full">
                  <div className={`h-full rounded-full ${a.c}`} style={{ width: a.taxa }} />
                </div>
              </div>
              <span className="text-slate-400 text-[8px] shrink-0">{a.conv} conv.</span>
            </div>
          ))}
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded p-2">
          <p className="font-semibold text-orange-700 text-[9px]">📈 Taxa de conversão do mês:</p>
          <p className="text-orange-600 font-bold">25,5% — acima da meta de 20%</p>
        </div>
      </div>
    </div>
  );
}
