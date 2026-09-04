const ORCAMENTOS = [
  { ref: 'ORC-0089', cliente: 'Fashion Store SP', total: 'R$ 18.420', status: 'Aprovado', statusColor: '#10B981' },
  { ref: 'ORC-0091', cliente: 'Atacado Minas Têxtil', total: 'R$ 31.680', status: 'Aguardando', statusColor: '#F59E0B' },
  { ref: 'ORC-0093', cliente: 'Boutique Paulista', total: 'R$ 7.350', status: 'Aprovado', statusColor: '#10B981' },
];

export default function Slide6Custos() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div className="absolute top-0 left-0 w-full h-[0.5vh] bg-primary" />

      <div className="flex flex-col justify-center pl-[7vw] w-[44vw]">
        <span className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]" style={{ fontSize: "1.5vw" }}>
          Custos e Relatórios
        </span>
        <h2 className="font-display font-black text-text leading-none tracking-tight mb-[3vh]" style={{ fontSize: "5vw", textWrap: "balance" }}>
          Números reais para decisões reais
        </h2>
        <div className="flex flex-col gap-[2vh]">
          {[
            { t: 'Custo real por peça', d: 'Matéria-prima + MO + overhead calculados automaticamente.', c: 'text-primary' },
            { t: 'Orçamento em PDF', d: 'Gerado e enviado por e-mail com aprovação integrada.', c: 'text-accent' },
            { t: 'BI de Vendas', d: 'Relatórios com exportação Excel e visão por cliente.', c: 'text-primary' },
            { t: 'Contas a receber', d: 'Cobranças e emissão de faturas com 1 clique.', c: 'text-accent' },
          ].map(f => (
            <div key={f.t} className="flex items-start gap-[1.5vw]">
              <div className={`w-[0.5vw] shrink-0 h-[5vh] ${f.c === 'text-primary' ? 'bg-primary' : 'bg-accent'}`} />
              <div>
                <p className={`font-display font-bold ${f.c} mb-[0.3vh]`} style={{ fontSize: "1.9vw" }}>{f.t}</p>
                <p className="font-body text-muted" style={{ fontSize: "1.7vw" }}>{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mockup do sistema de custos */}
      <div className="flex-1 flex flex-col justify-center pr-[5vw] pl-[3vw] gap-[1.6vh]">
        {/* Ficha de custo */}
        <div className="bg-white/5 border border-white/10 rounded-xl px-[2vw] py-[1.8vh]">
          <div className="flex items-center justify-between mb-[1.2vh]">
            <span className="font-display font-bold text-text" style={{ fontSize: "1.7vw" }}>💰 Ficha de Custo — Camisa Social</span>
            <span className="bg-green-500/20 text-green-400 px-[1.2vw] py-[0.4vh] rounded-full font-body" style={{ fontSize: "1.3vw" }}>CAM-0041</span>
          </div>
          <div className="grid grid-cols-2 gap-[1vw]">
            {[
              ['Tecido principal', 'R$ 12,80/m', '1.8m', 'R$ 23,04'],
              ['Aviamentos', '—', 'kit', 'R$ 4,20'],
              ['Mão de obra (costura)', 'R$ 18,00/h', '0.5h', 'R$ 9,00'],
              ['Custos fixos (overhead)', '15%', '—', 'R$ 5,43'],
            ].map(([item, unit, qtd, val]) => (
              <div key={item} className="flex items-center justify-between py-[0.6vh] border-b border-white/8">
                <div>
                  <p className="font-body text-text" style={{ fontSize: "1.35vw" }}>{item}</p>
                  <p className="font-body text-muted" style={{ fontSize: "1.2vw" }}>{unit} × {qtd}</p>
                </div>
                <span className="font-display font-bold text-accent" style={{ fontSize: "1.5vw" }}>{val}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-[1.2vh] pt-[1vh] border-t border-white/15">
            <span className="font-display font-bold text-text" style={{ fontSize: "1.6vw" }}>Custo total / peça</span>
            <span className="font-display font-black text-primary" style={{ fontSize: "2.4vw" }}>R$ 41,67</span>
          </div>
        </div>

        {/* Lista de orçamentos */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="px-[2vw] py-[1.2vh] border-b border-white/10">
            <span className="font-display font-bold text-text" style={{ fontSize: "1.55vw" }}>📋 Orçamentos Recentes</span>
          </div>
          {ORCAMENTOS.map(o => (
            <div key={o.ref} className="flex items-center justify-between px-[2vw] py-[1.2vh] border-b border-white/5">
              <span className="font-display font-bold text-accent" style={{ fontSize: "1.4vw" }}>{o.ref}</span>
              <span className="font-body text-text" style={{ fontSize: "1.4vw" }}>{o.cliente}</span>
              <span className="font-display font-bold text-text" style={{ fontSize: "1.4vw" }}>{o.total}</span>
              <span className="px-[1vw] py-[0.3vh] rounded-full font-body" style={{ fontSize: "1.3vw", background: o.statusColor + '22', color: o.statusColor }}>{o.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
