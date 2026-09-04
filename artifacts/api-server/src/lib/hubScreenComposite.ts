/**
 * hubScreenComposite.ts — Mirage Hub marketing image generator
 *
 * 5 screens with varied backgrounds (light/dark/gradient):
 *   1. Dashboard   → LIGHT white bg, colorful KPI cards
 *   2. Kanban      → DARK with vivid colored column headers
 *   3. PLM         → LIGHT neutral, clean table, colorful pills
 *   4. Conecta Moda→ GRADIENT purple→blue (product hero feel)
 *   5. Relatórios  → LIGHT white, multi-color chart, clean cards
 */

import sharp from "sharp";

const SIZE = 1024;

// ── Light theme tokens ────────────────────────────────────────────────────────
const L = {
  bg:      "#f8fafc",
  card:    "#ffffff",
  border:  "#e2e8f0",
  sidebar: "#1e1b4b",
  sideT:   "#ffffff",
  sideS:   "#a5b4fc",
  text:    "#1e293b",
  sub:     "#64748b",
  dim:     "#94a3b8",
  purple:  "#7c3aed",
  purpleL: "#ede9fe",
  blue:    "#3b82f6",
  blueL:   "#dbeafe",
  teal:    "#0d9488",
  tealL:   "#ccfbf1",
  green:   "#16a34a",
  greenL:  "#dcfce7",
  amber:   "#d97706",
  amberL:  "#fef3c7",
  red:     "#dc2626",
  redL:    "#fee2e2",
} as const;

// ── Dark theme tokens ─────────────────────────────────────────────────────────
const D = {
  bg:         "#0f0e17",
  sidebar:    "#14122a",
  card:       "#1c1a30",
  cardB:      "#2d2b45",
  purple:     "#7c3aed",
  purpleL:    "#a78bfa",
  purpleDim:  "#4c1d95",
  blue:       "#3b82f6",
  teal:       "#14b8a6",
  amber:      "#f59e0b",
  green:      "#22c55e",
  red:        "#ef4444",
  text:       "#f1f5f9",
  sub:        "#94a3b8",
  dim:        "#475569",
} as const;

// ── SVG helpers ───────────────────────────────────────────────────────────────

const fnt = "Liberation Sans,DejaVu Sans,Arial,sans-serif";

function r(x: number, y: number, w: number, h: number, fill: string, rx = 8): string {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
}

function t(x: number, y: number, content: string, size: number, fill: string, weight = "normal", anchor = "start"): string {
  return `<text x="${x}" y="${y}" font-family="${fnt}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${content}</text>`;
}

function pill(x: number, y: number, label: string, bg: string, fg: string): string {
  const w = label.length * 7 + 20;
  return `<rect x="${x}" y="${y - 11}" width="${w}" height="20" rx="10" fill="${bg}"/>
    ${t(x + w / 2, y + 4, label, 11, fg, "bold", "middle")}`;
}

function shadow(x: number, y: number, w: number, h: number, rx = 12): string {
  return `<rect x="${x + 2}" y="${y + 4}" width="${w}" height="${h}" rx="${rx}" fill="#00000014"/>`;
}

// ── Light sidebar (used by screens 1, 3, 5) ───────────────────────────────────

function lightSidebar(activeIdx: number): string {
  const W = 196;
  const items = ["Dashboard", "Kanban", "PLM", "Orçamentos", "Relatórios", "Comunidade", "CRM"];
  const icons = ["⬡", "⊞", "◈", "◎", "◫", "◉", "◌"];
  let out = `<g>
    ${r(0, 0, W, SIZE, L.sidebar, 0)}
    <!-- logo row -->
    ${r(12, 16, W - 24, 50, "#312e81", 10)}
    ${t(40, 38, "⊛", 20, "#a78bfa", "normal")}
    ${t(64, 38, "MIRAGE", 16, "#ffffff", "bold")}
    ${t(64, 54, "Gestão &amp; Tecnologia", 10, "#a5b4fc", "normal")}
  `;
  items.forEach((label, i) => {
    const iy = 86 + i * 52;
    const active = i === activeIdx;
    if (active) {
      out += r(8, iy - 16, W - 16, 40, L.purple, 8);
    }
    out += `<text x="26" y="${iy + 8}" font-family="sans-serif" font-size="16" fill="${active ? "#fff" : "#818cf8"}">${icons[i]}</text>`;
    out += t(50, iy + 9, label, 13, active ? "#ffffff" : "#a5b4fc", active ? "bold" : "normal");
    if (!active) {
      out += `<rect x="${W - 8}" y="${iy - 16}" width="3" height="40" rx="1.5" fill="${L.purple}" fill-opacity="0"/>`;
    }
  });
  return out + "</g>";
}

function lightTopbar(title: string, sub = ""): string {
  const cx = 196;
  return `<g>
    ${r(cx, 0, SIZE - cx, 70, L.card, 0)}
    <rect x="${cx}" y="69" width="${SIZE - cx}" height="1" fill="${L.border}"/>
    ${t(cx + 20, 32, title, 22, L.text, "bold")}
    ${sub ? t(cx + 20, 54, sub, 12, L.sub) : ""}
    <circle cx="${SIZE - 30}" cy="35" r="20" fill="${L.purpleL}"/>
    <circle cx="${SIZE - 30}" cy="35" r="20" fill="none" stroke="${L.purple}" stroke-width="2"/>
    ${t(SIZE - 30, 40, "C", 14, L.purple, "bold", "middle")}
  </g>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 1: Dashboard — LIGHT background, colorful KPI cards
// ═══════════════════════════════════════════════════════════════════════════════

export function screen1Dashboard(): string {
  const cx = 196;
  const cw = SIZE - cx;
  const kw = Math.floor((cw - 56) / 3);

  const kpis = [
    { label: "Pedidos ativos",     value: "47",       delta: "▲ 12%",  accent: L.purple, light: L.purpleL },
    { label: "Em produção",        value: "1.840 un", delta: "▲ 8%",   accent: L.blue,   light: L.blueL   },
    { label: "Receita este mês",   value: "R$ 92k",   delta: "▲ 23%",  accent: L.teal,   light: L.tealL   },
  ];

  let kpiCards = "";
  kpis.forEach((k, i) => {
    const kx = cx + 16 + i * (kw + 12);
    const ky = 82;
    kpiCards += `
      ${shadow(kx, ky, kw, 100)}
      ${r(kx, ky, kw, 100, L.card, 14)}
      <rect x="${kx}" y="${ky}" width="${kw}" height="4" rx="2" fill="${k.accent}"/>
      ${r(kx + 14, ky + 18, 32, 32, k.light, 8)}
      ${t(kx + 30, ky + 39, "◈", 16, k.accent, "bold", "middle")}
      ${t(kx + 54, ky + 34, k.label, 12, L.sub)}
      ${t(kx + 14, ky + 72, k.value, 24, L.text, "bold")}
      ${r(kx + kw - 64, ky + 64, 52, 20, k.light, 10)}
      ${t(kx + kw - 38, ky + 78, k.delta, 11, k.accent, "bold", "middle")}
    `;
  });

  // Bar chart (light)
  const bx = cx + 16; const by = 200; const bw = cw - 32; const bh = 200;
  const bars = [42, 58, 50, 74, 65, 88, 76, 95, 82, 100, 91, 108];
  const maxV = 120;
  let barChart = `
    ${shadow(bx, by, bw, bh)}
    ${r(bx, by, bw, bh, L.card, 14)}
    ${t(bx + 16, by + 24, "Produção mensal — unidades expedidas", 13, L.sub)}
    ${t(bx + bw - 16, by + 24, "Jan–Dez 2025", 12, L.dim, "normal", "end")}
    <rect x="${bx + 16}" y="${by + 36}" width="${bw - 32}" height="1" fill="${L.border}"/>
  `;
  const months = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  bars.forEach((v, i) => {
    const barH = Math.round((v / maxV) * (bh - 70));
    const barX = bx + 20 + i * Math.floor((bw - 40) / bars.length);
    const barW = Math.floor((bw - 40) / bars.length) - 5;
    const isLast = i === bars.length - 1;
    barChart += `<rect x="${barX}" y="${by + bh - 30 - barH}" width="${barW}" height="${barH}" rx="4" fill="${isLast ? L.purple : L.purple}" fill-opacity="${isLast ? 1 : 0.2 + i * 0.06}"/>`;
    barChart += t(barX + barW / 2, by + bh - 10, months[i]!, 10, L.dim, "normal", "middle");
  });

  // Recent orders table
  const tx = cx + 16; const ty = 420; const tw = cw - 32; const th = 220;
  const orders = [
    { code: "PED-1042", client: "Marca Alpha",  qty: "320 un", stage: "Costura",    sc: L.blue,  sl: L.blueL  },
    { code: "PED-1041", client: "Studio Nord",  qty: "180 un", stage: "Corte",      sc: L.amber, sl: L.amberL },
    { code: "PED-1040", client: "Label Verde",  qty: "500 un", stage: "Acabamento", sc: L.teal,  sl: L.tealL  },
    { code: "PED-1039", client: "R2PB",         qty: "240 un", stage: "Entregue",   sc: L.green, sl: L.greenL },
  ];
  let table = `
    ${shadow(tx, ty, tw, th)}
    ${r(tx, ty, tw, th, L.card, 14)}
    ${t(tx + 16, ty + 26, "Pedidos recentes", 14, L.text, "bold")}
    <rect x="${tx + 16}" y="${ty + 38}" width="${tw - 32}" height="1" fill="${L.border}"/>
  `;
  orders.forEach((o, i) => {
    const ry2 = ty + 52 + i * 42;
    const rowBg = i % 2 === 0 ? "#f8fafc" : L.card;
    table += r(tx + 12, ry2 - 2, tw - 24, 38, rowBg, 6);
    table += t(tx + 24, ry2 + 14, o.code, 13, L.text, "bold");
    table += t(tx + 24, ry2 + 28, o.client, 11, L.sub);
    table += t(tx + 280, ry2 + 21, o.qty, 12, L.sub);
    table += `<rect x="${tx + tw - 120}" y="${ry2 + 6}" width="90" height="22" rx="11" fill="${o.sl}"/>`;
    table += t(tx + tw - 75, ry2 + 21, o.stage, 11, o.sc, "bold", "middle");
  });

  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${r(0, 0, SIZE, SIZE, L.bg, 0)}
    ${lightSidebar(0)}
    ${lightTopbar("Dashboard", "Bem-vindo, Clóvis · Mirage Hub")}
    ${kpiCards}
    ${barChart}
    ${table}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 2: Kanban — DARK with vivid colored column headers
// ═══════════════════════════════════════════════════════════════════════════════

export function screen2Kanban(): string {
  const stages = [
    { label: "Fila",        color: "#6366f1", cards: [["PED-1043","Marca Alpha","320 un"],["PED-1044","Studio Nord","150 un"]] },
    { label: "Corte",       color: "#f59e0b", cards: [["PED-1040","Label Verde","500 un"],["PED-1038","R2PB","240 un"]] },
    { label: "Costura",     color: "#3b82f6", cards: [["PED-1037","Brand Co","180 un"]] },
    { label: "Acabamento",  color: "#14b8a6", cards: [["PED-1035","Nova Moda","320 un"],["PED-1034","Alpha","90 un"]] },
    { label: "Expedição",   color: "#22c55e", cards: [["PED-1033","R2PB","420 un"]] },
  ];

  const colW = Math.floor((SIZE - 20) / stages.length);
  let out = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="topbar" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="100%" stop-color="#14122a"/>
      </linearGradient>
    </defs>
    ${r(0, 0, SIZE, SIZE, "#0a0918", 0)}
    ${r(0, 0, SIZE, 68, "url(#topbar)", 0)}
    <rect x="0" y="67" width="${SIZE}" height="1" fill="#312e81"/>
    ${t(20, 30, "⊛", 20, "#a78bfa")}
    ${t(48, 30, "MIRAGE", 18, "#ffffff", "bold")}
    ${t(48, 50, "Kanban de Produção", 12, "#818cf8")}
    <!-- badge counts -->
  `;

  stages.forEach((stage, si) => {
    const cx = si * colW + 10;
    const totalCards = stage.cards.length;

    // Column header with vivid color
    out += `
      <defs>
        <linearGradient id="col${si}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${stage.color}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${stage.color}" stop-opacity="0.05"/>
        </linearGradient>
      </defs>
      ${r(cx, 78, colW - 8, SIZE - 86, "url(#col${si})", 12)}
      <rect x="${cx}" y="78" width="${colW - 8}" height="44" rx="12" fill="${stage.color}" fill-opacity="0.18"/>
      <rect x="${cx}" y="78" width="4" height="44" rx="2" fill="${stage.color}"/>
      ${t(cx + 18, 100, stage.label, 14, "#ffffff", "bold")}
      <circle cx="${cx + colW - 22}" cy="100" r="12" fill="${stage.color}" fill-opacity="0.35"/>
      ${t(cx + colW - 22, 104, String(totalCards), 13, stage.color, "bold", "middle")}
    `;

    stage.cards.forEach((card, ci) => {
      const cardY = 132 + ci * 136;
      out += `
        ${r(cx, cardY, colW - 8, 122, D.card, 10)}
        <rect x="${cx}" y="${cardY}" width="${colW - 8}" height="4" rx="2" fill="${stage.color}"/>
        ${t(cx + 12, cardY + 24, card[0]!, 13, "#ffffff", "bold")}
        ${t(cx + 12, cardY + 42, card[1]!, 12, D.sub)}
        ${t(cx + 12, cardY + 60, card[2]!, 12, D.sub)}
        <rect x="${cx + 12}" y="${cardY + 72}" width="${colW - 30}" height="1" fill="${D.cardB}"/>
        <rect x="${cx + 12}" y="${cardY + 85}" width="${Math.floor((colW - 30) * 0.65)}" height="6" rx="3" fill="${stage.color}" fill-opacity="0.25"/>
        <rect x="${cx + 12}" y="${cardY + 85}" width="${Math.floor((colW - 30) * 0.4)}" height="6" rx="3" fill="${stage.color}"/>
        ${t(cx + 12, cardY + 110, stage.label, 11, stage.color, "bold")}
        <text x="${cx + colW - 26}" y="${cardY + 112}" font-family="sans-serif" font-size="18" fill="${D.dim}">⋯</text>
      `;
    });
  });

  out += "</svg>";
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 3: PLM – Fichas Técnicas — LIGHT neutral
// ═══════════════════════════════════════════════════════════════════════════════

export function screen3PLM(): string {
  const cx = 196; const cw = SIZE - cx;
  const fichas = [
    { code: "FT-0024", name: "Camiseta Oversized Premium",  cat: "Malha",     status: "Aprovada",   sc: L.green, sl: L.greenL  },
    { code: "FT-0023", name: "Bermuda Cargo Structured",    cat: "Sarja",     status: "Em revisão", sc: L.amber, sl: L.amberL  },
    { code: "FT-0022", name: "Moletom Universitário",       cat: "Fleece",    status: "Aprovada",   sc: L.green, sl: L.greenL  },
    { code: "FT-0021", name: "Jaqueta Corta-vento Tech",    cat: "Poliéster", status: "Pilotagem",  sc: L.blue,  sl: L.blueL   },
    { code: "FT-0020", name: "Top Fitness Compressão",      cat: "Poliamida", status: "Aprovada",   sc: L.green, sl: L.greenL  },
    { code: "FT-0019", name: "Calça Jogger Ribana",         cat: "Malha PV",  status: "Rascunho",   sc: L.sub,   sl: L.border  },
    { code: "FT-0018", name: "Vestido Midi Viscose",        cat: "Viscose",   status: "Aprovada",   sc: L.green, sl: L.greenL  },
  ];

  let rows = "";
  fichas.forEach((f, i) => {
    const ry2 = 110 + i * 52;
    rows += `
      ${r(cx + 16, ry2, cw - 32, 46, i % 2 === 0 ? L.card : L.bg, 8)}
      <circle cx="${cx + 44}" cy="${ry2 + 23}" r="15" fill="${L.purpleL}"/>
      ${t(cx + 44, ry2 + 28, "FT", 10, L.purple, "bold", "middle")}
      ${t(cx + 68, ry2 + 18, f.code, 13, L.text, "bold")}
      ${t(cx + 68, ry2 + 33, f.name, 11, L.sub)}
      ${r(cx + 320, ry2 + 10, 72, 24, L.border, 6)}
      ${t(cx + 356, ry2 + 26, f.cat, 11, L.sub, "normal", "middle")}
      ${r(cx + cw - 130, ry2 + 10, 100, 24, f.sl, 12)}
      ${t(cx + cw - 80, ry2 + 26, f.status, 11, f.sc, "bold", "middle")}
    `;
  });

  // BOM summary card at bottom
  const bomY = SIZE - 100;
  const bom = `
    ${shadow(cx + 16, bomY, cw - 32, 80)}
    ${r(cx + 16, bomY, cw - 32, 80, L.card, 14)}
    <rect x="${cx + 16}" y="${bomY}" width="${cw - 32}" height="4" rx="2" fill="${L.purple}"/>
    ${t(cx + 32, bomY + 30, "BOM Total estimado:", 13, L.sub)}
    ${t(cx + 32, bomY + 58, "R$ 48.720,00", 26, L.text, "bold")}
    ${r(cx + cw - 200, bomY + 16, 80, 22, L.greenL, 8)}
    ${t(cx + cw - 160, bomY + 31, "5 aprovadas", 12, L.green, "bold", "middle")}
    ${r(cx + cw - 110, bomY + 16, 80, 22, L.amberL, 8)}
    ${t(cx + cw - 70, bomY + 31, "2 pendentes", 12, L.amber, "bold", "middle")}
  `;

  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${r(0, 0, SIZE, SIZE, L.bg, 0)}
    ${lightSidebar(2)}
    ${lightTopbar("PLM — Fichas Técnicas", "7 fichas · filtro: todas as categorias")}
    <!-- table header -->
    ${r(cx + 16, 84, cw - 32, 24, L.purpleL, 6)}
    ${t(cx + 68, 100, "Código / Nome", 11, L.purple, "bold")}
    ${t(cx + 320, 100, "Categoria", 11, L.purple, "bold")}
    ${t(cx + cw - 80, 100, "Status", 11, L.purple, "bold", "middle")}
    ${rows}
    ${bom}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 4: Conecta Moda — GRADIENT purple→indigo (product hero)
// ═══════════════════════════════════════════════════════════════════════════════

export function screen4Conecta(): string {
  const suppliers = [
    { name: "FabStyle Ateliê",  spec: "Alfaiataria",   city: "SP", rating: 4.9, match: 98, color: "#22c55e" },
    { name: "NordTex",          spec: "Malha",         city: "MG", rating: 4.7, match: 94, color: "#14b8a6" },
    { name: "VitaConfecção",    spec: "Fitness",       city: "SP", rating: 4.8, match: 91, color: "#3b82f6" },
    { name: "UrbanThread",      spec: "Streetwear",    city: "SC", rating: 4.6, match: 87, color: "#f59e0b" },
    { name: "FlexWeave",        spec: "Private Label", city: "RJ", rating: 4.9, match: 95, color: "#a78bfa" },
    { name: "SulTêxtil",        spec: "Denim",         city: "RS", rating: 4.5, match: 83, color: "#fb7185" },
  ];

  const COLS = 3;
  const cw2 = Math.floor((SIZE - 48) / COLS);
  const ch = 164;

  let cards = "";
  suppliers.forEach((s, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const sx = 16 + col * (cw2 + 8);
    const sy = 156 + row * (ch + 10);
    cards += `
      <rect x="${sx + 2}" y="${sy + 4}" width="${cw2}" height="${ch}" rx="14" fill="#00000020"/>
      ${r(sx, sy, cw2, ch, "rgba(255,255,255,0.10)", 14)}
      <rect x="${sx}" y="${sy}" width="${cw2}" height="${ch}" rx="14" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
      <rect x="${sx}" y="${sy}" width="${cw2}" height="4" rx="2" fill="${s.color}"/>
      <circle cx="${sx + 30}" cy="${sy + 38}" r="20" fill="${s.color}" fill-opacity="0.25"/>
      ${t(sx + 30, sy + 43, s.name[0]!, 16, s.color, "bold", "middle")}
      ${t(sx + 56, sy + 30, s.name, 13, "#ffffff", "bold")}
      ${t(sx + 56, sy + 46, s.spec + " · " + s.city, 11, "rgba(255,255,255,0.6)")}
      <rect x="${sx + 12}" y="${sy + 64}" width="${cw2 - 24}" height="1" fill="rgba(255,255,255,0.15)"/>
      ${t(sx + 16, sy + 90, "⭐ " + s.rating.toFixed(1), 14, "#fde68a")}
      <rect x="${sx + cw2 - 72}" y="${sy + 76}" width="60" height="24" rx="12" fill="${s.color}" fill-opacity="0.25"/>
      <rect x="${sx + cw2 - 72}" y="${sy + 76}" width="60" height="24" rx="12" fill="none" stroke="${s.color}" stroke-width="1"/>
      ${t(sx + cw2 - 42, sy + 92, s.match + "%", 13, s.color, "bold", "middle")}
      <rect x="${sx + 12}" y="${sy + 110}" width="${cw2 - 24}" height="7" rx="3.5" fill="rgba(255,255,255,0.12)"/>
      <rect x="${sx + 12}" y="${sy + 110}" width="${Math.round((cw2 - 24) * s.match / 100)}" height="7" rx="3.5" fill="${s.color}"/>
      ${t(sx + 12, sy + 140, "Ver perfil →", 11, "rgba(255,255,255,0.5)")}
    `;
  });

  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#1e1b4b"/>
        <stop offset="50%" stop-color="#312e81"/>
        <stop offset="100%" stop-color="#1d4ed8"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="25%" r="60%">
        <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${r(0, 0, SIZE, SIZE, "url(#heroBg)", 0)}
    <rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
    <!-- Decorative circles -->
    <circle cx="${SIZE}" cy="0" r="300" fill="#4f46e5" fill-opacity="0.15"/>
    <circle cx="0" cy="${SIZE}" r="250" fill="#2563eb" fill-opacity="0.12"/>
    <!-- Top bar -->
    ${r(0, 0, SIZE, 130, "rgba(0,0,0,0.25)", 0)}
    ${t(24, 32, "⊛", 22, "#a78bfa")}
    ${t(52, 32, "MIRAGE", 20, "#ffffff", "bold")}
    ${t(52, 52, "Conecta Moda", 13, "#a5b4fc")}
    <!-- Hero text -->
    ${t(SIZE / 2, 85, "Rede de Fornecedores Qualificados", 22, "#ffffff", "bold", "middle")}
    ${t(SIZE / 2, 110, "312 fornecedores · match inteligente · 6 estados", 13, "rgba(255,255,255,0.55)", "normal", "middle")}
    <!-- search bar -->
    ${r(80, 124, SIZE - 160, 36, "rgba(255,255,255,0.1)", 18)}
    <rect x="80" y="124" width="${SIZE - 160}" height="36" rx="18" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
    ${t(SIZE / 2, 147, "🔍  Buscar por especialidade, cidade, capacidade…", 12, "rgba(255,255,255,0.4)", "normal", "middle")}
    ${cards}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 5: Relatórios — LIGHT white, multi-color chart
// ═══════════════════════════════════════════════════════════════════════════════

export function screen5Relatorios(): string {
  const cx = 196; const cw = SIZE - cx;

  // Multi-line chart
  const chartX = cx + 16; const chartY = 82; const chartW = cw - 32; const chartH = 230;
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const series = [
    { label: "Faturamento",  color: L.purple, vals: [42,55,48,68,60,82,74,92,85,98,90,112] },
    { label: "Meta",         color: L.amber,  vals: [60,60,65,65,70,70,75,75,80,80,85,85]  },
    { label: "Custo",        color: L.teal,   vals: [28,34,31,42,38,52,46,58,52,61,56,70]  },
  ];
  const maxV = 120;
  const toX = (i: number) => chartX + 24 + i * Math.floor((chartW - 48) / (months.length - 1));
  const toY = (v: number) => chartY + chartH - 30 - Math.round((v / maxV) * (chartH - 50));

  let chart = `
    ${shadow(chartX, chartY, chartW, chartH)}
    ${r(chartX, chartY, chartW, chartH, L.card, 14)}
    ${t(chartX + 16, chartY + 24, "Performance 2025", 15, L.text, "bold")}
    <!-- legend -->
  `;
  series.forEach((s, si) => {
    chart += `<rect x="${chartX + chartW - 200 + si * 64}" y="${chartY + 14}" width="10" height="10" rx="2" fill="${s.color}"/>`;
    chart += t(chartX + chartW - 185 + si * 64, chartY + 23, s.label, 11, L.sub);
  });
  chart += `<rect x="${chartX + 16}" y="${chartY + 36}" width="${chartW - 32}" height="1" fill="${L.border}"/>`;

  // Grid lines
  for (let g = 0; g <= 4; g++) {
    const gy = chartY + chartH - 30 - Math.round((g / 4) * (chartH - 50));
    chart += `<line x1="${chartX + 20}" y1="${gy}" x2="${chartX + chartW - 16}" y2="${gy}" stroke="${L.border}" stroke-width="1" stroke-dasharray="4,3"/>`;
    chart += t(chartX + 8, gy + 4, String(Math.round(g * 30)), 10, L.dim, "normal", "end");
  }

  series.forEach((s) => {
    const pathD = s.vals.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");
    chart += `<path d="${pathD}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round"/>`;
    s.vals.forEach((v, i) => {
      if (i === s.vals.length - 1) {
        chart += `<circle cx="${toX(i)}" cy="${toY(v)}" r="5" fill="${s.color}" stroke="white" stroke-width="2"/>`;
      }
    });
  });

  months.forEach((m, i) => {
    if (i % 2 === 0) chart += t(toX(i), chartY + chartH - 8, m, 10, L.dim, "normal", "middle");
  });

  // KPI cards bottom
  const kpis = [
    { label: "Faturamento acum.", value: "R$ 807k", delta: "▲ 167%", color: L.purple, light: L.purpleL },
    { label: "Pedidos entregues", value: "284",     delta: "▲ 18%",  color: L.blue,   light: L.blueL   },
    { label: "Ticket médio",      value: "R$ 1.13k",delta: "▲ 24%",  color: L.teal,   light: L.tealL   },
    { label: "Clientes ativos",   value: "47",      delta: "▲ 9%",   color: L.green,  light: L.greenL  },
  ];
  const kw = Math.floor((cw - 48) / 4);
  let kpiRow = "";
  kpis.forEach((k, i) => {
    const kx = cx + 16 + i * (kw + 10);
    const ky = chartY + chartH + 20;
    kpiRow += `
      ${shadow(kx, ky, kw, 96)}
      ${r(kx, ky, kw, 96, L.card, 12)}
      <rect x="${kx}" y="${ky}" width="${kw}" height="3" rx="1.5" fill="${k.color}"/>
      ${t(kx + 12, ky + 24, k.label, 11, L.sub)}
      ${t(kx + 12, ky + 56, k.value, 22, L.text, "bold")}
      ${r(kx + 12, ky + 70, 60, 18, k.light, 9)}
      ${t(kx + 42, ky + 82, k.delta, 11, k.color, "bold", "middle")}
    `;
  });

  // Top clients bar chart
  const topX = cx + 16; const topY = chartY + chartH + 136; const topW = cw - 32; const topH = 172;
  const clients = [
    { name: "Marca Alpha",  val: 48200, max: 50000, color: L.purple },
    { name: "Studio Nord",  val: 36800, max: 50000, color: L.blue   },
    { name: "Label Verde",  val: 28400, max: 50000, color: L.teal   },
    { name: "R2PB",         val: 21600, max: 50000, color: L.amber  },
  ];
  let topClients = `
    ${shadow(topX, topY, topW, topH)}
    ${r(topX, topY, topW, topH, L.card, 14)}
    ${t(topX + 16, topY + 24, "Top clientes — receita acumulada 2025", 14, L.text, "bold")}
    <rect x="${topX + 16}" y="${topY + 36}" width="${topW - 32}" height="1" fill="${L.border}"/>
  `;
  clients.forEach((c, i) => {
    const ry3 = topY + 52 + i * 28;
    const barW = Math.round((topW - 160) * c.val / c.max);
    topClients += t(topX + 16, ry3 + 12, c.name, 12, L.text, "bold");
    topClients += `<rect x="${topX + 130}" y="${ry3 + 2}" width="${topW - 160}" height="14" rx="7" fill="${L.border}"/>`;
    topClients += `<rect x="${topX + 130}" y="${ry3 + 2}" width="${barW}" height="14" rx="7" fill="${c.color}"/>`;
    topClients += t(topX + topW - 16, ry3 + 14, "R$ " + (c.val / 1000).toFixed(0) + "k", 12, c.color, "bold", "end");
  });

  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${r(0, 0, SIZE, SIZE, L.bg, 0)}
    ${lightSidebar(4)}
    ${lightTopbar("Relatórios", "Visão geral · 2025")}
    ${chart}
    ${kpiRow}
    ${topClients}
  </svg>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Screen 6: Custos e Orçamentos — LIGHT, tabela de fichas + KPIs
// ═══════════════════════════════════════════════════════════════════════════════

export function screen6Custos(): string {
  const cx = 196; const cw = SIZE - cx;
  const kw = Math.floor((cw - 56) / 3);

  const kpis = [
    { label: "Custo médio/peça", value: "R$ 38,40", delta: "▼ 3%",  accent: L.teal,   light: L.tealL   },
    { label: "Margem bruta",     value: "42%",       delta: "▲ 5%",  accent: L.green,  light: L.greenL  },
    { label: "Orç. pendentes",   value: "7",         delta: "→ 0%",  accent: L.amber,  light: L.amberL  },
  ];

  let kpiCards = "";
  kpis.forEach((k, i) => {
    const kx = cx + 16 + i * (kw + 12);
    const ky = 82;
    kpiCards += `
      ${shadow(kx, ky, kw, 96)}
      ${r(kx, ky, kw, 96, L.card, 14)}
      <rect x="${kx}" y="${ky}" width="${kw}" height="4" rx="2" fill="${k.accent}"/>
      ${r(kx + 14, ky + 16, 30, 30, k.light, 8)}
      ${t(kx + 29, ky + 36, "◈", 14, k.accent, "bold", "middle")}
      ${t(kx + 52, ky + 30, k.label, 11, L.sub)}
      ${t(kx + 14, ky + 68, k.value, 22, L.text, "bold")}
      ${r(kx + kw - 62, ky + 60, 50, 20, k.light, 10)}
      ${t(kx + kw - 37, ky + 74, k.delta, 11, k.accent, "bold", "middle")}
    `;
  });

  // Fichas de custo
  const fichas = [
    { code: "FC-0018", name: "Camiseta Oversized 320un",  mat: "R$ 9.216",  mo: "R$ 3.840",  total: "R$ 13.056", margin: "44%", mc: L.green,  ml: L.greenL  },
    { code: "FC-0017", name: "Bermuda Cargo 180un",       mat: "R$ 6.300",  mo: "R$ 2.520",  total: "R$ 8.820",  margin: "38%", mc: L.amber,  ml: L.amberL  },
    { code: "FC-0016", name: "Moletom Universitário 90un",mat: "R$ 5.400",  mo: "R$ 1.800",  total: "R$ 7.200",  margin: "41%", mc: L.green,  ml: L.greenL  },
    { code: "FC-0015", name: "Top Fitness 240un",         mat: "R$ 3.120",  mo: "R$ 1.440",  total: "R$ 4.560",  margin: "52%", mc: L.teal,   ml: L.tealL   },
    { code: "FC-0014", name: "Jaqueta Corta-vento 60un",  mat: "R$ 7.800",  mo: "R$ 2.400",  total: "R$ 10.200", margin: "35%", mc: L.red,    ml: L.redL    },
  ];

  const tx = cx + 16; const ty = 200; const tw = cw - 32; const th = 54 + fichas.length * 46 + 16;

  let table = `
    ${shadow(tx, ty, tw, th)}
    ${r(tx, ty, tw, th, L.card, 14)}
    ${r(tx + 16, ty + 12, tw - 32, 24, L.purpleL, 6)}
    ${t(tx + 68, ty + 28, "Ficha / Produto", 11, L.purple, "bold")}
    ${t(tx + 280, ty + 28, "Mat.", 11, L.purple, "bold")}
    ${t(tx + 380, ty + 28, "M.O.", 11, L.purple, "bold")}
    ${t(tx + 470, ty + 28, "Total", 11, L.purple, "bold")}
    ${t(tx + tw - 80, ty + 28, "Margem", 11, L.purple, "bold", "middle")}
  `;
  fichas.forEach((f, i) => {
    const ry2 = ty + 44 + i * 46;
    table += r(tx + 12, ry2, tw - 24, 40, i % 2 === 0 ? L.bg : L.card, 6);
    table += `<circle cx="${tx + 36}" cy="${ry2 + 20}" r="14" fill="${L.purpleL}"/>`;
    table += t(tx + 36, ry2 + 25, "FC", 9, L.purple, "bold", "middle");
    table += t(tx + 60, ry2 + 16, f.code, 12, L.text, "bold");
    table += t(tx + 60, ry2 + 30, f.name, 10, L.sub);
    table += t(tx + 280, ry2 + 22, f.mat, 11, L.text);
    table += t(tx + 380, ry2 + 22, f.mo, 11, L.text);
    table += t(tx + 470, ry2 + 22, f.total, 12, L.text, "bold");
    table += r(tx + tw - 112, ry2 + 10, 88, 22, f.ml, 11);
    table += t(tx + tw - 68, ry2 + 25, f.margin, 12, f.mc, "bold", "middle");
  });

  // Bottom summary bar
  const sumY = ty + th + 16;
  const summary = `
    ${shadow(tx, sumY, tw, 72)}
    ${r(tx, sumY, tw, 72, L.card, 14)}
    <rect x="${tx}" y="${sumY}" width="${tw}" height="4" rx="2" fill="${L.purple}"/>
    ${t(tx + 20, sumY + 34, "Custo total orçado:", 13, L.sub)}
    ${t(tx + 20, sumY + 56, "R$ 43.836,00", 24, L.text, "bold")}
    ${r(tx + tw - 240, sumY + 16, 100, 22, L.greenL, 8)}
    ${t(tx + tw - 190, sumY + 31, "16 fichas ativas", 11, L.green, "bold", "middle")}
    ${r(tx + tw - 130, sumY + 16, 100, 22, L.amberL, 8)}
    ${t(tx + tw - 80, sumY + 31, "7 pendentes", 11, L.amber, "bold", "middle")}
  `;

  return `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    ${r(0, 0, SIZE, SIZE, L.bg, 0)}
    ${lightSidebar(3)}
    ${lightTopbar("Custos e Orçamentos", "Fichas de custo · 23 produtos ativos")}
    ${kpiCards}
    ${table}
    ${summary}
  </svg>`;
}

// ── Render SVG → PNG ──────────────────────────────────────────────────────────

export async function renderScreen(svgContent: string): Promise<Buffer> {
  return sharp(Buffer.from(svgContent)).png().toBuffer();
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const HUB_SCREENS: Array<{ name: string; svg: () => string }> = [
  { name: "Dashboard",          svg: screen1Dashboard  },
  { name: "Kanban",             svg: screen2Kanban     },
  { name: "PLM",                svg: screen3PLM        },
  { name: "Conecta Moda",       svg: screen4Conecta    },
  { name: "Relatórios",         svg: screen5Relatorios },
  { name: "Custos e Orçamentos",svg: screen6Custos     },
];

