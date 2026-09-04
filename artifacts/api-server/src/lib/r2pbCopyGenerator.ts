/**
 * r2pbCopyGenerator.ts — Geração de copy editorial para criativos R2PB
 *
 * Chamado após geração de imagem para produzir headline, caption e CTA
 * usando GPT-4.1-mini via AI Integrations.
 */

import { logger } from "./logger";

export interface R2PBCopyInput {
  creativeType: string;
  creativeAxis: string;
  segment: string;
  contextNote?: string | null;
  title?: string | null;
  imagePrompt: string;
  tenantId: string;
  /**
   * Arquétipo criativo do slot — governa instrução de headline e copy.
   * Ex: "authority", "process", "conversion_cta", etc.
   */
  creativeArchetype?: string | null;
  /** Configurações do Prompt Studio — Texto na Imagem */
  imageHeadlinePrimary?: string | null;
  imageHeadlineVariations?: string | null;
  imageTextStyleInstruction?: string | null;
  feedTextOverlayInstruction?: string | null;
  storyTextOverlayInstruction?: string | null;
  reelTextOverlayInstruction?: string | null;
  /** Configurações do Prompt Studio — Chamada do Post / Legenda */
  postCaptionCtaPrimary?: string | null;
  postCaptionCtaVariations?: string | null;
  postCaptionTone?: string | null;
  postCaptionStructure?: string | null;
  postCaptionInstructionMaster?: string | null;
  /** Tipo de slot para selecionar instrução de overlay correta */
  slotType?: "feed" | "story" | "reel" | null;
  /** Modificador de legenda por formato */
  feedCaptionModifier?: string | null;
  storyCaptionModifier?: string | null;
  reelCaptionModifier?: string | null;
}

export interface R2PBCopyResult {
  headline: string;
  caption: string;
  cta: string;
}

function isConfigured(): boolean {
  return (
    Boolean(process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]) &&
    Boolean(process.env["AI_INTEGRATIONS_OPENAI_API_KEY"])
  );
}

const SYSTEM_PROMPT = `Você é redator sênior de marketing para a R2PB, fábrica de private label premium brasileira que vende para marcas B2B (donos de marca, não consumidor final).

REGRAS DE HEADLINE — OBRIGATÓRIAS:
- Máximo 6 palavras. Impactante. Sem hashtag, sem emoji.
- PROIBIDO slogans vazios: "qualidade que transforma", "excelência em cada detalhe", "sua marca em boas mãos", "feito com amor". São genéricos e serão descartados.
- Cada headline deve entregar UMA das seguintes abordagens:
  A) Promessa concreta: o que a marca ganha objetivamente ("Produção pronta para sua próxima coleção")
  B) Autoridade de processo: o que a R2PB faz de diferente ("Do molde ao acabamento, sem improvisos")
  C) Dor do cliente: o problema que a R2PB resolve ("Chega de fornecedor que atrasa entrega")
  D) Prova implícita: dados, escala ou experiência ("Estrutura para quem precisa crescer")
  E) CTA consultivo: convite direto e premium ("Sua coleção começa aqui")
- Varie o tipo de headline a cada geração — não repita o mesmo padrão.

EXEMPLOS DE HEADLINES APROVADAS (use como referência de tom):
- "Sua marca precisa de produção. Não improviso."
- "Do molde ao acabamento: sem terceiros."
- "Private label exige processo, não só costura."
- "Fábrica que respeita o prazo da sua coleção."
- "Estrutura de confecção para marcas sérias."
- "Sua coleção começa muito antes da máquina."
- "Escale com quem entende de produção real."
- "Acabamento premium. Entrega no prazo."

CAPTION: 2-3 frases autorais alinhadas ao eixo + quebra de linha + 5 hashtags B2B moda brasileira.
CTA: máximo 4 palavras, ação clara e consultiva.
Tom: confiante, premium, direto — sem clichê de agência.
NÃO mencione IA, automação ou tecnologia.
Responda SOMENTE JSON válido, sem markdown: {"headline":"...","caption":"...","cta":"..."}
`;

export async function generateR2PBCopy(input: R2PBCopyInput): Promise<R2PBCopyResult> {
  if (!isConfigured()) {
    throw new Error("AI_INTEGRATIONS_OPENAI não configurado para copy generation");
  }

  const baseUrl = process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"]!.replace(/\/$/, "");
  const apiKey  = process.env["AI_INTEGRATIONS_OPENAI_API_KEY"]!;

  const axisLabel = input.creativeAxis === "autoridade_fabrica"
    ? "Autoridade da Fábrica (processo produtivo, bastidores técnicos, qualidade)"
    : "Lifestyle Nicho (resultado aspiracional, estilo de vida, identidade do segmento)";

  // Montar instruções extras do Prompt Studio — Texto na Imagem
  const overlayInstructions: string[] = [];
  if (input.imageHeadlinePrimary?.trim()) {
    overlayInstructions.push(`HEADLINE PADRÃO DO TENANT: "${input.imageHeadlinePrimary.trim()}"`);
  }
  if (input.imageHeadlineVariations?.trim()) {
    overlayInstructions.push(`VARIAÇÕES DE HEADLINE APROVADAS (prefira variar dentro delas):\n${input.imageHeadlineVariations.trim()}`);
  }
  if (input.imageTextStyleInstruction?.trim()) {
    overlayInstructions.push(`ESTILO DO TEXTO NA ARTE: ${input.imageTextStyleInstruction.trim()}`);
  }
  const slotOverlay = input.slotType === "feed" ? input.feedTextOverlayInstruction
    : input.slotType === "story" ? input.storyTextOverlayInstruction
    : input.slotType === "reel"  ? input.reelTextOverlayInstruction
    : null;
  if (slotOverlay?.trim()) {
    overlayInstructions.push(`INSTRUÇÃO DE OVERLAY PARA ${(input.slotType ?? "").toUpperCase()}: ${slotOverlay.trim()}`);
  }

  // Montar instruções extras do Prompt Studio — Chamada do Post / Legenda
  const captionInstructions: string[] = [];
  if (input.postCaptionInstructionMaster?.trim()) {
    captionInstructions.push(`INSTRUÇÃO MESTRE DE LEGENDA: ${input.postCaptionInstructionMaster.trim()}`);
  }
  if (input.postCaptionCtaPrimary?.trim()) {
    captionInstructions.push(`CTA PRINCIPAL: "${input.postCaptionCtaPrimary.trim()}"`);
  }
  if (input.postCaptionCtaVariations?.trim()) {
    captionInstructions.push(`VARIAÇÕES DE CTA APROVADAS:\n${input.postCaptionCtaVariations.trim()}`);
  }
  if (input.postCaptionTone?.trim()) {
    captionInstructions.push(`TOM DE VOZ DA LEGENDA: ${input.postCaptionTone.trim()}`);
  }
  if (input.postCaptionStructure?.trim()) {
    captionInstructions.push(`ESTRUTURA DA LEGENDA: ${input.postCaptionStructure.trim()}`);
  }

  // Instruções de arquétipo criativo — governa headline e copy por função do slot
  const archetypeInstructions: string[] = [];
  if (input.creativeArchetype) {
    const ARCHETYPE_COPY_RULES: Record<string, { headline: string; caption: string }> = {
      authority:         { headline: "Headline de AUTORIDADE INDUSTRIAL — comunica estrutura, processo ou escala. Ex: 'Do molde ao acabamento, sem terceiros.' / 'Estrutura que sua marca precisa.'", caption: "Caption que reforça autoridade técnica. Cite processo, estrutura ou capacidade produtiva. CTA consultivo." },
      process:           { headline: "Headline de PROCESSO ou BASTIDOR — revela o que acontece nos bastidores. Ex: 'Cada costura tem razão de ser.' / 'Corte preciso. Acabamento real.'", caption: "Caption que explica um diferencial do processo produtivo. Educativa mas comercial. CTA para conhecer mais." },
      product:           { headline: "Headline de PRODUTO — benefício concreto da peça. Ex: 'Tecido que entrega o que promete.' / 'Peça que representa sua marca.'", caption: "Caption sobre qualidade, material ou diferencial da peça. Comercial e específica. CTA para amostra ou orçamento." },
      behind_scenes:     { headline: "Headline HUMANIZADORA — revela equipe ou ambiente. Ex: 'Aqui começa sua coleção.' / 'Nossa equipe, seu resultado.'", caption: "Caption que conta aspecto humano da produção: equipe, processo, cuidado. Tom próximo e autêntico." },
      conversion_cta:    { headline: "Headline de CONVERSÃO DIRETA — ação imediata. Ex: 'Sua próxima coleção começa aqui.' / 'Produza com quem entende de marca.'", caption: "Caption de conversão: problema → solução → CTA claro. Máximo 3 frases + hashtags. Finalizar com contato." },
      social_proof:      { headline: "Headline de PROVA ou RESULTADO concreto. Ex: 'Resultado que fala por si.' / 'Coleção entregue. Prazo cumprido.'", caption: "Caption com evidência de resultado: coleção entregue, parceria consolidada, qualidade visível." },
      brand_positioning: { headline: "Headline de MANIFESTO ou POSICIONAMENTO. Ex: 'Fazemos marcas, não só roupas.' / 'Estrutura para quem leva moda a sério.'", caption: "Caption de posicionamento: quem são, o que defendem, qual o diferencial. Tom de manifesto premium." },
      launch_teaser:     { headline: "Headline de LANÇAMENTO ou URGÊNCIA. Ex: 'Chegou: produção para sua nova coleção.' / 'Disponível agora.'", caption: "Caption de lançamento: o que é novo, por que importa, como acessar. Tom de revelação e urgência controlada." },
    };
    const rule = ARCHETYPE_COPY_RULES[input.creativeArchetype];
    if (rule) {
      archetypeInstructions.push(`FUNÇÃO CRIATIVA DO SLOT: ${input.creativeArchetype.toUpperCase()}\n${rule.headline}\n${rule.caption}`);
    }
  }

  // Adicionar modificador de legenda por formato às instruções de caption
  const captionModifier = input.slotType === "feed" ? input.feedCaptionModifier
    : input.slotType === "story" ? input.storyCaptionModifier
    : input.slotType === "reel"  ? input.reelCaptionModifier
    : null;
  if (captionModifier?.trim()) {
    captionInstructions.push(`DIREÇÃO ESPECÍFICA PARA ${(input.slotType ?? "").toUpperCase()}: ${captionModifier.trim()}`);
  }

  // Construir sistema personalizado se há instruções de arquétipo ou Prompt Studio
  let systemPrompt = SYSTEM_PROMPT;
  if (archetypeInstructions.length || overlayInstructions.length || captionInstructions.length) {
    const customBlocks: string[] = [];
    // Arquétipo primeiro — governa a função criativa do slot
    if (archetypeInstructions.length) {
      customBlocks.push(`\n\n=== DIREÇÃO DE ARTE POR ARQUÉTIPO ===\n${archetypeInstructions.join("\n")}\nEssa instrução define a FUNÇÃO CRIATIVA do slot. Priorize-a ao gerar headline e caption.`);
    }
    if (overlayInstructions.length) {
      customBlocks.push(`\n\n=== CONFIGURAÇÃO DE TEXTO NA IMAGEM (Prompt Studio do Tenant) ===\n${overlayInstructions.join("\n")}\nUse o "headline" da resposta JSON seguindo essas diretrizes de texto na arte.`);
    }
    if (captionInstructions.length) {
      customBlocks.push(`\n\n=== CONFIGURAÇÃO DE LEGENDA / CHAMADA DO POST (Prompt Studio do Tenant) ===\n${captionInstructions.join("\n")}\nUse o "caption" e "cta" da resposta JSON seguindo essas diretrizes.`);
    }
    systemPrompt = SYSTEM_PROMPT + customBlocks.join("");
  }

  const userPrompt = [
    `Eixo criativo: ${axisLabel}`,
    `Linha visual: ${input.creativeType}`,
    `Segmento: ${input.segment}`,
    input.title       ? `Campanha: ${input.title}` : null,
    input.contextNote ? `Contexto: ${input.contextNote}` : null,
    `Conceito visual: ${input.imagePrompt.slice(0, 300)}`,
  ].filter(Boolean).join("\n");

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model:    "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Copy generation HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const json = await res.json() as { choices?: { message?: { content?: string } }[] };
  const raw  = json.choices?.[0]?.message?.content ?? "{}";

  try {
    // Strip possible markdown code fences
    const clean   = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed  = JSON.parse(clean) as Partial<R2PBCopyResult>;
    const result: R2PBCopyResult = {
      headline: String(parsed.headline ?? "").trim(),
      caption:  String(parsed.caption  ?? "").trim(),
      cta:      String(parsed.cta      ?? "").trim(),
    };
    logger.info({ tenantId: input.tenantId, headline: result.headline }, "r2pbCopyGenerator: copy gerada");
    return result;
  } catch {
    throw new Error(`Copy generation: JSON inválido — ${raw.slice(0, 200)}`);
  }
}
