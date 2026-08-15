export function PLMScreen1() {
  const statusCols = [
    { label: 'Rascunho', color: 'bg-slate-500', count: 4, items: ['Blusa Linho Verão', 'Calça Slim Fit'] },
    { label: 'Em Dev.', color: 'bg-blue-500', count: 3, items: ['Vestido Floral', 'Jaqueta Jeans'] },
    { label: 'Pilotagem', color: 'bg-amber-500', count: 3, items: ['Camisa Oxford'] },
    { label: 'Aprovado', color: 'bg-emerald-500', count: 2, items: ['Short Cargo', 'Saia Midi'] },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-indigo-600 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">PLM Mirage — Dashboard</p>
        <div className="flex gap-1">
          {[{l:'Produtos',v:'12'},{l:'Pilotos',v:'3'},{l:'Aprovações',v:'2'}].map(s=>(
            <div key={s.l} className="bg-white/20 rounded px-1.5 py-0.5 text-center">
              <span className="text-white font-bold text-[9px]">{s.v}</span>
              <span className="text-indigo-200 text-[7px] ml-0.5">{s.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 grid grid-cols-4 gap-1 p-1.5 overflow-hidden">
        {statusCols.map(col => (
          <div key={col.label} className="flex flex-col gap-1">
            <div className={`${col.color} text-white rounded px-1.5 py-0.5 flex items-center justify-between`}>
              <span className="font-semibold text-[8px]">{col.label}</span>
              <span className="bg-white/30 rounded-full px-1 text-[7px]">{col.count}</span>
            </div>
            {col.items.map((item, i) => (
              <div key={i} className="bg-slate-800 border border-slate-700 rounded p-1">
                <div className="w-4 h-4 rounded bg-indigo-700 flex items-center justify-center mb-0.5">
                  <span className="text-indigo-200 text-[6px] font-bold">P</span>
                </div>
                <p className="text-slate-300 leading-tight">{item}</p>
                <p className="text-slate-600 text-[7px] mt-0.5">Feminino · T.único</p>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PLMScreen2() {
  const bom = [
    ['Tecido Malha PV', '2,3m', 'R$38,00'],
    ['Linha', '1 cx', 'R$1,80'],
    ['Etiqueta bordada', '1 un', 'R$2,50'],
    ['Mão de obra corte', '—', 'R$4,00'],
    ['Costura e remendos', '—', 'R$12,00'],
    ['Overhead (15%)', '—', 'R$8,75'],
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-indigo-600 px-2.5 py-2 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-[10px]">Materiais & Custos — Blusa Linho Verão</p>
          <p className="text-indigo-200 text-[8px]">Lista de materiais e custos</p>
        </div>
        <div className="bg-white/20 rounded px-2 py-1 text-center">
          <p className="text-white font-bold">R$67,05</p>
          <p className="text-indigo-200 text-[7px]">custo/pç</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 bg-slate-800 px-2 py-1 text-[8px] font-semibold text-slate-400 border-b border-slate-700">
          <span className="col-span-1">Insumo</span><span>Qtd</span><span className="text-right">Custo</span>
        </div>
        {bom.map(([d, q, v], i) => (
          <div key={i} className={`grid grid-cols-3 px-2 py-1.5 border-b border-slate-800 ${i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'}`}>
            <span className="text-slate-300 col-span-1 truncate">{d}</span>
            <span className="text-slate-500">{q}</span>
            <span className="text-right text-slate-300 font-medium">{v}</span>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-1 p-1.5 bg-indigo-900/40 border-t border-indigo-700">
          {[{l:'Custo',v:'R$67,05',c:'text-slate-200'},{l:'Margem 35%',v:'R$23,47',c:'text-emerald-400'},{l:'Preço',v:'R$90,52',c:'text-indigo-300'}].map((s,i)=>(
            <div key={i} className="bg-slate-800 rounded p-1 text-center">
              <p className={`font-bold ${s.c}`}>{s.v}</p>
              <p className="text-slate-500 text-[7px]">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PLMScreen3() {
  const aprovacoes = [
    { etapa: 'Ficha Técnica', status: 'Aprovado', c: 'bg-emerald-900 text-emerald-300' },
    { etapa: 'Modelagem', status: 'Aprovado', c: 'bg-emerald-900 text-emerald-300' },
    { etapa: 'Materiais & Custos', status: 'Aprovado', c: 'bg-emerald-900 text-emerald-300' },
    { etapa: 'Piloto', status: 'Pendente', c: 'bg-amber-900 text-amber-300' },
    { etapa: 'Gerencial', status: 'Aguardando', c: 'bg-slate-800 text-slate-400' },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-indigo-600 px-2.5 py-2">
        <p className="text-white font-bold text-[10px]">Fluxo de Aprovação — PLM</p>
        <p className="text-indigo-200 text-[8px]">Vestido Floral · versão 2</p>
      </div>
      <div className="flex-1 p-2 space-y-1.5">
        {aprovacoes.map((a, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-800 rounded p-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center text-indigo-300 font-bold text-[8px] shrink-0">{i + 1}</div>
            <span className="flex-1 text-slate-300">{a.etapa}</span>
            <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${a.c}`}>{a.status}</span>
          </div>
        ))}
        <div className="mt-2 bg-indigo-900/40 border border-indigo-700 rounded p-2">
          <p className="text-indigo-300 font-semibold text-[9px]">✦ 3 de 5 etapas aprovadas</p>
          <div className="h-1.5 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
