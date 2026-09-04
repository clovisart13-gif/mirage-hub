/**
 * R2PB Creative Direction — Premium Image Prompt Enricher
 *
 * Transforma um `image_prompt` genérico em direção visual completa,
 * coerente com o posicionamento de private label premium da R2PB.
 *
 * Chamado antes de qualquer provider de imagem para garantir que
 * NENHUMA imagem saia com estética amadora ou cara genérica de IA.
 *
 * v2: Biblioteca expandida (20 cenas), anti-repetição, slot_type awareness.
 */

export type CreativeType =
  | "streetwear"
  | "fitness"
  | "alfaiataria"
  | "generico"
  | "autoridade_fabrica";

/** Eixo criativo de alto nível — governa direção de imagem e copy */
export type CreativeAxis = "autoridade_fabrica" | "lifestyle_nicho";

/** Segmento de moda — usado em copy e metadados */
export type CreativeSegment = "fábrica" | "streetwear" | "fitness" | "alfaiataria" | "genérico";

export type SlotType = "feed" | "story" | "reel";

export function resolveCreativeAxis(creativeType: CreativeType): CreativeAxis {
  return creativeType === "autoridade_fabrica" ? "autoridade_fabrica" : "lifestyle_nicho";
}

export function resolveSegment(creativeType: CreativeType): CreativeSegment {
  if (creativeType === "autoridade_fabrica") return "fábrica";
  if (creativeType === "generico") return "genérico";
  return creativeType as CreativeSegment;
}

export interface R2PBEnrichmentInput {
  imagePrompt: string;
  creativeType?: CreativeType | null;
  /** Contexto extra livre — produto, campanha, proposta */
  contextNote?: string | null;
  /** Formato do slot — define orientação/enquadramento obrigatório */
  slotType?: SlotType | null;
  /**
   * Rótulos de cenas usadas recentemente (últimos 3–5 assets da campanha).
   * Usado para evitar repetição de cenas iguais em sequência.
   */
  recentSceneLabels?: string[];
  /**
   * Arquétipo criativo do slot — governa estrutura visual, regra de texto e direção de cena.
   * Ex: "authority", "process", "conversion_cta", "social_proof", etc.
   */
  archetype?: string | null;
}

export interface R2PBEnrichmentResult {
  enrichedPrompt: string;
  originalPrompt: string;
  creativeType: CreativeType;
  creativeAxis: CreativeAxis;
  segment: CreativeSegment;
  directionApplied: string[];
  /** Rótulo da cena escolhida — registrar em growth_assets.prompt_input para anti-repetição */
  sceneLabel: string | null;
}

// ── Instrução de orientação por formato de slot ───────────────────────────────

const SLOT_FRAMING: Record<SlotType, string> = {
  feed: `
FORMATO: Feed Instagram — proporção retrato 4:5 (vertical portrait).
Composição editorial: sujeito ocupando 60-75% do quadro, espaço lateral equilibrado, fundo limpo que não compete.
Enquadramento: full body de 3/4 mostrando a peça inteira OU bust shot com detalhe rico de textura/tecido.
Luz: natural difusa de janela alta ou softbox lateral suave — textura do tecido visível nas dobras e costuras.
Composição deve funcionar como miniatura no grid — contraste e foco nítidos mesmo em tamanho reduzido.
`.trim(),
  story: `
FORMATO: Stories Instagram — proporção vertical 9:16, tela full-bleed.
COMPOSIÇÃO OBRIGATÓRIA: sujeito humano no terço central vertical (safe zone: 25% superior e 20% inferior livres para UI do Instagram e overlay de texto).
Luz direcional dramática: vinda de 3/4 posterior ou lateral — criar borda de luz ou silhueta no sujeito contra fundo escuro/contrastante.
Pose de impacto: modelo em movimento real (corrida, giro, passo largo) OU close emocional com expressão forte OU detalhe de tecido/peça em macro com bokeh profundo.
Perspectiva: câmera levemente abaixo do centro (power shot para roupa) OU câmera alta looking-down para detalhe de produto.
Paleta editorial: cores saturadas mas controladas — sem HDR artificial, sem filtro Instagram. Iluminação de campanha real.
PROIBIDO: composição simétrica sem tensão visual, pose estática de catálogo, fundo branco de estúdio sem contexto.
`.trim(),
  reel: `
FORMATO: Reels / TikTok — proporção vertical 9:16, energia cinética.
Frame que sugere movimento e ação — como um fotograma de filme pausado no pico da ação.
Close expressivo com expressão de impacto OU movimento congelado em ponto de máxima energia.
Sujeito ocupando 70-80% do quadro, fundo desfocado ou com movimento de câmera simulado.
`.trim(),
};

// ── Bases de direção visual por linha ────────────────────────────────────────

const STREETWEAR_BASE = `
Editorial de moda streetwear urbano premium.
Ambiente: rua de cidade grande, parede de concreto com textura marcada, escada de incêndio, ou galeria de arte industrial.
Luz: natural lateral dura — golden hour ou overcast cinza — sem flash direto.
Enquadramento: full body ou 3/4 com perspectiva levemente abaixo; câmera inclinada no máximo 5°.
Pose: postura desafiadora mas controlada — cruzando os braços, olhando para o lado, em movimento natural; nada de pose de catálogo genérico.
Modelo: pessoa real com expressão confiante, diversidade brasileira, pele real com textura natural.
Tecido: algodão pesado ou moletom premium — captura de textura visível nas dobras e costuras.
Acabamento: nível editorial Vogue Brasil / Hypebeast — não é e-commerce, é editorial.
Paleta: tons frios ou neutros saturados (off-white, preto profundo, cinza cimento, terracota).
`.trim();

const FITNESS_BASE = `
Campanha fitness de alto desempenho — private label premium.
Ambiente: estúdio clean de luz controlada com fundo de gradient suave, ou exterior ao amanhecer (parque, pista de corrida).
Luz: key light softbox lateral ou aro de LED — sem sombras duras no rosto, destaque nos contornos do corpo.
Enquadramento: full body ou detalhe técnico do tecido (close em costuras, recortes, gráficos sublimados).
Pose: movimento real congelado — corrida, agachamento, barra, salto; ou posição atlética de repouso com tensão muscular visível.
Modelo: corpo atlético autêntico, suor natural discreto, expressão focada — não sorriso forçado.
Tecido: dry-fit ou compressionado — captura das estruturas de ventilação, recortes e elasticidade natural.
Acabamento: campanha de performance — Nike / Under Armour aesthetic, não academia genérica.
Paleta: cores de energia — coral, verde neon, preto técnico, branco puro; ou monocromático minimalista.
`.trim();

const ALFAIATARIA_BASE = `
Look de alfaiataria brasileira contemporânea — private label sofisticado.
Ambiente: ambiente neutro luxuoso — parede clara com textura de cimento premium, showroom clean, jardim com vegetação discreta.
Luz: luz natural difusa de janela alta, ou iluminação de museu — sem sombras duras, modelagem suave e clara.
Enquadramento: full body ou 3/4 clean — pessoa em destaque, fundo minimalista que não compete.
Pose: postura ereta e segura — mãos no bolso, braço relaxado ao lado, sentar com elegância; nada de pose teatral.
Modelo: pessoa com presença executiva — não precisa de expressão radiante, basta autoconfiança discreta.
Tecido: linho, viscose ou crepe premium — captura do caimento natural, não amassado; pregas e formas estruturais da peça.
Acabamento: campanha de marca de grife brasileira — Farm, Shoulder, Dudalina Premium; não catálogo de e-commerce.
Paleta: off-white, bege, azul marinho, cinza médio, vinho; sem estampas distrativas no background.
`.trim();

const GENERICO_BASE = `
Campanha de moda brasileira — private label premium.
Luz: luz natural ou softbox — sem flash direto que apague a textura do tecido.
Enquadramento: full body ou 3/4, pessoa em evidência, fundo limpo e não competitivo.
Pose: postura real e confiante — sem pose genérica de catálogo.
Modelo: pessoa real com pele autêntica — sem over-retoque digital.
Tecido: foco na textura e caimento real da peça.
Acabamento: nível editorial de campanha de marca — não foto de e-commerce.
`.trim();

// ── Biblioteca de cenas: Autoridade da Fábrica ────────────────────────────────
// 20 cenas distintas com rótulos únicos para anti-repetição.

export const FABRICA_SCENES: Array<{ label: string; scene: string }> = [
  {
    label: "corte_industrial",
    scene: `CENA: SETOR DE CORTE
Mesa de corte industrial de aço com camadas de tecido estendido, régua de alumínio e cortadeira elétrica em ação.
Luz fluorescente de teto com incidência de janela lateral — luz de trabalho real.
Trabalhador com giz de alfaiate marcando encaixe. Detalhes de moldes de papel sobrepostos.
Foco: textura das camadas de tecido, fibras visíveis, detalhe técnico preciso.`,
  },
  {
    label: "estamparia_sublimacao",
    scene: `CENA: ESTAMPARIA / SUBLIMAÇÃO
Prensa térmica de sublimação aberta com vapor visível, peça estampada na mesa.
Ambiente com amostras de cores penduradas na parede ao fundo — foco técnico profissional.
Cores vibrantes da estampa contrastando com o aço industrial da prensa.`,
  },
  {
    label: "serigrafia",
    scene: `CENA: SERIGRAFIA
Tela de serigrafia com tinta sendo passada com rodo — movimento congelado em close.
Mesa de silk, tinta colorida espalhando-se sobre malha branca.
Luz lateral de ateliê revelando textura da tela e da tinta fresca.`,
  },
  {
    label: "bordado_industrial",
    scene: `CENA: BORDADO INDUSTRIAL
Máquina de bordado industrial com bastidores múltiplos em operação — detalhe das agulhas em movimento.
Fios coloridos tensionados, bastidores circulares alinhados.
Iluminação de ateliê direcionada e quente, detalhe técnico dos pontos formando-se.`,
  },
  {
    label: "bordado_macro",
    scene: `CENA: CLOSE MACRO DE BORDADO
Close macro em bordado premium finalizado sobre tecido escuro.
Texturas de fio, pontos uniformes, brilho suave do fio metalizado ou de poliéster.
Fundo desfocado revelando o tecido base, bordado em foco total — nível joia.`,
  },
  {
    label: "costura_reta",
    scene: `CENA: COSTURA RETA INDUSTRIAL
Costureira em máquina reta industrial, tecido passando sob agulha — close nas mãos e tecido.
Linha de costura formando-se com precisão, tensão do tecido visível.
Ambiente organizado de linha de produção — luz fria de chão de fábrica premium.`,
  },
  {
    label: "overloque",
    scene: `CENA: MÁQUINA OVERLOQUE
Operação de overloque em tecido de malha, fios coloridos formando a borda.
Mãos guiando tecido com precisão, linhas do overloque em exposição lateral.
Detalhe da tensão dos múltiplos fios — 3 ou 5 fios simultâneos visíveis.`,
  },
  {
    label: "galoneira",
    scene: `CENA: GALONEIRA / BARRA
Máquina galoneira formando barra dupla em peça de malha.
Close no pé da máquina e na bainha se formando — detalhe preciso de acabamento.
Luz direcionada revelando estrutura dos pontos da galoneira.`,
  },
  {
    label: "modelagem_mesa",
    scene: `CENA: MESA DE MODELAGEM
Mesa de modelagem com moldes de papel kraft, réguas francesas curvas, alfinetes e tesoura de alfaiate.
Mãos do modelista ajustando encaixe de moldes sobre tecido cru.
Ambiente de ateliê técnico — prancheta inclinada, moldes numerados visíveis mas ilegíveis.`,
  },
  {
    label: "cad_modelagem",
    scene: `CENA: CAD DE MODELAGEM
Tela de monitor exibindo software CAD de modelagem (linhas de molde, curvas francesas digitais).
Mãos do modelista ao teclado ou com stylus em mesa digitalizadora.
Ambiente de ateliê técnico moderno — luz de tela azulada contrastando com luz quente do ambiente.`,
  },
  {
    label: "enfesto",
    scene: `CENA: ENFESTO DE TECIDO
Mesa de enfesto longa com camadas de tecido sendo estendidas mecanicamente.
Vista lateral mostrando as múltiplas camadas de tecido alinhadas perfeitamente.
Luz lateral revelando textura e espessura do bloco de tecido — detalhe de material.`,
  },
  {
    label: "risco_molde",
    scene: `CENA: RISCO E ENCAIXE
Molde sendo riscado com giz de alfaiate sobre camadas de tecido enfestado.
Encaixe técnico de peças para aproveitamento máximo — linhas de giz visíveis.
Mãos traçando contornos com segurança, moldes de papel posicionados no fundo.`,
  },
  {
    label: "separacao_tecido",
    scene: `CENA: SEPARAÇÃO DE TECIDO
Rolos de tecido premium sendo separados por tonalidade ou composição.
Estoque organizado de malhas — rolos coloridos em prateleiras industriais.
Close em textura do rolo aberto — fio, trama, caimento natural do tecido.`,
  },
  {
    label: "inspecao_qualidade",
    scene: `CENA: INSPEÇÃO DE QUALIDADE
Técnica inspecionando costura de peça finalizada contra luz de inspeção branca intensa.
Mãos abrindo costura lateral, olho treinado examinando ponto a ponto.
Fundo clean de sala de qualidade — iluminação branca uniforme, sem sombras.`,
  },
  {
    label: "embalagem_expedicao",
    scene: `CENA: EMBALAGEM E EXPEDIÇÃO
Arara com peças acabadas embaladas individualmente em saco plástico com cabide premium.
Peças dobradas com precisão sendo colocadas em caixa de expedição neutra.
Etiquetas de qualidade visíveis — sem texto legível, apenas forma e cor da etiqueta.`,
  },
  {
    label: "piloto_manequim",
    scene: `CENA: AJUSTE DE PILOTO / PROTÓTIPO
Costureiro ajustando peça piloto em manequim de alfaiate.
Alfinetes marcando correções, fita métrica pendurada no pescoço, expressão concentrada.
Ambiente de ateliê de desenvolvimento — luz quente, tecido cru no manequim.`,
  },
  {
    label: "reuniao_desenvolvimento",
    scene: `CENA: REUNIÃO DE DESENVOLVIMENTO
Mesa com amostras de tecido, fichas técnicas, cartelas de cores e aviamentos dispostos.
Mãos selecionando amostra de tecido, comparando tonalidades.
Vista de cima ou 3/4 — mesa de trabalho como superfície de criação, não sala de reunião.`,
  },
  {
    label: "materia_prima_rolo",
    scene: `CENA: MATÉRIA-PRIMA — ROLOS PREMIUM
Close artístico de rolos de tecido premium empilhados — variação de cores e texturas.
Tecidos nobres: tweed, malha canelada, brim premium, crepe — textura visível em detalhe.
Composição editorial de produto — luz lateral revelando superfície e trama.`,
  },
  {
    label: "dtg_impressao_digital",
    scene: `CENA: IMPRESSÃO DIGITAL DTG
Cabeçote de impressora DTG industrial imprimindo arte colorida diretamente em camiseta.
Gotículas de tinta, cores vibrantes formando a estampa — close técnico de precisão.
Luz de galpão industrial com destaque na área de impressão em movimento.`,
  },
  {
    label: "passadoria_acabamento",
    scene: `CENA: PASSADORIA E ACABAMENTO FINAL
Mesa de passadoria com ferro a vapor profissional, peça sendo finalizada.
Vapor visível sobre o tecido — napa, jeans ou social sendo destensionado.
Detalhe do brilho do tecido após passadoria — acabamento polido, peça final.`,
  },
];

// ── Auto-builder: monta prompt base a partir de slot + campanha ───────────────

// ── Biblioteca de hipóteses criativas ────────────────────────────────────────

export const HYPOTHESIS_LIBRARY = {
  angles: [
    "autoridade fabril",
    "prova de processo",
    "diferenciação premium",
    "escalabilidade",
    "bastidor real",
    "qualidade e acabamento",
    "segurança operacional",
    "desenvolvimento de coleção",
    "exclusividade de marca",
  ],
  pains: [
    "fornecedor inconsistente",
    "atraso de produção",
    "queda de qualidade",
    "dificuldade de escalar",
    "falta de estrutura",
    "coleção sem padronização",
  ],
  promises: [
    "operação preparada",
    "private label premium",
    "processo confiável",
    "estrutura para crescimento",
    "da ideia à coleção com consistência",
  ],
  hooks: [
    "confronto direto",
    "bastidor",
    "prova",
    "transformação",
    "argumento racional",
    "desejo de marca",
  ],
  intencoes: [
    "autoridade",
    "captação",
    "prova",
    "conversão",
    "reposicionamento",
  ],
  estagiosFunil: [
    "topo — awareness",
    "meio — consideração",
    "fundo — conversão",
  ],
  usageTypes: [
    "organic",
    "paid_social",
    "hybrid",
  ],
} as const;

/** Contexto de hipótese de um slot/criativo */
export interface SlotHypothesis {
  hypothesis_angle?: string | null;
  target_context?: string | null;
  pain_point?: string | null;
  promise?: string | null;
  creative_style?: string | null;
  hook_type?: string | null;
  cta_type?: string | null;
  usage_type?: string | null;
}

/**
 * Constrói o prompt visual base de um slot sem precisar de input manual do usuário.
 * Camada B na arquitetura: Campanha → Slot → Refino opcional.
 *
 * @param slotType      Formato do slot (feed / story / reel)
 * @param creativeAxis  Eixo criativo herdado do slot/campanha
 * @param campaign      Dados da campanha para contextualizar o visual
 * @param hypothesis    Hipótese criativa do slot (angle, pain, promise, hook, etc.)
 */
export function buildSlotPrompt(
  slotType: SlotType,
  creativeAxis: string | null,
  campaign?: {
    angulo?: string | null;
    oferta?: string | null;
    objective?: string | null;
    name?: string | null;
    nicho?: string | null;
    intencao_criativa?: string | null;
  } | null,
  hypothesis?: SlotHypothesis | null,
  archetype?: string | null,
): string {
  // Stories/reels: lifestyle por padrão (fábrica não funciona em 9:16 dinâmico)
  const axis = creativeAxis ?? (slotType === "story" || slotType === "reel" ? "lifestyle_nicho" : "autoridade_fabrica");

  const parts: string[] = [];

  // Contexto de hipótese — enriquece o prompt com intenção específica
  if (hypothesis?.hypothesis_angle) parts.push(`ângulo: ${hypothesis.hypothesis_angle}`);
  if (hypothesis?.target_context)   parts.push(`público: ${hypothesis.target_context}`);
  if (hypothesis?.pain_point)       parts.push(`dor: ${hypothesis.pain_point}`);
  if (hypothesis?.promise)          parts.push(`promessa: ${hypothesis.promise}`);
  if (hypothesis?.creative_style)   parts.push(`estilo: ${hypothesis.creative_style}`);
  if (hypothesis?.hook_type)        parts.push(`hook: ${hypothesis.hook_type}`);

  // Contexto de campanha
  if (campaign?.angulo) parts.push(campaign.angulo);
  if (campaign?.oferta)  parts.push(`coleção: ${campaign.oferta}`);
  if (campaign?.nicho)   parts.push(`nicho: ${campaign.nicho}`);
  if (campaign?.intencao_criativa) parts.push(`intenção: ${campaign.intencao_criativa}`);

  // Bloco de arquétipo — substitui instruções genéricas por direção criativa específica
  if (archetype) {
    // Import lazy para evitar ciclo — usamos string lookup direto
    const ARCHETYPE_PROMPTS: Record<string, Record<string, string>> = {
      authority: {
        // Fábrica real como protagonista — ambiente de produção é o herói, não modelo de moda
        feed:  "Brazilian premium garment factory interior as the visual hero. Wide editorial shot of an organized industrial sewing floor: rows of professional overlock and straight-stitch machines, fabric rolls stacked on steel shelves, cutting tables with spread textile, warm directed factory lighting from above. NO fashion model in foreground. The production environment itself communicates authority — machinery in sharp detail, fabric rolls in vivid colors (teal bolts, mustard rolls, rust fabric), cutting room visible in depth. The viewer immediately understands: this is a serious manufacturer, not a clothing brand. Strong editorial composition 4:5 vertical. Headline text space in upper third.",
        story: "Vertical 9:16. Brazilian premium confection factory as the sole subject — sewing machines in tight rows, industrial overlocks with thread spools, cutting tables and fabric rolls stacked floor to ceiling. NO person in center frame. Dramatic industrial side lighting casting strong shadows across machinery and fabric bolts. One fabric roll in vivid saturated color (deep teal, rust or cobalt) anchors the foreground. Center-third clear for headline overlay. The environment alone communicates: production facility with real scale and authority.",
        reel:  "Vertical 9:16 cinematic factory overview. Premium Brazilian confection floor — rows of industrial sewing machines, fabric rolls on shelves, cutting station with spread colorful textile. Dramatic raking light from factory windows. NO fashion model. The machinery, organized space and fabric bolts communicate manufacturing authority. Strong thumbnail composition with vivid fabric color anchoring the frame.",
      },
      process: {
        // Close de processo produtivo — mãos, máquina, tecido — sem modelo de moda em nenhuma hipótese
        feed:  "Extreme close-up macro editorial of skilled hands guiding vibrant colored fabric through an industrial sewing machine — needle piercing fabric in sharp detail, thread forming a precise seam. Fabric in saturated color: coral, cobalt blue, or olive green against industrial steel machine. Shallow depth of field blurring the rest of the factory behind. Warm focused worklight revealing weave and thread quality. Vertical 4:5 portrait. Absolutely no fashion model, no full-body shot, no styled outfit. Pure factory craft documentation — the hands and the machine are the only subjects.",
        story: "Vertical 9:16 dramatic macro. Close-up of hands actively cutting fabric layers on an industrial cutting table OR guiding textile through an overlock machine — vivid colored fabric in motion: teal, mustard, deep red. Steel cutting tool or machine foot in sharp focus. Industrial environment bokeh background with rows of machines out of focus. Strong raking sidelight revealing fabric weave and texture. No fashion model anywhere in frame. Pure production process.",
        reel:  "Vertical 9:16 cinematic process shot. Fabric in vivid saturated color (striped or solid — cobalt, coral, forest green) moving through industrial sewing machine or under cutting blade. Close camera on the action: needle, thread, fabric weave in motion. Dynamic motion blur on the textile suggesting active production pace. Premium Brazilian factory aesthetic. No model, no person beyond hands directly operating machinery.",
      },
      product: {
        // Editorial de moda com foco na peça — lifestyle real, mas a qualidade da peça é o herói
        feed:  "Premium fashion editorial with garment as hero. Model wearing a complete polished look in a vibrant non-black color — cobalt blue, forest green, burnt orange, deep red or camel — photographed in a clean architectural environment (showroom, concrete wall, natural daylight from high windows). Focus on garment drape, fabric quality and construction detail. Vertical 4:5 portrait. Editorial quality: Vogue Brasil level, not e-commerce catalog.",
        story: "Vertical 9:16 product-hero editorial. Full body or 3/4 shot of model in complete garment — vivid saturated color, visible fabric texture and premium construction. Clean background, soft directional light. The garment speaks for itself.",
        reel:  "Vertical 9:16 fashion editorial. Model in motion wearing colorful complete look — movement revealing garment quality, fabric drape and construction. Premium aesthetic, editorial lighting.",
      },
      behind_scenes: {
        // Bastidores humanizados — equipe real, ambiente de trabalho, calor humano da fábrica
        feed:  "Authentic behind-the-scenes editorial in a Brazilian fashion atelier. A team member — tailor, seamstress or pattern maker — in a genuine working moment: measuring a garment, reviewing fabric swatches in warm natural light, or organizing colorful fabric rolls. Authentic workspace visible: sewing machines, mannequins, fabric shelves with colorful textiles (teal, mustard, rust). Warm natural light from windows. Real human moment, not staged. Vertical 4:5 portrait.",
        story: "Vertical 9:16 authentic atelier scene. Fashion professional at work — reviewing patterns, selecting fabrics, adjusting garment on mannequin. Warm workspace environment with colorful textiles visible. Real, not posed.",
        reel:  "Vertical 9:16 humanized behind-the-scenes. Team in motion in atelier — genuine work happening, colorful fabrics and production materials surrounding. Warm authentic light.",
      },
      conversion_cta: {
        // Editorial de conversão — modelo convidativo, espaço para texto, cor forte
        feed:  "Premium fashion advertisement editorial optimized for conversion. Model wearing complete look in a bold, memorable color — electric blue, vibrant red, deep emerald or warm terracotta — in confident inviting pose with open body language. Clean architectural background with visual space in upper third for CTA text. Commercial quality, high contrast, aspirational. The viewer wants to contact this brand. Vertical 4:5 portrait.",
        story: "Vertical 9:16 advertisement composition. Fashion model in vivid colored outfit, confident inviting expression, clean background with generous text space. Strong visual hierarchy designed for CTA overlay. Premium commercial quality.",
        reel:  "Vertical 9:16 high-energy commercial thumbnail. Model in bold color (non-black) in strong pose, clear visual hierarchy, premium aesthetic optimized for viewer action.",
      },
      social_proof: {
        // Resultado entregue — coleção finalizada, qualidade visível, orgulho de entrega
        feed:  "Premium fashion editorial celebrating a delivered collection. Model wearing a complete finished look — crisp tailoring or premium streetwear in a confident color (camel, cobalt, sage green) — in a showroom or clean premium environment suggesting delivery and quality. The garment is finished, polished, real. Quality details visible: clean stitching, perfect drape, premium fabric. Celebratory but sophisticated. Vertical 4:5 portrait.",
        story: "Vertical 9:16 result editorial. Complete polished collection or finished garment on model — visible quality, premium construction, confident delivery atmosphere. Colorful, celebratory, professional.",
        reel:  "Vertical 9:16 delivered result showcase. Complete garment or collection in quality-focused composition — fabric detail, premium finish, editorial color. Sense of successful delivery.",
      },
      brand_positioning: {
        // Manifesto de marca — showroom, identidade, premium B2B
        feed:  "Premium institutional fashion editorial. Minimalist private label showroom — curated garments in complementary colors hanging on industrial rails, premium fabric rolls on display, clean architectural surfaces. Rich ambient light from above. No model. The space itself communicates: sophisticated Brazilian manufacturing brand. Identity, exclusivity, craft. Palette: neutrals with one strong color accent (deep teal, rust or mustard). Vertical 4:5 portrait.",
        story: "Vertical 9:16 brand identity. Premium showroom or atelier space, carefully curated garments in color, aspirational B2B premium aesthetic. The brand's visual language is clear and distinctive.",
        reel:  "Vertical 9:16 brand positioning. Premium fashion manufacturing environment, clean strong composition, brand identity moment. Rich color palette: not black-on-black.",
      },
      launch_teaser: {
        // Lançamento com cor e energia — revela algo novo, urgência controlada
        feed:  "Premium fashion launch editorial with dramatic reveal energy. New garment in bold, saturated color — vivid emerald, deep coral, electric cobalt or golden mustard — emerging from dramatic lighting contrast. Model unveiling new look or product isolated on striking background. Sense of exclusive premiere, anticipation, premium newness. Vertical 4:5 portrait. Strong visual contrast: the color pops.",
        story: "Vertical 9:16 dramatic launch reveal. New garment or collection in striking color spotlight — vivid, bold, memorable palette. Sense of premiere and exclusive availability. Strong visual contrast.",
        reel:  "Vertical 9:16 launch energy. Fashion reveal with vivid color and dramatic lighting — new product in bold palette, sense of premiere, strong composition.",
      },
    };
    const archetypeBlock = ARCHETYPE_PROMPTS[archetype]?.[slotType] ?? ARCHETYPE_PROMPTS[archetype]?.["feed"];
    if (archetypeBlock) {
      parts.push(`ARQUÉTIPO CRIATIVO: ${archetypeBlock}`);
    }
  } else {
    // Fallback: instruções genéricas originais
    const formatInstruction: Record<SlotType, string> = {
      feed:  "composição retrato clean para feed, produto em destaque, luz natural editorial",
      story: "composição vertical dinâmica para stories, movimento visual de baixo para cima",
      reel:  "frame cinematográfico de alta energia para reels, close expressivo ou movimento congelado",
    };
    const axisInstruction =
      axis === "autoridade_fabrica"
        ? "processo produtivo premium, técnica de confecção, qualidade visual do ateliê"
        : "lifestyle de moda, modelo usando a peça, ambiente premium coerente com a marca";
    parts.push(formatInstruction[slotType] ?? formatInstruction.feed);
    parts.push(axisInstruction);
  }

  parts.push("private label premium R2PB");

  return parts.join(". ");
}

// ── Anti-repetição: selecionar cena evitando as recentes ────────────────────

/**
 * Escolhe uma cena da biblioteca de autoridade_fabrica evitando
 * repetir as `recentLabels` passadas (últimas 3–5 da campanha).
 * Se todas já foram usadas recentemente, rotaciona a mais antiga.
 */
export function pickFabricaScene(recentLabels: string[] = []): { label: string; scene: string } {
  const recentSet = new Set(recentLabels.slice(-4)); // evitar últimas 4
  const available = FABRICA_SCENES.filter(s => !recentSet.has(s.label));
  const pool = available.length > 0 ? available : FABRICA_SCENES;
  // escolha determinística baseada em hash simples do timestamp para evitar sempre o mesmo
  const idx = (Date.now() % pool.length + pool.length) % pool.length;
  return pool[idx];
}

const BASE_BY_TYPE: Record<CreativeType, string> = {
  streetwear:         STREETWEAR_BASE,
  fitness:            FITNESS_BASE,
  alfaiataria:        ALFAIATARIA_BASE,
  generico:           GENERICO_BASE,
  autoridade_fabrica: "", // preenchido dinamicamente com pickFabricaScene
};

// ── Negativos OBRIGATÓRIOS — instrução máxima anti-texto ──────────────────────

const NEGATIVES = `
PROIBIDO ABSOLUTAMENTE — ZERO TOLERÂNCIA:
- QUALQUER texto na imagem: letras, palavras, números, siglas, marcas, logotipos, URLs, hashtags, slogans gravados ou impressos na cena
- Texto em placa, mural, máquina, parede, piso, embalagem ou qualquer superfície visível
- Marcas de roupa visíveis (sem etiqueta legível, sem patch com texto, sem estampa com palavra)
- Texto gerado pela IA como decoração da cena — proibido mesmo se parecer parte do ambiente
- Rosto simétrico demais, olhos brilhantes irreais, pele plástica de IA
- Proporções corporais estranhas: dedos extras, mãos deformadas, articulações erradas
- Tecido artificial com brilho sintético ou textura de plástico
- Cenário genérico de estúdio branco sem contexto
- Estética amadora: iluminação de celular, sombras de câmera de segurança, contraste excessivo
- Post-processing HDR irreal, saturação de redes sociais, filtro Instagram visível

INSTRUÇÃO FINAL: A imagem deve ser COMPLETAMENTE LIMPA DE TEXTO — se aparecer qualquer caractere legível, a geração falhou.
`.trim();

// ── Função principal ──────────────────────────────────────────────────────────

/**
 * Detecta se o contexto menciona fábrica/produção para sugerir creative type.
 */
export function detectCreativeTypeFromContext(
  context: string,
  explicit?: CreativeType | null,
): CreativeType {
  if (explicit && explicit !== "generico") return explicit;
  const lower = context.toLowerCase();
  const factoryKeywords = [
    "fábrica", "fabrica", "corte", "costura", "bordado", "estamparia",
    "modelagem", "cad", "produção", "produtiva", "confecção", "confeccao",
    "autoridade", "estrutura produtiva", "acabamento", "ateliê", "atelier",
    "setor", "linha de produção", "maquinário",
  ];
  if (factoryKeywords.some(kw => lower.includes(kw))) return "autoridade_fabrica";
  if (lower.includes("fitness") || lower.includes("academia") || lower.includes("esporte")) return "fitness";
  if (lower.includes("alfaiataria") || lower.includes("social") || lower.includes("executivo")) return "alfaiataria";
  if (lower.includes("streetwear") || lower.includes("street") || lower.includes("urbano")) return "streetwear";
  return explicit ?? "generico";
}

export function enrichR2PBPrompt(input: R2PBEnrichmentInput): R2PBEnrichmentResult {
  const contextForDetection = [input.imagePrompt, input.contextNote ?? ""].join(" ");
  const creativeType: CreativeType = detectCreativeTypeFromContext(contextForDetection, input.creativeType);

  // Selecionar cena (com anti-repetição para autoridade_fabrica)
  let sceneLabel: string | null = null;
  let base: string;
  if (creativeType === "autoridade_fabrica") {
    const chosen = pickFabricaScene(input.recentSceneLabels ?? []);
    sceneLabel = chosen.label;
    base = `
Fotografia documental industrial premium — interior de confecção brasileira de alta qualidade.

${chosen.scene}

PARÂMETROS GERAIS:
Qualidade fotográfica: editorial documental — referência SENAI catálogo técnico / Léa Leonardi industrial.
Sem pessoas posando: mãos e movimentos técnicos reais, não performance.
Cores: tons quentes industriais — cru do tecido, metal de máquina, luz de néon branca, madeira de mesa.
Não é lifestyle, não é fashion editorial — é autoridade técnica.
`.trim();
  } else {
    base = BASE_BY_TYPE[creativeType];
  }

  const directionApplied: string[] = [
    `linha_visual:${creativeType}`,
    "luz_editorial",
    "pose_autentica",
    "textura_real",
    "negativos_r2pb_strict",
  ];
  if (sceneLabel) directionApplied.push(`cena:${sceneLabel}`);
  if (input.slotType) directionApplied.push(`slot_type:${input.slotType}`);
  if (input.archetype) directionApplied.push(`arquetipo:${input.archetype}`);

  const parts: string[] = [];

  // 1. Prompt original
  parts.push(`CONCEITO VISUAL:\n${input.imagePrompt.trim()}`);

  // 2. Contexto extra
  if (input.contextNote?.trim()) {
    parts.push(`CONTEXTO DA CAMPANHA:\n${input.contextNote.trim()}`);
    directionApplied.push("contexto_campanha");
  }

  // 3. Direção de formato do slot (feed / story / reel)
  if (input.slotType && SLOT_FRAMING[input.slotType]) {
    parts.push(SLOT_FRAMING[input.slotType]);
  }

  // 4. Direção visual da linha R2PB
  parts.push(`DIREÇÃO VISUAL — ${creativeType.toUpperCase()}:\n${base}`);

  // 5. Arquétipo criativo — direção de arte específica por função do slot
  if (input.archetype) {
    const ARCHETYPE_META: Record<string, { goal: string; textRule: string; sceneDirection: string }> = {
      authority:         { goal: "Construir autoridade industrial e percepção de estrutura premium", textRule: "HEADLINE OBRIGATÓRIA — promessa de autoridade. Máximo 6 palavras. Ex: 'Estrutura que sua marca precisa.'", sceneDirection: "Ambiente de fábrica ou showroom premium. Profissional em posição de domínio técnico." },
      process:           { goal: "Mostrar processo produtivo como diferencial de qualidade", textRule: "HEADLINE DE BASTIDOR — revela o que acontece nos bastidores. Ex: 'Do molde ao acabamento real.'", sceneDirection: "Close de processo técnico: costura, corte, bordado ou detalhe de tecido premium." },
      product:           { goal: "Destacar o produto como objeto de desejo e qualidade", textRule: "HEADLINE DE PRODUTO — benefício concreto. Ex: 'Acabamento que representa sua marca.'", sceneDirection: "Produto em destaque: flat lay premium ou modelo com foco na peça." },
      behind_scenes:     { goal: "Humanizar a marca com bastidores autênticos", textRule: "HEADLINE HUMANIZADORA — revela equipe ou ambiente. Ex: 'Aqui começa sua coleção.'", sceneDirection: "Ateliê real com equipe em momento autêntico — não posado." },
      conversion_cta:    { goal: "Gerar ação imediata — contato ou orçamento", textRule: "HEADLINE DE CONVERSÃO — ação direta. Ex: 'Comece sua coleção agora.'", sceneDirection: "Modelo em pose de convite ou produto com espaço visual para CTA claro." },
      social_proof:      { goal: "Gerar credibilidade com evidência de resultado", textRule: "HEADLINE DE PROVA — dado ou resultado. Ex: 'Mais de 50 marcas atendidas.'", sceneDirection: "Resultado concreto: look finalizado, acabamento de qualidade, entrega." },
      brand_positioning: { goal: "Fortalecer posicionamento premium de marca B2B", textRule: "HEADLINE DE MANIFESTO — posicionamento. Ex: 'Private label que respeita sua marca.'", sceneDirection: "Ambiente institucional clean. Composição premium sem poluição visual." },
      launch_teaser:     { goal: "Criar antecipação e urgência em torno de lançamento", textRule: "HEADLINE DE LANÇAMENTO — novidade ou urgência. Ex: 'Nova coleção disponível agora.'", sceneDirection: "Produto em revelação dramática. Sensação de estreia exclusiva." },
    };
    const meta = ARCHETYPE_META[input.archetype];
    if (meta) {
      parts.push(
        `ARQUÉTIPO CRIATIVO — ${input.archetype.toUpperCase()}:\n` +
        `Objetivo: ${meta.goal}\n` +
        `Regra de texto: ${meta.textRule}\n` +
        `Direção de cena: ${meta.sceneDirection}`
      );
    }
  }

  // 6. Negativos obrigatórios
  parts.push(NEGATIVES);

  const enrichedPrompt = parts.join("\n\n---\n\n");

  return {
    enrichedPrompt,
    originalPrompt: input.imagePrompt,
    creativeType,
    creativeAxis: resolveCreativeAxis(creativeType),
    segment: resolveSegment(creativeType),
    directionApplied,
    sceneLabel,
  };
}
