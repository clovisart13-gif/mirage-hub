export default function ModaConectaLanding() {
  const TARGET = "/formulariofase1";

  return (
    <>
      <style>{`
        .mcl * { box-sizing: border-box; margin: 0; padding: 0; }
        .mcl { font-family: 'Inter', -apple-system, sans-serif; background: #fff; color: #1B2F5E; line-height: 1.6; min-height: 100vh; }

        /* NAV */
        .mcl-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(8px);
          border-bottom: 1px solid rgba(27,47,94,0.08);
          padding: 0 2rem; height: 68px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .mcl-nav-logo { display: flex; align-items: center; gap: 10px; }
        .mcl-nav-logo img { height: 34px; object-fit: contain; }
        .mcl-nav-logo-text { display: flex; flex-direction: column; line-height: 1.2; }
        .mcl-nav-logo-text .brand { font-size: 13px; font-weight: 700; color: #1B2F5E; }
        .mcl-nav-logo-text .sub   { font-size: 10px; color: #64748B; }
        .mcl-nav-title {
          font-size: 13px; font-weight: 800; letter-spacing: 0.12em;
          text-transform: uppercase; color: #1B2F5E;
          position: absolute; left: 50%; transform: translateX(-50%);
        }
        .mcl-nav-cta {
          display: inline-flex; align-items: center;
          background: #2563EB; color: #fff;
          font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
          padding: 10px 22px; border-radius: 100px; text-decoration: none;
          transition: background 0.2s;
        }
        .mcl-nav-cta:hover { background: #1d4ed8; }

        /* HERO */
        .mcl-hero {
          max-width: 1200px; margin: 0 auto;
          padding: 72px 2rem 80px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 64px; align-items: center;
        }
        .mcl-badge {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
          text-transform: uppercase; color: #2563EB; margin-bottom: 24px;
        }
        .mcl-badge .dot {
          width: 8px; height: 8px; background: #2563EB;
          border-radius: 50%; flex-shrink: 0;
          animation: mcl-pulse 2s infinite;
        }
        @keyframes mcl-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .mcl-h1 {
          font-size: clamp(2.2rem, 3.8vw, 3.2rem); font-weight: 900;
          line-height: 1.1; letter-spacing: -0.02em;
          color: #1B2F5E; margin-bottom: 20px;
        }
        .mcl-body { font-size: 1rem; color: #64748B; line-height: 1.75; margin-bottom: 20px; }
        .mcl-highlight { font-size: 1rem; font-weight: 600; color: #2563EB; line-height: 1.55; margin-bottom: 36px; }
        .mcl-btn {
          display: inline-flex; align-items: center;
          background: #2563EB; color: #fff;
          font-size: 14px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 16px 36px;
          border-radius: 100px; text-decoration: none;
          box-shadow: 0 4px 24px rgba(37,99,235,0.35);
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .mcl-btn:hover { background: #1d4ed8; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(37,99,235,0.45); }
        .mcl-fine { margin-top: 16px; display: flex; flex-direction: column; gap: 4px; }
        .mcl-fine span { font-size: 12px; color: #94A3B8; display: flex; align-items: center; gap: 6px; }
        .mcl-fine span::before { content: '✓'; color: #3B82F6; font-weight: 700; font-size: 11px; }

        /* VISUAL */
        .mcl-visual { position: relative; }
        .mcl-img-wrap {
          border-radius: 24px; overflow: hidden; aspect-ratio: 4/3;
          position: relative; z-index: 2;
          box-shadow: 0 24px 64px rgba(27,47,94,0.18);
        }
        .mcl-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .mcl-blob { position: absolute; background: #A8D5A2; border-radius: 50%; opacity: 0.7; z-index: 1; }
        .mcl-blob-1 { width: 120px; height: 120px; top: -32px; right: -20px; }
        .mcl-blob-2 { width: 80px;  height: 80px;  bottom: -24px; left: -16px; }

        /* SECTION WHY */
        .mcl-why { background: #F0F4FF; padding: 80px 2rem; }
        .mcl-why-inner { max-width: 1100px; margin: 0 auto; text-align: center; }
        .mcl-h2 {
          font-size: clamp(1.8rem, 3.2vw, 2.75rem); font-weight: 900;
          color: #1B2F5E; letter-spacing: -0.02em; margin-bottom: 16px;
        }
        .mcl-sub { font-size: 1rem; color: #64748B; max-width: 600px; margin: 0 auto 52px; }
        .mcl-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 20px; }
        .mcl-card {
          background: #fff; border-radius: 16px; padding: 28px 24px; text-align: left;
          border: 1px solid rgba(27,47,94,0.08);
          box-shadow: 0 2px 12px rgba(27,47,94,0.05);
        }
        .mcl-card-icon {
          width: 44px; height: 44px; background: #F0F4FF; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 16px;
        }
        .mcl-card h3 { font-size: 15px; font-weight: 700; color: #1B2F5E; margin-bottom: 8px; }
        .mcl-card p  { font-size: 13px; color: #64748B; line-height: 1.6; }

        /* SECTION QUEM */
        .mcl-quem { padding: 80px 2rem; }
        .mcl-quem-inner { max-width: 1100px; margin: 0 auto; }
        .mcl-perfis { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 40px; }
        .mcl-tag {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 9px 18px; border-radius: 100px;
          border: 1.5px solid rgba(37,99,235,0.22);
          font-size: 13px; font-weight: 600; color: #1B2F5E;
        }
        .mcl-tag .d { width: 6px; height: 6px; background: #2563EB; border-radius: 50%; }

        /* CTA FINAL */
        .mcl-cta-section {
          background: #1B2F5E; padding: 80px 2rem; text-align: center;
          position: relative; overflow: hidden;
        }
        .mcl-cta-section::before {
          content:''; position:absolute; width:400px; height:400px;
          background:rgba(37,99,235,0.15); border-radius:50%;
          top:-100px; right:-100px;
        }
        .mcl-cta-section::after {
          content:''; position:absolute; width:300px; height:300px;
          background:rgba(168,213,162,0.1); border-radius:50%;
          bottom:-80px; left:-80px;
        }
        .mcl-cta-inner { position:relative; z-index:1; max-width:640px; margin:0 auto; }
        .mcl-cta-inner h2 {
          font-size: clamp(1.8rem, 3.2vw, 2.75rem); font-weight: 900;
          color: #fff; letter-spacing: -0.02em; margin-bottom: 14px;
        }
        .mcl-cta-inner p { font-size: 1rem; color: rgba(255,255,255,0.65); margin-bottom: 36px; }
        .mcl-btn-white {
          display: inline-flex; align-items: center;
          background: #fff; color: #1B2F5E;
          font-size: 14px; font-weight: 800; letter-spacing: 0.06em;
          text-transform: uppercase; padding: 16px 36px;
          border-radius: 100px; text-decoration: none;
          box-shadow: 0 4px 24px rgba(0,0,0,0.2);
          transition: background 0.2s, transform 0.15s;
        }
        .mcl-btn-white:hover { background: #F0F4FF; transform: translateY(-2px); }
        .mcl-cta-note { margin-top: 14px; font-size: 12px; color: rgba(255,255,255,0.35); }

        /* FOOTER */
        .mcl-footer { background: #111827; padding: 28px 2rem; text-align: center; }
        .mcl-footer p { font-size: 11px; color: rgba(255,255,255,0.3); }
        .mcl-footer a { color: rgba(255,255,255,0.45); text-decoration: none; }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .mcl-nav-title { display: none; }
          .mcl-hero { grid-template-columns: 1fr; gap: 36px; padding: 48px 1.5rem 56px; }
          .mcl-visual { order: -1; }
          .mcl-blob-1 { width: 80px; height: 80px; }
          .mcl-blob-2 { width: 56px; height: 56px; }
          .mcl-why, .mcl-quem, .mcl-cta-section { padding: 56px 1.5rem; }
        }
        @media (max-width: 480px) {
          .mcl-nav { padding: 0 1rem; }
          .mcl-nav-cta { font-size: 11px; padding: 9px 14px; }
        }
      `}</style>

      <div className="mcl">
        {/* NAV */}
        <nav className="mcl-nav">
          <div className="mcl-nav-logo">
            <img src="/mirage-logo.png" alt="Mirage"
              onError={(e) => (e.currentTarget.style.display = "none")} />
            <div className="mcl-nav-logo-text">
              <span className="brand">Mirage</span>
              <span className="sub">Gestão &amp; Tecnologia para Confecção</span>
            </div>
          </div>
          <span className="mcl-nav-title">Moda Conecta</span>
          <a href={TARGET} className="mcl-nav-cta">Quero me cadastrar</a>
        </nav>

        {/* HERO */}
        <section>
          <div className="mcl-hero">
            <div>
              <div className="mcl-badge"><span className="dot" />
                Cadastro antecipado aberto &nbsp;|&nbsp; Vagas limitadas para membros fundadores
              </div>
              <h1 className="mcl-h1">Conexões que fazem a moda acontecer.</h1>
              <p className="mcl-body">
                O Moda Conecta aproxima pequenos confeccionistas, costureiros, modelistas,
                estilistas, fornecedores e prestadores de serviços em uma comunidade criada
                para gerar conexões, trocas e novas oportunidades.
              </p>
              <p className="mcl-highlight">
                Faça parte da rede que vai conectar quem vive e faz a moda acontecer.
              </p>
              <a href={TARGET} className="mcl-btn">Quero ser membro fundador</a>
              <div className="mcl-fine">
                <span>Pré-cadastro gratuito em menos de 1 minuto.</span>
                <span>Primeiro ciclo com número limitado de participantes.</span>
                <span>Cadastro sujeito à análise de perfil.</span>
              </div>
            </div>

            <div className="mcl-visual">
              <div className="mcl-blob mcl-blob-1" />
              <div className="mcl-blob mcl-blob-2" />
              <div className="mcl-img-wrap">
                <img
                  src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=900&q=80&auto=format&fit=crop"
                  alt="Profissionais do setor têxtil colaborando"
                />
              </div>
            </div>
          </div>
        </section>

        {/* POR QUE SOZINHO É MAIS DIFÍCIL */}
        <section className="mcl-why">
          <div className="mcl-why-inner">
            <h2 className="mcl-h2">Crescer sozinho deixa tudo mais difícil.</h2>
            <p className="mcl-sub">
              Quem está na ponta do setor sabe: achar um parceiro confiável, ampliar a
              carteira ou crescer com qualidade exige muito mais do que habilidade técnica.
            </p>
            <div className="mcl-cards">
              {[
                { icon: "🤝", title: "Conexões qualificadas",    desc: "Match direto entre quem precisa e quem oferece. Sem intermediários e sem achismo." },
                { icon: "🌐", title: "Rede de confiança",        desc: "Cada perfil passa por curadoria. Você se conecta com quem é sério e está no mercado." },
                { icon: "⚡", title: "Fase fundadora gratuita",  desc: "Os primeiros aprovados entram sem custo inicial. Vagas limitadas para este ciclo." },
                { icon: "📈", title: "Novas oportunidades",      desc: "Ampliar produção, diversificar clientes ou fechar parcerias — tudo no mesmo lugar." },
              ].map(c => (
                <div key={c.title} className="mcl-card">
                  <div className="mcl-card-icon">{c.icon}</div>
                  <h3>{c.title}</h3>
                  <p>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARA QUEM É */}
        <section className="mcl-quem">
          <div className="mcl-quem-inner">
            <h2 className="mcl-h2">Para quem é o Moda Conecta?</h2>
            <p className="mcl-sub" style={{ margin: 0 }}>Para todos que fazem a cadeia produtiva da moda funcionar.</p>
            <div className="mcl-perfis">
              {["Confecção","Facção / Terceirizada","Oficina / Ateliê","Marca / Grife","Private Label",
                "Modelista","Estilista","Fornecedor de Insumos","Prestador de Serviços",
                "Estamparia / Bordado","Lavanderia","Logística Têxtil"].map(p => (
                <div key={p} className="mcl-tag"><span className="d" />{p}</div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="mcl-cta-section">
          <div className="mcl-cta-inner">
            <h2>Faça parte da fase fundadora.</h2>
            <p>Pré-cadastro gratuito. Vagas limitadas. Aprovação por análise de perfil.</p>
            <a href={TARGET} className="mcl-btn-white">Quero ser membro fundador</a>
            <p className="mcl-cta-note">Pré-cadastro em menos de 1 minuto · Sem cartão de crédito</p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mcl-footer">
          <p>MODA CONECTA · por Mirage Hub &nbsp;·&nbsp;
            <a href="https://www.gestaomirage.com.br">gestaomirage.com.br</a>
          </p>
        </footer>
      </div>
    </>
  );
}
