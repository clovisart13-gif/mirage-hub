import { Router } from "express";
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db, pool, contentPackItems, campaignAssets, growthAssets, growthProviderRuns } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { objectStorageClient } from "../../lib/objectStorage";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import {
  applyTenantBranding,
  isTenantBrandingRegistered,
  buildMirageItemPrompt,
  getTenantFallbackPrompt,
  MIRAGE_NEGATIVE_PROMPT,
} from "../../lib/imageBranding";
import { z } from "zod";
import { randomUUID } from "crypto";
import { logger } from "../../lib/logger";

const router = Router();

function requireInternalKey(req: Request, res: Response, next: () => void) {
  const key = process.env["MARKETING_INTERNAL_API_KEY"];
  if (!key) {
    res.status(503).json({ error: "Internal API key not configured on server" });
    return;
  }
  const provided = req.headers["x-internal-key"];
  if (!provided || provided !== key) {
    res.status(401).json({ error: "Unauthorized — invalid x-internal-key" });
    return;
  }
  next();
}

const batchSchema = z.object({
  company_slug: z.string().min(1),
  branding_variant: z.enum(["auto", "color", "white", "black"]).optional().default("auto"),
  content_item_ids: z.array(z.string().uuid()).min(1).max(50),
});

router.post(
  "/internal/marketing/assets/generate-batch",
  requireInternalKey,
  async (req: Request, res: Response) => {
    const parsed = batchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
      return;
    }

    const { company_slug: companySlug, branding_variant, content_item_ids } = parsed.data;

    if (!isTenantBrandingRegistered(companySlug)) {
      res.status(422).json({
        error: `Tenant "${companySlug}" não possui branding configurado. Registre o brand antes de gerar imagens.`,
      });
      return;
    }

    const privateDir = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx = clean.indexOf("/");
    const bucketName = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";

    const results: Array<{
      content_item_id: string;
      ok: boolean;
      storage_path?: string;
      asset_id?: string;
      error?: string;
    }> = [];

    for (const itemId of content_item_ids) {
      try {
        const [item] = await db
          .select()
          .from(contentPackItems)
          .where(eq(contentPackItems.id, itemId))
          .limit(1);

        if (!item) {
          results.push({ content_item_id: itemId, ok: false, error: "Item não encontrado" });
          continue;
        }

        if (item.companySlug !== companySlug) {
          results.push({ content_item_id: itemId, ok: false, error: "company_slug não corresponde ao item" });
          continue;
        }

        let prompt: string;
        let negativePrompt: string | undefined;
        let headline: string | undefined;

        if (item.imagePrompt) {
          prompt = item.imagePrompt;
        } else if (companySlug === "mirage") {
          prompt = buildMirageItemPrompt({
            title: item.title,
            hook: item.hook,
            funnelStage: item.funnelStage,
          });
          negativePrompt = MIRAGE_NEGATIVE_PROMPT;
        } else {
          const fallbackBase = getTenantFallbackPrompt(companySlug);
          const parts: string[] = [fallbackBase];
          if (item.title) parts.push(`Visual theme: ${item.title}`);
          if (item.hook) parts.push(`Concept: ${item.hook}`);
          if (item.funnelStage) parts.push(`Funnel stage: ${item.funnelStage}`);
          parts.push("NO text, NO typography. Square 1:1 format.");
          prompt = parts.join(". ");
        }

        if (item.title?.trim()) {
          headline = item.title.trim();
        }

        logger.info(
          {
            companySlug,
            itemId,
            hasImagePrompt: !!item.imagePrompt,
            funnelStage: item.funnelStage,
            headline,
            promptPreview: prompt.slice(0, 200),
          },
          "internal/generate-batch: prompt resolved"
        );

        const rawBuffer = await generateImageBuffer(prompt, "1024x1024", negativePrompt);
        const imageBuffer = await applyTenantBranding(rawBuffer, companySlug, 1024, branding_variant, headline);

        const uid = randomUUID();
        const assetPath = `campaign-assets/${companySlug}/${item.campaignId}/${uid}.png`;
        const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;

        const bucket = objectStorageClient.bucket(bucketName);
        await bucket.file(objectName).save(imageBuffer, { contentType: "image/png", resumable: false });

        const storagePath = `/objects/${assetPath}`;

        const [inserted] = await db
          .insert(campaignAssets)
          .values({
            companySlug,
            campaignId: item.campaignId,
            contentItemId: itemId,
            assetType: "image",
            storagePath,
            promptUsed: prompt,
            status: "ready",
          })
          .returning();

        logger.info({ companySlug, itemId, storagePath }, "internal/generate-batch: asset salvo");

        results.push({ content_item_id: itemId, ok: true, storage_path: storagePath, asset_id: inserted.id });
      } catch (err: any) {
        logger.error({ companySlug, itemId, err: err.message }, "internal/generate-batch: erro no item");
        results.push({ content_item_id: itemId, ok: false, error: err.message });
      }
    }

    const succeeded = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    res.json({ ok: failed === 0, succeeded, failed, results });
  }
);

// ── POST /internal/marketing/campaigns/:id/generate ──────────────────────────
// Gera criativos para uma campanha EXISTENTE (retroativo ou sob demanda).
// ATHOS pode usar: {"action":"call_hub_api","args":{"method":"POST","path":"/api/internal/marketing/campaigns/ID/generate","body":{}}}
router.post("/internal/marketing/campaigns/:id/generate", requireInternalKey, async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query<{ id: string; tenant_id: string; name: string; objective: string | null; channel: string | null; angulo: string | null; oferta: string | null; observacoes: string | null }>(
      `SELECT id, tenant_id, name, objective, channel, angulo, oferta, observacoes FROM growth_campaigns WHERE id = $1`,
      [id]
    );
    if (!rows.length) { res.status(404).json({ error: "Campanha não encontrada" }); return; }
    const camp = rows[0];

    const { enrichR2PBPrompt } = await import("../../lib/r2pbPromptEnricher");
    const { generateBananaImage } = await import("../../lib/bananaProvider");

    const briefGenCompletion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{
        role: "system",
        content: `Você é diretor criativo da R2PB, private label premium para moda brasileira.
Gere 2 briefs visuais distintos para a campanha.
Retorne SOMENTE JSON: { "briefs": [ { "title": "string — id interno", "image_prompt": "string — cena fotográfica em inglês, SEM mencionar marca/texto/logo", "creative_type": "streetwear"|"fitness"|"alfaiataria"|"generico"|"autoridade_fabrica", "aspect_ratio": "1:1"|"4:5"|"9:16", "context_note": "string", "caption": "string — legenda do post em português BR, 3-4 frases + 5 hashtags, sem emoji, foco em dor/solução", "headline": "string — até 5 palavras em português para o card" } ] }
REGRA: se a campanha mencionar fábrica, corte, costura, bordado, estamparia, modelagem, CAD ou autoridade → pelo menos 1 brief usa creative_type="autoridade_fabrica" descrevendo chão de fábrica ou ateliê técnico.`,
      }, {
        role: "user",
        content: `CAMPANHA: ${camp.name}\nOBJETIVO: ${camp.objective ?? ""}\nCANAL: ${camp.channel ?? "Instagram"}\nOFERTA: ${camp.oferta ?? ""}\nÂNGULO: ${camp.angulo ?? ""}`,
      }],
      max_completion_tokens: 900,
    });

    const rawBriefs = (briefGenCompletion.choices[0]?.message?.content ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    let briefs: { title: string; image_prompt: string; creative_type: string; aspect_ratio: string; context_note: string; caption?: string; headline?: string }[] = [];
    try { briefs = (JSON.parse(rawBriefs).briefs ?? []).slice(0, 3); } catch { briefs = []; }
    if (!briefs.length) { res.status(502).json({ error: "GPT não gerou briefs — tente novamente" }); return; }

    res.json({ ok: true, campaign_id: id, campaign_name: camp.name, criativos_iniciados: briefs.length, message: `${briefs.length} criativos em geração para "${camp.name}"` });

    // Gera em background
    (async () => {
      for (const brief of briefs) {
        try {
          const ct = (["streetwear", "fitness", "alfaiataria", "generico"].includes(brief.creative_type) ? brief.creative_type : "generico") as any;
          const enriched = enrichR2PBPrompt({ imagePrompt: brief.image_prompt, creativeType: ct, contextNote: brief.context_note ?? null });
          const [asset] = await db.insert(growthAssets).values({
            tenantId: camp.tenant_id, campaignId: id, assetType: "image", provider: "banana",
            title: brief.title ?? null,
            promptInput: { original_prompt: enriched.originalPrompt, enriched_prompt: enriched.enrichedPrompt, creative_type: ct, aspect_ratio: brief.aspect_ratio ?? "1:1", source: "retroactive-gen" },
            status: "requested", createdBy: "internal-generate",
          }).returning();
          const [run] = await db.insert(growthProviderRuns).values({
            tenantId: camp.tenant_id, campaignId: id, assetId: asset.id, provider: "banana", runType: "generate", status: "queued",
            requestPayload: { image_prompt: brief.image_prompt, creative_type: ct },
          }).returning();
          await db.update(growthProviderRuns).set({ status: "running", updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
          await db.update(growthAssets).set({ status: "generating", updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));
          const t0 = Date.now();
          const result = await generateBananaImage({ prompt: enriched.enrichedPrompt, tenantId: camp.tenant_id, campaignId: id });
          const durationMs = Date.now() - t0;
          // Aplica branding R2PB (logo + footer) — sem headline na imagem
          const { applyBrandingToStoredImage } = await import("../../lib/growthAssetBranding");
          let finalUrl = result.outputUrl;
          let compositionOk = false;
          try {
            finalUrl = await applyBrandingToStoredImage({
              rawStoragePath: result.outputUrl,
              tenantId: camp.tenant_id,
              campaignId: id,
              // headline omitido — texto não vai na imagem
            });
            compositionOk = true;
          } catch (brandErr: any) {
            logger.warn({ error: brandErr?.message }, "campaigns/:id/generate: branding falhou — usando imagem base");
          }

          const captionText = brief.caption?.trim() ?? null;
          const headlineText = brief.headline?.trim() ?? null;

          await db.update(growthProviderRuns).set({ status: "success", durationMs, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
          await db.update(growthAssets).set({
            status: "awaiting_approval",
            outputUrl: finalUrl,
            outputData: result.responsePayload as any,
            generationTimeMs: durationMs,
            caption: captionText,
            headline: headlineText,
            cta: captionText ? "Fale com um especialista" : null,
            compositionApplied: compositionOk,
            sourcePipeline: "v2",
            updatedAt: new Date(),
          }).where(eq(growthAssets.id, asset.id));
          logger.info({ assetId: asset.id, campaignId: id, durationMs, compositionOk, hasCaption: !!captionText }, "campaigns/:id/generate: criativo gerado");
        } catch (e: any) {
          logger.error({ error: e?.message, campaignId: id }, "campaigns/:id/generate: falha");
        }
      }
    })().catch(() => {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /internal/marketing/launch-campaign ─────────────────────────────────
// Endpoint para ATHOS criar campanha + gerar criativos automaticamente.
// Clóvis não precisa abrir o Hub — ATHOS chama este endpoint diretamente.
//
// Body: { brief: string, tenant_id?: string, channel?: string, oferta?: string }
// A IA extrai nome, objetivo, ângulo etc. do brief.
router.post("/internal/marketing/launch-campaign", requireInternalKey, async (req: Request, res: Response) => {
  const {
    brief, tenant_id, channel, oferta, angulo,
    nicho, intencao_criativa, estagio_funil,
    slot_count, slots: slotsParam,
  } = req.body as Record<string, any>;

  if (!tenant_id || !["r2pb", "mirage"].includes(tenant_id)) {
    res.status(400).json({ error: "tenant_id obrigatório — 'r2pb' ou 'mirage'. Sem fallback silencioso." });
    return;
  }
  if (!brief || brief.trim().length < 10) {
    res.status(400).json({ error: "brief é obrigatório (mínimo 10 caracteres)" });
    return;
  }

  try {
    // 1. Extrai dados estruturados da campanha do brief com GPT
    const extraction = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{
        role: "system",
        content: `Você é um estrategista de marketing ${tenant_id === "mirage" ? "do Hub Mirage / Moda Conecta — ecossistema de curadoria, comunidade e inteligência comercial do mercado têxtil brasileiro" : "da R2PB — private label premium para marcas de moda brasileiras"}. Dado um briefing em linguagem natural, extraia os dados da campanha.
Retorne SOMENTE JSON válido (sem markdown):
{ "name": "string — nome conciso da campanha (max 60 chars)", "objective": "string", "channel": "string", "oferta": "string", "angulo": "string", "observacoes": "string", "nicho": "string — segmento de moda (ex: ${tenant_id === "mirage" ? "curadoria de marcas, comunidade de fornecedores, ecossistema têxtil" : "streetwear premium, fitness feminino, alfaiataria corporativa"})", "intencao_criativa": "autoridade|captação|prova|conversão|reposicionamento", "estagio_funil": "topo — awareness|meio — consideração|fundo — conversão", "slot_count": número inteiro — quantos criativos gerar. Extraia do briefing se mencionado (ex: "8 criativos" → 8, "uma semana de conteúdo" → 7). Se não mencionado, use 5. }`,
      }, {
        role: "user",
        content: `BRIEFING: ${brief.trim()}
${channel ? `CANAL FORÇADO: ${channel}` : ""}
${oferta ? `OFERTA FORÇADA: ${oferta}` : ""}
${angulo ? `ÂNGULO FORÇADO: ${angulo}` : ""}`,
      }],
      max_completion_tokens: 500,
    });

    const rawExtraction = (extraction.choices[0]?.message?.content ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
    let campData: Record<string, string>;
    try { campData = JSON.parse(rawExtraction); } catch { campData = {}; }

    const name              = campData.name ?? brief.trim().slice(0, 60);
    const objective         = campData.objective ?? null;
    const campChannel       = channel ?? campData.channel ?? null;
    const campOferta        = oferta  ?? campData.oferta  ?? null;
    const campAngulo        = angulo  ?? campData.angulo  ?? null;
    const observacoes       = campData.observacoes ?? brief.trim();
    const campNicho         = nicho             ?? campData.nicho              ?? null;
    const campIntencao      = intencao_criativa ?? campData.intencao_criativa  ?? null;
    const campEstagioFunil  = estagio_funil     ?? campData.estagio_funil      ?? null;
    // slot_count: body param tem prioridade; senão usa o que o GPT extraiu do brief; senão 5
    const resolvedSlotCount = slot_count != null
      ? slot_count
      : (campData.slot_count ? parseInt(String(campData.slot_count), 10) : null);

    // 2. Cria a campanha
    const { rows } = await pool.query<{ id: string }>(`
      INSERT INTO growth_campaigns (tenant_id, name, objective, channel, source, angulo, oferta, observacoes, nicho, intencao_criativa, estagio_funil, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
      RETURNING id
    `, [tenant_id, name, objective, campChannel, "athos-auto", campAngulo, campOferta, observacoes, campNicho, campIntencao, campEstagioFunil]);

    const campaignId = rows[0].id;
    logger.info({ campaignId, name, tenant_id }, "internal/launch-campaign: campanha criada");

    // 3. Cria slots — composição explícita OU distribuição automática por slot_count
    logger.info({ campaignId, resolvedSlotCount, slot_count_body: slot_count, slot_count_gpt: campData.slot_count ?? null, slotsParamLen: Array.isArray(slotsParam) ? slotsParam.length : null }, "internal/launch-campaign: resolvendo slot_count");
    const { growthCampaignSlots } = await import("@workspace/db");

    type SlotType = "feed" | "story" | "reel";
    let resolvedTypes: SlotType[];

    if (Array.isArray(slotsParam) && slotsParam.length > 0) {
      // Composição explícita: e.g. ["feed","feed","story","reel"]
      resolvedTypes = slotsParam.map((s: string) => (["feed","story","reel"].includes(s) ? s : "feed") as SlotType);
    } else {
      // Distribuição automática story-heavy (padrão captação social)
      // count=5 → 1 feed, 3 stories, 1 reel
      // count=8 → 3 feeds, 4 stories, 1 reel
      // count=10 → 4 feeds, 5 stories, 1 reel
      const count = Math.max(1, Math.min(20, parseInt(String(resolvedSlotCount ?? 5), 10) || 5));
      const reels   = count <= 3 ? 0 : 1;
      const stories = count <= 1 ? 0 : Math.min(count - reels, Math.max(1, Math.round(count * 0.5)));
      const feeds   = Math.max(count <= 1 ? 1 : 0, count - reels - stories);
      resolvedTypes = [
        ...Array(feeds).fill("feed" as SlotType),
        ...Array(stories).fill("story" as SlotType),
        ...Array(reels).fill("reel" as SlotType),
      ];
    }

    const slotDefs: { slotType: SlotType; isExtra: boolean }[] =
      resolvedTypes.map(t => ({ slotType: t, isExtra: false }));
    const insertedSlots = await db.insert(growthCampaignSlots).values(
      slotDefs.map((s, i) => ({
        campaignId,
        tenantId: tenant_id,
        slotType: s.slotType,
        slotIndex: i,
        objective: objective ?? null,
        status: "pending_generation" as const,
        isExtra: false,
      }))
    ).returning();

    logger.info({ campaignId, slots: insertedSlots.length }, "internal/launch-campaign: slots criados");

    // 4. Gera imagens para cada slot em background (com headline dentro, formato correto)
    (async () => {
      const { enrichR2PBPrompt, pickFabricaScene } = await import("../../lib/r2pbPromptEnricher");
      const { applyBrandingToStoredImage } = await import("../../lib/growthAssetBranding");
      const { generateOpenAIImage } = await import("../../lib/openaiImageProvider");
      const { generateBananaImage } = await import("../../lib/bananaProvider");

      // GPT gera um brief por slot — reels recebem roteiro, feeds/stories recebem prompt de imagem
      const slotsDescription = insertedSlots.map((s, i) => `${i + 1}. ${s.slotType}`).join(", ");
      const briefCompletion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        messages: [{
          role: "system",
          content: `Você é o diretor criativo da R2PB (private label premium de moda).
Dado uma campanha, gere ${insertedSlots.length} briefs distintos — um por slot.

REGRA CRÍTICA DE FORMATO POR SLOT:
- feed → image_prompt obrigatório (cena fotográfica em inglês para proporção retrato 4:5), roteiro null
- story → image_prompt obrigatório (cena fotográfica em inglês para proporção vertical 9:16 full-bleed), roteiro null
- reel → roteiro obrigatório (narrado em português, 3-5 frases: gancho + desenvolvimento + CTA), image_prompt null

REGRA DE VARIEDADE VISUAL — OBRIGATÓRIA:
Use ao mínimo 3 creative_types distintos no conjunto de slots.
NUNCA repita o mesmo creative_type em mais de 2 slots seguidos.
Stories DEVEM usar "streetwear", "fitness" ou "alfaiataria" — nunca "autoridade_fabrica" (fábrica não funciona em 9:16 story vertical).
Feeds podem usar qualquer tipo incluindo "autoridade_fabrica".

DIREÇÃO VISUAL POR FORMATO:
- feed: composição retrato editorial 4:5, sujeito centralizado com espaço lateral, fundo limpo ou ambiente contextual, luz natural ou softbox lateral
- story: composição vertical 9:16 com energia e dinamismo — sujeito no centro, espaço no topo e base para UI do Instagram, luz dramática direcional, pose de impacto ou detalhe de tecido em macro
- reel: narrativa audiovisual com gancho forte nos 3 primeiros segundos

Retorne SOMENTE JSON:
{ "briefs": [ { "title": "string", "slot_type": "feed"|"story"|"reel", "image_prompt": "string ou null", "roteiro": "string ou null", "headline": "FRASE CURTA EM CAPS (máx 4 palavras)", "creative_type": "streetwear"|"fitness"|"alfaiataria"|"autoridade_fabrica"|"generico", "context_note": "string", "hypothesis_angle": "string", "pain_point": "string", "promise": "string", "hook_type": "string", "usage_type": "organic"|"paid_social"|"hybrid" } ] }`,
        }, {
          role: "user",
          content: `CAMPANHA: ${name}\nOBJETIVO: ${objective ?? "engajamento"}\nOFERTA: ${campOferta ?? ""}\nÂNGULO: ${campAngulo ?? ""}\nNICHO: ${campNicho ?? ""}\nINTENÇÃO: ${campIntencao ?? ""}\nFUNIL: ${campEstagioFunil ?? ""}\nSLOTS: ${slotsDescription}`,
        }],
        max_completion_tokens: 1800,
      });

      const rawBriefs = (briefCompletion.choices[0]?.message?.content ?? "{}").replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
      let briefs: { title: string; slot_type?: string; image_prompt: string | null; roteiro?: string | null; headline?: string; creative_type: string; context_note: string; hypothesis_angle?: string; pain_point?: string; promise?: string; hook_type?: string; usage_type?: string }[] = [];
      try { briefs = (JSON.parse(rawBriefs).briefs ?? []).slice(0, insertedSlots.length); } catch { briefs = []; }

      for (let i = 0; i < insertedSlots.length; i++) {
        const slot = insertedSlots[i];
        const brief = briefs[i] ?? { title: `Criativo ${i + 1}`, image_prompt: `Premium fashion ${name}`, headline: name.slice(0, 20).toUpperCase(), creative_type: "generico", context_note: "" };

        try {
          // Salva hipótese + eixo criativo no slot (usado em regenerações futuras)
          const slotCreativeType = (["streetwear", "fitness", "alfaiataria", "autoridade_fabrica", "generico"].includes(brief.creative_type) ? brief.creative_type : "generico");
          await db.update(growthCampaignSlots).set({
            hypothesis_angle: brief.hypothesis_angle ?? null,
            pain_point: brief.pain_point ?? null,
            promise: brief.promise ?? null,
            hook_type: brief.hook_type ?? null,
            usage_type: brief.usage_type ?? "organic",
            creativeAxis: slotCreativeType === "autoridade_fabrica" ? "autoridade_fabrica" : "lifestyle_nicho",
            updatedAt: new Date(),
          } as any).where(eq(growthCampaignSlots.id, slot.id));

          // ── REEL → pipeline HeyGen ───────────────────────────────────────────
          if (slot.slotType === "reel") {
            const roteiro = brief.roteiro?.trim() ?? null;
            const [asset] = await db.insert(growthAssets).values({
              tenantId: tenant_id,
              campaignId,
              assetType: "video",
              provider: "heygen",
              title: brief.title ?? null,
              promptInput: {
                roteiro,
                slot_type: "reel",
                hook_type: brief.hook_type ?? null,
                pain_point: brief.pain_point ?? null,
                promise: brief.promise ?? null,
                source: "athos-auto",
              },
              status: "generating" as any,
              createdBy: "athos-auto",
              caption: roteiro,
            }).returning();

            await db.update(growthCampaignSlots).set({
              assetId: asset.id,
              status: "generating" as any,
              updatedAt: new Date(),
            }).where(eq(growthCampaignSlots.id, slot.id));

            // Dispara HeyGen em background — job de ~90s
            (async () => {
              const { createHeygenVideoJob } = await import("../../lib/heygenProvider");
              const { growthProviderRuns } = await import("@workspace/db");
              const [run] = await db.insert(growthProviderRuns).values({
                tenantId: tenant_id,
                campaignId,
                assetId: asset.id,
                provider: "heygen",
                runType: "generate",
                status: "queued",
                requestPayload: { script: roteiro, aspect_ratio: "9:16", source: "athos-auto" },
              }).returning();

              try {
                await db.update(growthProviderRuns).set({ status: "running", updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
                const t0 = Date.now();
                const { externalJobId, requestPayload, responsePayload } = await createHeygenVideoJob({
                  title: brief.title ?? name,
                  script: roteiro ?? name,
                  aspectRatio: "9:16",
                });
                const durationMs = Date.now() - t0;
                await db.update(growthProviderRuns).set({ status: "success", externalJobId, requestPayload, responsePayload, durationMs, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
                // Asset fica como "generating" até sync confirmar conclusão
                logger.info({ assetId: asset.id, slotId: slot.id, externalJobId, durationMs }, "launch-campaign: reel HeyGen job criado ✅");
              } catch (e: any) {
                await db.update(growthProviderRuns).set({ status: "failed", errorMessage: e.message, updatedAt: new Date() }).where(eq(growthProviderRuns.id, run.id));
                await db.update(growthAssets).set({ status: "pending_video" as any, updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));
                await db.update(growthCampaignSlots).set({ status: "pending_video" as any, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slot.id));
                logger.error({ error: e?.message, assetId: asset.id }, "launch-campaign: HeyGen falhou — slot voltou a pending_video");
              }
            })().catch(() => {});

            continue; // não gera imagem para reel
          }

          // ── FEED / STORY → pipeline de imagem ───────────────────────────────
          await db.update(growthCampaignSlots).set({ status: "generating" as const, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slot.id));

          const ct = (["streetwear", "fitness", "alfaiataria", "autoridade_fabrica", "generico"].includes(brief.creative_type) ? brief.creative_type : "generico") as any;
          // Sempre gerar em 9:16 (1024×1536) — branding step recorta feed para 4:5 via sharp cover
          const size: "1024x1536" = "1024x1536";

          const enriched = enrichR2PBPrompt({ imagePrompt: brief.image_prompt ?? brief.context_note ?? name, creativeType: ct, contextNote: brief.context_note ?? null, slotType: slot.slotType });

          const [asset] = await db.insert(growthAssets).values({
            tenantId: tenant_id,
            campaignId,
            assetType: "image",
            provider: "openai",
            title: brief.title ?? null,
            promptInput: { enriched_prompt: enriched.enrichedPrompt, creative_type: ct, slot_type: slot.slotType, source: "athos-auto" },
            status: "generating" as any,
            createdBy: "athos-auto",
          }).returning();

          await db.update(growthCampaignSlots).set({ assetId: asset.id, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slot.id));

          const t0 = Date.now();
          let result: { outputUrl: string; storagePath: string };
          try {
            result = await generateOpenAIImage({ prompt: enriched.enrichedPrompt, tenantId: tenant_id, campaignId, size });
          } catch {
            result = await generateBananaImage({ prompt: enriched.enrichedPrompt, tenantId: tenant_id, campaignId });
          }
          const durationMs = Date.now() - t0;

          const headline = brief.headline ?? name.slice(0, 20).toUpperCase();
          const branded = await applyBrandingToStoredImage({ rawStoragePath: result.outputUrl, tenantId: tenant_id, campaignId, headline, slotType: slot.slotType });

          const copyCompletion = await openai.chat.completions.create({
            model: "gpt-5-mini",
            messages: [{
              role: "system", content: "Você é o copywriter da R2PB. Gere uma legenda para Instagram (máx 150 chars) com CTA. Retorne SOMENTE o texto da legenda.",
            }, {
              role: "user", content: `Campanha: ${name}\nTítulo: ${brief.title}\nOferta: ${campOferta ?? ""}\nÂngulo: ${campAngulo ?? ""}`,
            }],
          });
          const caption = copyCompletion.choices[0]?.message?.content?.trim() ?? "";

          await db.update(growthAssets).set({
            status: "awaiting_approval" as any,
            outputUrl: branded.storagePath,
            caption,
            generationTimeMs: durationMs,
            updatedAt: new Date(),
          }).where(eq(growthAssets.id, asset.id));

          await db.update(growthCampaignSlots).set({ status: "generated" as const, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slot.id));

          logger.info({ assetId: asset.id, slotId: slot.id, slotType: slot.slotType, campaignId, durationMs }, "launch-campaign: slot de imagem gerado ✅");
        } catch (e: any) {
          await db.update(growthCampaignSlots).set({ status: "pending_generation" as const, updatedAt: new Date() }).where(eq(growthCampaignSlots.id, slot.id));
          logger.error({ error: e?.message, slotId: slot.id, campaignId }, "launch-campaign: falha no slot");
        }
      }
      logger.info({ campaignId, total: insertedSlots.length }, "launch-campaign: todos os slots concluídos");
    })().catch((e) => logger.error({ error: e?.message }, "launch-campaign: erro no background"));

    const feedsN   = resolvedTypes.filter(t => t === "feed").length;
    const storiesN = resolvedTypes.filter(t => t === "story").length;
    const reelsN   = resolvedTypes.filter(t => t === "reel").length;
    const breakdown = [feedsN && `${feedsN} feed`, storiesN && `${storiesN} story`, reelsN && `${reelsN} reel`].filter(Boolean).join(", ");
    res.json({
      ok: true,
      campaign_id: campaignId,
      campaign_name: name,
      slots_criados: insertedSlots.length,
      composicao: { feeds: feedsN, stories: storiesN, reels: reelsN },
      message: `Campanha "${name}" criada com ${insertedSlots.length} slots (${breakdown}). Imagens em geração — ~30–60s. Acesse Growth → Curadoria para aprovar e publicar.`,
    });
  } catch (err: any) {
    logger.error({ error: err?.message }, "internal/launch-campaign: erro");
    res.status(500).json({ error: err.message });
  }
});

export default router;
