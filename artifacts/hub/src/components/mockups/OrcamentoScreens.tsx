export function OrcamentoScreen1() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[10px] select-none h-full overflow-hidden">
      <div className="bg-blue-600 px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-white font-bold">Orçamento #ORÇ-2847</p>
          <p className="text-blue-200 text-[9px]">Camiseta Polo M/F — Grade P/M/G/GG</p>
        </div>
        <div className="bg-white/20 rounded px-2 py-1 text-center">
          <p className="text-white font-bold">R$89,90</p>
          <p className="text-blue-200 text-[8px]">preço/pç</p>
        </div>
      </div>
      <div className="p-2 space-y-2">
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Ficha de Custo</p>
        <div className="border rounded overflow-hidden">
          <div className="bg-slate-50 grid grid-cols-3 px-2 py-1 text-[9px] font-semibold text-slate-500">
            <span className="col-span-2">Insumo</span><span className="text-right">Custo</span>
          </div>
          {[
            ['Tecido Malha PV (2,3m/pç)','R$42,55'],
            ['Linha e aviamentos','R$2,10'],
            ['Etiqueta bordada','R$1,80'],
            ['Mão de obra — costura','R$8,00'],
            ['Overhead (15%)','R$8,17'],
          ].map(([d,v],i)=>(
            <div key={i} className={`grid grid-cols-3 px-2 py-1 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
              <span className="col-span-2 text-slate-600">{d}</span>
              <span className="text-right text-slate-700 font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded grid grid-cols-3 gap-1 p-1.5">
          {[{l:'Custo total',v:'R$62,62',c:'text-slate-700'},{l:'Margem 30%',v:'R$18,79',c:'text-emerald-600'},{l:'Preço final',v:'R$89,90',c:'text-blue-700'}].map((s,i)=>(
            <div key={i} className="text-center">
              <p className={`font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[8px] text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          <div className="flex-1 bg-blue-600 text-white text-[9px] text-center py-1 rounded font-medium">📄 Gerar PDF</div>
          <div className="flex-1 bg-green-500 text-white text-[9px] text-center py-1 rounded font-medium">📱 WhatsApp</div>
        </div>
      </div>
    </div>
  );
}

export function OrcamentoScreen2() {
  const quotes = [
    { id:'ORÇ-2847', client:'Moda Sul', prod:'Polo M/F', val:'R$89,90', status:'Aprovado', c:'bg-emerald-100 text-emerald-700' },
    { id:'ORÇ-2846', client:'BrasFash', prod:'Calça Jeans', val:'R$142,00', status:'Pendente', c:'bg-amber-100 text-amber-700' },
    { id:'ORÇ-2845', client:'Estilo SP', prod:'Vestido Festa', val:'R$218,50', status:'Aprovado', c:'bg-emerald-100 text-emerald-700' },
    { id:'ORÇ-2844', client:'GoodWear', prod:'Regata Basic', val:'R$31,20', status:'Reprovado', c:'bg-red-100 text-red-700' },
    { id:'ORÇ-2843', client:'R2PB', prod:'Camiseta Lisa', val:'R$24,80', status:'Aprovado', c:'bg-emerald-100 text-emerald-700' },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[10px] select-none h-full">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <p className="font-bold text-slate-700">Histórico de Orçamentos</p>
        <div className="bg-blue-50 text-blue-700 text-[9px] px-2 py-0.5 rounded-full font-semibold">Mês: Abril</div>
      </div>
      <div className="p-2">
        <div className="grid grid-cols-4 text-[9px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1">
          <span>Nº</span><span>Cliente</span><span className="text-right">Valor/pç</span><span className="text-right">Status</span>
        </div>
        <div className="space-y-0.5">
          {quotes.map((q,i)=>(
            <div key={i} className="grid grid-cols-4 bg-slate-50 hover:bg-blue-50 rounded px-1 py-1.5 items-center transition-colors">
              <span className="text-blue-600 font-semibold text-[9px]">{q.id}</span>
              <span className="text-slate-600">{q.client}</span>
              <span className="text-right font-semibold text-slate-700">{q.val}</span>
              <span className="text-right"><span className={`${q.c} rounded-full px-1.5 py-0.5 text-[8px] font-semibold`}>{q.status}</span></span>
            </div>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[{l:'Total orçado',v:'R$47.280',c:'text-slate-700'},{l:'Taxa aprovação',v:'60%',c:'text-emerald-600'},{l:'Receita potencial',v:'R$28.368',c:'text-blue-700'}].map((s,i)=>(
            <div key={i} className="bg-slate-50 rounded p-1.5 text-center">
              <p className={`font-bold ${s.c}`}>{s.v}</p>
              <p className="text-[8px] text-slate-400">{s.l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function OrcamentoScreen3() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[10px] select-none h-full overflow-hidden">
      <div className="bg-slate-100 px-2 py-1.5 border-b border-slate-200 flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400"/><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"/><div className="w-1.5 h-1.5 rounded-full bg-green-400"/>
        <span className="text-slate-500 text-[9px] ml-1">orcamento_ORÇ-2847.pdf</span>
      </div>
      <div className="p-2 bg-slate-50 h-full">
        <div className="bg-white rounded border border-slate-200 p-2 shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="w-16 h-3 bg-slate-200 rounded mb-1"/>
              <p className="text-[8px] text-slate-400">CNPJ 12.345.678/0001-99</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-blue-700 text-sm">R$89,90</p>
              <p className="text-[8px] text-slate-400">por peça</p>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-1.5 mb-1.5">
            <p className="font-bold text-slate-700 mb-0.5">ORÇAMENTO #ORÇ-2847</p>
            <p className="text-[8px] text-slate-500">Camiseta Polo Masculina • Grade completa P/M/G/GG</p>
            <p className="text-[8px] text-slate-500">Cliente: Moda Sul Ind. Com. Ltda • Data: 25/04/2026</p>
          </div>
          <div className="border border-slate-200 rounded overflow-hidden mb-1.5">
            <div className="bg-blue-600 grid grid-cols-3 px-1.5 py-1 text-[8px] font-bold text-white">
              <span className="col-span-2">Descrição</span><span className="text-right">Valor</span>
            </div>
            {[['Matéria-prima total','R$46,45'],['Mão de obra','R$8,00'],['Overhead','R$8,17'],['Custo Total','R$62,62'],['Margem (30%)','R$18,79']].map(([d,v],i)=>(
              <div key={i} className={`grid grid-cols-3 px-1.5 py-0.5 ${i===3?'bg-slate-100 font-bold':i%2===0?'bg-white':'bg-slate-50'}`}>
                <span className={`col-span-2 text-slate-600 ${i===3?'font-bold':''}`}>{d}</span>
                <span className={`text-right text-slate-700 ${i===3?'font-bold':''}`}>{v}</span>
              </div>
            ))}
          </div>
          <div className="bg-blue-600 text-white rounded p-1.5 flex justify-between items-center">
            <p className="text-[8px] font-medium">PREÇO FINAL POR PEÇA:</p>
            <p className="font-bold text-xs">R$89,90</p>
          </div>
          <p className="text-[7px] text-slate-400 mt-1 text-center">Válido por 15 dias • Gerado automaticamente pelo Mirage</p>
        </div>
      </div>
    </div>
  );
}
