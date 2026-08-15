export function ComunidadeScreen1() {
  const suppliers = [
    { n: 'TextilPrime SP', cat: 'Tecidos & Malhas', rating: 4.9, loc: 'São Paulo, SP', badge: 'Destaque', reviews: 213 },
    { n: 'AviaSul', cat: 'Aviamentos & Botões', rating: 4.7, loc: 'Florianópolis, SC', badge: 'Verificado', reviews: 94 },
    { n: 'BordaMax', cat: 'Bordado & Estamparia', rating: 4.8, loc: 'Americana, SP', badge: 'Verificado', reviews: 128 },
    { n: 'Fios & Linhas BH', cat: 'Linhas & Fios', rating: 4.6, loc: 'Belo Horizonte, MG', badge: 'Verificado', reviews: 67 },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-emerald-600 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Moda Conecta</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full font-medium">500+ fornecedores</span>
      </div>
      <div className="flex gap-1 px-2 py-1.5 border-b border-slate-800">
        {['Todos', 'Tecidos', 'Aviamentos', 'Bordado'].map((t, i) => (
          <span key={t} className={`text-[8px] px-2 py-0.5 rounded-full font-medium ${i === 0 ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'}`}>{t}</span>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {suppliers.map((s, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-800/50">
            <div className="w-7 h-7 rounded-lg bg-emerald-900 border border-emerald-700 flex items-center justify-center text-emerald-400 font-bold text-[10px] shrink-0">
              {s.n.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <p className="font-semibold text-slate-200 truncate">{s.n}</p>
                <span className={`text-[7px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${s.badge === 'Destaque' ? 'bg-amber-900 text-amber-300' : 'bg-emerald-900 text-emerald-300'}`}>{s.badge}</span>
              </div>
              <p className="text-slate-500 text-[8px]">{s.cat} · {s.loc}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-amber-400 text-[9px]">★</span>
                <span className="font-semibold text-slate-300">{s.rating}</span>
                <span className="text-slate-600 text-[7px]">({s.reviews})</span>
              </div>
            </div>
            <div className="bg-emerald-600 text-white text-[7px] px-1.5 py-1 rounded font-medium shrink-0">Cotação</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ComunidadeScreen2() {
  const posts = [
    { u: 'Clovis A.', time: '2h', title: 'Como reduzi 25% no tecido negociando direto com a fábrica', replies: 18, likes: 47, tag: 'Dica', tagColor: 'bg-emerald-900 text-emerald-300' },
    { u: 'Mariana F.', time: '5h', title: 'Alguém usa tecido reciclado? Cliente pediu certificação', replies: 12, likes: 31, tag: 'Pergunta', tagColor: 'bg-blue-900 text-blue-300' },
    { u: 'Roberto S.', time: '1d', title: 'Planilha gratuita para controle de OPs — baixe aqui', replies: 34, likes: 89, tag: 'Recurso', tagColor: 'bg-violet-900 text-violet-300' },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-emerald-600 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Fórum — Confecção & Vestuário</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full">320 membros</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800 p-1.5 space-y-1.5">
        {posts.map((p, i) => (
          <div key={i} className="bg-slate-800 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 rounded-full bg-emerald-700 flex items-center justify-center text-white text-[7px] font-bold shrink-0">{p.u[0]}</div>
              <span className="text-slate-400 text-[8px]">{p.u}</span>
              <span className="text-slate-700">·</span>
              <span className="text-slate-600 text-[8px]">{p.time}</span>
              <span className={`ml-auto text-[7px] px-1.5 py-0.5 rounded-full font-semibold ${p.tagColor}`}>{p.tag}</span>
            </div>
            <p className="text-slate-200 font-medium leading-tight mb-1.5">{p.title}</p>
            <div className="flex gap-3 text-slate-600 text-[8px]">
              <span>💬 {p.replies}</span>
              <span>❤️ {p.likes}</span>
            </div>
          </div>
        ))}
        <div className="bg-emerald-900/40 border border-emerald-700 rounded-lg py-2 text-center text-[8px] font-semibold text-emerald-400">
          + Fazer uma pergunta
        </div>
      </div>
    </div>
  );
}

export function ComunidadeScreen3() {
  const jobs = [
    { role: 'Costureira Industrial', co: 'R2PB Confecções', loc: 'Joinville, SC', tp: 'CLT', sal: 'R$1.800–2.200', hot: true },
    { role: 'Modelista Sênior', co: 'Estilo SP', loc: 'São Paulo, SP', tp: 'CLT', sal: 'R$4.500–5.500', hot: false },
    { role: 'Gerente de Produção', co: 'BrasFash Atacado', loc: 'Remoto', tp: 'PJ', sal: 'R$8.000–10.000', hot: true },
    { role: 'Auxiliar de Corte', co: 'GoodWear Ind.', loc: 'Blumenau, SC', tp: 'CLT', sal: 'R$1.400–1.600', hot: false },
  ];
  return (
    <div className="bg-slate-900 rounded-lg text-[9px] select-none h-full overflow-hidden flex flex-col">
      <div className="bg-emerald-600 px-2.5 py-2 flex items-center justify-between">
        <p className="text-white font-bold text-[10px]">Vagas do Setor Têxtil</p>
        <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full">43 abertas</span>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800">
        {jobs.map((j, i) => (
          <div key={i} className="px-2 py-2 hover:bg-slate-800/50">
            <div className="flex items-start justify-between gap-1 mb-0.5">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                <p className="font-semibold text-slate-200 truncate">{j.role}</p>
                {j.hot && <span className="bg-red-900 text-red-300 text-[6px] px-1 py-0.5 rounded font-bold shrink-0">🔥</span>}
              </div>
              <span className="bg-slate-800 text-slate-400 text-[7px] px-1.5 py-0.5 rounded font-semibold shrink-0">{j.tp}</span>
            </div>
            <p className="text-slate-500 text-[8px] mb-1">{j.co} · {j.loc}</p>
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 font-semibold">{j.sal}</span>
              <div className="bg-emerald-700 text-white text-[7px] px-1.5 py-0.5 rounded">Ver vaga →</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
