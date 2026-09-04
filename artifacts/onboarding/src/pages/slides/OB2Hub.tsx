import { useLocation } from "wouter";

const MODULOS = [
  { nome: 'PLM',         label: 'Produto',    cor: '#4F46E5', bg: '#EEF2FF', emoji: '🎨', position: 3  },
  { nome: 'Kanban',      label: 'Produção',   cor: '#7C3AED', bg: '#F5F3FF', emoji: '🏭', position: 6  },
  { nome: 'Custos',      label: 'Orçamentos', cor: '#2563EB', bg: '#EFF6FF', emoji: '💰', position: 8  },
  { nome: 'Relatórios',  label: 'BI',         cor: '#0891B2', bg: '#ECFEFF', emoji: '📊', position: 10 },
  { nome: 'Moda Conecta',label: 'Rede B2B',   cor: '#059669', bg: '#ECFDF5', emoji: '🤝', position: 12 },
  { nome: 'CRM',         label: 'Clientes',   cor: '#EA580C', bg: '#FFF7ED', emoji: '💬', position: 13 },
];

export default function OB2Hub() {
  const [, navigate] = useLocation();

  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div className="absolute top-0 left-0 w-full h-[0.6vh] bg-primary" />

      {/* Coluna esquerda */}
      <div className="w-[42vw] flex flex-col justify-center pl-[7vw] pr-[3vw]">
        <span className="font-display font-bold text-primary uppercase tracking-widest mb-[1.5vh]" style={{ fontSize: "1.5vw" }}>
          Hub Central
        </span>
        <h2 className="font-display font-extrabold text-text leading-tight tracking-tight mb-[2.5vh]" style={{ fontSize: "4.5vw", textWrap: "balance" } as React.CSSProperties}>
          Todos os apps em um só lugar
        </h2>
        <p className="font-body text-muted mb-[3vh]" style={{ fontSize: "1.85vw", maxWidth: "34vw" }}>
          Acesse qualquer módulo com um clique. Dados sincronizados, sem retrabalho.
        </p>
        <div className="flex flex-col gap-[1.5vh]">
          {[
            { t: 'Acesso por módulo', d: 'Clique direto da tela inicial do Hub', c: 'text-primary' },
            { t: 'Acesso por plano', d: 'Cada plano libera seus módulos incluídos', c: 'text-accent' },
            { t: 'Multi-tenant isolado', d: 'Seus dados são 100% privados e seguros', c: 'text-primary' },
          ].map(({ t, d, c }) => (
            <div key={t} className="flex items-center gap-[1.5vw]">
              <div className={`w-[0.5vw] h-[4.5vh] rounded-full ${c === 'text-primary' ? 'bg-primary' : 'bg-accent'}`} />
              <div>
                <p className={`font-display font-bold ${c}`} style={{ fontSize: "1.7vw" }}>{t}</p>
                <p className="font-body text-muted" style={{ fontSize: "1.5vw" }}>{d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mockup do Hub */}
      <div className="flex-1 flex flex-col justify-center pr-[6vw] pl-[2vw] gap-[2vh]">
        {/* Header */}
        <div className="bg-white rounded-xl px-[2vw] py-[1.4vh] flex items-center justify-between shadow-sm border border-slate-100">
          <div className="flex items-center gap-[1.2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-display font-black" style={{ fontSize: "1vw" }}>M</span>
            </div>
            <span className="font-display font-bold text-slate-800" style={{ fontSize: "1.6vw" }}>Mirage Hub</span>
          </div>
          <div className="flex items-center gap-[1vw]">
            <span className="bg-green-50 text-green-700 border border-green-200 rounded-full px-[1vw] py-[0.3vh] font-body" style={{ fontSize: "1.2vw" }}>● Plano Pro</span>
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-slate-100 flex items-center justify-center">
              <span style={{ fontSize: "1.2vw" }}>👤</span>
            </div>
          </div>
        </div>

        <p className="font-display font-bold text-slate-500 uppercase tracking-wide" style={{ fontSize: "1.2vw" }}>Acesso rápido</p>

        {/* Grid de módulos — cada card é um botão que navega para o slide correto */}
        <div className="grid grid-cols-3 gap-[1.4vh]">
          {MODULOS.map(m => (
            <button
              key={m.nome}
              onClick={() => navigate(`/slide${m.position}`)}
              className="bg-white rounded-xl px-[1.8vw] py-[2vh] shadow-sm border border-slate-100 flex items-center gap-[1.2vw] hover:shadow-md hover:border-slate-200 transition-all cursor-pointer text-left"
            >
              <div className="w-[3.5vw] h-[3.5vw] rounded-xl flex items-center justify-center shrink-0" style={{ background: m.bg }}>
                <span style={{ fontSize: "1.8vw" }}>{m.emoji}</span>
              </div>
              <div>
                <p className="font-display font-bold text-slate-800" style={{ fontSize: "1.45vw" }}>{m.nome}</p>
                <p className="font-body text-slate-500" style={{ fontSize: "1.25vw" }}>{m.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
