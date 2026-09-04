const CLIENTES = [
  { nome: 'Fashion Store SP', pedidos: 12, total: 'R$ 89.400', ticket: 'R$ 7.450', status: '+23%' },
  { nome: 'Atacado Rio Branco', pedidos: 8, total: 'R$ 61.200', ticket: 'R$ 7.650', status: '+11%' },
  { nome: 'Boutique Ana Lima', pedidos: 19, total: 'R$ 38.700', ticket: 'R$ 2.037', status: '+31%' },
];

export default function OB11BIVendas() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div className="absolute top-0 left-0 w-full h-[0.6vh] bg-accent" />

      {/* Esquerda */}
      <div className="w-[40vw] flex flex-col justify-center pl-[7vw] pr-[3vw]">
        <span className="font-display font-bold text-accent uppercase tracking-widest mb-[1.5vh]" style={{ fontSize: "1.5vw" }}>
          Relatórios — BI de Vendas
        </span>
        <h2 className="font-display font-extrabold text-text leading-tight tracking-tight mb-[2.5vh]" style={{ fontSize: "4.2vw" }}>
          Análise de vendas com exportação Excel
        </h2>
        <p className="font-body text-muted mb-[3vh]" style={{ fontSize: "1.9vw", maxWidth: "30vw" }}>
          Filtre por período, produto ou cliente. Exporte em 1 clique para apresentar à direção.
        </p>
        <div className="flex flex-col gap-[1.5vh]">
          {[
            { t: 'Filtros por período', d: 'Compare meses, trimestres e anos' },
            { t: 'Por produto', d: 'Volume e margem por referência' },
            { t: 'Por cliente', d: 'Recorrência e ticket médio' },
          ].map(({ t, d }) => (
            <div key={t} className="flex items-start gap-[1vw]">
              <span className="text-accent font-display font-black" style={{ fontSize: "1.6vw" }}>▸</span>
              <div>
                <p className="font-display font-bold text-text" style={{ fontSize: "1.7vw" }}>{t}</p>
                <p className="font-body text-muted" style={{ fontSize: "1.45vw" }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direita: mockup tabela BI */}
      <div className="flex-1 flex flex-col justify-center pr-[5vw] pl-[2vw] gap-[1.6vh]">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-[2vw] py-[1.5vh] border-b border-slate-100">
            <span className="font-display font-bold text-slate-800" style={{ fontSize: "1.6vw" }}>📊 BI por Cliente — Mai/2026</span>
            <button className="bg-indigo-600 text-white rounded-lg px-[1.8vw] py-[0.7vh] font-display font-bold flex items-center gap-[0.8vw]" style={{ fontSize: "1.35vw" }}>
              <span>📥</span> Exportar Excel
            </button>
          </div>
          <div className="grid grid-cols-5 px-[2vw] py-[1vh] bg-slate-50 border-b border-slate-100">
            {['Cliente', 'Pedidos', 'Total', 'Ticket médio', 'Crescimento'].map(h => (
              <span key={h} className="font-display font-bold text-slate-500 uppercase tracking-wide" style={{ fontSize: "1.2vw" }}>{h}</span>
            ))}
          </div>
          {CLIENTES.map(c => (
            <div key={c.nome} className="grid grid-cols-5 px-[2vw] py-[1.6vh] border-b border-slate-50 items-center">
              <span className="font-body font-semibold text-slate-800" style={{ fontSize: "1.4vw" }}>{c.nome}</span>
              <span className="font-body text-slate-600" style={{ fontSize: "1.4vw" }}>{c.pedidos}</span>
              <span className="font-display font-bold text-indigo-700" style={{ fontSize: "1.4vw" }}>{c.total}</span>
              <span className="font-body text-slate-600" style={{ fontSize: "1.4vw" }}>{c.ticket}</span>
              <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-[1vw] py-[0.3vh] font-display font-bold inline-block" style={{ fontSize: "1.3vw" }}>{c.status}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-[1.2vw]">
          {[
            { n: 'R$ 189k', l: 'total top 3', c: '#4338CA' },
            { n: '39', l: 'pedidos no mês', c: '#0891B2' },
            { n: '+22%', l: 'crescimento médio', c: '#059669' },
          ].map(({ n, l, c }) => (
            <div key={l} className="bg-white rounded-xl px-[1.8vw] py-[1.8vh] shadow-sm border border-slate-100 text-center">
              <p className="font-display font-black" style={{ fontSize: "2.5vw", color: c }}>{n}</p>
              <p className="font-body text-slate-500" style={{ fontSize: "1.3vw" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
