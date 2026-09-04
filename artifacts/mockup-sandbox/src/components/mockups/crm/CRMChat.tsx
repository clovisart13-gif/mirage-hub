const CONTACTS = [
  { name: 'Rodrigo', role: 'SUPERVISOR', time: 'há 1m dia', color: 'bg-green-500', msg: 'Para começarmos, você po...' },
  { name: 'Fabiana', role: 'SUPERVISOR', time: 'há 2 dias', color: 'bg-blue-500', msg: 'Para começarmos, você po...' },
  { name: 'Beatriz Freire', role: 'COMERCIAL · SDR', time: 'há 2 dias', color: 'bg-orange-400', msg: 'Quais os valores par...' },
  { name: 'Meu nome é Vitor', role: '', time: 'há 2 dias', color: 'bg-violet-600', msg: 'Serto 1/2 melhor', tags: ['COMERCIAL·SDR', 'PLANO·SDR'] },
  { name: 'Larissa', role: 'SUPERVISOR', time: 'há 2 dias', color: 'bg-pink-500', msg: '...', tags: ['COMERCIAL·SDR', 'PLANO·SDR'] },
  { name: 'Bruno', role: 'SUPERVISOR', time: 'há 3 dias', color: 'bg-teal-500', msg: 'Recusado' },
  { name: 'Chalini Cotting', role: 'SUPERVISOR', time: 'há 3 dias', color: 'bg-red-500', msg: 'Para começarmos, você po...', active: true, badge: 'PRODUÇÃO' },
  { name: 'Everton Crivai', role: 'SUPERVISOR', time: 'há 4 dias', color: 'bg-indigo-500', msg: 'Para começarmos, você po...' },
  { name: 'Mariana', role: 'SUPERVISOR', time: 'há 4 dias', color: 'bg-yellow-500', msg: 'Para começarmos, você po...' },
  { name: 'Laisa', role: 'SUPERVISOR', time: 'há 4 dias', color: 'bg-cyan-500', msg: 'Para começarmos, você po...' },
];

const MESSAGES = [
  { from: 'bot', text: 'Olá tudo bem? meu nome é Xenato sou atendente da KGMS confecções - Private Label. Qual seu nome por favor?', time: '12:00' },
  { from: 'user', text: 'Jaqueline Barros', time: '12:00' },
  { from: 'bot', text: 'Qual das opções se encaixa melhor com sua experiência', time: '12:00', options: ['Financeiro', 'Comercial', 'Produção'] },
  { from: 'user', text: 'Produção', time: '12:19' },
  { from: 'bot', text: 'ChaliniExplique com suas palavras qual sua experiência, e para qual vaga esta se candidatando? e pode anexar seu currículo por aqui mesmo, caso exista alguma vaga que se encaixe no seu perfil entraremos em contato, muito obrigado', time: '12:01' },
  { from: 'user', text: 'ChaliniExplique com suas palavras qual sua experiência, e para qual vaga esta se candidatando? e pode anexar seu currículo por aqui mesmo, caso exista alguma vaga que se encaixe no seu perfil entraremos em contato, muito obrigado', time: '12:01' },
  { from: 'user', attachment: 'Currículo Jaque.pdf', time: '12:01' },
];

function NavSidebar() {
  const icons = ['💬', '👥', '🗂️', '📊', '⚙️', '🛡️'];
  return (
    <div className="w-14 bg-white border-r border-gray-200 flex flex-col items-center pt-2 gap-1 shrink-0">
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mb-3">
        <span className="text-white text-xs font-bold">M</span>
      </div>
      {icons.map((icon, i) => (
        <button key={i} className={`w-10 h-9 flex items-center justify-center rounded-lg text-base ${i === 0 ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`}>
          {icon}
        </button>
      ))}
    </div>
  );
}

export default function CRMChat() {
  return (
    <div className="flex h-screen bg-white font-sans text-sm overflow-hidden">
      <NavSidebar />

      {/* Contact list */}
      <div className="w-56 border-r border-gray-200 flex flex-col shrink-0">
        <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
          <button className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Novos</button>
          <button className="text-gray-400 text-xs px-2 py-0.5">Meus</button>
          <button className="text-gray-400 text-xs px-2 py-0.5">Outros</button>
          <span className="ml-auto bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">4</span>
        </div>
        <div className="px-3 py-1.5 border-b border-gray-100">
          <input className="w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-400" placeholder="Apenas não lidas" />
        </div>
        <div className="overflow-y-auto flex-1">
          {CONTACTS.map((c, i) => (
            <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 ${c.active ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''}`}>
              <div className={`w-8 h-8 rounded-full ${c.color} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5`}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-800 truncate">{c.name}</span>
                  <span className="text-[9px] text-gray-400 shrink-0 ml-1">{c.time}</span>
                </div>
                {c.role && <div className="text-[9px] text-blue-500 font-semibold mb-0.5">{c.role}</div>}
                {c.badge && <span className="text-[8px] bg-green-100 text-green-700 px-1 py-0.5 rounded font-bold">{c.badge}</span>}
                {c.tags && (
                  <div className="flex gap-1 flex-wrap mt-0.5">
                    {c.tags.map(t => <span key={t} className="text-[8px] bg-blue-100 text-blue-600 px-1 rounded">{t}</span>)}
                  </div>
                )}
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{c.msg}</p>
              </div>
              <div className="shrink-0">
                <span className="text-gray-300 text-xs">•••</span>
              </div>
            </div>
          ))}
        </div>
        {/* Bottom input */}
        <div className="px-3 py-2 border-t border-gray-200 flex items-center gap-2">
          <span className="text-[10px] text-gray-400">+55 ▾</span>
          <input className="flex-1 text-[10px] border border-gray-200 rounded px-2 py-1 text-gray-400" placeholder="(00) 0000-0000" />
          <button className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded font-semibold">Conversar</button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-12 border-b border-gray-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">CC</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-800">Chalini Cotting</span>
                <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">PRODUÇÃO</span>
                <span className="text-gray-300">ⓘ</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">☎ (11) 99439-3480</span>
            <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Pendente</span>
            <button className="text-gray-400 hover:text-gray-600">⋮</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {MESSAGES.map((msg, i) => (
            <div key={i} className={`flex ${msg.from === 'bot' ? 'justify-start' : 'justify-end'}`}>
              {msg.from === 'bot' && (
                <div className="flex items-start gap-2 max-w-sm">
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] shrink-0 mt-1">🤖</div>
                  <div className="bg-white rounded-xl rounded-tl-none border border-gray-200 px-3 py-2 shadow-sm">
                    <p className="text-xs text-gray-700 leading-relaxed">{msg.text}</p>
                    {msg.options && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        {msg.options.map(opt => (
                          <button key={opt} className="text-xs border border-blue-300 text-blue-600 rounded-lg px-3 py-1.5 hover:bg-blue-50 text-left">{opt}</button>
                        ))}
                      </div>
                    )}
                    <div className="text-[9px] text-gray-400 mt-1 text-right">{msg.time} ✓</div>
                  </div>
                </div>
              )}
              {msg.from === 'user' && (
                <div className="max-w-sm">
                  {msg.attachment ? (
                    <div className="bg-blue-600 rounded-xl rounded-tr-none px-3 py-2 shadow-sm flex items-center gap-2">
                      <span className="text-white text-lg">📄</span>
                      <div>
                        <p className="text-white text-xs font-medium">{msg.attachment}</p>
                        <p className="text-blue-200 text-[9px]">30 kB</p>
                      </div>
                      <button className="text-blue-200 hover:text-white ml-2">⬆</button>
                    </div>
                  ) : (
                    <div className="bg-blue-600 rounded-xl rounded-tr-none px-3 py-2 shadow-sm">
                      <p className="text-white text-xs leading-relaxed">{msg.text}</p>
                      <div className="text-[9px] text-blue-200 mt-1 text-right">{msg.time} ✓</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Session note */}
          <div className="text-center">
            <span className="text-[9px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Tempo de sessão excedido em Jun 1s 12:00 às 18/06/2026</span>
          </div>
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 px-4 py-2.5 bg-white flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">M</span>
            </div>
            <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Mirage</span>
          </div>
          <span className="text-xs text-gray-400 flex-1">Passaram-se 24 horas desde a última mensagem de Chalini. Envie um modelo de mensagem para reiniciar o atendimento.</span>
          <button className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600">Cancelar ▾</button>
          <button className="text-xs border border-gray-300 rounded px-2 py-1 text-gray-600">→ Transferir</button>
          <button className="text-xs bg-blue-600 text-white rounded px-3 py-1 font-semibold">Reiniciar</button>
        </div>
      </div>

      {/* Right panel placeholder */}
      <div className="w-8 border-l border-gray-200 bg-gray-50 shrink-0" />
    </div>
  );
}
