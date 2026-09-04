/**
 * creativeArchetypes.ts — Camada de direção de arte por slot
 *
 * Define 8 arquétipos criativos, cada um com:
 *  - objetivo no funil
 *  - estrutura visual obrigatória
 *  - regra de texto / headline
 *  - cena prioritária
 *  - direção por formato (feed / story / reel)
 *
 * Garante que cada slot de campanha nasça com uma função criativa definida,
 * evitando o colapso para "fashion image genérica".
 */

export type CreativeArchetype =
  | "authority"
  | "process"
  | "product"
  | "behind_scenes"
  | "conversion_cta"
  | "social_proof"
  | "brand_positioning"
  | "launch_teaser";

export interface ArchetypeDefinition {
  id: CreativeArchetype;
  label: string;
  emoji: string;
  /** Objetivo no funil de marketing */
  primaryGoal: string;
  /** Descrição da estrutura visual esperada */
  visualStructure: string;
  /** Regra de headline/texto na arte */
  textRule: string;
  /** Cena / ambiente prioritário para geração de imagem */
  scenePriority: string;
  /** Sujeito / foco principal da imagem */
  subjectPriority: string;
  /** Modo de CTA na copy */
  ctaMode: string;
  /** Direção de prompt por formato — injetada antes do provider de imagem */
  formatDirections: {
    feed: string;
    story: string;
    reel: string;
  };
  /** Blocos de texto de prompt (em inglês, para o modelo de imagem) */
  imagePromptBlocks: {
    feed: string;
    story: string;
    reel: string;
  };
  /** Instrução de headline para o gerador de copy */
  copyHeadlineInstruction: string;
  /** Instrução de caption para o gerador de copy */
  copyCaptionInstruction: string;
}

// ── Definição dos 8 arquétipos ────────────────────────────────────────────────

export const ARCHETYPES: Record<CreativeArchetype, ArchetypeDefinition> = {
  authority: {
    id: "authority",
    label: "Autoridade",
    emoji: "🏭",
    primaryGoal: "Construir percepção de autoridade técnica e industrial",
    visualStructure:
      "Fábrica ou showroom premium ao fundo. Modelo ou profissional em posição de domínio. Headline forte com promessa concreta. Composição limpa, hierarquia visual clara.",
    textRule:
      "HEADLINE OBRIGATÓRIA — promessa de autoridade. Ex: 'Private label com estrutura industrial real.' Máximo 6 palavras.",
    scenePriority:
      "Chão de fábrica organizado, maquinário premium, ateliê técnico ou showroom com estrutura visível",
    subjectPriority: "Profissional em ação técnica ou modelo com look completo em ambiente de fábrica",
    ctaMode: "Consultivo direto — foco em parceria e produção",
    formatDirections: {
      feed: "Composição 4:5 com headline no terço superior ou central. Fundo de fábrica/showroom. Look completo visível. Assinatura no rodapé.",
      story: "Vertical 9:16. Headline no terço central (safe zone). Visual de bastidor ou produção. CTA na parte inferior.",
      reel: "Thumbnail vertical com headline de impacto. Sensação de movimento técnico — como uma cena de vídeo pausada no pico da ação industrial.",
    },
    imagePromptBlocks: {
      feed: "Premium fashion factory showroom background with organized production floor. Professional in authority pose wearing complete streetwear/fashion look. Editorial portrait 4:5 vertical. Strong foreground subject, factory context visible behind. Clean industrial premium aesthetic.",
      story: "Vertical 9:16 full-bleed editorial. Fashion professional or model in a Brazilian premium textile factory, dramatic side lighting, production equipment visible, strong silhouette, safe zone for headline text overlay in center third.",
      reel: "Vertical 9:16 cinematic freeze-frame. Fashion industry professional in motion through premium factory environment, dynamic angle, industrial backdrop, strong directional lighting, thumbnail-quality composition.",
    },
    copyHeadlineInstruction:
      "Headline de autoridade industrial. Deve comunicar estrutura, processo ou escala. Ex: 'Produção premium sem improviso.', 'Do molde ao acabamento, sem terceiros.'",
    copyCaptionInstruction:
      "Caption que reforça autoridade técnica da fábrica. Cite processo, estrutura ou capacidade produtiva. Termine com CTA consultivo.",
  },

  process: {
    id: "process",
    label: "Processo",
    emoji: "⚙️",
    primaryGoal: "Mostrar o processo produtivo como diferencial e prova de qualidade",
    visualStructure:
      "Close de mão em processo técnico: costura, corte, estamparia, bordado ou detalhe de tecido. Headline de bastidor. Sem modelo completo — foco no fazer.",
    textRule:
      "HEADLINE DE BASTIDOR — revela o que acontece nos bastidores. Ex: 'Do molde ao acabamento real.' Máximo 6 palavras.",
    scenePriority:
      "Close de máquina de costura, tesoura em corte, bordado em andamento, detalhe de linha ou tecido macro",
    subjectPriority: "Mãos em processo técnico, detalhe de peça sendo produzida, close de material premium",
    ctaMode: "Prova e credibilidade — 'Veja como produzimos'",
    formatDirections: {
      feed: "Close editorial 4:5 de processo produtivo. Bokeh no fundo. Detalhe técnico em foco. Headline integrada.",
      story: "Vertical 9:16. Close dramático de processo: mãos, máquina, tecido. Headline curta e direta no centro.",
      reel: "Thumbnail vertical com close de detalhe técnico impressionante. Sensação de movimento de produção.",
    },
    imagePromptBlocks: {
      feed: "Extreme close-up editorial photography of hands working on premium garment in Brazilian factory. Sharp focus on stitching, cutting or fabric detail. Shallow depth of field, warm studio lighting, premium textile texture visible. Vertical 4:5 portrait format.",
      story: "Vertical 9:16 dramatic close-up. Skilled hands working on fabric — stitching, embroidery or precise cutting. Macro lens detail, bokeh background with factory machinery. Strong directional light revealing texture. Cinematic quality.",
      reel: "Vertical 9:16 cinematic detail shot. Dynamic blur suggesting active production process, fabric in motion, hands in decisive action. Premium factory aesthetic.",
    },
    copyHeadlineInstruction:
      "Headline de processo ou detalhe técnico. Ex: 'Cada costura tem razão de ser.', 'Corte preciso. Acabamento real.'",
    copyCaptionInstruction:
      "Caption que explica um aspecto do processo produtivo como diferencial. Educativa mas comercial. CTA para conhecer mais.",
  },

  product: {
    id: "product",
    label: "Produto",
    emoji: "👕",
    primaryGoal: "Destacar o produto físico como objeto de desejo e qualidade percebida",
    visualStructure:
      "Produto em destaque: flat lay premium ou modelo vestindo a peça com foco na peça. Composição comercial clara. Headline de produto.",
    textRule:
      "HEADLINE DE PRODUTO — benefício concreto da peça ou do processo. Ex: 'Acabamento premium em cada detalhe.' Máximo 6 palavras.",
    scenePriority:
      "Flat lay premium com peça dobrada, produto em detalhe ou modelo vestindo a peça com composição limpa",
    subjectPriority: "A peça de roupa como protagonista — detalhe de textura, costuras, acabamentos visíveis",
    ctaMode: "Comercial direto — 'Veja esta peça na sua coleção'",
    formatDirections: {
      feed: "Flat lay editorial 4:5 ou modelo com foco na peça. Composição de produto limpa. Headline integrada. Luz de produto.",
      story: "Vertical 9:16. Produto em destaque. Visual imediato. Headline e CTA claros.",
      reel: "Thumbnail de produto com headline comercial forte. Produto visível e reconhecível em miniatura.",
    },
    imagePromptBlocks: {
      feed: "Premium fashion product editorial. Either flat lay arrangement of carefully folded garment on clean surface with subtle props, or model wearing complete look with focus on garment quality. Soft product lighting revealing fabric texture. Vertical 4:5 portrait.",
      story: "Vertical 9:16 product-focused editorial. Complete outfit on model with clear view of garment details, premium texture visible. Clean background. Strong product lighting.",
      reel: "Vertical 9:16 product showcase. Model wearing garment in dynamic pose, garment clearly visible and well-lit. Editorial style with clean backdrop.",
    },
    copyHeadlineInstruction:
      "Headline focada no produto ou acabamento. Ex: 'Tecido que entrega o que promete.', 'Peça que representa sua marca.'",
    copyCaptionInstruction:
      "Caption que descreve qualidade, material ou diferencial da peça. Comercial e específica. CTA para solicitar amostra ou orçamento.",
  },

  behind_scenes: {
    id: "behind_scenes",
    label: "Bastidores",
    emoji: "🎬",
    primaryGoal: "Humanizar a marca mostrando o ambiente real de produção",
    visualStructure:
      "Ambiente autêntico de ateliê, reunião de equipe ou momento de trabalho real. Não é editorial — é real e direto. Humaniza a marca.",
    textRule:
      "HEADLINE HUMANIZADORA — revela o ambiente ou a equipe. Ex: 'Onde sua coleção nasce de verdade.' Máximo 6 palavras.",
    scenePriority:
      "Ateliê real com mesas de trabalho, equipe em reunião, momento de seleção de tecidos, prova de peça",
    subjectPriority: "Equipe trabalhando ou profissional em momento autêntico — não posado, real",
    ctaMode: "Conexão emocional — 'Conheça nossa equipe'",
    formatDirections: {
      feed: "Editorial de ambiente 4:5. Equipe ou profissional em cena autêntica. Composição mais ampla mostrando o ateliê.",
      story: "Vertical 9:16. Cena de bastidor autêntica. Momento de trabalho real. Headline curta e humana.",
      reel: "Thumbnail vertical de cena autêntica. Sensação de 'por trás das câmeras' profissional.",
    },
    imagePromptBlocks: {
      feed: "Behind-the-scenes editorial photography in Brazilian fashion atelier. Team member reviewing fabric samples or working at production table. Natural warm light, authentic workspace visible, genuine working moment. Vertical 4:5 portrait format.",
      story: "Vertical 9:16 authentic behind-the-scenes. Fashion professional in genuine working moment — measuring, selecting fabrics or reviewing garment. Warm natural light, authentic atelier environment.",
      reel: "Vertical 9:16 authentic atelier scene. Real working moment with team or professional, movement suggested, genuine fashion production environment.",
    },
    copyHeadlineInstruction:
      "Headline que humaniza ou revela bastidor. Ex: 'Aqui começa sua coleção.', 'Nossa equipe, seu resultado.'",
    copyCaptionInstruction:
      "Caption que conta um aspecto humano da produção: equipe, processo, cuidado. Tom próximo e autêntico. CTA relacional.",
  },

  conversion_cta: {
    id: "conversion_cta",
    label: "Conversão",
    emoji: "📲",
    primaryGoal: "Gerar ação imediata — contato, visita ou solicitação de orçamento",
    visualStructure:
      "Imagem mais comercial com CTA visual claro. Headline de conversão. Layout funciona como anúncio premium. Assinatura e contato bem visíveis.",
    textRule:
      "HEADLINE DE CONVERSÃO — ação direta. Ex: 'Solicite sua produção hoje.' ou 'Comece sua coleção agora.' Máximo 6 palavras.",
    scenePriority:
      "Modelo com look completo em posição de convite, ou detalhe de produto com espaço para CTA",
    subjectPriority: "Modelo em pose de convite ou produto com composição que deixa espaço para CTA claro",
    ctaMode: "Direto e urgente — 'Fale agora', 'Solicite orçamento'",
    formatDirections: {
      feed: "Anúncio premium 4:5. Headline de conversão no terço superior. Modelo ou produto. Contato/CTA integrado ao layout.",
      story: "Vertical 9:16 de anúncio real. Headline no centro. CTA claro abaixo. Visual imediato. Funciona como anúncio pago.",
      reel: "Thumbnail de anúncio. Headline de conversão. Imagem que convida ao clique.",
    },
    imagePromptBlocks: {
      feed: "Premium fashion advertisement editorial. Model wearing complete look in inviting pose, clean background, strong composition with visual space for CTA. Commercial quality, high contrast, clear brand moment. Vertical 4:5 portrait.",
      story: "Vertical 9:16 premium advertisement composition. Fashion model in confident inviting pose, clean background allowing text overlays, commercial editorial quality. Strong visual hierarchy.",
      reel: "Vertical 9:16 advertisement thumbnail composition. Model or product in strong commercial pose, clear visual hierarchy, premium aesthetic inviting viewer action.",
    },
    copyHeadlineInstruction:
      "Headline de conversão direta. Ex: 'Sua próxima coleção começa aqui.', 'Produza com quem entende de marca.'",
    copyCaptionInstruction:
      "Caption de conversão: problema → solução → CTA claro. Máximo 3 frases + hashtags. Finalizar com número de WhatsApp ou 'link na bio'.",
  },

  social_proof: {
    id: "social_proof",
    label: "Prova Social",
    emoji: "🤝",
    primaryGoal: "Gerar credibilidade através de evidência de parceria e resultado",
    visualStructure:
      "Resultado concreto de parceria: look finalizado, detalhe de acabamento de qualidade, ou momento de entrega. Headline de prova.",
    textRule:
      "HEADLINE DE PROVA — dado, resultado ou depoimento implícito. Ex: 'Mais de 50 marcas atendidas.' ou 'Seu prazo, nossa prioridade.' Máximo 6 palavras.",
    scenePriority:
      "Look completo finalizado em ambiente premium, ou detalhe de acabamento de alta qualidade como prova visual",
    subjectPriority: "Resultado final: peça ou coleção acabada com qualidade visível",
    ctaMode: "Credibilidade — 'Seja a próxima marca parceira'",
    formatDirections: {
      feed: "Editorial de resultado 4:5. Look completo ou coleção finalizada. Headline de prova. Composição de entrega.",
      story: "Vertical 9:16. Momento de resultado ou parceria. Headline de evidência. Visual imediato.",
      reel: "Thumbnail de resultado. Sensação de 'missão cumprida'. Produto ou look em destaque.",
    },
    imagePromptBlocks: {
      feed: "Premium fashion editorial showcasing final garment or collection. Model wearing polished complete look in premium showroom setting. Quality details visible, editorial lighting, celebratory but sophisticated mood. Vertical 4:5 portrait.",
      story: "Vertical 9:16 result-focused editorial. Complete polished look on model in premium environment, final product quality visible, confident atmosphere of delivered excellence.",
      reel: "Vertical 9:16 polished result showcase. Complete fashion collection or final garment detail, premium quality visible, editorial composition suggesting successful delivery.",
    },
    copyHeadlineInstruction:
      "Headline de prova ou resultado concreto. Ex: 'Resultado que fala por si.', 'Coleção entregue. Prazo cumprido.'",
    copyCaptionInstruction:
      "Caption com evidência de resultado: coleção entregue, parceria consolidada, qualidade visível. Tom confiante e concreto.",
  },

  brand_positioning: {
    id: "brand_positioning",
    label: "Posicionamento",
    emoji: "💎",
    primaryGoal: "Fortalecer o posicionamento de marca premium no mercado B2B de moda",
    visualStructure:
      "Imagem institucional. Composição limpa e premium. Não é produto nem processo — é identidade e percepção de valor. Headline de posicionamento.",
    textRule:
      "HEADLINE DE POSICIONAMENTO — manifesta o que a marca representa. Ex: 'Private label que respeita sua marca.' Máximo 6 palavras.",
    scenePriority:
      "Ambiente clean e premium: showroom minimalista, composição editorial sofisticada, ambiente que irradia exclusividade",
    subjectPriority: "Composição premium sem modelo ou com modelo em pose institucional forte",
    ctaMode: "Identidade — 'Descubra o que fazemos diferente'",
    formatDirections: {
      feed: "Editorial institucional 4:5. Composição limpa. Identidade premium. Headline de manifesto.",
      story: "Vertical 9:16 institucional. Visual clean. Headline de posicionamento. Sem poluição visual.",
      reel: "Thumbnail institucional premium. Composição que transmite autoridade de marca.",
    },
    imagePromptBlocks: {
      feed: "Premium institutional fashion editorial. Minimalist showroom with carefully curated garments on display, premium materials and surfaces, clean architectural background, sophisticated ambient light. Identity and exclusivity atmosphere. Vertical 4:5 portrait.",
      story: "Vertical 9:16 brand identity editorial. Premium fashion environment with clean composition, aspirational but grounded premium B2B aesthetic, institutional quality lighting.",
      reel: "Vertical 9:16 brand positioning visual. Aspirational premium fashion environment, clean composition, strong brand identity moment, institutional quality.",
    },
    copyHeadlineInstruction:
      "Headline de manifesto ou posicionamento. Ex: 'Fazemos marcas, não só roupas.', 'Estrutura para quem leva moda a sério.'",
    copyCaptionInstruction:
      "Caption de posicionamento: quem são, o que defendem, qual o diferencial. Tom de manifesto premium. CTA para conhecer mais.",
  },

  launch_teaser: {
    id: "launch_teaser",
    label: "Lançamento",
    emoji: "🚀",
    primaryGoal: "Criar antecipação e urgência em torno de lançamento ou novidade",
    visualStructure:
      "Imagem com sensação de novo e exclusivo. Visual que comunica 'algo está chegando' ou 'novo disponível'. Headline de lançamento.",
    textRule:
      "HEADLINE DE LANÇAMENTO — urgência ou novidade. Ex: 'Nova coleção disponível agora.' ou 'Lançamento exclusivo.' Máximo 6 palavras.",
    scenePriority:
      "Produto revelado com drama: detalhe de peça nova, composição de lançamento, ambiente de revelação",
    subjectPriority: "Nova peça ou coleção com composição dramática — revelação",
    ctaMode: "Urgência — 'Reserve agora', 'Vagas limitadas'",
    formatDirections: {
      feed: "Editorial de lançamento 4:5. Produto ou look novo em destaque. Headline de urgência ou novidade.",
      story: "Vertical 9:16 de lançamento. Visual dramático. Headline urgente. CTA imediato.",
      reel: "Thumbnail de lançamento. Sensação de 'novo agora'. Produto ou look em revelação.",
    },
    imagePromptBlocks: {
      feed: "Premium fashion launch editorial. New garment or collection revealed dramatically — product emerging from dark background or model unveiling new look. Sense of exclusive premiere, dramatic lighting, editorial quality. Vertical 4:5 portrait.",
      story: "Vertical 9:16 fashion launch reveal. Dramatic lighting, new garment or collection in spotlight moment, sense of premiere and exclusivity. Strong visual contrast.",
      reel: "Vertical 9:16 launch moment. New fashion collection or garment in dramatic reveal composition, strong lighting, sense of premiere and exclusive availability.",
    },
    copyHeadlineInstruction:
      "Headline de lançamento ou urgência. Ex: 'Chegou: produção para sua nova coleção.', 'Lançamento disponível agora.'",
    copyCaptionInstruction:
      "Caption de lançamento: o que é novo, por que importa, como acessar. Tom de revelação e urgência controlada. CTA direto.",
  },
};

// ── Alocação inteligente de arquétipos por campanha ───────────────────────────

/**
 * Distribui arquétipos de forma estratégica entre os slots de uma campanha.
 * Garante diversidade e cobertura de funil.
 *
 * Regras para R2PB (captação de marcas):
 * - Feed 1: authority
 * - Feed 2: process
 * - Feed 3: conversion_cta
 * - Feed N: alterna entre product, social_proof, brand_positioning
 * - Story 1: authority (headline forte)
 * - Story 2: process ou product
 * - Story 3: conversion_cta
 * - Story N: alterna entre behind_scenes, social_proof
 * - Reel: launch_teaser ou conversion_cta
 */
export function assignArchetypes(slots: Array<{ slotType: string; slotIndex: number }>): CreativeArchetype[] {
  const FEED_SEQUENCE: CreativeArchetype[] = [
    "authority", "process", "conversion_cta", "product", "social_proof",
    "brand_positioning", "behind_scenes", "launch_teaser",
  ];
  const STORY_SEQUENCE: CreativeArchetype[] = [
    "authority", "process", "conversion_cta", "product",
    "social_proof", "behind_scenes", "brand_positioning", "launch_teaser",
  ];
  const REEL_SEQUENCE: CreativeArchetype[] = [
    "launch_teaser", "conversion_cta", "authority", "process",
  ];

  return slots.map(slot => {
    const idx = (slot.slotIndex - 1);
    switch (slot.slotType) {
      case "feed":  return FEED_SEQUENCE[idx  % FEED_SEQUENCE.length];
      case "story": return STORY_SEQUENCE[idx % STORY_SEQUENCE.length];
      case "reel":  return REEL_SEQUENCE[idx  % REEL_SEQUENCE.length];
      default:      return "authority";
    }
  });
}

/**
 * Retorna o bloco de prompt de imagem para um dado arquétipo + formato.
 * Usado pelo `buildSlotPrompt` para enriquecer o prompt antes da geração.
 */
export function getArchetypeImagePromptBlock(
  archetype: CreativeArchetype,
  slotType: "feed" | "story" | "reel",
): string {
  const def = ARCHETYPES[archetype];
  if (!def) return "";
  return def.imagePromptBlocks[slotType] ?? def.imagePromptBlocks.feed;
}

/**
 * Retorna a instrução de formato para um dado arquétipo + formato.
 */
export function getArchetypeFormatDirection(
  archetype: CreativeArchetype,
  slotType: "feed" | "story" | "reel",
): string {
  const def = ARCHETYPES[archetype];
  if (!def) return "";
  return def.formatDirections[slotType] ?? def.formatDirections.feed;
}
