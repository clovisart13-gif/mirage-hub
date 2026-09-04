const NAV = ['+ Novo', 'Vendas', 'Compras', 'Serviços', 'Financeiro', 'Estoque', 'Transporte'];

const ENTRIES = [
  { num: 1,  nfe: '77',      date: '06/05/2026', supplier: 'Lola Biquini LTDA',           value: 'R$ 3.855,76', ok: true },
  { num: 28, nfe: '19574',   date: '22/04/2026', supplier: 'DALILA TEXTIL LTDA',           value: 'R$ 117,39',   ok: true },
  { num: 27, nfe: '2243491', date: '16/04/2026', supplier: 'EXCIM Importacao e ...',        value: 'R$ 35,84',    ok: true },
  { num: 26, nfe: '116082',  date: '16/04/2026', supplier: 'EXCIM Importacao e ...',        value: 'R$ 137,76',   ok: true },
  { num: 21, nfe: '15468',   date: '15/04/2026', supplier: 'THALIA AVIAMENTOS LTDA·ME',    value: 'R$ 304,14',   ok: true },
  { num: 24, nfe: '2241558', date: '14/04/2026', supplier: 'EXCIM Importacao e ...',        value: 'R$ 570,50',   ok: true },
  { num: 25, nfe: '337380',  date: '13/04/2026', supplier: 'NICOLETTI TEXTIL LTDA',         value: 'R$ 7.136,00', ok: true },
  { num: 23, nfe: '1497935', date: '13/04/2026', supplier: 'MENEGOTTI TEXTIL LTDA',         value: 'R$ 4.109,49', ok: true },
  { num: 19, nfe: '212595',  date: '02/04/2026', supplier: 'Bru Elas Comercial Textil ...',  value: 'R$ 157,79',   ok: true },
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

export default function ERPEstoque() {
  return (
    <div className="flex flex-col h-screen bg-[#f0f4f8] font-sans overflow-hidden">
      <TopNav />

      <div className="flex-1 overflow-y-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-blue-600 mb-4">
          <button className="hover:underline">Início</button>
          <span className="text-gray-400">›</span>
          <span className="text-gray-500">Entrada de mercadoria</span>
        </div>

        <h1 className="text-xl font-semibold text-gray-700 mb-4">Entrada de mercadoria</h1>

        {/* Actions bar */}
        <div className="flex items-center gap-2 mb-4">
          <button className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded transition-colors">Adicionar</button>
          <button className="border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded hover:bg-gray-50">Importar</button>
          <button className="border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded hover:bg-gray-50">Imprimir</button>
          <button className="border border-gray-300 text-gray-600 text-sm px-3 py-2 rounded hover:bg-gray-50">Excluir</button>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center border border-gray-300 rounded overflow-hidden">
              <input className="text-sm px-3 py-2 outline-none w-48" placeholder="Pesquisar" />
              <button className="bg-blue-600 text-white px-3 py-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </button>
            </div>
            <button className="text-blue-600 text-sm hover:underline">+ Busca avançada</button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="w-8 px-3 py-3"><input type="checkbox" className="rounded" /></th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Nº</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">NFe</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Data</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Fornecedor</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Valor total</th>
                <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500">Situação</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {ENTRIES.map((row, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                  <td className="px-3 py-3"><input type="checkbox" className="rounded" /></td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{row.num}</td>
                  <td className="px-3 py-3 text-gray-700 text-xs">{row.nfe}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{row.date}</td>
                  <td className="px-3 py-3 text-gray-700 text-xs font-medium">{row.supplier}</td>
                  <td className="px-3 py-3 text-gray-700 text-xs font-semibold">{row.value}</td>
                  <td className="px-3 py-3">
                    <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button className="text-gray-400 hover:text-gray-600 text-base">📄</button>
                      <button className="text-gray-400 hover:text-gray-600 text-base">📥</button>
                      <button className="text-gray-400 hover:text-blue-600 text-base">▶</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
