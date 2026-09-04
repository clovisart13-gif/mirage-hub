const base = import.meta.env.BASE_URL;

const MODULOS = [
  { icon: "💰", nome: "Controle Financeiro", desc: "Receitas, despesas e fluxo de caixa" },
  { icon: "📄", nome: "Emissão de NF-e", desc: "Nota fiscal integrada ao sistema" },
  { icon: "🛒", nome: "Gestão de Vendas", desc: "Pedidos, aprovações e histórico" },
  { icon: "🖥️", nome: "PDV — Frente de Caixa", desc: "Ponto de venda integrado" },
  { icon: "📦", nome: "Controle de Estoque", desc: "Inventário e movimentações" },
  { icon: "🛍️", nome: "Controle de Compras", desc: "Pedidos de compra e fornecedores" },
  { icon: "⚡", nome: "Antecipação de Recebíveis", desc: "Capital de giro acelerado" },
  { icon: "🔗", nome: "Loja de Integrações", desc: "Conecte plataformas e sistemas" },
  { icon: "🏦", nome: "Open Banking Stone", desc: "Conta bancária integrada" },
  { icon: "💳", nome: "Conta PJ Integrada", desc: "Financeiro 100% dentro do ERP" },
];

export default function ERP2Modulos() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" }}>
      <div className="absolute top-0 left-0 w-[60vw] h-[50vh] opacity-20" style={{ background: "radial-gradient(ellipse at 20% 20%, #16a34a 0%, transparent 60%)" }} />

      {/* Header */}
      <div className="relative flex items-center justify-between px-[7vw] pt-[5vh] pb-[3vh]">
        <div>
          <span className="font-body font-bold uppercase tracking-widest text-green-400 bg-green-900/40 px-[1.2vw] py-[0.5vh] rounded-full" style={{ fontSize: "1.1vw" }}>10 módulos</span>
          <h2 className="font-display font-extrabold text-white mt-[1vh]" style={{ fontSize: "3.8vw" }}>
            Tudo que sua empresa precisa,<br />
            <span style={{ color: "#22c55e" }}>em um só lugar</span>
          </h2>
        </div>
        <img src={`${base}logo-dark.png`} crossOrigin="anonymous" alt="Mirage" style={{ height: "4vh", width: "auto", opacity: 0.7 }} />
      </div>

      {/* Grid de módulos */}
      <div className="relative flex-1 grid grid-cols-5 gap-[1.5vw] px-[7vw] pb-[5vh]">
        {MODULOS.map(({ icon, nome, desc }) => (
          <div
            key={nome}
            className="flex flex-col justify-between rounded-[1.2vw] p-[1.5vw]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div>
              <span style={{ fontSize: "2.5vw" }}>{icon}</span>
              <p className="font-display font-bold text-white mt-[1vh]" style={{ fontSize: "1.5vw" }}>{nome}</p>
              <p className="font-body text-white/50 mt-[0.5vh]" style={{ fontSize: "1.1vw" }}>{desc}</p>
            </div>
            <div className="mt-[1.5vh] flex items-center gap-[0.5vw]">
              <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-green-400" />
              <span className="font-body text-green-400" style={{ fontSize: "1vw" }}>Incluso no Hub</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
