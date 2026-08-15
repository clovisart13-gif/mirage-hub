export function PartnersMockup() {
  const partners = [
    { name: 'Contador / BPO Fiscal', icon: '🧾', color: 'bg-blue-500', badge: 'Certificado', tags: ['NF-e', 'SPED', 'Folha'] },
    { name: 'Marketing & Performance', icon: '📈', color: 'bg-orange-500', badge: 'Certificado', tags: ['Meta Ads', 'Google', 'Branding'] },
    { name: 'Consultoria de Gestão', icon: '💼', color: 'bg-violet-500', badge: 'Certificado', tags: ['Processos', 'Custo', 'Expansão'] },
  ];

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white select-none">
      {/* Header */}
      <div className="bg-violet-600 px-3 py-2 flex items-center justify-between">
        <span className="text-white font-bold text-xs">Partners Mirage</span>
        <div className="flex gap-2 text-[10px] text-violet-200">
          <span>✓ Certificados</span>
          <span>⭐ NPS 9+</span>
        </div>
      </div>

      {/* Cupom banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5">
        <p className="text-[9px] text-amber-700 font-medium">🎫 Cupom exclusivo gerado automaticamente ao visitar</p>
      </div>

      <div className="p-2 space-y-1.5">
        {partners.map((p, i) => (
          <div key={i} className="border border-slate-100 rounded-lg p-2 flex items-center gap-2">
            <div className={`w-8 h-8 ${p.color} rounded-lg flex items-center justify-center shrink-0 text-base`}>
              {p.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="text-[10px] font-semibold text-slate-700 truncate">{p.name}</p>
                <span className="text-[8px] bg-violet-100 text-violet-700 px-1 rounded shrink-0">{p.badge}</span>
              </div>
              <div className="flex gap-1">
                {p.tags.map(t => (
                  <span key={t} className="text-[8px] bg-slate-100 text-slate-500 px-1 rounded">{t}</span>
                ))}
              </div>
            </div>
            <div className="text-[8px] bg-violet-50 text-violet-600 border border-violet-200 px-1.5 py-0.5 rounded shrink-0">
              Visitar
            </div>
          </div>
        ))}

        {/* CTA */}
        <div className="border border-dashed border-violet-300 rounded-lg p-2 text-center mt-1">
          <p className="text-[9px] font-semibold text-violet-700">Quer ser parceiro Mirage?</p>
          <p className="text-[8px] text-slate-400">parceiros@gestaomirage.com.br</p>
        </div>
      </div>
    </div>
  );
}
