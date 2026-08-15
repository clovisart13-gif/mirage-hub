export function ERPScreen1() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-slate-700 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">ERP Mirage — Dashboard Financeiro</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full">Abril 2026</span>
      </div>
      <div className="p-2 space-y-2 flex-1">
        <div className="grid grid-cols-4 gap-1">
          {[
            { l: 'Receita', v: 'R$284.500', c: 'text-emerald-600' },
            { l: 'Despesas', v: 'R$189.300', c: 'text-red-500' },
            { l: 'Lucro', v: 'R$95.200', c: 'text-slate-700' },
            { l: 'Margem', v: '33,5%', c: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded p-1.5 text-center">
              <p className={`font-bold text-[10px] ${s.c}`}>{s.v}</p>
              <p className="text-slate-400 text-[7px]">{s.l}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="text-[8px] font-semibold text-slate-400 uppercase mb-1">Fluxo de Caixa — últimas 4 semanas</p>
          <div className="flex gap-1 items-end h-14 mb-1">
            {[{ e: 42, s: 31 }, { e: 55, s: 38 }, { e: 38, s: 29 }, { e: 68, s: 42 }].map((b, i) => (
              <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
                <div className="flex-1 bg-emerald-400 rounded-t" style={{ height: `${b.e / 68 * 100}%` }} />
                <div className="flex-1 bg-red-300 rounded-t" style={{ height: `${b.s / 68 * 100}%` }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded" /><span className="text-slate-400 text-[7px]">Entradas</span></div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-300 rounded" /><span className="text-slate-400 text-[7px]">Saídas</span></div>
          </div>
        </div>
        <div>
          <p className="text-[8px] font-semibold text-slate-400 uppercase mb-1">Contas vencendo hoje</p>
          {[
            { d: 'Fornecedor Têxtil SP', v: 'R$18.400', tp: 'Pagar', c: 'text-red-500' },
            { d: 'Cliente Atacado MG', v: 'R$32.100', tp: 'Receber', c: 'text-emerald-600' },
          ].map((c, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded flex items-center justify-between px-2 py-1 mb-0.5">
              <span className="text-slate-600">{c.d}</span>
              <div className="text-right">
                <p className={`font-bold ${c.c}`}>{c.v}</p>
                <p className="text-slate-400 text-[7px]">{c.tp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ERPScreen2() {
  const nfes = [
    { n: 'NF-e 004821', dest: 'Moda Sul Ltda', val: 'R$28.440', status: 'Autorizada', c: 'bg-emerald-100 text-emerald-700' },
    { n: 'NF-e 004820', dest: 'BrasFash Atacado', val: 'R$14.200', status: 'Autorizada', c: 'bg-emerald-100 text-emerald-700' },
    { n: 'NF-e 004819', dest: 'Estilo SP Com.', val: 'R$8.750', status: 'Processando', c: 'bg-amber-100 text-amber-700' },
    { n: 'NF-e 004818', dest: 'GoodWear Ind.', val: 'R$52.100', status: 'Autorizada', c: 'bg-emerald-100 text-emerald-700' },
    { n: 'NF-e 004817', dest: 'FashMode Ltda', val: 'R$6.900', status: 'Cancelada', c: 'bg-red-100 text-red-700' },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-slate-700 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Emissão de NF-e</p>
        <div className="bg-white/20 text-white text-[8px] px-2 py-0.5 rounded font-medium">+ Nova NF-e</div>
      </div>
      <div className="p-1.5 flex-1">
        <div className="grid grid-cols-4 text-[8px] font-semibold text-slate-400 uppercase px-1 mb-1">
          <span>Número</span><span>Destinatário</span><span className="text-right">Valor</span><span className="text-right">Status</span>
        </div>
        {nfes.map((n, i) => (
          <div key={i} className={`grid grid-cols-4 items-center rounded px-1.5 py-1 mb-0.5 ${i % 2 === 0 ? 'bg-slate-50' : 'bg-white'}`}>
            <span className="text-slate-600 font-semibold text-[8px]">{n.n}</span>
            <span className="text-slate-500 truncate text-[8px]">{n.dest}</span>
            <span className="text-right font-semibold text-slate-700 text-[8px]">{n.val}</span>
            <span className="text-right"><span className={`${n.c} text-[7px] font-semibold px-1 py-0.5 rounded-full`}>{n.status}</span></span>
          </div>
        ))}
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[
            { l: 'NF-es (mês)', v: '38', c: 'text-slate-700' },
            { l: 'Total faturado', v: 'R$110K', c: 'text-emerald-600' },
            { l: 'SEFAZ', v: '✓ OK', c: 'text-blue-600' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded p-1.5 text-center">
              <p className={`font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[7px] text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ERPScreen3() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-slate-700 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Controle de Estoque</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full">284 itens</span>
      </div>
      <div className="p-2 space-y-1.5 flex-1">
        <div className="grid grid-cols-3 gap-1">
          {[
            { l: 'Total itens', v: '284', c: 'text-slate-700' },
            { l: 'Baixo estoque', v: '12', c: 'text-amber-600' },
            { l: 'Valor total', v: 'R$342K', c: 'text-emerald-600' },
          ].map((s, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 rounded p-1.5 text-center">
              <p className={`font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[7px] text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
        <p className="text-[8px] font-semibold text-slate-400 uppercase">Matérias-primas</p>
        {[
          { n: 'Malha PV Branca', u: 'kg', q: 1240, pct: 95, c: 'bg-emerald-400' },
          { n: 'Malha Piquet Preta', u: 'kg', q: 380, pct: 65, c: 'bg-emerald-400' },
          { n: 'Linha 120 Preta', u: 'cones', q: 48, pct: 40, c: 'bg-amber-400' },
          { n: 'Elástico 2cm', u: 'metros', q: 620, pct: 75, c: 'bg-emerald-400' },
          { n: 'Etiqueta Bordada', u: 'und', q: 180, pct: 18, c: 'bg-red-400' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded px-2 py-1">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.c}`} />
            <span className="flex-1 text-slate-600 truncate">{item.n}</span>
            <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden shrink-0">
              <div className={`h-full rounded-full ${item.c}`} style={{ width: `${item.pct}%` }} />
            </div>
            <span className="text-slate-400 shrink-0 w-10 text-right">{item.q} {item.u}</span>
          </div>
        ))}
        <div className="bg-amber-50 border border-amber-200 rounded p-1.5">
          <p className="text-amber-700 font-semibold">⚠ 12 itens abaixo do mínimo</p>
          <p className="text-amber-500 text-[8px]">Sugestão de compra gerada</p>
        </div>
      </div>
    </div>
  );
}
