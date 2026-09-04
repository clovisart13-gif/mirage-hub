/**
 * imageBranding.ts — Multi-tenant image branding pipeline
 *
 * Each tenant has its own BrandConfig with:
 *  - logo path
 *  - footer contact info (WhatsApp, handle, website)
 *  - accent color
 *  - fallback prompt style (used when item.imagePrompt is absent)
 *
 * NEVER apply one tenant's branding to another tenant's assets.
 * If company_slug is unknown or missing, throw — fail explicitly.
 */

import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Brand configuration registry ─────────────────────────────────────────────

export interface BrandConfig {
  logoPath: string;
  /** WhatsApp number displayed in footer — empty string to omit */
  whatsapp: string;
  /** Instagram handle (e.g. "@gestaomirage") */
  handle: string;
  /** Accent hex color for footer bar */
  accentColor: string;
  /** Used for auto-generated prompts when item.imagePrompt is absent */
  fallbackPromptBase: string;
  /**
   * Second line shown in the footer when whatsapp is empty.
   * Defaults to the handle if not set.
   * For Instagram-first campaigns, use "Link na bio" instead of a domain.
   */
  footerLine2?: string;
}

const BRAND_REGISTRY: Record<string, BrandConfig> = {
  r2pb: {
    logoPath: resolve(__dirname, "r2pb-logo.png"),
    whatsapp: "(011) 99439-3480",
    handle: "@r2pbfabricaderoupas",
    accentColor: "#2563eb",
    fallbackPromptBase:
      "Fotografia editorial premium de moda brasileira B2B — confecção, private label, streetwear, fitness ou alfaiataria. Fundo neutro ou ambiente de ateliê elegante. Estética de campanha sofisticada.",
  },
  mirage: {
    logoPath: resolve(__dirname, "mirage-logo.png"),
    whatsapp: "",
    handle: "@gestaomirage",
    footerLine2: "Link na bio",
    accentColor: "#1e40af",
    fallbackPromptBase:
      "Professional Brazilian fashion industry B2B marketing visual. Dark navy gradient background with subtle geometric forms. Aspirational, clean, premium editorial aesthetic. NO text, NO letters, NO numbers, NO typography, NO logos. Square 1:1 format.",
  },
};

// ── Per-item prompt builder for Mirage ───────────────────────────────────────

/**
 * Negative prompt for all Mirage image generation.
 * Embed in every generation call to prevent generic AI clichés.
 */
export const MIRAGE_NEGATIVE_PROMPT =
  "text, letters, numbers, typography, watermarks, words, fonts, captions, subtitles, " +
  "logos embedded in scene, infographics, diagrams, overlaid UI elements, " +
  "network nodes, spiderweb, web-like abstract mesh, glowing blue particles, " +
  "neon glow, hologram, digital matrix, circuit board, futuristic tech abstract, " +
  "low quality, blurry, oversaturated, cartoon, illustration, 3D render, CGI";

/**
 * Per-funnel-stage editorial prompts — real fashion/textile/B2B Brazilian direction.
 * Three visual territories (per ATHOS creative brief):
 *   T1 Bastidores premium: hands, fabrics, technical drawings, curation, materials
 *   T2 Editorial institucional: clean backgrounds, elegant composition, no people
 *   T3 Rede humana real: people, business connections, supply chain, practical
 *
 * Each stage maps to 2 variants (selected by title length % 2 for variety).
 */
const MIRAGE_STAGE_PROMPTS: Record<string, [string, string]> = {
  awareness: [
    // T3 — human network, discovery
    "Editorial photography: Brazilian fashion industry professionals in a bright modern showroom, warm natural light, premium fabric swatches on a clean white table, collaborative atmosphere suggesting a trusted and curated industry network, B2B fashion meeting, aspirational mood, cinematic quality, earthy neutral tones with warm accents",
    // T1 — behind the scenes, discovery
    "Editorial photography: fashion designer hands spreading premium fabric swatches across a design table in a Brazilian studio, technical sketches visible, warm natural window light, sense of discovery and curation in the fashion supply chain, premium editorial aesthetic, shallow depth of field",
  ],
  interest: [
    // T1 — textures, detail, curiosity
    "Close-up editorial photography: premium textile and fabric samples arranged artistically on a clean surface, rich textures of woven fabrics, color palette cards, and leather swatches, selective focus with shallow depth of field, warm studio lighting, Brazilian fashion industry curation aesthetic",
    // T1 — workspace, detail
    "Editorial photography: fashion designer creative workspace, technical flat sketches and fabric swatches pinned to corkboard, color palette samples, hands holding a pencil, warm afternoon light through studio window, premium B2B fashion editorial, rich depth and texture",
  ],
  consideration: [
    // T2 — institutional, clean, decisive
    "Premium architectural editorial photography: modern Brazilian fashion industry office interior, elegant meeting room with floor-to-ceiling windows, diffused soft light, empty table with curated fabric samples, sophisticated minimal composition, no people, authoritative and trustworthy B2B atmosphere, muted neutral tones",
    // T3 — professionals reviewing, decision
    "Editorial photography: two Brazilian fashion industry professionals reviewing a fabric collection in a premium showroom, professional business setting, warm natural light, fabric samples on table, decisive professional atmosphere, B2B supply chain context, clean contemporary style",
  ],
  conversion: [
    // T3 — entrepreneur, confidence, action
    "Dynamic editorial photography: confident Brazilian fashion entrepreneur in premium showroom reviewing curated textile collection, warm spotlight accent lighting, rich fabric textures visible, exclusive access atmosphere, sense of decisive action and valuable opportunity, premium B2B editorial style",
    // T1 — selection moment, premium
    "Editorial photography: fashion buyer hands carefully selecting from a curated rack of premium fabric samples in a modern Brazilian textile showroom, exclusive B2B experience, warm focused lighting, sense of quality and decisive choice, cinematic depth of field",
  ],
  retention: [
    // T3 — partnership, warmth
    "Editorial photography: warm handshake between Brazilian fashion brand owner and textile supplier in modern creative studio, genuine B2B partnership moment, warm golden ambient lighting, fabric samples and sketchbooks on nearby table, collaborative and trustworthy atmosphere",
    // T3 — community, continuation
    "Editorial photography: small group of Brazilian fashion industry professionals in casual collaborative discussion around a studio table, natural warm light, fabric samples and brand materials visible, sense of community and ongoing partnership in the fashion supply chain",
  ],
  loyalty: [
    // T2 — prestige, achievement
    "Luxury editorial photography: premium fashion collection displayed in an elegant minimalist Brazilian showroom, architectural diffused lighting, cream and warm white tones with gold accent details, exclusive members-only aesthetic, sophisticated achievement mood, no people",
    // T1 — celebration of quality
    "Editorial photography: beautifully arranged premium textile samples and brand materials on a luxury surface, gold and cream color palette, fashion industry achievement aesthetic, celebratory but sophisticated mood, premium flat lay composition, warm directional lighting",
  ],
};

/**
 * Builds a varied, per-item editorial image generation prompt for Mirage campaigns.
 * Direction: real fashion/textile/B2B Brazilian (NOT abstract digital).
 * AI generates a pure visual background — text is added programmatically afterward.
 */
export function buildMirageItemPrompt(item: {
  title?: string | null;
  hook?: string | null;
  funnelStage?: string | null;
}): string {
  const stagePair =
    MIRAGE_STAGE_PROMPTS[item.funnelStage ?? "awareness"] ??
    MIRAGE_STAGE_PROMPTS["awareness"];

  const variant = (item.title?.length ?? 0) % 2;
  const base = stagePair[variant];

  return `${base}. Square 1:1 Instagram format. High resolution 4K. NO embedded text, NO letters, NO words, NO logos in the scene.`;
}

// ── Headline SVG overlay ───────────────────────────────────────────────────────

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (test.length <= maxCharsPerLine) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Builds a headline SVG overlay with 4 rotating layout variants for creative variety.
 *
 * @param isPortrait   true for any h > w format (4:5 feed OR 9:16 story)
 * @param isStory      true only for 9:16 story/reel — applies Instagram story safe zones
 * @param layoutVariant 0-3 cycles through different visual compositions
 */
function buildHeadlineSvg(
  text: string, w: number, h: number, footerH: number,
  isPortrait = false, isStory = false, layoutVariant = 0,
): string {
  const scale    = w / 1024;
  const upper    = text.toUpperCase();
  const charLen  = upper.length;

  // Portrait: tighter wrap to prevent right-edge overflow
  const maxChars = isPortrait
    ? (charLen <= 20 ? 12 : charLen <= 35 ? 14 : 18)
    : (charLen <= 20 ? 14 : charLen <= 35 ? 17 : 22);
  const fontSize = Math.round((charLen <= 20 ? 82 : charLen <= 35 ? 68 : 56) * scale);
  const lineH    = Math.round(fontSize * 1.28);
  const lines    = wrapText(upper, maxChars);
  const blockH   = lines.length * lineH;

  // Stories only: safe zones for Instagram chrome (progress bar top, reply bar bottom)
  const topSafe = isStory ? STORY_TOP_SAFE : 0;
  const photoH  = h - footerH - topSafe;

  const accentH = Math.round(5 * scale);
  const panelX  = Math.round(40 * scale);
  const panelW  = w - panelX * 2;
  const font    = `font-family="DejaVu Sans Bold,DejaVu Sans,Liberation Sans,sans-serif" font-size="${fontSize}" font-weight="bold"`;
  const letter  = `letter-spacing="${Math.round(scale)}"`;

  const v = layoutVariant % 4;

  // ── Layout 0: Classic center panel ────────────────────────────────────────
  // Dark semi-transparent rounded panel centered at 38% of photo area
  if (v === 0) {
    const panelPad   = Math.round(28 * scale);
    const panelH     = blockH + panelPad + Math.round(16 * scale);
    const centerY    = topSafe + Math.floor(photoH * 0.38);
    const panelY     = Math.max(topSafe + Math.round(16 * scale), centerY - Math.floor((blockH + panelPad) / 2));
    const textStartY = panelY + panelPad - Math.round(4 * scale);
    const tspans     = lines.map((l, i) => `<tspan x="${w / 2}" dy="${i === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`).join("");
    return (
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${panelX}" y="${panelY}" width="${panelW}" height="${panelH}" rx="${Math.round(12 * scale)}" fill="black" fill-opacity="0.76"/>` +
      `<rect x="${panelX}" y="${panelY}" width="${Math.round(72 * scale)}" height="${accentH}" rx="${Math.round(3 * scale)}" fill="#2563eb"/>` +
      `<text x="${w / 2}" y="${textStartY}" ${font} fill="white" text-anchor="middle" ${letter}>${tspans}</text>` +
      `</svg>`
    );
  }

  // ── Layout 1: Editorial left — left-aligned, vertical accent bar, no panel ─
  // Premium editorial look: large left-aligned text with text-shadow only
  if (v === 1) {
    const leftX      = Math.round(56 * scale);
    const bottomAnchor = h - footerH - Math.round(32 * scale);
    const textStartY = bottomAnchor - blockH;
    const barH       = blockH + Math.round(24 * scale);
    const barY       = textStartY - Math.round(12 * scale);
    const tspans     = lines.map((l, i) => `<tspan x="${leftX + Math.round(24 * scale)}" dy="${i === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`).join("");
    return (
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      // Vertical accent bar on the left
      `<rect x="${leftX}" y="${barY}" width="${Math.round(6 * scale)}" height="${barH}" rx="${Math.round(3 * scale)}" fill="#2563eb"/>` +
      // Text with drop shadow for legibility without panel
      `<text x="${leftX + Math.round(24 * scale)}" y="${textStartY}" ${font} fill="black" fill-opacity="0.5" text-anchor="start" ${letter} filter="url(#shadow1)">${tspans}</text>` +
      `<text x="${leftX + Math.round(24 * scale)}" y="${textStartY}" ${font} fill="white" text-anchor="start" ${letter}>${tspans}</text>` +
      `</svg>`
    );
  }

  // ── Layout 2: Top authority — text near top with full-width gradient band ──
  // Dramatic top placement, horizontal gradient scrim for legibility
  if (v === 2) {
    const gradH      = Math.round((blockH + 64) * scale * 0.9);
    const textStartY = topSafe + Math.round(32 * scale) + Math.round(fontSize * 0.85);
    const tspans     = lines.map((l, i) => `<tspan x="${w / 2}" dy="${i === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`).join("");
    return (
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><linearGradient id="topGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0.82"/><stop offset="100%" stop-color="black" stop-opacity="0"/></linearGradient></defs>` +
      `<rect x="0" y="${topSafe}" width="${w}" height="${gradH}" fill="url(#topGrad)"/>` +
      // Thin accent line at top of gradient
      `<rect x="${Math.round(56 * scale)}" y="${topSafe + Math.round(16 * scale)}" width="${Math.round(64 * scale)}" height="${accentH}" rx="${Math.round(3 * scale)}" fill="#2563eb"/>` +
      `<text x="${w / 2}" y="${textStartY}" ${font} fill="white" text-anchor="middle" ${letter}>${tspans}</text>` +
      `</svg>`
    );
  }

  // ── Layout 3: Bottom anchor — text above footer with dark gradient scrim ───
  // Cinematic bottom placement, common in premium editorial content
  if (v === 3) {
    const scrimH     = Math.round((blockH + 80) * scale);
    const scrimY     = h - footerH - scrimH;
    const textStartY = h - footerH - Math.round(32 * scale) - (lines.length - 1) * lineH;
    const tspans     = lines.map((l, i) => `<tspan x="${w / 2}" dy="${i === 0 ? 0 : lineH}">${escapeXml(l)}</tspan>`).join("");
    return (
      `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<defs><linearGradient id="botGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity="0.85"/></linearGradient></defs>` +
      `<rect x="0" y="${scrimY}" width="${w}" height="${scrimH + footerH}" fill="url(#botGrad)"/>` +
      // Accent strip above text
      `<rect x="${Math.round(56 * scale)}" y="${textStartY - Math.round(16 * scale)}" width="${Math.round(64 * scale)}" height="${accentH}" rx="${Math.round(3 * scale)}" fill="#2563eb"/>` +
      `<text x="${w / 2}" y="${textStartY}" ${font} fill="white" text-anchor="middle" ${letter}>${tspans}</text>` +
      `</svg>`
    );
  }

  // Fallback — should never reach, but TypeScript needs a return
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"/>`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type BrandingVariant = "auto" | "color" | "white" | "black";

const FOOTER_H = 140;
const LOGO_W   = 220;
const LOGO_PAD = 64; // margem lateral segura — grid do Instagram corta ~40px das bordas
// Instagram Stories/Reels: bottom ~250px is covered by reply bar + interactions UI
// Top ~160px is covered by progress bar + profile. Keep branding inside safe zone.
const STORY_BOTTOM_SAFE = 260; // px to lift footer off the very bottom on portrait formats
const STORY_TOP_SAFE    = 160; // px from top to avoid progress/profile overlap

// ── Footer SVG factory v2 ─────────────────────────────────────────────────────
// Larger text, no emoji (sharp cannot render emoji reliably),
// true opaque black background for maximum legibility.

function buildFooter(
  w: number,
  cfg: BrandConfig,
  theme: "dark" | "white" | "black",
): string {
  const mid = FOOTER_H / 2;

  // Always use opaque dark for maximum WhatsApp legibility
  const bg =
    theme === "white"
      ? `<rect width="${w}" height="${FOOTER_H}" fill="white" fill-opacity="0.95"/>`
      : `<rect width="${w}" height="${FOOTER_H}" fill="#0d0d0d" fill-opacity="0.97"/>`;

  const textColor   = theme === "white" ? "#111827" : "#ffffff";
  const subColor    = theme === "white" ? "#6b7280" : "#b0bec5";
  const handleColor = theme === "white" ? cfg.accentColor : "#93c5fd";

  const hasWhatsapp = cfg.whatsapp.length > 0;

  if (hasWhatsapp) {
    // WA icon: green circle with "WA" text (no emoji — sharp uses system fonts without emoji)
    const iconCx = 52;
    const iconCy = mid;
    const iconR  = 24;
    const numberY = mid - 14;
    const labelY  = mid + 14;
    const handleY = mid + 6;

    return `<svg width="${w}" height="${FOOTER_H}" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  <rect width="${w}" height="3" fill="${cfg.accentColor}"/>
  <circle cx="${iconCx}" cy="${iconCy}" r="${iconR}" fill="#25D366"/>
  <text x="${iconCx}" y="${iconCy - 4}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="11" font-weight="bold" fill="white" text-anchor="middle">WA</text>
  <text x="${iconCx}" y="${iconCy + 10}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="9" fill="white" text-anchor="middle">zap</text>
  <text x="${iconCx + iconR + 16}" y="${numberY}" font-family="DejaVu Sans Bold,DejaVu Sans,Liberation Sans,sans-serif" font-size="32" font-weight="bold" fill="${textColor}">${cfg.whatsapp}</text>
  <text x="${iconCx + iconR + 16}" y="${labelY}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="17" fill="${subColor}">WhatsApp · Atendimento exclusivo</text>
  <text x="${w - LOGO_PAD}" y="${handleY}" font-family="DejaVu Sans Bold,DejaVu Sans,Liberation Sans,sans-serif" font-size="17" font-weight="bold" fill="${handleColor}" text-anchor="end">${cfg.handle}</text>
</svg>`;
  }

  // No WhatsApp — handle + footerLine2 centered
  const line2 = cfg.footerLine2 ?? cfg.handle;
  return `<svg width="${w}" height="${FOOTER_H}" xmlns="http://www.w3.org/2000/svg">
  ${bg}
  <rect width="${w}" height="3" fill="${cfg.accentColor}"/>
  <text x="${w / 2}" y="${mid + 4}" font-family="DejaVu Sans Bold,DejaVu Sans,Liberation Sans,sans-serif" font-size="22" font-weight="bold" fill="${handleColor}" text-anchor="middle">${cfg.handle}</text>
  <text x="${w / 2}" y="${mid + 28}" font-family="DejaVu Sans,Liberation Sans,sans-serif" font-size="16" fill="${subColor}" text-anchor="middle">${line2}</text>
</svg>`;
}

// ── Logo colorisation ─────────────────────────────────────────────────────────

async function logoVariant(
  raw: Buffer,
  variant: "color" | "white" | "black",
): Promise<{ buf: Buffer; w: number; h: number }> {
  const resized = await sharp(raw).resize(LOGO_W, null, { fit: "inside" }).png().toBuffer();
  const meta    = await sharp(resized).metadata();
  const w       = meta.width  ?? LOGO_W;
  const h       = meta.height ?? 80;

  if (variant === "color") return { buf: resized, w, h };

  const fillColor = variant === "white" ? "#ffffff" : "#000000";
  const colorized = await sharp({
    create: { width: w, height: h, channels: 4, background: fillColor },
  })
    .composite([{ input: resized, blend: "dest-in" }])
    .png()
    .toBuffer();

  return { buf: colorized, w, h };
}

// ── Brightness detection ──────────────────────────────────────────────────────

async function avgBrightness(imageBuffer: Buffer, size: number): Promise<number> {
  const region = await sharp(imageBuffer)
    .resize(size, size, { fit: "cover" })
    .extract({ left: Math.floor(size * 0.5), top: 0, width: Math.floor(size * 0.5), height: Math.floor(size * 0.4) })
    .greyscale()
    .raw()
    .toBuffer();

  let sum = 0;
  for (const v of region) sum += v;
  return sum / region.length;
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Apply tenant-specific branding overlay to an image.
 *
 * @param imageBuffer  Raw image buffer from AI generation
 * @param companySlug  Tenant slug — MUST match a registered brand
 * @param size         Output WIDTH in pixels
 * @param variant      Logo/footer color variant ("auto" = detect from image)
 * @param headline     Optional headline text composited onto the image
 * @param outputHeight Output HEIGHT in pixels (defaults to size for square; pass 1536 for 9:16)
 * @throws If companySlug is not registered — fail explicitly, no silent fallback
 */
export async function applyTenantBranding(
  imageBuffer: Buffer,
  companySlug: string,
  size = 1024,
  variant: BrandingVariant = "auto",
  headline?: string,
  outputHeight?: number,
  layoutVariant?: number,
): Promise<Buffer> {
  const cfg = BRAND_REGISTRY[companySlug];
  if (!cfg) {
    throw new Error(
      `[imageBranding] Tenant "${companySlug}" não possui BrandConfig registrado. ` +
      `Tenants disponíveis: ${Object.keys(BRAND_REGISTRY).join(", ")}. ` +
      `Registre o tenant antes de gerar imagens.`,
    );
  }

  const h = outputHeight ?? size;
  const isPortrait = h > size;          // true for 4:5 feed (1280) AND 9:16 story (1536)
  const isStory    = h >= 1400;         // true only for 9:16 story/reel — has Instagram story chrome

  // Only stories/reels have Instagram's bottom UI (reply bar + interactions) — lift footer above it
  const bottomOffset = isStory ? STORY_BOTTOM_SAFE : 0;
  const footerTop    = h - FOOTER_H - bottomOffset;

  const logoRaw = await readFile(cfg.logoPath);

  let chosen: "color" | "white" | "black";
  if (variant === "auto") {
    const brightness = await avgBrightness(imageBuffer, size);
    chosen = brightness < 140 ? "white" : "black";
  } else if (variant === "color") {
    chosen = "color";
  } else {
    chosen = variant;
  }

  const theme = chosen === "white" ? "dark" : chosen === "black" ? "white" : "dark";
  const { buf: logoBuf, h: logoH2 } = await logoVariant(logoRaw, chosen);
  const footer = Buffer.from(buildFooter(size, cfg, theme));

  // Logo: bottom-left, directly above footer, with safe padding
  const logoTop  = footerTop - logoH2 - 16;
  const logoLeft = LOGO_PAD;

  const composites: sharp.OverlayOptions[] = [
    { input: logoBuf, top: Math.max(0, logoTop), left: logoLeft, blend: "over" },
    { input: footer,  top: footerTop,            left: 0,        blend: "over" },
  ];

  if (headline?.trim()) {
    const headlineSvg = Buffer.from(buildHeadlineSvg(headline.trim(), size, h, FOOTER_H + bottomOffset, isPortrait, isStory, layoutVariant ?? 0));
    composites.unshift({ input: headlineSvg, top: 0, left: 0, blend: "over" });
  }

  return sharp(imageBuffer)
    .resize(size, h, { fit: "cover" })
    .composite(composites)
    .png()
    .toBuffer();
}

/**
 * Returns the fallback prompt base for a given tenant.
 * Used when item.imagePrompt is absent.
 */
export function getTenantFallbackPrompt(companySlug: string): string {
  const cfg = BRAND_REGISTRY[companySlug];
  if (!cfg) {
    throw new Error(
      `[imageBranding] Tenant "${companySlug}" não registrado. Não é possível gerar prompt.`,
    );
  }
  return cfg.fallbackPromptBase;
}

/**
 * Returns true if the given companySlug has a registered brand config.
 */
export function isTenantBrandingRegistered(companySlug: string): boolean {
  return companySlug in BRAND_REGISTRY;
}

/**
 * Builds a fallback prompt string from brand_blueprints data.
 * Used by generate-image when the tenant's branding is stored in DB (not hardcoded).
 */
export function buildPromptFromBrandBlueprint(brand: {
  segmento?: string | null;
  estiloVisual?: string | null;
  referenciaEsteticas?: string | null;
  adjetivos?: string[] | null;
}): string {
  const parts: string[] = [];
  if (brand.segmento)          parts.push(`Segmento: ${brand.segmento}`);
  if (brand.estiloVisual)      parts.push(`Estilo visual: ${brand.estiloVisual}`);
  if (brand.referenciaEsteticas) parts.push(`Referências: ${brand.referenciaEsteticas}`);
  if (brand.adjetivos?.length) parts.push(`Adjetivos da marca: ${brand.adjetivos.join(", ")}`);
  return parts.join(". ");
}

/**
 * Same as applyTenantBranding, but does NOT throw if the tenant is not registered.
 * For unknown tenants, returns the image resized to a square without any overlay.
 * Use this for machine-generated creatives where branding config may not yet exist.
 */
export async function applyTenantBrandingOptional(
  imageBuffer: Buffer,
  companySlug: string,
  size = 1024,
  variant: BrandingVariant = "auto",
): Promise<Buffer> {
  if (isTenantBrandingRegistered(companySlug)) {
    return applyTenantBranding(imageBuffer, companySlug, size, variant);
  }
  return sharp(imageBuffer)
    .resize(size, size, { fit: "cover" })
    .png()
    .toBuffer();
}

// ── Dynamic branding from DB blueprint data ───────────────────────────────────

/**
 * Build a BrandConfig from brand_blueprints DB row fields.
 * Used for tenants not (yet) in BRAND_REGISTRY.
 * logoBuffer: pre-fetched logo bytes, or null to skip logo overlay.
 */
export function buildBrandConfigFromData(data: {
  whatsapp?: string | null;
  instagram?: string | null;
  cor_primaria?: string | null;
  nome_marca?: string | null;
  segmento?: string | null;
  estilo_visual?: string | null;
  referencias_esteticas?: string | null;
  adjetivos?: string[] | null;
}): BrandConfig {
  return {
    logoPath:    "",   // logo is fetched by URL at runtime; not used via file path
    whatsapp:    data.whatsapp    ?? "",
    handle:      data.instagram   ?? "",
    accentColor: data.cor_primaria ?? "#2563eb",
    fallbackPromptBase: [
      data.segmento              ? `Segmento: ${data.segmento}` : null,
      data.estilo_visual         ? `Estilo visual: ${data.estilo_visual}` : null,
      data.referencias_esteticas ? `Referências: ${data.referencias_esteticas}` : null,
      data.adjetivos?.length     ? `Adjetivos: ${data.adjetivos.join(", ")}` : null,
    ].filter(Boolean).join(". ") || "Fotografia editorial premium de moda brasileira.",
  };
}

/**
 * Apply branding using data from brand_blueprints table.
 * Fetches logo from logo_url if provided; falls back to no logo.
 */
export async function applyBrandFromBlueprintData(
  imageBuffer: Buffer,
  brandData: {
    whatsapp?: string | null;
    instagram?: string | null;
    cor_primaria?: string | null;
    logo_url?: string | null;
    nome_marca?: string | null;
    segmento?: string | null;
    estilo_visual?: string | null;
    referencias_esteticas?: string | null;
    adjetivos?: string[] | null;
  },
  size = 1024,
  variant: BrandingVariant = "auto",
): Promise<Buffer> {
  const cfg = buildBrandConfigFromData(brandData);

  // Fetch logo from URL if available
  let logoRaw: Buffer | null = null;
  if (brandData.logo_url) {
    try {
      const resp = await fetch(brandData.logo_url);
      if (resp.ok) {
        logoRaw = Buffer.from(await resp.arrayBuffer());
      }
    } catch {
      // logo fetch failed — proceed without logo
    }
  }

  let chosen: "color" | "white" | "black";
  if (variant === "auto") {
    const brightness = await avgBrightness(imageBuffer, size);
    chosen = brightness < 140 ? "white" : "black";
  } else if (variant === "color") {
    chosen = "color";
  } else {
    chosen = variant;
  }

  const theme = chosen === "white" ? "dark" : chosen === "black" ? "white" : "dark";
  const footer = Buffer.from(buildFooter(size, cfg, theme));

  const composites: sharp.OverlayOptions[] = [
    { input: footer, top: size - FOOTER_H, left: 0, blend: "over" },
  ];

  if (logoRaw) {
    const { buf: logoBuf, h: logoH2 } = await logoVariant(logoRaw, chosen);
    const logoTop = size - FOOTER_H - logoH2 - 16;
    composites.unshift({ input: logoBuf, top: Math.max(0, logoTop), left: LOGO_PAD, blend: "over" });
  }

  return sharp(imageBuffer)
    .resize(size, size, { fit: "cover" })
    .composite(composites)
    .png()
    .toBuffer();
}

// ── Legacy alias — mantido para compatibilidade, usa config R2PB ──────────────
/** @deprecated Use applyTenantBranding(buf, "r2pb") instead */
export async function applyR2PBBranding(
  imageBuffer: Buffer,
  size = 1024,
  variant: BrandingVariant = "auto",
): Promise<Buffer> {
  return applyTenantBranding(imageBuffer, "r2pb", size, variant);
}
