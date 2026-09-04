/**
 * /internal/creative/r2pb/generate-image
 *
 * Endpoint interno para geração real de imagem estática premium para campanhas R2PB.
 * Chamado pelo n8n após o R2PB_CREATIVE_GENERATOR V2 gerar o image_prompt.
 *
 * Fluxo:
 *   1. Recebe image_prompt + metadados de campanha
 *   2. Enriquece o prompt com direção criativa premium R2PB (r2pbPromptEnricher)
 *   3. Chama Banana / Gemini 2.5 Flash Image
 *   4. Salva imagem em object storage (via bananaProvider)
 *   5. Persiste metadados em growth_assets + growth_provider_runs
 *   6. Se machine_creative_id fornecido: atualiza machine_creatives (storagePath, promptUsado, status)
 *   7. Retorna resposta estruturada para curadoria
 *
 * Auth: x-internal-key (MARKETING_INTERNAL_API_KEY)
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, growthAssets, growthProviderRuns, machineCreatives } from "@workspace/db";
import { logger } from "../../lib/logger";
import { generateBananaImage, BananaApiError, BananaConfigError } from "../../lib/bananaProvider";
import { enrichR2PBPrompt, type CreativeType } from "../../lib/r2pbPromptEnricher";

const router = Router();

// ── Auth middleware ───────────────────────────────────────────────────────────

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

router.use("/internal/creative", requireInternalKey);

// ── Schema ────────────────────────────────────────────────────────────────────

const generateImageSchema = z.object({
  /** Ex: "r2pb" */
  tenant_id: z.string().min(1),
  /** UUID do growth_campaign (opcional) */
  campaign_id: z.string().uuid().nullable().optional(),
  /** UUID do machine_creative — se fornecido, atualiza assetStoragePath e status */
  machine_creative_id: z.string().uuid().nullable().optional(),
  /** Título editorial do criativo */
  title: z.string().nullable().optional(),
  /** Prompt visual vindo do agente criativo (será enriquecido antes de chamar o provider) */
  image_prompt: z.string().min(10),
  /** Linha visual da R2PB — define qual base de direção criativa é aplicada */
  creative_type: z.enum(["streetwear", "fitness", "alfaiataria", "generico"]).nullable().optional(),
  /** Proporção desejada — informativo */
  aspect_ratio: z.string().nullable().optional(),
  /** Nota de contexto adicional sobre a campanha / produto */
  context_note: z.string().nullable().optional(),
  /** Quem disparou (ex: "n8n:R2PB_CREATIVE_GENERATOR_V2") */
  created_by: z.string().nullable().optional(),
});

// ── POST /internal/creative/r2pb/generate-image ───────────────────────────────

router.post("/internal/creative/r2pb/generate-image", async (req: Request, res: Response) => {
  const parsed = generateImageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }

  const d = parsed.data;
  const creativeType = (d.creative_type ?? "generico") as CreativeType;

  // 1. Enriquecer prompt com direção criativa R2PB
  const enriched = enrichR2PBPrompt({
    imagePrompt: d.image_prompt,
    creativeType,
    contextNote: d.context_note ?? null,
  });

  logger.info(
    {
      tenantId: d.tenant_id,
      campaignId: d.campaign_id ?? null,
      machineCreativeId: d.machine_creative_id ?? null,
      creativeType,
      directionApplied: enriched.directionApplied,
    },
    "creative/r2pb/generate-image: iniciando geração com prompt enriquecido"
  );

  // 2. Registrar asset + run como "requested" / "queued"
  const [asset] = await db
    .insert(growthAssets)
    .values({
      tenantId: d.tenant_id,
      campaignId: d.campaign_id ?? null,
      assetType: "image",
      provider: "banana",
      title: d.title ?? null,
      promptInput: {
        original_prompt: enriched.originalPrompt,
        enriched_prompt: enriched.enrichedPrompt,
        creative_type: creativeType,
        aspect_ratio: d.aspect_ratio ?? null,
        context_note: d.context_note ?? null,
        direction_applied: enriched.directionApplied,
        machine_creative_id: d.machine_creative_id ?? null,
      },
      status: "requested",
      createdBy: d.created_by ?? null,
    })
    .returning();

  const [run] = await db
    .insert(growthProviderRuns)
    .values({
      tenantId: d.tenant_id,
      campaignId: d.campaign_id ?? null,
      assetId: asset.id,
      provider: "banana",
      runType: "generate",
      status: "queued",
      requestPayload: {
        image_prompt: d.image_prompt,
        creative_type: creativeType,
        aspect_ratio: d.aspect_ratio ?? null,
      },
    })
    .returning();

  // 3. Gerar imagem
  try {
    await db
      .update(growthProviderRuns)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(growthProviderRuns.id, run.id));

    await db
      .update(growthAssets)
      .set({ status: "generating", updatedAt: new Date() })
      .where(eq(growthAssets.id, asset.id));

    const startedAt = Date.now();
    const result = await generateBananaImage({
      prompt: enriched.enrichedPrompt,
      tenantId: d.tenant_id,
      campaignId: d.campaign_id,
    });
    const durationMs = Date.now() - startedAt;

    // 4. Atualizar run + asset com resultado
    const [updatedRun] = await db
      .update(growthProviderRuns)
      .set({
        status: "success",
        requestPayload: result.requestPayload,
        responsePayload: result.responsePayload,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(growthProviderRuns.id, run.id))
      .returning();

    const [updatedAsset] = await db
      .update(growthAssets)
      .set({
        status: "awaiting_approval",
        outputUrl: result.outputUrl,
        outputData: result.responsePayload as any,
        generationTimeMs: durationMs,
        updatedAt: new Date(),
      })
      .where(eq(growthAssets.id, asset.id))
      .returning();

    // 5. Se machine_creative_id fornecido → atualiza machine_creatives
    let machineCreativeUpdated = false;
    if (d.machine_creative_id) {
      try {
        await db
          .update(machineCreatives)
          .set({
            assetStoragePath: result.outputUrl,
            imagePromptUsed: enriched.enrichedPrompt,
            statusAprovacao: "gerado",
            updatedAt: new Date(),
          })
          .where(eq(machineCreatives.id, d.machine_creative_id));
        machineCreativeUpdated = true;
      } catch (mcErr) {
        logger.warn(
          { machineCreativeId: d.machine_creative_id, err: mcErr },
          "creative/r2pb: falha ao atualizar machine_creatives (não crítico)"
        );
      }
    }

    logger.info(
      {
        assetId: updatedAsset.id,
        tenantId: d.tenant_id,
        outputUrl: result.outputUrl,
        durationMs,
        machineCreativeUpdated,
      },
      "creative/r2pb/generate-image: imagem gerada com sucesso"
    );

    res.status(201).json({
      ok: true,
      asset: {
        id: updatedAsset.id,
        tenant_id: updatedAsset.tenantId,
        campaign_id: updatedAsset.campaignId,
        asset_type: updatedAsset.assetType,
        provider: updatedAsset.provider,
        status: updatedAsset.status,
        output_url: updatedAsset.outputUrl,
        title: updatedAsset.title,
        created_at: updatedAsset.createdAt,
        generation_time_ms: durationMs,
      },
      provider_run: { id: updatedRun.id, status: updatedRun.status, duration_ms: durationMs },
      enrichment: {
        creative_type: creativeType,
        direction_applied: enriched.directionApplied,
        original_prompt: enriched.originalPrompt,
      },
      machine_creative_updated: machineCreativeUpdated,
      /** URL para acessar a imagem via Hub: prefixe com /api/storage */
      image_path: result.outputUrl,
      /** Endpoint de curadoria no Hub */
      curation_url: `/api/marketing/pilotos/assets/${updatedAsset.id}`,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";

    await db
      .update(growthProviderRuns)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(growthProviderRuns.id, run.id));

    await db
      .update(growthAssets)
      .set({ status: "failed", errorMessage, updatedAt: new Date() })
      .where(eq(growthAssets.id, asset.id));

    if (err instanceof BananaConfigError) {
      logger.warn({ tenantId: d.tenant_id }, "creative/r2pb: provider Banana não configurado");
      res.status(503).json({
        error: "Provider de imagem não configurado",
        detail: "Verifique AI_INTEGRATIONS_GEMINI_BASE_URL e AI_INTEGRATIONS_GEMINI_API_KEY",
        asset_id: asset.id,
      });
      return;
    }

    if (err instanceof BananaApiError) {
      logger.error({ tenantId: d.tenant_id, err: errorMessage }, "creative/r2pb: falha na API do provider");
      res.status(502).json({ error: "Falha na geração de imagem pelo provider", detail: errorMessage, asset_id: asset.id });
      return;
    }

    logger.error({ tenantId: d.tenant_id, err: errorMessage }, "creative/r2pb: erro inesperado");
    res.status(500).json({ error: errorMessage, asset_id: asset.id });
  }
});

// ── GET /internal/creative/r2pb/assets ───────────────────────────────────────
// Lista assets de imagem da R2PB — conveniente para o n8n verificar curadoria

router.get("/internal/creative/r2pb/assets", async (req: Request, res: Response) => {
  const { status, limit } = req.query as { status?: string; limit?: string };
  const limitN = Math.min(parseInt(limit ?? "50", 10) || 50, 200);

  try {
    const conditions = [
      eq(growthAssets.tenantId, "r2pb"),
      eq(growthAssets.assetType, "image"),
    ];
    if (status) conditions.push(eq(growthAssets.status, status as any));

    const rows = await db
      .select()
      .from(growthAssets)
      .where(and(...conditions))
      .orderBy(desc(growthAssets.createdAt))
      .limit(limitN);

    res.json({
      ok: true,
      total: rows.length,
      assets: rows.map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        output_url: a.outputUrl,
        campaign_id: a.campaignId,
        created_at: a.createdAt,
        generation_time_ms: a.generationTimeMs,
        image_path: a.outputUrl,
        curation_url: `/api/marketing/pilotos/assets/${a.id}`,
        prompt_input: a.promptInput,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
