const ITENS = [
  { item: 'Tricoline branco', unit: 'R$ 18,50/m', qtd: '1.8m', total: 'R$ 33,30' },
  { item: 'Linha costura (kit)', unit: 'R$ 3,20', qtd: '1', total: 'R$ 3,20' },
  { item: 'Botões perolados', unit: 'R$ 0,40/un', qtd: '8', total: 'R$ 3,20' },
  { item: 'MO costura', unit: 'R$ 18/h', qtd: '0.5h', total: 'R$ 9,00' },
  { item: 'Overhead (15%)', unit: '—', qtd: '—', total: 'R$ 7,31' },
];

export default function OB5Custos() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex" style={{ background: "#F7F8FC" }}>

      {/* Esquerda */}
      <div className="flex flex-col justify-center pl-[7vw] w-[42vw]">
        <span className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]" style={{ fontSize: "1.5vw" }}>
          Módulo 3
        </span>
        <h2 className="font-display font-extrabold text-text leading-tight tracking-tight mb-[2.5vh]" style={{ fontSize: "4.8vw", textWrap: "balance" }}>
          Custos e Orçamentos
        </h2>
        <p className="font-body text-muted mb-[3vh]" style={{ fontSize: "1.9vw", maxWidth: "34vw" }}>
          Calcule o custo real por peça e gere um orçamento em PDF profissional em 1 clique.
        </p>
        <div className="flex flex-col gap-[1.5vh]">
          {[
            { t: 'Custo automático', d: 'Materiais + MO calculados em tempo real', cor: 'bg-primary' },
            { t: 'PDF profissional', d: 'Gerado com sua logo, enviado por e-mail', cor: 'bg-accent' },
            { t: 'Aprovação integrada', d: 'Cliente aprova e entra no histórico direto', cor: 'bg-primary' },
          ].map(({ t, d, cor }) => (
            <div key={t} className="flex items-center gap-[1.5vw]">
              <div className={`w-[0.5vw] h-[4.5vh] rounded-full ${cor}`} />
              <div>
                <p className="font-display font-bold text-text" style={{ fontSize: "1.75vw" }}>{t}</p>
                <p className="font-body text-muted" style={{ fontSize: "1.55vw" }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Direita: mockup ficha de custo */}
      <div className="flex-1 flex flex-col justify-center pr-[5vw] pl-[2vw] gap-[1.5vh]">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-[2vw] py-[1.4vh] flex items-center justify-between border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #4338CA, #6366F1)' }}>
            <div>
              <p className="font-display font-bold text-white" style={{ fontSize: "1.6vw" }}>💰 Ficha de Custo — Camisa Social</p>
              <p className="font-body text-white/70" style={{ fontSize: "1.3vw" }}>CAM-0041 · Grade P/M/G/GG · 120 peças</p>
            </div>
            <span className="bg-white/20 text-white rounded-lg px-[1.2vw] py-[0.5vh] font-display font-bold" style={{ fontSize: "1.3vw" }}>Aberta</span>
          </div>
          <div className="px-[2vw] pb-[1.5vh]">
            <div className="grid grid-cols-4 py-[1vh] border-b border-slate-100">
              {['Item', 'Unitário', 'Qtd', 'Total'].map(h => (
                <span key={h} className="font-display font-bold text-slate-500 uppercase tracking-wide" style={{ fontSize: "1.2vw" }}>{h}</span>
              ))}
            </div>
            {ITENS.map(row => (
              <div key={row.item} className="grid grid-cols-4 py-[0.8vh] border-b border-slate-50">
                <span className="font-body text-slate-700" style={{ fontSize: "1.35vw" }}>{row.item}</span>
                <span className="font-body text-slate-500" style={{ fontSize: "1.35vw" }}>{row.unit}</span>
                <span className="font-body text-slate-500" style={{ fontSize: "1.35vw" }}>{row.qtd}</span>
                <span className="font-display font-bold text-slate-800" style={{ fontSize: "1.35vw" }}>{row.total}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-[1.2vh] mt-[0.5vh]">
              <div className="flex gap-[2vw]">
                <div>
                  <p className="font-body text-slate-500" style={{ fontSize: "1.2vw" }}>Custo / peça</p>
                  <p className="font-display font-black text-primary" style={{ fontSize: "2.2vw" }}>R$ 56,01</p>
                </div>
                <div>
                  <p className="font-body text-slate-500" style={{ fontSize: "1.2vw" }}>Margem sugerida (42%)</p>
                  <p className="font-display font-black text-accent" style={{ fontSize: "2.2vw" }}>R$ 97,00</p>
                </div>
              </div>
              <div className="flex flex-col gap-[0.8vh]">
                <button className="bg-primary text-white rounded-lg px-[1.8vw] py-[0.8vh] font-display font-bold" style={{ fontSize: "1.4vw" }}>Gerar PDF</button>
                <button className="bg-slate-100 text-slate-600 rounded-lg px-[1.8vw] py-[0.8vh] font-body" style={{ fontSize: "1.3vw" }}>Enviar por e-mail</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
