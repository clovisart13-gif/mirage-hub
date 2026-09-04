const NAV = ['+ Novo', 'Vendas', 'Compras', 'Serviços', 'Financeiro', 'Estoque', 'Transporte'];

const SIDEBAR_CATEGORIES = [
  { label: 'Compradas', icon: '🛒', section: false },
  { label: 'Gratuitas', icon: '🎁', section: false },
  { section: true, label: 'CATEGORIAS' },
  { label: 'Todas', icon: '⊞', active: true },
  { label: 'E-commerce', icon: '🛍️' },
  { label: 'Organização', icon: '📁' },
  { label: 'Gestão', icon: '💼' },
  { label: 'Ferramentas', icon: '🔧' },
  { label: 'Pagamentos', icon: '💳' },
  { label: 'Fiscal', icon: '🧾' },
  { label: 'Inteligência Artificial', icon: '🤖' },
  { label: 'Integrações', icon: '🔗' },
];

const TOP_INTEGRATIONS = [
  { n: 1, name: 'Consultas Serasa', icon: '📊', n2: 4, name2: 'VHDrive', icon2: '☁️' },
  { n: 2, name: 'Agenda', icon: '📅', n2: 5, name2: 'Envio de SMS', icon2: '💬' },
  { n: 3, name: 'Avisos Internos', icon: '📢', n2: 6, name2: 'Automação', icon2: '⚙️' },
];

const INTEGRATIONS = [
  { name: 'Agenda', icon: '📅', desc: 'Organize seus compromissos e receba alerta de eventos programados.', price: 'Gratuito', check: true },
  { name: 'Aniversariantes', icon: '🎂', desc: 'Lembre-se do aniversário dos seus clientes.', price: 'R$ 39,90 / mês', check: false },
  { name: 'Assinaturas', icon: '✍️', desc: 'Crie planos, divulgue em seu site e gerencie as assinaturas de seus clientes.', price: 'Gratuito', check: false },
  { name: 'Consultas Serasa', icon: '📊', desc: 'Consulte o CPF/CNPJ de clientes automaticamente com Serasa.', price: 'R$ 29,90 / mês', check: false },
  { name: 'Automação', icon: '⚙️', desc: 'Automatize processos repetitivos e ganhe produtividade.', price: 'Gratuito', check: false },
  { name: 'Envio de SMS', icon: '💬', desc: 'Envie lembretes e confirmações por SMS para seus clientes.', price: 'R$ 19,90 / mês', check: false },
];

function TopNav() {
  return (
    <header className="bg-[#1e3a6e] h-11 flex items-center px-4 gap-0 shrink-0">
      <div className="flex items-center gap-2 mr-4">
        <span className="text-white text-lg">⬡</span>
        <span className="text-white font-bold text-sm tracking-wide">MIRAGE</span>
      </div>
      {NAV.map(item => (
        <button key={item} className={`px-3 h-11 text-[12px] font-medium flex items-center gap-1
          ${item === '+ Novo' ? 'text-blue-200' : 'text-blue-100 hover:text-white hover:bg-[#2a4d8a]'}`}>
          {item}
          {['Vendas','Compras','Serviços','Financeiro','Estoque','Transporte'].includes(item) && (
            <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          )}
        </button>
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

export default function ERPIntegracoes() {
  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] font-sans overflow-hidden">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200 px-6 py-2">
        <div className="flex items-center gap-1 text-xs text-blue-600">
          <button className="hover:underline">Início</button>
          <span className="text-gray-400">›</span>
          <button className="hover:underline">Loja de Integrações</button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-500">Todas</span>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <div className="w-52 bg-white border-r border-gray-200 shrink-0 overflow-y-auto py-3">
          {SIDEBAR_CATEGORIES.map((item, i) => (
            item.section
              ? <p key={i} className="text-[9px] font-bold text-gray-400 px-4 mt-3 mb-1 uppercase tracking-widest">{item.label}</p>
              : (
                <button key={i} className={`w-full flex items-center gap-2 px-4 py-2 text-[12px] transition-colors
                  ${'active' in item && item.active ? 'bg-blue-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-5 min-w-0">
          <h1 className="text-xl font-semibold text-gray-700 mb-4">Loja de Integrações</h1>

          {/* Featured + Top downloads */}
          <div className="grid grid-cols-2 gap-4 mb-5">
            {/* Featured banner */}
            <div className="rounded-xl overflow-hidden bg-gradient-to-br from-[#1a3a5c] to-[#0f7a6e] p-5 text-white relative min-h-[130px]">
              <div className="absolute top-2 right-2 bg-white text-[9px] text-blue-700 font-bold px-2 py-0.5 rounded">Novidade</div>
              <h3 className="text-lg font-bold text-green-300 mb-1">Consulta de Placas</h3>
              <p className="text-xs text-blue-100 mb-3">Preencha os dados do veículo automaticamente e evite erros de digitação.</p>
              <button className="bg-green-400 hover:bg-green-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors">Quero conhecer</button>
              <div className="absolute right-5 bottom-4 text-5xl opacity-20">🚗</div>
            </div>

            {/* Top downloads */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex gap-2 mb-3">
                <button className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full font-semibold">Mais baixados</button>
                <button className="text-[11px] text-gray-500 px-3 py-1 rounded-full hover:bg-gray-50">Destaques</button>
              </div>
              <div className="space-y-2">
                {TOP_INTEGRATIONS.map((row, i) => (
                  <div key={i} className="flex items-center">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-3 text-right">{row.n}.</span>
                      <span className="text-base">{row.icon}</span>
                      <span className="text-[11px] text-gray-700">{row.name}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[11px] text-gray-400 w-3 text-right">{row.n2}.</span>
                      <span className="text-base">{row.icon2}</span>
                      <span className="text-[11px] text-gray-700">{row.name2}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* All integrations */}
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Todas as extensões e integrações</h2>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden flex-1 max-w-sm bg-white">
              <span className="pl-3 text-gray-400">🔍</span>
              <input className="text-sm px-2 py-2 outline-none flex-1" placeholder="Buscar" />
            </div>
            <button className="flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-2 text-[11px] text-gray-600 bg-white hover:bg-gray-50">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />Gratuitas
            </button>
            <button className="flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-2 text-[11px] text-gray-600 bg-white hover:bg-gray-50">
              <span className="w-3 h-3 rounded bg-blue-500 inline-block" />Pagas
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {INTEGRATIONS.map((integ, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{integ.icon}</span>
                  <div className="flex items-center gap-1">
                    <h3 className="text-[12px] font-semibold text-gray-800">{integ.name}</h3>
                    {integ.check && <span className="text-blue-500 text-xs">✓</span>}
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed flex-1">{integ.desc}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${integ.price === 'Gratuito' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                    {integ.price}
                  </span>
                  {integ.check && <span className="text-gray-300 text-sm">✓</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
