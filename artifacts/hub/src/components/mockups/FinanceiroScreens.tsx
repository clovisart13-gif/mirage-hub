export function FinanceiroScreen1() {
  const contas = [
    { nome: 'Bradesco Corrente', saldo: 'R$18.420', cor: 'bg-teal-700' },
    { nome: 'Itaú Pessoa Jurídica', saldo: 'R$7.830', cor: 'bg-teal-800' },
    { nome: 'Caixa', saldo: 'R$3.150', cor: 'bg-teal-900' },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-teal-600 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Financeiro Mirage — Dashboard</p>
        <div className="flex gap-1">
          {[{l:'Saldo',v:'R$29.4k'},{l:'Receita',v:'R$52.1k'},{l:'Despesa',v:'R$22.7k'}].map(s=>(
            <div key={s.l} className="bg-white/20 rounded px-1.5 py-0.5 text-center">
              <span className="text-white font-bold text-[9px]">{s.v}</span>
              <span className="text-teal-200 text-[7px] ml-0.5">{s.l}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-1.5 p-1.5 overflow-hidden">
        <div className="flex flex-col gap-1">
          <p className="text-slate-400 font-semibold text-[8px] uppercase tracking-wide px-0.5">Contas Bancárias</p>
          {contas.map((c, i) => (
            <div key={i} className={`${c.cor} rounded p-1.5`}>
              <p className="text-teal-200 text-[8px] font-medium truncate">{c.nome}</p>
              <p className="text-white font-bold text-[11px] mt-0.5">{c.saldo}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-slate-400 font-semibold text-[8px] uppercase tracking-wide px-0.5">Junho / Fluxo</p>
          <div className="bg-slate-800 rounded p-1.5 flex-1 flex flex-col gap-1">
            {[
              { l: 'Receita Total', v: 'R$52.100', c: 'text-emerald-400' },
              { l: 'Despesas Fixas', v: 'R$12.300', c: 'text-red-400' },
              { l: 'Despesas Variáveis', v: 'R$10.400', c: 'text-orange-400' },
              { l: 'Resultado Líquido', v: 'R$29.400', c: 'text-teal-300' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-slate-400">{r.l}</span>
                <span className={`font-bold ${r.c}`}>{r.v}</span>
              </div>
            ))}
          </div>
          <div className="bg-teal-900/40 border border-teal-700 rounded p-1">
            <p className="text-teal-300 font-semibold text-[9px]">↑ 18% vs mês anterior</p>
            <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-teal-500 rounded-full" style={{ width: '72%' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FinanceiroScreen2() {
  const txs = [
    { desc: 'Venda Coleção Verão', tipo: 'C', val: '+R$8.200', cat: 'Vendas', c: 'text-emerald-400' },
    { desc: 'Fornecedor Tecidos SP', tipo: 'D', val: '-R$3.100', cat: 'Mat. Prima', c: 'text-red-400' },
    { desc: 'Energia Elétrica', tipo: 'D', val: '-R$680', cat: 'Utilidades', c: 'text-red-400' },
    { desc: 'Adiantamento Cliente', tipo: 'C', val: '+R$5.000', cat: 'Vendas', c: 'text-emerald-400' },
    { desc: 'Manutenção Máquinas', tipo: 'D', val: '-R$420', cat: 'Manutenção', c: 'text-red-400' },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-teal-600 px-2.5 py-2 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-[10px]">Extrato — Junho 2026</p>
          <p className="text-teal-200 text-[8px]">Bradesco Corrente · 23 lançamentos</p>
        </div>
        <div className="flex gap-1">
          <span className="bg-white/20 text-white rounded px-1.5 py-0.5">Todas</span>
          <span className="bg-emerald-700 text-white rounded px-1.5 py-0.5">Crédito</span>
          <span className="bg-red-800 text-white rounded px-1.5 py-0.5">Débito</span>
        </div>
      </div>
      <div className="grid grid-cols-4 bg-slate-800 px-2 py-1 text-[8px] font-semibold text-slate-400 border-b border-slate-700">
        <span className="col-span-2">Descrição</span><span>Categoria</span><span className="text-right">Valor</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {txs.map((t, i) => (
          <div key={i} className={`grid grid-cols-4 px-2 py-1.5 border-b border-slate-800 ${i % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/40'}`}>
            <div className="col-span-2 flex items-center gap-1">
              <span className={`text-[7px] rounded-sm px-0.5 font-bold ${t.tipo === 'C' ? 'bg-emerald-900 text-emerald-300' : 'bg-red-900 text-red-300'}`}>{t.tipo}</span>
              <span className="text-slate-300 truncate">{t.desc}</span>
            </div>
            <span className="text-slate-500 truncate">{t.cat}</span>
            <span className={`text-right font-bold ${t.c}`}>{t.val}</span>
          </div>
        ))}
      </div>
      <div className="bg-slate-800 border-t border-slate-700 px-2 py-1 flex justify-between items-center">
        <span className="text-slate-400 text-[8px]">5 de 23 · página 1</span>
        <div className="flex gap-1">
          <span className="text-emerald-400 font-bold">+R$13.200</span>
          <span className="text-slate-600">|</span>
          <span className="text-red-400 font-bold">-R$4.200</span>
        </div>
      </div>
    </div>
  );
}

export function FinanceiroScreen3() {
  const regras = [
    { termo: 'TECIDOS', cat: 'Matéria-Prima', acoes: 8 },
    { termo: 'ENERGIA', cat: 'Utilidades', acoes: 3 },
    { termo: 'VENDA', cat: 'Receita de Vendas', acoes: 14 },
    { termo: 'SALARIO', cat: 'Folha de Pagamento', acoes: 6 },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-teal-600 px-2.5 py-2">
        <p className="text-white font-bold text-[10px]">Importar OFX + Regras Automáticas</p>
        <p className="text-teal-200 text-[8px]">Classificação inteligente de lançamentos</p>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-2 overflow-hidden">
        <div className="bg-teal-900/30 border border-teal-700 border-dashed rounded p-2 text-center">
          <p className="text-teal-300 font-semibold">📎 extrato_jun2026.ofx</p>
          <p className="text-slate-500 text-[8px] mt-0.5">42 lançamentos detectados · 38 classificados automaticamente</p>
          <div className="h-1.5 bg-slate-700 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-teal-500 rounded-full" style={{ width: '90%' }} />
          </div>
          <p className="text-teal-400 font-bold mt-1">90% classificado automaticamente</p>
        </div>
        <p className="text-slate-400 font-semibold text-[8px] uppercase tracking-wide">Regras ativas</p>
        <div className="flex-1 overflow-y-auto space-y-1">
          {regras.map((r, i) => (
            <div key={i} className="bg-slate-800 rounded p-1.5 flex items-center justify-between">
              <div>
                <p className="text-slate-200 font-medium">"{r.termo}"</p>
                <p className="text-teal-400 text-[7px]">→ {r.cat}</p>
              </div>
              <span className="bg-teal-900 text-teal-300 rounded px-1.5 py-0.5 text-[7px]">{r.acoes} usos</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
