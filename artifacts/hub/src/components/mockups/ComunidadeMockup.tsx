export function ComunidadeMockup() {
  const suppliers = [
    { name: 'TextilBR', cat: 'Tecidos', rating: 4.9, reviews: 142, badge: 'Top', color: 'bg-emerald-500', tags: ['Malha', 'Viscolycra'] },
    { name: 'AviaTudo', cat: 'Aviamentos', rating: 4.7, reviews: 89, badge: 'Verificado', color: 'bg-blue-500', tags: ['Botões', 'Zíper'] },
    { name: 'BordadoArt', cat: 'Bordados', rating: 4.8, reviews: 67, badge: 'Top', color: 'bg-violet-500', tags: ['Bordado', 'Silk'] },
    { name: 'EmbalaSP', cat: 'Embalagens', rating: 4.6, reviews: 201, badge: 'Verificado', color: 'bg-amber-500', tags: ['Sacola', 'Cabide'] },
  ];

  const posts = [
    { user: 'Amanda C.', text: 'Alguém indica fornecedor de viscolycra para SP?', replies: 8, likes: 14 },
    { user: 'Carlos M.', text: 'Dica: negocie frete acima de R$5k com a TextilBR!', replies: 3, likes: 27 },
  ];

  return (
    <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white select-none">
      {/* Header */}
      <div className="bg-emerald-600 px-3 py-2 flex items-center justify-between">
        <span className="text-white font-bold text-xs">Moda Conecta</span>
        <div className="flex gap-2 text-[10px] text-emerald-200">
          <span>🏪 Fornecedores</span>
          <span>💬 Fórum</span>
          <span>💼 Vagas</span>
        </div>
      </div>

      <div className="p-2 grid grid-cols-2 gap-2">
        {/* Suppliers */}
        <div>
          <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Fornecedores em destaque</p>
          <div className="space-y-1.5">
            {suppliers.map((s, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-1.5 flex items-center gap-1.5">
                <div className={`w-7 h-7 ${s.color} rounded-md flex items-center justify-center shrink-0`}>
                  <span className="text-white text-[9px] font-bold">{s.name.charAt(0)}{s.name.charAt(1)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] font-semibold text-slate-700 truncate">{s.name}</p>
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1 rounded shrink-0">{s.badge}</span>
                  </div>
                  <p className="text-[8px] text-slate-400">{s.cat}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-yellow-400 text-[9px]">★</span>
                    <span className="text-[8px] text-slate-600 font-medium">{s.rating}</span>
                    <span className="text-[8px] text-slate-400">({s.reviews})</span>
                  </div>
                </div>
                <div className="text-[8px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                  Cotar
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forum + jobs */}
        <div className="space-y-2">
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Fórum — Discussões recentes</p>
            {posts.map((p, i) => (
              <div key={i} className="border border-slate-100 rounded-lg p-1.5 mb-1.5">
                <div className="flex items-center gap-1 mb-0.5">
                  <div className="w-4 h-4 bg-slate-300 rounded-full" />
                  <span className="text-[9px] font-semibold text-slate-600">{p.user}</span>
                </div>
                <p className="text-[9px] text-slate-500 leading-tight">{p.text}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-[8px] text-slate-400">💬 {p.replies}</span>
                  <span className="text-[8px] text-slate-400">❤️ {p.likes}</span>
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase mb-1.5">Vagas abertas</p>
            <div className="space-y-1">
              {[
                { role: 'Costureira Industrial', local: 'São Paulo - SP', salary: 'R$2.200' },
                { role: 'Modelista Sênior', local: 'Belo Horizonte - MG', salary: 'R$4.500' },
              ].map((v, i) => (
                <div key={i} className="border border-slate-100 rounded-lg px-1.5 py-1 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-semibold text-slate-700">{v.role}</p>
                    <p className="text-[8px] text-slate-400">{v.local}</p>
                  </div>
                  <span className="text-[8px] font-medium text-emerald-600">{v.salary}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
