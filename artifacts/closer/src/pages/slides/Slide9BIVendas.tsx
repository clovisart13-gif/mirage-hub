const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
const VALORES = [38, 52, 45, 68, 71, 89];
const MAX = 100;

export default function Slide9BIVendas() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex flex-col justify-center pl-[6vw] pr-[6vw]">
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(90,79,219,0.1) 0%, transparent 65%)" }} />

      <div className="flex items-end justify-between mb-[3vh]">
        <div>
          <span className="relative font-display font-bold text-primary uppercase tracking-widest" style={{ fontSize: "1.5vw" }}>BI de Vendas</span>
          <h2 className="relative font-display font-black text-text leading-none tracking-tight" style={{ fontSize: "4.8vw" }}>
            6 visões de negócio numa tela
          </h2>
        </div>
        <div className="flex gap-[3vw]">
          {[['R$ 248k', 'faturamento mai'], ['+17%', 'vs abril'], ['94%', 'taxa aprovação']].map(([n, l]) => (
            <div key={l} className="text-right">
              <p className="font-display font-black text-accent" style={{ fontSize: "3vw" }}>{n}</p>
              <p className="font-body text-muted" style={{ fontSize: "1.4vw" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-[2vw]">
        {/* Gráfico de barras */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-[2vw] py-[2vh] w-[38vw]">
          <p className="font-display font-bold text-text mb-[2vh]" style={{ fontSize: "1.6vw" }}>📈 Faturamento Mensal (R$ mil)</p>
          <div className="flex items-end gap-[1.2vw] h-[18vh]">
            {MESES.map((m, i) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-[0.5vh]">
                <span className="font-display font-bold text-accent" style={{ fontSize: "1.2vw" }}>
                  {i === MESES.length - 1 ? `${VALORES[i]}k` : ''}
                </span>
                <div
                  className="w-full rounded-t-lg transition-all"
                  style={{
                    height: `${(VALORES[i] / MAX) * 15}vh`,
                    background: i === MESES.length - 1
                      ? 'linear-gradient(180deg, #F5A623, #E8920A)'
                      : i >= MESES.length - 2
                        ? 'rgba(90,79,219,0.8)'
                        : 'rgba(90,79,219,0.35)',
                  }}
                />
                <span className="font-body text-muted" style={{ fontSize: "1.2vw" }}>{m}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid de abas */}
        <div className="flex-1 grid grid-cols-2 gap-[1.2vw]">
          {[
            { t: 'KPIs Gerais', d: 'Visão executiva consolidada', icon: '📊', c: '#5A4FDB' },
            { t: 'BI Vendas + Excel', d: 'Análise e exportação em 1 clique', icon: '📥', c: '#F5A623' },
            { t: 'Controle Produção', d: 'OPs por etapa e prazo', icon: '🏭', c: '#5A4FDB' },
            { t: 'Por Cliente', d: 'Histórico e recorrência', icon: '👥', c: '#10B981' },
            { t: 'Histórico', d: 'Comparativo e sazonalidade', icon: '📅', c: '#5A4FDB' },
            { t: 'Contas a Receber', d: 'Cobranças e faturas integradas', icon: '💳', c: '#F5A623' },
          ].map(({ t, d, icon, c }) => (
            <div key={t} className="bg-white/5 border border-white/10 rounded-xl px-[1.8vw] py-[1.8vh] flex items-start gap-[1vw] hover:border-white/25 transition-colors">
              <span style={{ fontSize: "2.2vw" }}>{icon}</span>
              <div>
                <p className="font-display font-bold text-text" style={{ fontSize: "1.55vw", color: c }}>{t}</p>
                <p className="font-body text-muted" style={{ fontSize: "1.35vw" }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
