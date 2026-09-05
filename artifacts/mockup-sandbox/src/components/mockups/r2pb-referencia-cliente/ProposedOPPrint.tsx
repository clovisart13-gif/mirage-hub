import './_group.css';

const sizes = ['P', 'M', 'G', 'GG'];

export default function ProposedOPPrint() {
  return (
    <section className="r2pb-op-preview" aria-label="Pré-visualização de cartão de produção A4 com referência do cliente">
      <div className="r2pb-op-sheet">
        <ProductionCopy destination="FORNECEDOR" />
        <div className="r2pb-op-cut"><div className="r2pb-op-cut-line" /><span className="r2pb-op-cut-icon">✂</span><span>recorte aqui</span><div className="r2pb-op-cut-line" /></div>
        <ProductionCopy destination="FÁBRICA" />
      </div>
    </section>
  );
}

function ProductionCopy({ destination }: { destination: string }) {
  return (
    <article className="r2pb-op-card">
      <header className="r2pb-op-header">
        <div><div className="r2pb-op-title">CARTÃO DE PRODUÇÃO</div><div className="r2pb-op-company">R2PB CONFECÇÕES</div><div className="r2pb-op-subtitle">265HO-036 · NOTES</div></div>
        <div className="r2pb-op-header-right"><div className="r2pb-op-dest">{destination}</div><div className="r2pb-op-phase">COSTURA</div></div>
      </header>
      <div className="r2pb-op-body">
        <div className="r2pb-op-grid">
          <div>
            <Field label="Cliente" value="NOTES" /><Field label="Código OP" value="OP-26-036" /><Field label="Ref. R2PB" value="265HO-036" /><Field label="Ref. Cliente" value="REF-NOTES-7842" /><Field label="Modelo / Descrição" value="Hoodie oversized canguru" /><Field label="Fornecedor" value="FACÇÃO ALFA" />
            <div className="r2pb-op-row2"><Field label="Início" value="18/03/2026" /><Field label="Vencimento" value="28/03/2026" /></div>
          </div>
          <div>
            <Field label="Nº Pedido" value="PED-26-217" />
            <div className="r2pb-op-label">Quantidade</div><div className="r2pb-op-qtd">120</div>
            <div className="r2pb-op-row2"><Field label="CMO Unit." value="R$ 18,50" /><Field label="CMO Total" value="R$ 2.220,00" /></div>
          </div>
        </div>
        <h3 className="r2pb-op-heading">Grade de Corte</h3>
        <table className="r2pb-op-table"><thead><tr><th>Cor</th><th>Grade</th>{sizes.map(size => <th key={size}>{size}</th>)}<th>Total</th></tr></thead><tbody><tr><td>PRETO</td><td>P/M/G/GG</td><td>24</td><td>36</td><td>36</td><td>24</td><td><strong>120</strong></td></tr><tr><td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td><td><strong>120</strong></td></tr></tbody></table>
        <h3 className="r2pb-op-heading">Retorno / Quantidade Produzida</h3>
        <table className="r2pb-op-table"><thead><tr><th>Cor</th><th>Grade</th>{sizes.map(size => <th key={size}>{size}</th>)}<th>Total</th></tr></thead><tbody><tr><td>PRETO</td><td>P/M/G/GG</td><td>&nbsp;</td><td /><td /><td /><td /></tr><tr><td colSpan={6} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td><td /></tr></tbody></table>
        <h3 className="r2pb-op-heading">Observações</h3><div className="r2pb-op-obs">Conferir tonalidade do preto e acabamento da etiqueta antes da expedição.</div>
        <footer className="r2pb-op-footer"><span>Impresso em: 19/03/2026, 10:30</span><div className="r2pb-op-signature">Assinatura / Responsável</div></footer>
      </div>
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div><div className="r2pb-op-label">{label}</div><div className="r2pb-op-value">{value}</div></div>;
}