const NAV = ['+ Novo', 'Vendas', 'Compras', 'Serviços', 'Financeiro', 'Estoque', 'Transporte'];
const QUICK = [
  { icon: '🧾', label: 'Nota Fiscal' },
  { icon: '📦', label: 'Produtos' },
  { icon: '🖥️', label: 'PDV' },
  { icon: '📋', label: 'Pedidos' },
  { icon: '🏪', label: 'Mercadori...' },
  { icon: '🏦', label: 'Conta PJ ...' },
];
const FINANCEIRO_MENU = [
  { label: 'Contas a Pagar', active: false },
  { label: 'Contas a Receber', active: true },
  { label: 'Antecipação de Recebíveis', active: false },
  { label: 'Extrato', active: false },
  { label: 'DRE Gerencial', active: false },
  { label: 'Fluxo de Caixa', active: false, sub: true },
  { label: 'Conciliação', active: false },
  { label: 'Contas Bancárias', active: false },
  { label: 'Parâmetros', active: false, sub: true },
  { label: 'Relatórios', active: false, sub: true },
];
const CALENDAR_DAYS = [28,29,30,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,1,2,3,4,5,6];

function TopNav({ activeMenu }: { activeMenu: string | null }) {
  return (
    <header className="bg-[#1e3a6e] h-11 flex items-center px-4 gap-0 shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <div className="text-white font-bold text-sm tracking-wide flex items-center gap-1">
          <span className="text-white text-lg">⬡</span>
          <span className="font-bold text-sm">MIRAGE</span>
        </div>
      </div>
      {NAV.map(item => (
        <div key={item} className="relative">
          <button className={`px-3 h-11 text-[12px] font-medium flex items-center gap-1 transition-colors
            ${item === 'Financeiro' ? 'bg-[#2a4d8a] text-white border-b-2 border-blue-300' :
              item === '+ Novo' ? 'text-blue-200 hover:text-white' : 'text-blue-100 hover:text-white hover:bg-[#2a4d8a]'}`}>
            {item}
            {['Vendas','Compras','Serviços','Financeiro','Estoque','Transporte'].includes(item) && (
              <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            )}
          </button>
          {item === 'Financeiro' && (
            <div className="absolute top-11 left-0 bg-white shadow-xl rounded-b border border-gray-200 w-56 z-50 py-1">
              {FINANCEIRO_MENU.map((m, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-2 text-[12px] cursor-pointer
                  ${m.active ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span>{m.label}</span>
                  {m.sub && <span className={m.active ? 'text-blue-200' : 'text-gray-400'}>›</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="ml-auto flex items-center gap-2">
        {['🏛️','⊞','❓','⚙️','🔔'].map((icon, i) => (
          <button key={i} className="text-blue-200 hover:text-white text-base w-8 h-8 flex items-center justify-center">{icon}</button>
        ))}
        <div className="w-8 h-8 rounded-full bg-blue-400 flex items-center justify-center text-white text-sm font-bold">C</div>
      </div>
    </header>
  );
}

export default function ERPDashboard() {
  const today = 20;
  const daysOfWeek = ['D','S','T','Q','Q','S','S'];

  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] font-sans overflow-hidden">
      <TopNav activeMenu="Financeiro" />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-700">Boa tarde, <strong>Clovis</strong></h1>
          <button className="text-gray-400 hover:text-gray-600">✏️</button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Acesso Rápido */}
          <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Acesso Rápido</h2>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-base">⊕</span>
                <span className="text-base">+</span>
                <span className="text-base">⋯</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-0 p-4">
              {QUICK.map((q, i) => (
                <button key={i} className="flex flex-col items-center gap-2 p-3 hover:bg-blue-50 rounded-lg transition-colors group">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl group-hover:bg-blue-100">
                    {q.icon}
                  </div>
                  <span className="text-[10px] text-gray-600 text-center leading-tight">{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Maio de 2026</h2>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-base">⊕</span>
                <button className="text-gray-400 hover:text-gray-600 text-lg">◀</button>
                <button className="text-gray-400 hover:text-gray-600 text-lg">▶</button>
              </div>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-7 mb-1">
                {daysOfWeek.map((d, i) => (
                  <div key={i} className="text-center text-[10px] text-gray-400 font-semibold py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-0.5">
                {CALENDAR_DAYS.map((d, i) => {
                  const isCurrentMonth = (i >= 3 && i <= 33);
                  const isToday = d === today && isCurrentMonth;
                  return (
                    <button key={i} className={`text-center text-[11px] py-1.5 rounded-full transition-colors
                      ${isToday ? 'bg-blue-600 text-white font-bold' :
                        isCurrentMonth ? 'text-gray-700 hover:bg-blue-50' : 'text-gray-300'}`}>
                      {d}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-100">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-[10px] text-gray-500">Contas a receber</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-gray-500">Contas a pagar</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[10px] text-gray-500">Compromissos</span></div>
              </div>
            </div>
          </div>

          {/* Saldo das contas */}
          <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Saldo das contas</h2>
              <div className="flex items-center gap-2 text-gray-400">
                <span>⊕</span><span>❓</span><span>⋯</span>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[11px] text-gray-400 mb-4">Atualizado em 20 de maio de 2026</p>
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-lg">🏦</div>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Conta Inicial (Caixinha)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">R$ ••••••</span>
                  <button className="text-gray-400 hover:text-gray-600">👁️</button>
                </div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-[11px] text-blue-600 font-medium">Total disponível</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">R$ ••••••</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
