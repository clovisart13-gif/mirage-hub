/**
 * Mirage / Moda Conecta Creative Engine
 *
 * Motor criativo isolado para o tenant `mirage`.
 * Garante que NENHUMA peça do Moda Conecta herde estética, semântica
 * ou linguagem da R2PB (private label / fábrica / streetwear).
 *
 * Modos criativos mapeiam para composição visual, headline, CTA e
 * referências imagéticas distintas — eliminando templates repetitivos.
 */

// ── Tipos ───────────────────────────────────────────────────────────────────

export type MirageCreativeMode =
  | "institucional"
  | "comunidade"
  | "curadoria_b2b"
  | "captacao_fornecedores"
  | "captacao_marcas"
  | "ecossistema_editorial";

export interface MirageEnrichmentInput {
  imagePrompt: string;
  creativeMode?: MirageCreativeMode | null;
  contextNote?: string | null;
  campaignName?: string | null;
  campaignObjective?: string | null;
  slotType?: "feed" | "story" | "reel" | null;
}

export interface MirageEnrichmentResult {
  enrichedPrompt: string;
  originalPrompt: string;
  creativeMode: MirageCreativeMode;
  directionApplied: string[];
  negativeTermsApplied: string[];
  compositionStyle: string;
  headlineTone: string;
  ctaStyle: string;
}

// ── Negatives globais do Mirage (nunca deve aparecer) ────────────────────────

// ── Bloqueios duros — dois grupos distintos ──────────────────────────────────
// Grupo 1: herança R2PB (fábrica, confecção, streetwear)
// Grupo 2: atalho corporativo genérico (o novo erro a evitar)

const MIRAGE_HARD_NEGATIVES = [
  // ── R2PB / fábrica (nunca) ──────────────────────────────────────────────
  "factory floor",
  "industrial sewing machine",
  "production line",
  "garment manufacturing",
  "private label clothing ad",
  "streetwear model posing",
  "clothing brand campaign lookbook",
  "textile machinery",
  "workshop stitching",
  "embroidery machine",
  "hypebeast aesthetic",
  "gym fitness apparel shoot",
  "fast fashion production",
  // ── Corporativo genérico (o novo erro) ─────────────────────────────────
  "corporate skyline",
  "glass office tower exterior",
  "financial district skyscrapers",
  "generic office lobby",
  "investment banking aesthetic",
  "stock market trading floor",
  "SaaS product screenshot mockup",
  "generic business handshake in suit",
  "corporate boardroom with suits",
  "real estate luxury condo lobby",
  "fintech app dashboard illustration",
  "consulting firm presentation slide",
];

const MIRAGE_NEGATIVE_PROMPT =
  `STRICT NEGATIVES — Do NOT show ANY of: ${MIRAGE_HARD_NEGATIVES.join(", ")}. ` +
  `This is NOT a factory, NOT a clothing brand ad, NOT a corporate finance company. ` +
  `Every image must contain recognizable visual codes of the Brazilian fashion B2B sector: ` +
  `textiles, fabric swatches, showrooms, fashion professionals, sourcing, curation, or trade connections. ` +
  `If none of these appear, the image FAILS.`;

// ── Biblioteca de modos criativos ────────────────────────────────────────────

interface ModeDefinition {
  label: string;
  sceneDirection: string;
  compositionStyle: string;
  headlineTone: string;
  ctaStyle: string;
  visualReferences: string;
  extraNegatives: string[];
}

export const MIRAGE_CREATIVE_MODES: Record<MirageCreativeMode, ModeDefinition> = {

  // ── TERRITÓRIO 1: Curadoria Têxtil ─────────────────────────────────────────
  // Âncoras: amostras, cartelas, fichas técnicas, showroom de materiais
  institucional: {
    label: "Curadoria Têxtil — Seleção e Critério",
    sceneDirection:
      "Top-down editorial flat lay on a matte stone or warm linen surface. " +
      "Scene contains: neatly arranged premium fabric swatches in 4-6 distinct textures (linen, crepe, jacquard, denim, jersey), " +
      "one open technical specification sheet, a small color card palette fanned out, and a minimal tablet or clipboard showing a supplier rating. " +
      "Studio lighting from a 45-degree angle creating soft shadows. " +
      "Color palette: warm naturals (ecru, sand, slate), with one accent color swatch per the season. " +
      "Feeling: curated selection, professional discernment, quality over quantity. " +
      "This is the physical act of selecting the right supplier — textile intelligence made visual.",
    compositionStyle: "Overhead flat lay, golden-ratio arrangement, generous breathing room between objects",
    headlineTone: "Preciso e seletivo — curadoria com critério, não catálogo aberto",
    ctaStyle: "Fornecedores verificados | Acesse a rede curada",
    visualReferences:
      "Kinfolk issue 22 objects spread, Première Vision show floor material displays, " +
      "WGSN material trend boards, premium sourcing fair editorial photography",
    extraNegatives: [
      "person in frame",
      "digital device as hero",
      "generic white background product shot",
      "messy pile of fabrics",
    ],
  },

  curadoria_b2b: {
    label: "Curadoria Têxtil — Mesa de Trabalho",
    sceneDirection:
      "Editorial medium shot of a professional curation workspace in a bright São Paulo or Rio showroom. " +
      "A fashion buyer or sourcing specialist's hands (visible but face cropped or soft-focus) examining fabric swatches pinned to a vertical board. " +
      "Surrounding elements: color palette chips, technical data sheets, open notebook with annotations, samples in labeled bags. " +
      "Natural daylight from a side window, warm editorial tones. " +
      "Feeling: active curation in progress, expertise at work, decisions being made. " +
      "Every element must connect to the fashion supply chain — no generic office props.",
    compositionStyle: "Medium-close environmental portrait, diagonal composition, hands and materials as visual anchors",
    headlineTone: "Ativo e especializado — o processo de curadoria como diferencial",
    ctaStyle: "Fornecedores validados | Parceiros verificados",
    visualReferences:
      "Business of Fashion sourcing feature photography, Première Vision buyer editorial, " +
      "Vogue Business supply chain photography, TEXBRASIL fair coverage",
    extraNegatives: ["full face corporate portrait", "generic stock office", "unrelated business meeting"],
  },

  // ── TERRITÓRIO 2: Conexão entre Negócios da Moda ───────────────────────────
  // Âncoras: marca + fornecedor, reunião setorial, parceria, showroom com pessoas
  comunidade: {
    label: "Conexão — Marca Encontra Fornecedor",
    sceneDirection:
      "Candid editorial photograph of a connection moment in a fashion B2B context in Brazil. " +
      "Scene: a brand representative and a textile supplier seated across a showroom table. " +
      "Visible on the table: fabric samples, a tablet showing a supplier profile, and handwritten notes. " +
      "Both people are professionally dressed (not suited-up corporate, fashion industry casual-professional). " +
      "Warm natural light, editorial shallow depth-of-field. Brazilian context: warm skin tones, relaxed professional energy. " +
      "Feeling: trust being built, the right match being made, human intelligence behind the platform.",
    compositionStyle: "Two-shot across a table, eye-level, shallow depth of field on the handshake or sample moment",
    headlineTone: "Relacional e direto — o encontro certo no momento certo",
    ctaStyle: "Entre para a rede | Conecte sua marca",
    visualReferences:
      "The Business of Fashion buyer-supplier feature photography, Faire.com brand story visuals, " +
      "Sebrae moda B2B editorial, ABEST professional network imagery",
    extraNegatives: [
      "generic corporate handshake in suit",
      "stock photo smiling people in office",
      "clothes as hero in frame",
      "runway or fashion show",
    ],
  },

  captacao_marcas: {
    label: "Conexão — Marca em Processo de Sourcing",
    sceneDirection:
      "A fashion brand founder or designer, mid-30s, Brazilian, reviewing sourcing options in a bright and minimal studio. " +
      "They are looking at a mood board on the wall that mixes fabric swatches, reference images, and printed supplier profiles. " +
      "On the desk: open laptop showing a sourcing platform, fabric rolls in background, annotated sketches. " +
      "Natural window light, warm editorial feel. Soft focus on background details. " +
      "Feeling: discovery, clarity, finding the right partner without wasting time. " +
      "This person is a buyer, not a model — professional presence, not consumer brand energy.",
    compositionStyle: "3/4 environmental portrait, person at left, mood board at right, balanced negative space",
    headlineTone: "Orientado ao problema — encontrar o fornecedor certo sem perder tempo e dinheiro",
    ctaStyle: "Encontre fornecedores | Comece o sourcing",
    visualReferences:
      "Vogue Business sourcing editorial, Nuvemshop brand feature photography, " +
      "WGSN buyer profile imagery, ABEST member stories",
    extraNegatives: [
      "model wearing clothes for brand",
      "consumer fashion advertising",
      "fashion show runway",
      "generic laptop stock photo",
    ],
  },

  captacao_fornecedores: {
    label: "Conexão — Fornecedor na Plataforma",
    sceneDirection:
      "A textile supplier representative (owner of a fabric house or material supplier, 35-55 years old, Brazilian) " +
      "standing in their showroom surrounded by organized fabric rolls and sample books. " +
      "They are looking at a tablet showing their digital profile on a sourcing platform. " +
      "Showroom environment: professionally organized shelves with fabric rolls in coordinated colors, labeled samples. " +
      "Feeling: pride in product quality, access to new markets, professional visibility. " +
      "This is NOT a factory — it is a premium showroom where buyers come to select materials.",
    compositionStyle: "Medium shot, person in foreground, showroom in background, diagonal leading lines of fabric rolls",
    headlineTone: "Proposta de valor concreta — o que o fornecedor ganha ao entrar na rede qualificada",
    ctaStyle: "Cadastre seu showroom | Expanda sua base de clientes",
    visualReferences:
      "Première Vision exhibitor editorial, TEXBRASIL fair supplier profiles, " +
      "Milão Unica fair photography, ABEST supplier directory imagery",
    extraNegatives: [
      "industrial manufacturing floor",
      "mass production machinery",
      "dark warehouse",
      "unorganized textile stockroom",
    ],
  },

  // ── TERRITÓRIO 3: Ecossistema Editorial Moda B2B ───────────────────────────
  // Âncoras: visual premium com códigos claros da cadeia têxtil, não corporativo genérico
  ecossistema_editorial: {
    label: "Ecossistema Editorial — Moda B2B Brasileira",
    sceneDirection:
      "Premium editorial composition that communicates the Brazilian fashion supply chain as an ecosystem. " +
      "Approach A (preferred): overhead aerial-style flat lay mixing fashion trade objects — " +
      "fabric swatch cards from different suppliers arranged in a network pattern on a raw linen surface, " +
      "small supplier name tags, a central 'hub' object (compass, loupe, or color-calibration card). " +
      "Approach B: Split editorial collage — left panel shows close-up textile texture (jacquard weave or premium jersey), " +
      "right panel shows two hands exchanging a fabric sample, connected by a thin line graphic element. " +
      "Color palette: warm neutral ground with 2-3 accent colors from textile swatches. " +
      "Feeling: intelligence, scale, interconnection — the fashion market mapped and curated. " +
      "Must feel like a WGSN or Première Vision editorial, NOT like a SaaS product landing page.",
    compositionStyle: "Graphic editorial — strong geometry using fashion B2B objects as structural elements",
    headlineTone: "Visionário e editorial — inteligência da cadeia da moda, não tecnologia abstrata",
    ctaStyle: "O ecossistema têxtil do Brasil | Inteligência comercial para marcas e fornecedores",
    visualReferences:
      "WGSN trend board editorial, Première Vision magazine covers, " +
      "Business of Fashion special edition layouts, TEXBRASIL identity campaign, " +
      "Vogue Business supply chain feature photography",
    extraNegatives: [
      "network diagram with generic nodes",
      "SaaS app UI mockup",
      "generic globe or world map",
      "fintech illustration style",
      "abstract corporate geometry without fashion reference",
    ],
  },
};

// ── Inferência automática de modo por contexto ───────────────────────────────

export function inferMirageCreativeMode(context: {
  campaignName?: string | null;
  campaignObjective?: string | null;
  angulo?: string | null;
  intencao_criativa?: string | null;
}): MirageCreativeMode {
  const text = [
    context.campaignName,
    context.campaignObjective,
    context.angulo,
    context.intencao_criativa,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/fornecedor|supplier|cadastro|rede de clientes/.test(text)) return "captacao_fornecedores";
  if (/marca|comprador|lojista|estilista|encontrar parceiro/.test(text)) return "captacao_marcas";
  if (/comunidade|rede|conexão|networking|pessoas/.test(text)) return "comunidade";
  if (/curadoria|seleção|verificado|qualificado|b2b/.test(text)) return "curadoria_b2b";
  if (/ecossistema|editorial|inteligência|mercado|visão/.test(text)) return "ecossistema_editorial";
  return "institucional"; // default seguro para Mirage
}

// ── Enriquecedor principal ───────────────────────────────────────────────────

export function enrichMiragePrompt(input: MirageEnrichmentInput): MirageEnrichmentResult {
  const mode =
    input.creativeMode ??
    inferMirageCreativeMode({
      campaignName: input.campaignName,
      campaignObjective: input.campaignObjective,
    });

  const modeDef = MIRAGE_CREATIVE_MODES[mode];

  // Orientação por formato de slot
  const slotFraming =
    input.slotType === "story" || input.slotType === "reel"
      ? "Vertical 9:16 composition, subject in upper two-thirds, CTA zone at bottom quarter."
      : "Square 1:1 or portrait 4:5 composition, balanced visual weight, center-to-left subject.";

  const negatives = [...MIRAGE_HARD_NEGATIVES, ...modeDef.extraNegatives];

  const directionApplied: string[] = [
    `Mode: ${modeDef.label}`,
    `Composition: ${modeDef.compositionStyle}`,
    `Visual ref: ${modeDef.visualReferences}`,
    `Slot framing: ${slotFraming}`,
    "Tenant: Mirage / Moda Conecta — NOT R2PB / private label / factory",
  ];

  const enrichedPrompt = [
    // Conceito original do gerador
    `CONCEPT: ${input.imagePrompt.trim()}`,
    "",
    // Direção criativa do modo
    `VISUAL DIRECTION (${modeDef.label}): ${modeDef.sceneDirection}`,
    "",
    // Enquadramento por formato
    `FORMAT FRAMING: ${slotFraming}`,
    "",
    // Contexto da campanha
    input.contextNote ? `CAMPAIGN CONTEXT: ${input.contextNote}` : null,
    "",
    // Visual references
    `VISUAL REFERENCES: ${modeDef.visualReferences}`,
    "",
    // Negativas — o mais importante para evitar contaminação R2PB
    `STRICT NEGATIVES: ${MIRAGE_NEGATIVE_PROMPT}`,
    `ADDITIONAL NEGATIVES FOR THIS MODE: ${modeDef.extraNegatives.join(", ")}.`,
    "",
    // Qualidade técnica
    "TECHNICAL: photorealistic, editorial quality, premium art direction, no text or logos in image, no watermarks.",
  ]
    .filter((l) => l !== null)
    .join("\n");

  return {
    enrichedPrompt,
    originalPrompt: input.imagePrompt,
    creativeMode: mode,
    directionApplied,
    negativeTermsApplied: negatives,
    compositionStyle: modeDef.compositionStyle,
    headlineTone: modeDef.headlineTone,
    ctaStyle: modeDef.ctaStyle,
  };
}

// ── Gerador de copy para Mirage / Moda Conecta ───────────────────────────────

export interface MirageCopyInput {
  creativeMode: MirageCreativeMode;
  imagePrompt: string;
  contextNote?: string | null;
  campaignName?: string | null;
  slotType?: "feed" | "story" | "reel" | null;
  /** Configurações do Prompt Studio — Chamada do Post */
  postCaptionCtaPrimary?: string | null;
  postCaptionTone?: string | null;
  postCaptionInstructionMaster?: string | null;
  imageHeadlinePrimary?: string | null;
  imageHeadlineVariations?: string | null;
}

export interface MirageCopyResult {
  headline: string;
  caption: string;
  cta: string;
}

const MIRAGE_COPY_SYSTEM = `Você é redator sênior do Hub Mirage / Moda Conecta — ecossistema B2B de curadoria, comunidade e inteligência comercial do mercado têxtil brasileiro.

IDENTIDADE DA MARCA — MODA CONECTA:
- Plataforma que conecta marcas, compradores e fornecedores qualificados no mercado de moda brasileiro
- Foco: curadoria, ecossistema, networking B2B, inteligência comercial, comunidade de mercado
- Público: designers, compradores de moda, donos de marca, fornecedores têxteis verificados
- Tom: institucional, editorial, premium, consultivo. Direto mas sofisticado.

REGRAS ABSOLUTAS — PROIBIDO em qualquer output:
- Qualquer menção a fábrica, confecção, costura, produção, private label, corte, modelagem
- Streetwear, fitness, alfaiataria como categorias de produto
- Linguagem de fornecedor que vende serviço de produção
- Slogans genéricos: "qualidade premium", "excelência", "feito com amor"
- Hashtags R2PB: #r2pb, #privateLabelBrasil, #confecção

REGRAS DE HEADLINE — OBRIGATÓRIAS:
- Máximo 6 palavras. Sem hashtag, sem emoji.
- Enfoque em UMA das abordagens:
  A) Curadoria: o que o Moda Conecta seleciona e garante
  B) Conexão: o encontro entre quem precisa e quem oferece
  C) Ecossistema: a rede que movimenta o mercado
  D) Inteligência: o conhecimento que acelera decisões de compra
  E) Comunidade: pertencer ao mercado certo

EXEMPLOS DE HEADLINES APROVADAS:
- "Encontre fornecedores que cabem na sua marca"
- "Curadoria que economiza tempo de sourcing"
- "O ecossistema de moda que você precisava"
- "Networking B2B para marcas que crescem"
- "Fornecedores verificados, uma plataforma"
- "Conexões que viram coleções"

CAPTION: 2-3 frases editoriais + quebra de linha + 5 hashtags do ecossistema de moda brasileiro (ex: #ModaConecta #FornecedoresVerificados #MercadoDeModaBrasil #B2BModa #EcossistemaTextil).`;

export async function generateMirageCopy(input: MirageCopyInput): Promise<MirageCopyResult> {
  const baseUrl = (process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"] ?? "").replace(/\/$/, "");
  const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "";
  if (!baseUrl || !apiKey) throw new Error("AI_INTEGRATIONS_OPENAI não configurado para Mirage copy");

  const modeDef = MIRAGE_CREATIVE_MODES[input.creativeMode];
  const slotLabel = input.slotType === "story" ? "Story" : input.slotType === "reel" ? "Reel" : "Feed";

  const systemPrompt = input.postCaptionInstructionMaster
    ? `${MIRAGE_COPY_SYSTEM}\n\nINSTRUÇÃO ADICIONAL DO PROMPT STUDIO:\n${input.postCaptionInstructionMaster}`
    : MIRAGE_COPY_SYSTEM;

  const headlineInstruction = input.imageHeadlinePrimary
    ? `Headline obrigatória: "${input.imageHeadlinePrimary}"`
    : input.imageHeadlineVariations
    ? `Escolha uma destas variações de headline: ${input.imageHeadlineVariations}`
    : `Crie uma headline original no tom: ${modeDef.headlineTone}`;

  const ctaInstruction = input.postCaptionCtaPrimary
    ? `CTA: "${input.postCaptionCtaPrimary}"`
    : `CTA alinhado ao estilo "${modeDef.ctaStyle}"`;

  const userPrompt = `MODO CRIATIVO: ${input.creativeMode} — ${modeDef.sceneDirection}
FORMATO: ${slotLabel}
IMAGEM GERADA: ${input.imagePrompt}
${input.contextNote ? `CONTEXTO: ${input.contextNote}` : ""}
${input.campaignName ? `CAMPANHA: ${input.campaignName}` : ""}

${headlineInstruction}
${ctaInstruction}

Retorne SOMENTE JSON válido (sem markdown):
{"headline":"string","caption":"string","cta":"string"}`;

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5-mini",
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      max_completion_tokens: 400,
    }),
  });

  if (!resp.ok) throw new Error(`Mirage copy API error: ${resp.status}`);
  const data = await resp.json() as { choices: { message: { content: string } }[] };
  const raw = (data.choices[0]?.message?.content ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  try {
    const parsed = JSON.parse(raw) as MirageCopyResult;
    return {
      headline: parsed.headline ?? "Conecte-se ao ecossistema",
      caption:  parsed.caption  ?? "A plataforma que une marcas e fornecedores verificados do mercado têxtil brasileiro.",
      cta:      parsed.cta      ?? "Acesse o Moda Conecta",
    };
  } catch {
    return {
      headline: "Curadoria que conecta mercados",
      caption:  "Encontre os parceiros certos para a sua marca. O Moda Conecta reúne fornecedores verificados e compradores qualificados em uma plataforma de inteligência B2B.",
      cta:      "Acesse agora",
    };
  }
}
