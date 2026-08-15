export function CRMMockup() {
  const contacts = [
    { name: 'Moda Sul LTDA', msg: 'Bom dia! Preciso de 500 pçs...', time: '09:14', badge: 3, active: true },
    { name: 'Ricardo Atacado', msg: 'Quando fica pronto o pedido?', time: '08:52', badge: 1, active: false },
    { name: 'EstiloFash', msg: 'OK, pode confirmar o orçamento', time: 'Ontem', badge: 0, active: false },
    { name: 'BrasTêxtil SP', msg: 'Você: Enviado o catálogo 👍', time: 'Ontem', badge: 0, active: false },
  ];

  const messages = [
    { from: 'client', text: 'Bom dia! Preciso de 500 pçs da camiseta polo branca M e G', time: '09:14' },
    { from: 'agent', text: 'Bom dia! Claro, vou gerar um orçamento agora mesmo. Pode me confirmar o prazo?', time: '09:15' },
    { from: 'client', text: 'Precisaria para o dia 20. Consegue?', time: '09:16' },
    { from: 'agent', text: 'Sim! Nosso prazo para 500 pçs é de 12 dias úteis. Vou te enviar o orçamento já.', time: '09:17' },
  ];

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 select-none flex" style={{ height: '240px' }}>
      {/* Sidebar */}
      <div className="w-2/5 border-r border-slate-200 bg-white flex flex-col">
        <div className="bg-orange-600 px-2 py-2 flex items-center justify-between">
          <span className="text-white text-[10px] font-bold">CRM Mirage</span>
          <span className="bg-white/20 text-white text-[9px] px-1.5 rounded-full">4 chats</span>
        </div>
        <div className="overflow-y-auto flex-1">
          {contacts.map((c, i) => (
            <div key={i} className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-slate-100 cursor-pointer ${c.active ? 'bg-orange-50' : 'hover:bg-slate-50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${c.active ? 'bg-orange-500' : 'bg-slate-400'}`}>
                {c.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-[9px] font-semibold text-slate-700 truncate">{c.name}</p>
                  <p className="text-[8px] text-slate-400 shrink-0 ml-1">{c.time}</p>
                </div>
                <p className="text-[8px] text-slate-400 truncate">{c.msg}</p>
              </div>
              {c.badge > 0 && (
                <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-white text-[8px] font-bold">{c.badge}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        <div className="bg-white border-b px-2 py-1.5 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[8px] font-bold">M</div>
          <div>
            <p className="text-[10px] font-semibold text-slate-700">Moda Sul LTDA</p>
            <p className="text-[8px] text-emerald-500">● online agora</p>
          </div>
          <div className="ml-auto flex gap-1">
            <div className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Qualificação</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'agent' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-xl px-2 py-1 ${m.from === 'agent' ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-white border text-slate-700 rounded-bl-sm'}`}>
                <p className="text-[9px] leading-relaxed">{m.text}</p>
                <p className={`text-[8px] mt-0.5 ${m.from === 'agent' ? 'text-orange-200' : 'text-slate-400'}`}>{m.time}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white border-t px-2 py-1.5 flex items-center gap-1">
          <div className="flex-1 bg-slate-100 rounded-full px-2 py-1 text-[9px] text-slate-400">
            Digite uma mensagem...
          </div>
          <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-[10px]">➤</span>
          </div>
        </div>
      </div>
    </div>
  );
}
