export default function Slide10Comunidade() {
  const suppliers = [
    { name: 'TecidosBR', tag: 'Tecidos planos', stars: 5, city: 'SP', badge: '✓ Verificado' },
    { name: 'AviaModa', tag: 'Aviamentos', stars: 5, city: 'MG', badge: '✓ Verificado' },
    { name: 'FastFacção', tag: 'Facção completa', stars: 4, city: 'RJ', badge: '✓ Verificado' },
    { name: 'BordadosPRO', tag: 'Bordados & aplicações', stars: 5, city: 'RS', badge: '● Destaque' },
    { name: 'MalhariaSul', tag: 'Malhas & Jersey', stars: 4, city: 'SC', badge: '✓ Verificado' },
    { name: 'ModelistaNow', tag: 'Modelagem digital', stars: 5, city: 'SP', badge: '✓ Verificado' },
  ];
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-bg flex">
      <div className="absolute left-0 top-0 w-[0.5vw] h-full bg-accent" />

      <div className="flex flex-col justify-center pl-[8vw] w-[40vw]">
        <span
          className="font-display font-bold text-accent uppercase tracking-widest mb-[2vh]"
          style={{ fontSize: "1.5vw" }}
        >
          Moda Conecta
        </span>
        <h2
          className="font-display font-black text-text leading-none tracking-tight mb-[3vh]"
          style={{ fontSize: "4.8vw", textWrap: "balance" }}
        >
          Rede B2B do vestuário brasileiro
        </h2>
        <p className="font-body text-muted mb-[3vh]" style={{ fontSize: "1.85vw", maxWidth: "34vw" }}>
          Fornecedores verificados, cotações diretas e fórum especializado — tudo dentro do Hub.
        </p>
        <div className="flex flex-col gap-[1.6vh]">
          {[
            { label: '500+', desc: 'fornecedores verificados' },
            { label: '1 clique', desc: 'para solicitar cotação' },
            { label: 'Gratuito', desc: 'acesso para fornecedores' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-[1.5vw]">
              <span className="font-display font-black text-accent" style={{ fontSize: "2.2vw" }}>{s.label}</span>
              <span className="font-body text-muted" style={{ fontSize: "1.7vw" }}>{s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mockup do diretório */}
      <div className="flex-1 flex flex-col justify-center pr-[5vw] pl-[3vw] gap-[1.4vh]">
        <div className="bg-white/5 border border-white/10 rounded-xl px-[2vw] py-[1.5vh] mb-[1vh] flex items-center justify-between">
          <span className="font-body text-muted" style={{ fontSize: "1.5vw" }}>🔍 Buscar fornecedor, categoria ou região...</span>
          <span className="bg-accent/20 text-accent font-display font-bold px-[1.2vw] py-[0.5vh] rounded-lg" style={{ fontSize: "1.4vw" }}>Filtrar</span>
        </div>
        <div className="grid grid-cols-2 gap-[1.4vh]">
          {suppliers.map(s => (
            <div key={s.name} className="bg-white/6 border border-white/10 rounded-xl px-[1.8vw] py-[1.6vh] hover:border-accent/40 transition-colors">
              <div className="flex items-start justify-between mb-[0.8vh]">
                <div className="w-[3vw] h-[3vw] rounded-lg bg-primary/30 flex items-center justify-center">
                  <span className="font-display font-black text-primary" style={{ fontSize: "1.1vw" }}>{s.name.slice(0,2)}</span>
                </div>
                <span className={`text-xs px-[0.8vw] py-[0.3vh] rounded-full font-body ${s.badge.includes('Destaque') ? 'bg-accent/20 text-accent' : 'bg-green-500/20 text-green-400'}`} style={{ fontSize: "1.1vw" }}>{s.badge}</span>
              </div>
              <p className="font-display font-bold text-text" style={{ fontSize: "1.55vw" }}>{s.name}</p>
              <p className="font-body text-muted" style={{ fontSize: "1.35vw" }}>{s.tag} · {s.city}</p>
              <div className="flex gap-[0.3vw] mt-[0.8vh]">
                {Array.from({length: s.stars}).map((_,i) => <span key={i} className="text-accent" style={{ fontSize: "1.4vw" }}>★</span>)}
                {Array.from({length: 5 - s.stars}).map((_,i) => <span key={i} className="text-white/20" style={{ fontSize: "1.4vw" }}>★</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
