/**
 * creativeTemplateEngine.ts — Creative Render Engine v2
 *
 * 5 premium templates with structured prompt building,
 * art direction rules, and visual QA.
 */

import sharp from "sharp";

// ── Template definitions ──────────────────────────────────────────────────────

export type TemplateId =
  | "editorial_premium"
  | "manifesto"
  | "prova_qualidade"
  | "confianca"
  | "conversao_cta";

export interface CreativeTemplate {
  id: TemplateId;
  name: string;
  modes: string[];
  funnelStages: string[];
  objetivoKeywords: string[];
  visualDirection: string;
  composicaoHint: string;
  atmosphereHint: string;
  colorHint: string;
  strictlyAvoid: string;
  brandingTheme: "auto" | "white" | "black";
  headlineCharLimit: number;
}

export const TEMPLATES: Record<TemplateId, CreativeTemplate> = {
  editorial_premium: {
    id: "editorial_premium",
    name: "Editorial Premium",
    modes: ["conceitual", "hibrido"],
    funnelStages: ["awareness", "consideração", "consideration"],
    objetivoKeywords: ["brand", "posicion", "editorial", "identidade", "awareness", "marca"],
    visualDirection:
      "Luxury fashion editorial photography. Premium Brazilian B2B fashion atelier environment. Rich material textures — silk, fine cotton, structured suiting. Subtle fabric details in foreground with elegant depth-of-field blur in background. Architectural or studio negative space on lower third.",
    composicaoHint:
      "Rule of thirds. Main visual element occupies top 60% of frame. Clean uncluttered lower third (30% of height) with soft gradient fade toward dark — reserved for branding overlay. No content below 70% of image height.",
    atmosphereHint:
      "Dramatic yet refined lighting. Deep shadows with selective highlights. Premium ateliê ambiance. Sophisticated, aspirational mood.",
    colorHint:
      "Deep charcoal, navy, ivory, or jewel tones. Minimal palette — maximum 3 tonal families. No neon or flat colors.",
    strictlyAvoid:
      "No text, typography, or watermarks. No people with faces visible. No sewing machines or generic factory imagery. No solid flat black backgrounds. No stock-photo clichés.",
    brandingTheme: "white",
    headlineCharLimit: 45,
  },

  manifesto: {
    id: "manifesto",
    name: "Manifesto / Posicionamento",
    modes: ["conceitual", "hibrido"],
    funnelStages: ["awareness"],
    objetivoKeywords: ["manifesto", "posicion", "propósito", "missão", "statement", "valores"],
    visualDirection:
      "Bold architectural minimalism. Single powerful visual metaphor — abstract fabric geometry, flowing textile in motion, or structural fashion silhouette. Strong central composition. Monochromatic or dramatically limited palette.",
    composicaoHint:
      "Strong central focal element. Generous negative space around it. Center or upper-center composition. Very clean lower 25% — reserved for branding. Breathing room on all sides (minimum 8% margin).",
    atmosphereHint:
      "Confident, powerful, deliberately sparse. The emptiness is intentional — it speaks to premium positioning. High contrast between subject and background.",
    colorHint:
      "Monochromatic preferred — deep black with single accent, or white with rich charcoal. Alternatively: muted earth tones with one strong accent. Avoid busy multi-color palettes.",
    strictlyAvoid:
      "No text. No logos. No busy patterns. No cluttered compositions. No stock imagery of people. No generic backgrounds.",
    brandingTheme: "white",
    headlineCharLimit: 35,
  },

  prova_qualidade: {
    id: "prova_qualidade",
    name: "Prova de Qualidade",
    modes: ["comercial", "hibrido"],
    funnelStages: ["consideração", "consideration", "decision"],
    objetivoKeywords: ["qualidade", "prova", "bastidor", "acabamento", "precisão", "material", "tecido", "detalhe"],
    visualDirection:
      "Artisan craftsmanship documentation. Premium manufacturing quality close-up — precision stitching, fine fabric texture macro, quality material detail. Professional product photography. No people, only craft and material.",
    composicaoHint:
      "Macro detail as hero — close crop of quality indicator (stitch, seam, fabric weave, finishing). Shallow depth of field. Subject sharp, background softly blurred. Natural or studio light from left. Lower 25% clean gradient for footer.",
    atmosphereHint:
      "Trust-building, meticulous, confident. The image proves quality through tangible visual detail. Warm professional lighting — natural daylight or softbox. No artificial neon or dramatic dark.",
    colorHint:
      "Warm neutrals — ivory, cream, soft beige, taupe. Fabric natural colors. Occasional accent of brand color in material detail. Clean, honest palette.",
    strictlyAvoid:
      "No text in image. No sewing workers (only materials/product). No generic factory floor. No cluttered manufacturing environment. No dark moody tones (keep approachable and clean).",
    brandingTheme: "auto",
    headlineCharLimit: 55,
  },

  confianca: {
    id: "confianca",
    name: "Objeção / Confiança",
    modes: ["comercial", "hibrido"],
    funnelStages: ["consideração", "consideration", "decision"],
    objetivoKeywords: ["confiança", "parceiro", "segurança", "objeção", "garantia", "confiavel", "risco"],
    visualDirection:
      "Professional business partnership environment. Modern fashion showroom or design studio. Organized, clean, trustworthy atmosphere. Quality samples displayed professionally. Partnership and reliability implied through visual order.",
    composicaoHint:
      "Balanced professional composition. Main subject centered or left-aligned. Clean right side or lower area for text zone. Studio or showroom setting — organized, professional. Lower 25% clear gradient.",
    atmosphereHint:
      "Calm, reliable, professional confidence. Warm neutral lighting — not dramatic, not cold. Welcoming yet premium. Signals: 'we are organized, professional, trustworthy'.",
    colorHint:
      "Warm whites, soft grays, warm wood tones. Possibly subtle brand blue as accent in decor detail. Clean and professional. No dark moody tones.",
    strictlyAvoid:
      "No text. No faces. No handshake stock photos. No generic corporate imagery. No cold blue corporate tones. No busy or cluttered scenes.",
    brandingTheme: "auto",
    headlineCharLimit: 60,
  },

  conversao_cta: {
    id: "conversao_cta",
    name: "Conversão / CTA",
    modes: ["comercial"],
    funnelStages: ["decision", "action", "conversão"],
    objetivoKeywords: ["venda", "conversão", "cta", "agenda", "contato", "leads", "oferta", "resultado"],
    visualDirection:
      "Dynamic lifestyle product showcase. Aspirational but approachable. Clean hero product or fabric swatch on bright neutral background. Action-oriented, energetic composition. Clear single focal point.",
    composicaoHint:
      "Single strong hero element — product, swatch, or material showcase. Bright clean background (white, off-white, or very light neutral). Ample negative space especially in lower 30%. High clarity, no visual noise.",
    atmosphereHint:
      "Energetic, optimistic, action-ready. Invites engagement. Bright and clean — opposite of dark editorial. Accessible premium, not intimidating luxury.",
    colorHint:
      "Bright whites, clean neutrals, or bold brand color accent. High contrast between subject and background. Energetic but not chaotic. Single accent color maximum.",
    strictlyAvoid:
      "No text. No dark moody tones. No complex cluttered scenes. No abstract compositions — keep it clear and direct. No more than one focal element.",
    brandingTheme: "auto",
    headlineCharLimit: 50,
  },
};

// ── Template selector ─────────────────────────────────────────────────────────

export function selectTemplate(creative: {
  modoCriativo?: string | null;
  objetivoPeca?: string | null;
  funnelStage?: string | null;
  canal?: string | null;
}): TemplateId {
  const objetivo = (creative.objetivoPeca ?? "").toLowerCase();
  const modo = (creative.modoCriativo ?? "").toLowerCase();
  const funnel = (creative.funnelStage ?? "").toLowerCase();

  for (const [id, t] of Object.entries(TEMPLATES) as [TemplateId, CreativeTemplate][]) {
    const keywordMatch = t.objetivoKeywords.some(kw => objetivo.includes(kw));
    if (keywordMatch) return id;
  }

  if (modo === "comercial") {
    if (funnel.includes("action") || funnel.includes("convers")) return "conversao_cta";
    if (funnel.includes("decision")) return "confianca";
    return "prova_qualidade";
  }

  if (modo === "conceitual") return "editorial_premium";

  return "editorial_premium";
}

// ── Prompt builder ────────────────────────────────────────────────────────────

export function buildCreativePrompt(opts: {
  creative: {
    promptVisual?: string | null;
    direcaoArte?: string | null;
    composicaoSugerida?: string | null;
    cores?: string | null;
    headline?: string | null;
    canal?: string | null;
    formato?: string | null;
  };
  brand?: {
    segmento?: string | null;
    estiloVisual?: string | null;
    referenciasEsteticas?: string | null;
    adjetivos?: string[] | null;
    corPrimaria?: string | null;
  } | null;
  template: CreativeTemplate;
}): string {
  const { creative, brand, template } = opts;

  const parts: string[] = [];

  parts.push(template.visualDirection);
  parts.push(`Composition: ${template.composicaoHint}`);
  parts.push(`Atmosphere: ${template.atmosphereHint}`);
  parts.push(`Color palette: ${template.colorHint}`);

  if (brand) {
    const brandParts: string[] = [];
    if (brand.estiloVisual) brandParts.push(`Brand visual style: ${brand.estiloVisual}`);
    if (brand.referenciasEsteticas) brandParts.push(`Aesthetic references: ${brand.referenciasEsteticas}`);
    if (brand.adjetivos?.length) brandParts.push(`Brand personality: ${brand.adjetivos.join(", ")}`);
    if (brand.corPrimaria) brandParts.push(`Brand accent color: ${brand.corPrimaria}`);
    if (brandParts.length) parts.push(brandParts.join(". "));
  }

  if (creative.promptVisual?.trim()) {
    parts.push(`Specific visual direction: ${creative.promptVisual.trim()}`);
  }

  if (creative.direcaoArte?.trim()) {
    parts.push(`Art direction: ${creative.direcaoArte.trim()}`);
  }

  if (creative.composicaoSugerida?.trim()) {
    parts.push(`Suggested composition: ${creative.composicaoSugerida.trim()}`);
  }

  if (creative.cores?.trim()) {
    parts.push(`Color notes: ${creative.cores.trim()}`);
  }

  const formato = creative.canal ?? creative.formato ?? "";
  if (/story|stories/i.test(formato)) {
    parts.push("Vertical 9:16 portrait format. Optimized for Instagram Stories.");
  } else {
    parts.push("Square 1:1 format. Optimized for Instagram Feed.");
  }

  parts.push(template.strictlyAvoid);
  parts.push(
    "Ultra high quality photographic or digital art. Render at maximum detail. " +
    "Professional commercial photography aesthetic. No amateur or stock-photo look. " +
    "CRITICAL: absolutely no text, letters, numbers, words, or watermarks anywhere in the image. " +
    "CRITICAL: no logos or brand marks embedded in the scene. " +
    "CRITICAL: keep the bottom 25% of the image clean with a gradual fade — this area will receive branding overlay.",
  );

  return parts.join(". ");
}

// ── Truncate headline if over template limit ──────────────────────────────────

export function enforceHeadlineLimit(headline: string, template: CreativeTemplate): string {
  if (headline.length <= template.headlineCharLimit) return headline;
  const truncated = headline.slice(0, template.headlineCharLimit - 1).trimEnd();
  const lastSpace = truncated.lastIndexOf(" ");
  return lastSpace > 20 ? truncated.slice(0, lastSpace) + "…" : truncated + "…";
}

// ── Visual QA gate ────────────────────────────────────────────────────────────

export interface QAResult {
  ok: boolean;
  score: number;
  issues: string[];
}

export async function runVisualQA(imageBuffer: Buffer): Promise<QAResult> {
  const issues: string[] = [];

  try {
    const stats = await sharp(imageBuffer).resize(256, 256, { fit: "cover" }).stats();
    const channels = stats.channels;

    const avgBrightness = channels.reduce((s, c) => s + c.mean, 0) / channels.length;
    const avgStd = channels.reduce((s, c) => s + c.stdev, 0) / channels.length;

    if (avgBrightness < 20) {
      issues.push("Imagem muito escura (fundo sólido preto)");
    }
    if (avgBrightness > 235) {
      issues.push("Imagem muito clara (fundo sólido branco)");
    }
    if (avgStd < 18) {
      issues.push("Baixo contraste — imagem muito uniforme, sem detalhe visual");
    }

    const bottomRegion = await sharp(imageBuffer)
      .resize(256, 256, { fit: "cover" })
      .extract({ left: 0, top: 192, width: 256, height: 64 })
      .stats();
    const bottomBrightness = bottomRegion.channels.reduce((s, c) => s + c.mean, 0) / bottomRegion.channels.length;
    if (bottomBrightness > 200) {
      issues.push("Área inferior muito clara — pode reduzir legibilidade do rodapé");
    }

    const score = Math.max(0, 100 - issues.length * 25);
    return { ok: issues.length === 0, score, issues };
  } catch {
    return { ok: true, score: 50, issues: [] };
  }
}
