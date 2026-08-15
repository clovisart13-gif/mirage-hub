function fmt(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string | Date | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("pt-BR");
}

export function printOrcamento(o: any, empresa: any) {
  const itens: any[] = o.itens ?? [];
  const subtotal = itens.reduce((s: number, i: any) => s + Number(i.valorTotal ?? i.total ?? 0), 0);
  const descontoValor = o.descontoTipo === "percentual"
    ? subtotal * (Number(o.descontoValor ?? 0) / 100)
    : Number(o.descontoValor ?? 0);
  const total = Math.max(0, subtotal - descontoValor);
  const totalPecas = itens.reduce((s: number, i: any) => s + Number(i.quantidade), 0);
  const calcPgto = (pct: number, tipo: string, base: number) =>
    tipo === "valor" ? pct : (base * pct) / 100;
  const valorSinal = calcPgto(Number(o.percentualSinal ?? 0), o.tipoSinal ?? "percentual", total);
  const valorRetirada = calcPgto(Number(o.percentualRetirada ?? 0), o.tipoRetirada ?? "percentual", total);
  const valorPrazo = calcPgto(Number(o.percentualPrazo ?? 0), o.tipoPrazo ?? "percentual", total);

  const logoHtml = empresa?.logo_url
    ? `<img src="${empresa.logo_url}" alt="Logo" style="height:48px;width:auto;object-fit:contain;" />`
    : "";

  const itensHtml = itens.map((item: any, idx: number) => `
    <tr style="background:${idx % 2 === 0 ? '#fff' : '#fafafa'}">
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;">${item.referencia || "—"}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;">${item.descricao}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">${item.quantidade}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">${fmt(Number(item.valorUnitario))}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">${fmt(Number(item.valorTotal ?? item.total ?? 0))}</td>
    </tr>
  `).join("");

  const descontoHtml = Number(o.descontoValor ?? 0) > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
      <span>Desconto (${o.descontoTipo === "percentual" ? `${o.descontoValor}%` : "Valor fixo"}):</span>
      <strong>-${fmt(descontoValor)}</strong>
    </div>
  ` : "";

  const obsHtml = o.observacoes ? `
    <div style="background:#f5f5f5;border:1px solid #e0e0e0;padding:10px 12px;margin-top:14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;margin-bottom:6px;">Observações</div>
      <div style="font-size:10px;color:#444;line-height:1.5;white-space:pre-wrap;">${o.observacoes}</div>
    </div>
  ` : "";

  const rodapeHtml = (empresa?.pix || empresa?.cnpj || empresa?.email || empresa?.site) ? `
    <div style="margin-top:28px;border-top:2px solid #2c3e50;padding-top:10px;text-align:center;font-size:9px;color:#666;line-height:1.6;">
      <div style="font-weight:600;color:#444;font-size:10px;margin-bottom:2px;">
        ${empresa?.nome_empresa || ""}${empresa?.cnpj ? ` · CNPJ: ${empresa.cnpj}` : ""}
      </div>
      <div>
        ${empresa?.pix ? `PIX (CNPJ): ${empresa.pix}` : ""}
        ${empresa?.email ? `${empresa?.pix ? " | " : ""}Email: ${empresa.email}` : ""}
        ${empresa?.site ? `${(empresa?.pix || empresa?.email) ? " | " : ""}Site: ${empresa.site}` : ""}
      </div>
      <div>Este orçamento é válido por ${o.validade ?? o.validadeDias ?? 30} dias a partir da data de emissão.</div>
    </div>
  ` : `<div style="margin-top:28px;text-align:center;font-size:9px;color:#666;">Este orçamento é válido por ${o.validade ?? o.validadeDias ?? 30} dias a partir da data de emissão.</div>`;

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Orçamento ${o.numeroOrcamento ?? o.numero ?? ""}</title>
  <style>
    @page { size: A4; margin: 15mm 15mm 20mm 15mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 8mm; background: #fff; font-family: Arial, sans-serif; font-size: 12px; color: #222; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @media print {
      body { margin: 0; padding: 0; }
      a { text-decoration: none !important; color: inherit !important; }
    }
  </style>
</head>
<body>


    <!-- Cabeçalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid #e0e0e0;">
      <div style="display:flex;align-items:flex-start;gap:12px;">
        ${logoHtml}
        <div>
          <p style="font-size:15px;font-weight:700;color:#111;margin:0 0 3px 0;">${empresa?.nome_empresa || ""}</p>
          ${empresa?.endereco ? `<p style="font-size:10px;color:#555;line-height:1.4;margin:0;">${empresa.endereco}${empresa?.cidade_estado_cep ? ` - ${empresa.cidade_estado_cep}` : ""}</p>` : ""}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:18px;font-weight:700;color:#111;">${o.numeroOrcamento ?? o.numero ?? ""}</div>
        <div style="font-size:12px;color:#555;margin-top:3px;">${formatDate(o.dataEmissao ?? o.createdAt)}</div>
      </div>
    </div>

    <!-- Dados do Cliente -->
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">Dados do Cliente</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:11px;">
        <div><span style="color:#555;">Cliente: </span><strong style="color:#111;">${o.nomeCliente ?? ""}</strong></div>
        <div><span style="color:#555;">Marca/Coleção: </span><strong style="color:#111;">${o.marca || "—"}</strong></div>
        <div><span style="color:#555;">Validade: </span><strong style="color:#111;">${o.validade ?? o.validadeDias ?? 30} dias</strong></div>
        <div><span style="color:#555;">Prazo de Entrega: </span><strong style="color:#111;">${o.prazoEntregaTexto || "—"}</strong></div>
      </div>
    </div>

    <!-- Itens -->
    <div style="margin-bottom:14px;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:1px solid #e0e0e0;padding-bottom:4px;margin-bottom:8px;">Itens do Orçamento</div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead>
          <tr style="background:#2c3e50;color:white;">
            <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;width:15%;">Referência</th>
            <th style="padding:7px 10px;text-align:left;font-size:10px;text-transform:uppercase;width:35%;">Descrição</th>
            <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;width:8%;">QTD.</th>
            <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;width:16%;">VLR. UNIT.</th>
            <th style="padding:7px 10px;text-align:right;font-size:10px;text-transform:uppercase;width:26%;">TOTAL</th>
          </tr>
        </thead>
        <tbody>${itensHtml}</tbody>
      </table>
    </div>

    <!-- Totais -->
    <div style="margin-top:8px;padding:10px 14px;background:#f8f8f8;border:1px solid #e8e8e8;">
      <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
        <span>Total de Peças:</span><strong>${totalPecas} unidades</strong>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
        <span>Subtotal:</span><strong>${fmt(subtotal)}</strong>
      </div>
      ${descontoHtml}
      <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;color:#111;border-top:2px solid #ddd;margin-top:6px;padding-top:8px;">
        <span>VALOR TOTAL:</span><span>${fmt(total)}</span>
      </div>
    </div>

    ${obsHtml}

    <!-- Condições de Pagamento -->
    <div style="border-left:4px solid #e8a000;padding:10px 14px;margin-top:14px;background:#fffdf0;">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;margin-bottom:8px;">Condições de Pagamento</div>
      ${(() => {
        const parcelas: any[] = o.parcelas ?? [];
        if (parcelas.length > 0) {
          return parcelas.map((p: any) => {
            const v = p.tipo === "valor" ? Number(p.valor) : (total * Number(p.valor)) / 100;
            const label = p.tipo === "valor" ? `R$ ${Number(p.valor).toFixed(2).replace(".", ",")}` : `${p.valor}%`;
            return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
              <span><strong>${p.titulo} (${label}):</strong></span>
              <span>${fmt(v)}</span>
            </div>`;
          }).join("");
        }
        return `
          <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
            <span><strong>Sinal (${o.tipoSinal === "valor" ? `R$ ${Number(o.percentualSinal ?? 0).toFixed(2)}` : `${o.percentualSinal ?? 0}%`}):</strong></span>
            <span>${fmt(valorSinal)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
            <span><strong>Retirada (${o.tipoRetirada === "valor" ? `R$ ${Number(o.percentualRetirada ?? 0).toFixed(2)}` : `${o.percentualRetirada ?? 0}%`}):</strong></span>
            <span>${fmt(valorRetirada)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:#444;">
            <span><strong>Prazo (${o.tipoPrazo === "valor" ? `R$ ${Number(o.percentualPrazo ?? 0).toFixed(2)}` : `${o.percentualPrazo ?? 0}%`}):</strong></span>
            <span>${fmt(valorPrazo)}</span>
          </div>`;
      })()}
    </div>

    ${rodapeHtml}

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela de impressão. Por favor, permita popups para este site e tente novamente.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
