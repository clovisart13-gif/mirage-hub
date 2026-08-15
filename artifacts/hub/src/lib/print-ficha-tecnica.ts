function fmtDate(d?: string | Date | null) {
  if (!d) return new Date().toLocaleDateString("pt-BR");
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-BR");
}

function fmtCurrency(v: number | string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface PrintFichaOptions {
  ficha: any;
  produto?: any;
  cliente?: any;
  empresa?: any;
  colecao?: any;
}

export function printFichaTecnica({ ficha, produto, cliente, empresa, colecao }: PrintFichaOptions) {
  const logoHtml = empresa?.logo_url
    ? `<img src="${empresa.logo_url}" alt="Logo" style="height:52px;width:auto;object-fit:contain;" />`
    : `<div style="width:52px;height:52px;background:#4f46e5;border-radius:8px;display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:20px;">M</div>`;

  // ── Tabela de Medidas ────────────────────────────────────────────────────────
  const medidas = ficha.medidas ?? {};
  const grades = Object.keys(medidas);
  const campos = grades.length > 0 ? Object.keys(medidas[grades[0]] ?? {}) : [];
  const medidasHtml = (grades.length > 0 && campos.length > 0) ? `
    <div style="margin-top:18px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin-bottom:8px;">Tabela de Medidas (cm)</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#4f46e5;color:white;">
            <th style="padding:5px 8px;text-align:left;font-size:9px;font-weight:600;">Campo</th>
            ${grades.map(g => `<th style="padding:5px 8px;text-align:center;font-size:9px;font-weight:600;">${g}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${campos.map((campo, i) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#f8f8ff"};">
              <td style="padding:4px 8px;border-bottom:1px solid #eee;font-weight:500;">${campo}</td>
              ${grades.map(g => `<td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center;">${medidas[g]?.[campo] ?? "—"}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // ── Componentes ──────────────────────────────────────────────────────────────
  const componentes: any[] = ficha.componentes ?? [];
  const componentesHtml = componentes.length > 0 ? `
    <div style="margin-top:18px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin-bottom:8px;">Componentes / Tecidos</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:5px 8px;text-align:left;font-weight:600;color:#555;">Nome</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;color:#555;">Tecido / Descrição</th>
            <th style="padding:5px 8px;text-align:right;font-weight:600;color:#555;">Consumo</th>
          </tr>
        </thead>
        <tbody>
          ${componentes.map((c: any, i: number) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${c.nome ?? "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${c.tecido ?? c.descricao ?? "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${c.consumo ?? c.quantidade ?? "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  ` : "";

  // ── Mão de Obra ──────────────────────────────────────────────────────────────
  const mdoArray: any[] = ficha.mao_de_obra ?? [];
  const mdoHtml = mdoArray.length > 0 ? `
    <div style="margin-top:18px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin-bottom:8px;">Mão de Obra</div>
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:5px 8px;text-align:left;font-weight:600;color:#555;">Operação</th>
            <th style="padding:5px 8px;text-align:left;font-weight:600;color:#555;">Máquina</th>
            <th style="padding:5px 8px;text-align:center;font-weight:600;color:#555;">Tempo (min)</th>
            <th style="padding:5px 8px;text-align:right;font-weight:600;color:#555;">Custo</th>
          </tr>
        </thead>
        <tbody>
          ${mdoArray.map((m: any, i: number) => `
            <tr style="background:${i % 2 === 0 ? "#fff" : "#fafafa"};">
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${m.operacao ?? "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;">${m.maquina ?? "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:center;">${m.tempo_min ?? "—"}</td>
              <td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right;">${m.custo ? fmtCurrency(m.custo) : (m.valor ? fmtCurrency(m.valor) : "—")}</td>
            </tr>
          `).join("")}
          ${mdoArray.reduce((s: number, m: any) => s + Number(m.custo ?? m.valor ?? 0), 0) > 0 ? `
            <tr style="background:#f8f8ff;font-weight:700;">
              <td colspan="3" style="padding:5px 8px;text-align:right;color:#555;">Total M.O.:</td>
              <td style="padding:5px 8px;text-align:right;color:#4f46e5;">
                ${fmtCurrency(mdoArray.reduce((s: number, m: any) => s + Number(m.custo ?? m.valor ?? 0), 0))}
              </td>
            </tr>
          ` : ""}
        </tbody>
      </table>
    </div>
  ` : "";

  // ── Imagens e arquivos da galeria ────────────────────────────────────────────
  const galeria: string[] = ficha.galeria_urls ?? [];
  const fotoPrincipal: string | null = ficha.foto_principal_url ?? null;

  const isImageUrl = (url: string) => /\.(jpe?g|png|gif|webp|svg|bmp|tiff?)(\?.*)?$/i.test(url);

  const imagens = [fotoPrincipal, ...galeria.filter(isImageUrl)].filter(Boolean) as string[];
  const arquivos = galeria.filter(url => !isImageUrl(url));

  const fileLabel = (url: string) => {
    try {
      const parts = new URL(url, "http://x").pathname.split("/");
      return decodeURIComponent(parts[parts.length - 1]);
    } catch {
      return url.split("/").pop() ?? "arquivo";
    }
  };

  const galeriaHtml = imagens.length > 0 ? `
    <div style="margin-top:22px;page-break-inside:avoid;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin-bottom:10px;">
        Imagens / Referências Visuais
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;">
        ${imagens.map((url, i) => `
          <div style="text-align:center;">
            <img src="${url}" alt="Imagem ${i + 1}" style="max-height:180px;max-width:180px;object-fit:contain;border:1px solid #e0e0e0;border-radius:4px;display:block;" />
            <div style="font-size:8px;color:#666;margin-top:2px;">${i === 0 && fotoPrincipal ? "Principal" : `Ref. ${i + 1}`}</div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const anexosHtml = arquivos.length > 0 ? `
    <div style="margin-top:14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px;">
        Arquivos Técnicos Anexados
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${arquivos.map(url => `
          <div style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#f3f4f6;border:1px solid #e0e0e0;border-radius:4px;font-size:9px;color:#444;">
            📎 ${fileLabel(url)}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  // ── Status badge ─────────────────────────────────────────────────────────────
  const statusLabel: Record<string, string> = { rascunho: "Rascunho", em_revisao: "Em Revisão", aprovada: "Aprovada" };
  const statusColor: Record<string, string> = {
    rascunho: "background:#f3f4f6;color:#4b5563",
    em_revisao: "background:#fffbeb;color:#92400e",
    aprovada: "background:#f0fdf4;color:#166534",
  };
  const statusStyle = statusColor[ficha.status] ?? "background:#f3f4f6;color:#374151";

  // ── Especificações ───────────────────────────────────────────────────────────
  const specs = [
    ficha.familia && `<div><span style="color:#555;">Família: </span><strong>${ficha.familia}</strong></div>`,
    ficha.tipo_costura && `<div><span style="color:#555;">Tipo de Costura: </span><strong>${ficha.tipo_costura}</strong></div>`,
    ficha.instrucao_lavagem && `<div><span style="color:#555;">Lavagem: </span><strong>${ficha.instrucao_lavagem}</strong></div>`,
    ficha.aviamentos && `<div><span style="color:#555;">Aviamentos: </span><strong>${ficha.aviamentos}</strong></div>`,
    ficha.bordado_estampa && `<div><span style="color:#555;">Bordado/Estampa: </span><strong>${ficha.bordado_estampa}</strong></div>`,
  ].filter(Boolean).join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Ficha Técnica — ${ficha.titulo ?? produto?.nome ?? "Produto"}</title>
  <style>
    @page { size: A4; margin: 12mm 14mm 18mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; font-family: Arial, sans-serif; font-size: 11px; color: #222; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    @media print {
      body { margin: 0; padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

  <!-- Barra de ação (apenas tela) -->
  <div class="no-print" style="background:#4f46e5;padding:10px 20px;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;z-index:100;">
    <span style="color:white;font-weight:600;font-size:14px;">Ficha Técnica — Visualização / Impressão</span>
    <button onclick="window.print()" style="background:white;color:#4f46e5;border:none;padding:8px 20px;border-radius:6px;font-weight:700;font-size:13px;cursor:pointer;">🖨️ Imprimir / Salvar PDF</button>
  </div>

  <div style="padding: 8mm 10mm 10mm 10mm;">

    <!-- Cabeçalho -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #4f46e5;">
      <div style="display:flex;align-items:center;gap:12px;">
        ${logoHtml}
        <div>
          <div style="font-size:14px;font-weight:700;color:#111;">${empresa?.nome_empresa ?? "Mirage Confecção"}</div>
          ${empresa?.cnpj ? `<div style="font-size:9px;color:#666;">CNPJ: ${empresa.cnpj}</div>` : ""}
          ${empresa?.endereco ? `<div style="font-size:9px;color:#666;">${empresa.endereco}${empresa?.cidade_estado_cep ? ` · ${empresa.cidade_estado_cep}` : ""}</div>` : ""}
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#4f46e5;">FICHA TÉCNICA</div>
        <div style="font-size:16px;font-weight:700;color:#111;margin-top:2px;">v${ficha.versao ?? 1}</div>
        <div style="font-size:9px;color:#666;margin-top:2px;">${fmtDate(ficha.created_at)}</div>
        <div style="display:inline-block;margin-top:4px;padding:2px 8px;border-radius:10px;font-size:9px;font-weight:600;${statusStyle};">
          ${statusLabel[ficha.status] ?? ficha.status ?? "Rascunho"}
        </div>
      </div>
    </div>

    <!-- Produto + Cliente -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;font-size:10px;margin-bottom:14px;background:#f8f8ff;padding:10px 12px;border-radius:6px;border:1px solid #e8e8f8;">
      <div><span style="color:#555;">Produto: </span><strong style="color:#111;">${produto?.nome ?? ficha.produto_nome ?? "—"}</strong></div>
      <div><span style="color:#555;">Referência: </span><strong>${produto?.referencia ?? "—"}</strong></div>
      <div><span style="color:#555;">Coleção: </span><strong>${colecao?.nome ?? produto?.colecao ?? "—"}</strong></div>
      <div><span style="color:#555;">Título: </span><strong>${ficha.titulo ?? "—"}</strong></div>
      ${cliente ? `<div><span style="color:#555;">Cliente: </span><strong>${cliente.nome}</strong></div>` : ""}
      ${ficha.familia ? `<div><span style="color:#555;">Família: </span><strong>${ficha.familia}</strong></div>` : ""}
    </div>

    <!-- Especificações -->
    ${specs ? `
    <div style="margin-bottom:14px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;border-bottom:2px solid #4f46e5;padding-bottom:4px;margin-bottom:8px;">Especificações</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 20px;font-size:10px;">${specs}</div>
    </div>
    ` : ""}

    ${medidasHtml}
    ${componentesHtml}
    ${mdoHtml}
    ${galeriaHtml}
    ${anexosHtml}

    <!-- Observações -->
    ${ficha.observacoes ? `
    <div style="margin-top:18px;background:#f5f5f5;border:1px solid #e0e0e0;padding:10px 12px;border-radius:4px;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#333;margin-bottom:6px;">Observações</div>
      <div style="font-size:10px;color:#444;line-height:1.5;white-space:pre-wrap;">${ficha.observacoes}</div>
    </div>
    ` : ""}

    <!-- Rodapé -->
    <div style="margin-top:28px;border-top:1px solid #e0e0e0;padding-top:10px;display:flex;justify-content:space-between;font-size:8px;color:#888;">
      <span>${empresa?.nome_empresa ?? "Mirage Confecção"}${empresa?.cnpj ? ` · CNPJ: ${empresa.cnpj}` : ""}</span>
      <span>Emitido em ${fmtDate()} · Ficha v${ficha.versao ?? 1}</span>
    </div>

  </div>

  <script>
    // Auto-print se aberto como janela de impressão
    if (window.opener) {
      window.onload = function() { setTimeout(function() { window.print(); }, 400); };
    }
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    alert("O navegador bloqueou a janela. Permita popups para este site e tente novamente.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
