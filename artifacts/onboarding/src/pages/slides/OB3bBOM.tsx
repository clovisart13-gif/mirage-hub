export default function OB3bBOM() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col justify-center px-[7vw]"
      style={{ background: "linear-gradient(135deg, #F7F8FC 0%, #EEF0FF 100%)" }}
    >
      <div className="absolute top-0 left-0 w-full h-[0.6vh] bg-primary" />

      <span
        className="font-display font-bold text-primary uppercase tracking-widest mb-[2vh]"
        style={{ fontSize: "1.5vw" }}
      >
        PLM — BOM e Custos
      </span>
      <h2
        className="font-display font-extrabold text-text leading-tight tracking-tight mb-[4vh]"
        style={{ fontSize: "4.5vw" }}
      >
        Como calcular o custo real de um produto
      </h2>

      <div className="flex gap-[3vw]">
        <div className="flex flex-col gap-[2.5vh] flex-1">
          <div className="flex items-start gap-[2vw]">
            <div
              className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4338CA, #6366F1)" }}
            >
              <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>1</span>
            </div>
            <div>
              <p className="font-display font-bold text-text mb-[0.4vh]" style={{ fontSize: "2vw" }}>Cadastre os materiais</p>
              <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Tecido, aviamentos, linhas e acessórios com preço por unidade</p>
            </div>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div
              className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4338CA, #6366F1)" }}
            >
              <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>2</span>
            </div>
            <div>
              <p className="font-display font-bold text-text mb-[0.4vh]" style={{ fontSize: "2vw" }}>Monte a BOM</p>
              <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>Associe cada material ao produto com a quantidade usada por peça</p>
            </div>
          </div>
          <div className="flex items-start gap-[2vw]">
            <div
              className="flex-shrink-0 w-[5vw] h-[5vw] rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #06B6D4, #0891B2)" }}
            >
              <span className="font-display font-black text-white" style={{ fontSize: "1.8vw" }}>3</span>
            </div>
            <div>
              <p className="font-display font-bold text-text mb-[0.4vh]" style={{ fontSize: "2vw" }}>Custo calculado</p>
              <p className="font-body text-muted" style={{ fontSize: "1.85vw" }}>O sistema soma tudo automaticamente e exibe o custo real por peça</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-full rounded-2xl px-[3vw] py-[3vh]"
            style={{ background: "white", border: "0.1vw solid #E5E7EB", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
          >
            <p className="font-display font-bold text-text mb-[2vh]" style={{ fontSize: "1.8vw" }}>Exemplo: Camisa básica</p>
            <div className="flex flex-col gap-[1.2vh]">
              <div className="flex justify-between items-center">
                <span className="font-body text-muted" style={{ fontSize: "1.75vw" }}>Tecido (0,8m)</span>
                <span className="font-body font-semibold text-text" style={{ fontSize: "1.75vw" }}>R$ 18,40</span>
              </div>
              <div className="h-[0.08vh] bg-gray-100" />
              <div className="flex justify-between items-center">
                <span className="font-body text-muted" style={{ fontSize: "1.75vw" }}>Aviamentos</span>
                <span className="font-body font-semibold text-text" style={{ fontSize: "1.75vw" }}>R$ 3,20</span>
              </div>
              <div className="h-[0.08vh] bg-gray-100" />
              <div className="flex justify-between items-center">
                <span className="font-body text-muted" style={{ fontSize: "1.75vw" }}>Costura</span>
                <span className="font-body font-semibold text-text" style={{ fontSize: "1.75vw" }}>R$ 12,00</span>
              </div>
              <div className="h-[0.15vh] bg-primary mt-[0.5vh]" />
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-primary" style={{ fontSize: "1.9vw" }}>Custo real</span>
                <span className="font-display font-black text-primary" style={{ fontSize: "2.2vw" }}>R$ 33,60</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
