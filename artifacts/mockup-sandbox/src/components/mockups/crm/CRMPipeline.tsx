const NAV_ITEMS = ['Atendimentos', 'CRM', 'Apps', 'Relatórios', 'Ajustes', 'Admin'];

const COLUMNS = [
  {
    id: 'entrada', label: 'ENTRADA', count: 3, dot: '#6366f1',
    cards: [
      { id: 'POP-543', name: 'Reymon(21) 97804-1892', tags: [] },
      { id: 'POP-421', name: 'Paloma(32) 99927-9545', tags: [] },
      { id: 'POP-543', name: 'Davi Lipsi Silva(12) 98241-6556', tags: [] },
    ]
  },
  {
    id: 'lead1', label: 'LEAD_ENVIADO_PRO1', count: 19, dot: '#3b82f6',
    cards: [
      { id: 'POP-547', name: 'Pério(21) 98088-9546', tags: [] },
      { id: 'POP-349', name: 'Fernando(16) 99760-9064', tags: [] },
      { id: 'POP-301', name: 'Douglas(12) 99208-0241', tags: [] },
      { id: 'POP-231', name: 'leandro(13) 99134-7425', tags: [] },
      { id: 'POP-234', name: 'Jackson(11) 99759-7762', tags: [] },
      { id: 'POP-198', name: 'Igor(11) 96397-9853', tags: [] },
      { id: 'POP-344', name: 'Ricardo Petrone(11) 97545-7485', tags: [] },
    ]
  },
  {
    id: 'lead2', label: 'LEAD_ENVIADO_PRO2', count: 1, dot: '#8b5cf6',
    cards: [
      { id: 'POP-542', name: 'Giulio(11) 95924-3956', tags: [] },
      { id: 'POP-461', name: 'Imao(11) 94544-3774', tags: ['PLANO PRO'] },
      { id: 'POP-412', name: 'Ester Keysse(61) 99307-2421', tags: [] },
    ]
  },
  {
    id: 'lead3', label: 'LEAD_ENVIADO_PRO3', count: 1, dot: '#ec4899',
    cards: [
      { id: 'POP-237', name: 'paulo roberto(21) 99176-6746', tags: ['PLANO PRO'] },
    ]
  },
  {
    id: 'qualificar', label: 'QUALIFICAR', count: 16, dot: '#f59e0b',
    cards: [
      { id: 'POP-467', name: 'Brayan(67) 99976-3162', tags: ['QUALIFICADO', 'PLANO PRO'] },
      { id: 'POP-419', name: 'Theo(11) 99445-8068', tags: ['QUALIFICADO', 'PLANO PRO'] },
      { id: 'POP-382', name: 'Janaina(11) 98344-1741', tags: ['PLANO PRO'] },
      { id: 'POP-291', name: 'Vanessa(91) 91488-7664', tags: ['CLIENTE', 'PLANO PRO'] },
      { id: 'POP-417', name: 'Matheus Alvarenge(31) 98535-4138', tags: [] },
      { id: 'POP-223', name: 'Sofio+595 974725837', tags: [] },
      { id: 'POP-334', name: 'Samuel(14) 98130-7306', tags: [] },
      { id: 'POP-402', name: 'Aquila Matheus(85) 98704-1705', tags: ['QUALIFICADO', 'PLANO PRO'] },
    ]
  },
  {
    id: 'reuniao', label: 'REUNIÃO AGENDADA', count: 9, dot: '#10b981',
    cards: [
      { id: 'POP-398', name: 'valdier santos', tags: [] },
      { id: 'POP-411', name: 'Guilherme (11) 98872-5152', tags: ['CLIENTE', 'PLANO PRO'] },
      { id: 'POP-387', name: 'Cristiane(84) 99844-9772', tags: [] },
    ]
  },
  {
    id: 'levantamento', label: 'LEVANTAMENTO', count: 7, dot: '#06b6d4',
    cards: [
      { id: 'POP-512', name: 'Denilson Oliveira', tags: ['CLIENTE', 'PLANO PRO'] },
      { id: 'POP-443', name: 'Alan, TANG(13) 93467-9472', tags: ['CLIENTE'] },
      { id: 'POP-399', name: 'Carlo_LOQU(14)', tags: ['CLIENTE', 'PLANO PRO'] },
      { id: 'POP-376', name: 'Deborah, TC', tags: ['PLANO PRO'] },
    ]
  },
];

const TAG_COLORS: Record<string, string> = {
  'QUALIFICADO': 'bg-blue-500 text-white',
  'PLANO PRO': 'bg-purple-600 text-white',
  'CLIENTE': 'bg-green-500 text-white',
};

function TopNav() {
  return (
    <header className="h-10 bg-white border-b border-gray-200 flex items-center px-4 gap-6 text-xs shrink-0">
      <div className="flex items-center gap-1 mr-2">
        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
          <span className="text-white text-[9px] font-bold">M</span>
        </div>
        <span className="text-gray-400 text-[10px] hidden lg:block">mirage</span>
      </div>
      {NAV_ITEMS.map(item => (
        <button key={item} className={`text-gray-500 hover:text-gray-800 text-[11px] flex items-center gap-1 ${item === 'CRM' ? 'text-blue-600 font-semibold border-b-2 border-blue-600 pb-0.5' : ''}`}>
          {item}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">🔔</div>
        <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs">↔</div>
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-bold">M</div>
      </div>
    </header>
  );
}

export default function CRMPipeline() {
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      <TopNav />

      {/* Sub-header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
        <button className="text-gray-400 text-xs">←</button>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-800">PIPELINE COMERCIAL PRO</span>
          <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        <input className="ml-2 text-[11px] border border-gray-200 rounded px-2 py-0.5 w-40 text-gray-400" placeholder="Digite para pesquisar..." />
        <button className="text-[11px] border border-gray-200 rounded px-2 py-0.5 flex items-center gap-1 text-gray-600">
          <span>⊞</span> Filtros
        </button>
        <button className="text-[11px] text-gray-500 flex items-center gap-1">📦 Itens arquivados</button>
        <div className="ml-auto flex items-center gap-2">
          <button className="text-[11px] border border-gray-200 rounded px-2 py-0.5 flex items-center gap-1 text-gray-600">↑ Exportar</button>
          <button className="text-[11px] border border-gray-200 rounded px-2 py-0.5 flex items-center gap-1 text-gray-600">⚙ Configurar</button>
        </div>
      </div>

      {/* Column header row */}
      <div className="flex gap-0 overflow-x-auto shrink-0 bg-white border-b border-gray-100">
        {COLUMNS.map(col => (
          <div key={col.id} className="min-w-[175px] px-3 py-2 flex items-center gap-1.5 border-r border-gray-100">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dot }} />
            <span className="text-[10px] font-semibold text-gray-600 truncate">{col.label}</span>
            <span className="text-[10px] text-gray-400 ml-auto">({col.count})</span>
            <span className="text-gray-300 text-xs ml-1">▼</span>
          </div>
        ))}
      </div>

      {/* Kanban body */}
      <div className="flex gap-0 overflow-x-auto flex-1 min-h-0">
        {COLUMNS.map(col => (
          <div key={col.id} className="min-w-[175px] flex flex-col gap-2 p-2 border-r border-gray-100 overflow-y-auto">
            {col.cards.map((card, i) => (
              <div key={i} className="bg-white rounded border border-gray-200 p-2.5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-[9px] text-gray-400">{card.id}</span>
                  <div className="flex gap-1">
                    <button className="text-gray-300 hover:text-gray-500 text-xs">💬</button>
                    <button className="text-gray-300 hover:text-gray-500 text-xs">☑</button>
                  </div>
                </div>
                <p className="text-[11px] text-gray-700 font-medium leading-tight mb-1.5">{card.name}</p>
                {card.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {card.tags.map(tag => (
                      <span key={tag} className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${TAG_COLORS[tag] || 'bg-gray-200 text-gray-600'}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button className="text-[11px] text-gray-400 flex items-center gap-1 px-1 mt-1 hover:text-gray-600">
              <span className="text-lg leading-none">+</span> Novo Item
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
