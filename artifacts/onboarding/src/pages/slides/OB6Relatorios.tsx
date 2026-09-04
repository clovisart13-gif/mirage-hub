const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai'];
const VALS = [31, 44, 39, 61, 78];

export default function OB6Relatorios() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div className="absolute top-0 left-0 w-full h-[0.6vh] bg-accent" />

      {/* Esquerda */}
      <div className="w-[40vw] flex flex-col justify-center pl-[7vw] pr-[3vw]">
        <span className="font-display font-bold text-accent uppercase tracking-widest mb-[1.5vh]" style={{ fontSize: "1.5vw" }}>
          Módulo 4
        </span>
        <h2 className="font-display font-extrabold text-text leading-tight tracking-tight mb-[2.5vh]" style={{ fontSize: "4.5vw" }}>
          Relatórios
        </h2>
        <p className="font-body text-muted mb-[3vh]" style={{ fontSize: "1.9vw", maxWidth: "30vw" }}>
          6 abas integradas: do KPI executivo ao BI de vendas com exportação Excel em 1 clique.
        </p>
        <div className="grid grid-cols-2 gap-[1.2vh]">
          {[
            { t: 'KPIs Gerais', c: '#4338CA' },
            { t: 'BI Vendas + Excel', c: '#0891B2' },
            { t: 'Controle Produção', c: '#4338CA' },
            { t: 'Por Cliente', c: '#059669' },
            { t: 'Histórico', c: '#0891B2' },
            { t: 'Contas a Receber', c: '#4338CA' },
          ].map(({ t, c }) => (
            <div key={t} className="bg-white rounded-xl px-[1.5vw] py-[1.2vh] shadow-sm border border-slate-100 flex items-center gap-[0.8vw]">
              <div className="w-[0.5vw] h-[3vh] rounded-full shrink-0" style={{ background: c }} />
              <span className="font-display font-bold text-slate-800" style={{ fontSize: "1.4vw" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Direita: gráfico + KPIs */}
      <div className="flex-1 flex flex-col justify-center pr-[5vw] pl-[2vw] gap-[1.8vh]">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 px-[2vw] py-[2vh]">
          <div className="flex items-center justify-between mb-[2vh]">
            <span className="font-display font-bold text-slate-800" style={{ fontSize: "1.6vw" }}>📈 Faturamento Mensal</span>
            <span className="bg-indigo-50 text-primary border border-indigo-200 rounded-lg px-[1.2vw] py-[0.4vh] font-body" style={{ fontSize: "1.3vw" }}>📥 Exportar Excel</span>
          </div>
          <div className="flex items-end gap-[1.5vw] h-[15vh]">
            {MESES.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-[0.5vh]">
                <span className="font-display font-bold text-accent" style={{ fontSize: "1.1vw" }}>
                  {i === MESES.length - 1 ? `${VALS[i]}k` : ''}
                </span>
                <div
                  className="w-full rounded-t-md"
                  style={{
                    height: `${(VALS[i] / 90) * 13}vh`,
                    background: i === MESES.length - 1
                      ? 'linear-gradient(180deg, #06B6D4, #0891B2)'
                      : i >= MESES.length - 2
                        ? 'rgba(6,182,212,0.6)'
                        : 'rgba(6,182,212,0.25)',
                  }}
                />
                <span className="font-body text-slate-500" style={{ fontSize: "1.1vw" }}>{m}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-[1.2vw]">
          {[
            { n: 'R$ 248k', l: 'faturamento mai', c: '#4338CA' },
            { n: '+17%', l: 'vs mês anterior', c: '#059669' },
            { n: '94%', l: 'taxa de aprovação', c: '#0891B2' },
          ].map(({ n, l, c }) => (
            <div key={l} className="bg-white rounded-xl px-[1.8vw] py-[2vh] shadow-sm border border-slate-100 text-center">
              <p className="font-display font-black" style={{ fontSize: "2.8vw", color: c }}>{n}</p>
              <p className="font-body text-slate-500" style={{ fontSize: "1.3vw" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
