export function PartnersScreen1() {
  const partners = [
    { name: 'Contabilidade Têxtil SP', tag: 'Fiscal', rating: '4.9', badge: 'bg-blue-100 text-blue-700', icon: '🧾' },
    { name: 'Growth Confecção Mkt', tag: 'Marketing', rating: '4.8', badge: 'bg-orange-100 text-orange-700', icon: '📈' },
    { name: 'Gestão & Flow Consultoria', tag: 'Gestão', rating: '5.0', badge: 'bg-violet-100 text-violet-700', icon: '💼' },
    { name: 'BPO Fiscal Moda BR', tag: 'Fiscal', rating: '4.7', badge: 'bg-blue-100 text-blue-700', icon: '🧾' },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-violet-700 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Partners Mirage</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium">✦ Certificados</span>
      </div>
      <div className="flex gap-1 px-2 py-1.5 border-b border-slate-100">
        {['Todos', 'Fiscal', 'Marketing', 'Gestão'].map((t, i) => (
          <span key={t} className={`text-[8px] px-2 py-0.5 rounded-full font-medium ${i === 0 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-500'}`}>{t}</span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {partners.map((p, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5">
            <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-sm shrink-0">{p.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-700 truncate">{p.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-medium ${p.badge}`}>{p.tag}</span>
                <span className="text-amber-500 text-[8px]">★ {p.rating}</span>
              </div>
            </div>
            <div className="bg-violet-600 text-white text-[7px] px-1.5 py-1 rounded font-medium shrink-0">Ver →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PartnersScreen2() {
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-violet-700 px-2.5 py-2">
        <p className="text-white font-bold text-[10px]">Contabilidade Têxtil SP</p>
        <p className="text-violet-200 text-[8px]">Parceiro Certificado · Fiscal & Tributário</p>
      </div>
      <div className="p-2 space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-xl shrink-0">🧾</div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-amber-500">★★★★★</span>
              <span className="text-slate-500 text-[8px]">4.9 · 142 avaliações</span>
            </div>
            <p className="text-slate-500 text-[8px]">40+ confecções atendidas em SP, MG e SC</p>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[8px] font-semibold text-slate-500 uppercase">Especialidades</p>
          {['Emissão de NF-e integrada ao ERP', 'SPED Fiscal e Contribuições', 'Folha de pagamento têxtil', 'Simples Nacional / Lucro Presumido'].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-slate-600">{s}</span>
            </div>
          ))}
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded p-1.5 flex items-center justify-between">
          <div>
            <p className="text-[8px] font-semibold text-violet-700">Cupom exclusivo Mirage</p>
            <p className="text-violet-600 font-mono text-[8px]">MIRAGE-CONTABIL-10</p>
          </div>
          <div className="bg-violet-600 text-white text-[7px] px-1.5 py-1 rounded">Copiar</div>
        </div>
      </div>
    </div>
  );
}

export function PartnersScreen3() {
  const cats = [
    { icon: '🧾', label: 'Fiscal & Contábil', count: 12, color: 'border-l-blue-500 bg-blue-50' },
    { icon: '📈', label: 'Marketing', count: 8, color: 'border-l-orange-500 bg-orange-50' },
    { icon: '💼', label: 'Consultoria', count: 10, color: 'border-l-violet-500 bg-violet-50' },
  ];
  return (
    <div className="bg-white rounded-lg border border-slate-200 text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-violet-700 px-2.5 py-2">
        <p className="text-white font-bold text-[10px]">Rede de Parceiros Mirage</p>
        <p className="text-violet-200 text-[8px]">Especialistas no setor têxtil brasileiro</p>
      </div>
      <div className="p-2 space-y-1.5">
        <div className="grid grid-cols-3 gap-1 mb-2">
          {[{l:'Parceiros',v:'30+'},{l:'Estados',v:'12'},{l:'NPS Médio',v:'9.3'}].map((s, i) => (
            <div key={i} className="bg-slate-50 rounded p-1.5 text-center border border-slate-100">
              <p className="font-bold text-sm text-violet-700">{s.v}</p>
              <p className="text-[7px] text-slate-500">{s.l}</p>
            </div>
          ))}
        </div>
        {cats.map((c, i) => (
          <div key={i} className={`flex items-center gap-2 border-l-2 rounded p-1.5 ${c.color}`}>
            <span className="text-base">{c.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-slate-700">{c.label}</p>
              <p className="text-[7px] text-slate-500">{c.count} parceiros disponíveis</p>
            </div>
            <span className="text-violet-600 font-medium">Ver →</span>
          </div>
        ))}
        <div className="bg-violet-50 border border-violet-200 rounded p-2 mt-1">
          <p className="text-violet-700 font-semibold text-[9px]">✦ Incluído em todos os planos</p>
          <p className="text-violet-500 text-[8px]">Acesso gratuito à rede de parceiros certificados</p>
        </div>
      </div>
    </div>
  );
}
