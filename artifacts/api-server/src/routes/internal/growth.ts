import { Router } from "express";
import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, growthAssets, growthAssetVersions, growthProviderRuns } from "@workspace/db";
import { z } from "zod";
import { logger } from "../../lib/logger";
import {
  createHeygenVideoJob,
  getHeygenVideoJob,
  HeygenApiError,
  HeygenConfigError,
} from "../../lib/heygenProvider";
import { generateBananaImage, BananaApiError, BananaConfigError } from "../../lib/bananaProvider";
import { getProviderAvailability, resolveGrowthFallback, selectGrowthProvider } from "../../lib/growthProviderRouter";

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

router.use("/internal/growth", requireInternalKey);

const assetTypeEnum = z.enum(["copy", "headline", "script", "image", "video", "cta", "caption", "hook"]);
const providerEnum = z.enum(["openai", "heygen", "midjourney", "banana", "manual"]);
const assetStatusEnum = z.enum([
  "requested",
  "generating",
  "generated",
  "awaiting_approval",
  "approved",
  "rejected",
  "published",
  "failed",
  "archived",
]);
const runTypeEnum = z.enum(["generate", "poll", "retry", "fallback"]);
const runStatusEnum = z.enum(["queued", "running", "success", "failed"]);

const createAssetSchema = z.object({
  tenant_id: z.string().min(1),
  brand_id: z.string().uuid().optional().nullable(),
  campaign_id: z.string().uuid().optional().nullable(),
  asset_type: assetTypeEnum,
  provider: providerEnum,
  title: z.string().optional().nullable(),
  prompt_input: z.any().optional().nullable(),
  output_data: z.any().optional().nullable(),
  output_url: z.string().optional().nullable(),
  status: assetStatusEnum.optional(),
  parent_asset_id: z.string().uuid().optional().nullable(),
  cost_estimate_cents: z.number().int().optional().nullable(),
  generation_time_ms: z.number().int().optional().nullable(),
  created_by: z.string().optional().nullable(),
});

router.post("/internal/growth/assets", async (req: Request, res: Response) => {
  const parsed = createAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  try {
    const [inserted] = await db
      .insert(growthAssets)
      .values({
        tenantId: d.tenant_id,
        brandId: d.brand_id ?? null,
        campaignId: d.campaign_id ?? null,
        assetType: d.asset_type,
        provider: d.provider,
        title: d.title ?? null,
        promptInput: d.prompt_input ?? null,
        outputData: d.output_data ?? null,
        outputUrl: d.output_url ?? null,
        status: d.status ?? "requested",
        parentAssetId: d.parent_asset_id ?? null,
        costEstimateCents: d.cost_estimate_cents ?? null,
        generationTimeMs: d.generation_time_ms ?? null,
        createdBy: d.created_by ?? null,
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao criar asset");
    res.status(500).json({ error: "Erro ao criar asset" });
  }
});

router.get("/internal/growth/assets", async (req: Request, res: Response) => {
  const { campaign_id, provider, asset_type, status, tenant_id } = req.query as Record<string, string | undefined>;

  const conditions = [];
  if (tenant_id) conditions.push(eq(growthAssets.tenantId, tenant_id));
  if (campaign_id) conditions.push(eq(growthAssets.campaignId, campaign_id));
  if (provider) conditions.push(eq(growthAssets.provider, provider as any));
  if (asset_type) conditions.push(eq(growthAssets.assetType, asset_type as any));
  if (status) conditions.push(eq(growthAssets.status, status as any));

  try {
    const rows = await db
      .select()
      .from(growthAssets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(growthAssets.createdAt));
    res.json(rows);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao listar assets");
    res.status(500).json({ error: "Erro ao listar assets" });
  }
});

router.get("/internal/growth/assets/:id", async (req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(growthAssets).where(eq(growthAssets.id, String(req.params.id))).limit(1);
    if (!row) {
      res.status(404).json({ error: "Asset não encontrado" });
      return;
    }
    res.json(row);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao buscar asset");
    res.status(500).json({ error: "Erro ao buscar asset" });
  }
});

const patchAssetSchema = z.object({
  title: z.string().optional().nullable(),
  prompt_input: z.any().optional().nullable(),
  output_data: z.any().optional().nullable(),
  output_url: z.string().optional().nullable(),
  status: assetStatusEnum.optional(),
  error_message: z.string().optional().nullable(),
  cost_estimate_cents: z.number().int().optional().nullable(),
  generation_time_ms: z.number().int().optional().nullable(),
  change_reason: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
});

router.patch("/internal/growth/assets/:id", async (req: Request, res: Response) => {
  const parsed = patchAssetSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;

  try {
    const [existing] = await db.select().from(growthAssets).where(eq(growthAssets.id, String(req.params.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Asset não encontrado" });
      return;
    }

    const isNewVersion = d.output_data !== undefined || d.output_url !== undefined || d.prompt_input !== undefined;
    const nextVersionNumber = isNewVersion ? existing.versionNumber + 1 : existing.versionNumber;

    if (isNewVersion) {
      await db.insert(growthAssetVersions).values({
        assetId: existing.id,
        versionNumber: existing.versionNumber,
        promptInput: existing.promptInput,
        outputData: existing.outputData,
        outputUrl: existing.outputUrl,
        changeReason: d.change_reason ?? null,
        createdBy: d.created_by ?? null,
      });
    }

    const [updated] = await db
      .update(growthAssets)
      .set({
        ...(d.title !== undefined && { title: d.title }),
        ...(d.prompt_input !== undefined && { promptInput: d.prompt_input }),
        ...(d.output_data !== undefined && { outputData: d.output_data }),
        ...(d.output_url !== undefined && { outputUrl: d.output_url }),
        ...(d.status !== undefined && { status: d.status }),
        ...(d.error_message !== undefined && { errorMessage: d.error_message }),
        ...(d.cost_estimate_cents !== undefined && { costEstimateCents: d.cost_estimate_cents }),
        ...(d.generation_time_ms !== undefined && { generationTimeMs: d.generation_time_ms }),
        versionNumber: nextVersionNumber,
        updatedAt: new Date(),
      })
      .where(eq(growthAssets.id, String(req.params.id)))
      .returning();

    res.json(updated);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao atualizar asset");
    res.status(500).json({ error: "Erro ao atualizar asset" });
  }
});

const decisionSchema = z.object({
  approved_by: z.string().optional().nullable(),
  reason: z.string().optional().nullable(),
});

router.post("/internal/growth/assets/:id/approve", async (req: Request, res: Response) => {
  const parsed = decisionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  try {
    const [existing] = await db.select().from(growthAssets).where(eq(growthAssets.id, String(req.params.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Asset não encontrado" });
      return;
    }
    const [updated] = await db
      .update(growthAssets)
      .set({ status: "approved", approvedBy: parsed.data.approved_by ?? null, updatedAt: new Date() })
      .where(eq(growthAssets.id, String(req.params.id)))
      .returning();
    res.json(updated);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao aprovar asset");
    res.status(500).json({ error: "Erro ao aprovar asset" });
  }
});

router.post("/internal/growth/assets/:id/reject", async (req: Request, res: Response) => {
  const parsed = decisionSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  try {
    const [existing] = await db.select().from(growthAssets).where(eq(growthAssets.id, String(req.params.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Asset não encontrado" });
      return;
    }
    const [updated] = await db
      .update(growthAssets)
      .set({
        status: "rejected",
        approvedBy: parsed.data.approved_by ?? null,
        errorMessage: parsed.data.reason ?? existing.errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(growthAssets.id, String(req.params.id)))
      .returning();
    res.json(updated);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao rejeitar asset");
    res.status(500).json({ error: "Erro ao rejeitar asset" });
  }
});

const createRunSchema = z.object({
  tenant_id: z.string().min(1),
  campaign_id: z.string().uuid().optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  provider: providerEnum,
  run_type: runTypeEnum.optional(),
  request_payload: z.any().optional().nullable(),
  response_payload: z.any().optional().nullable(),
  status: runStatusEnum.optional(),
  external_job_id: z.string().optional().nullable(),
  error_message: z.string().optional().nullable(),
  cost_estimate_cents: z.number().int().optional().nullable(),
  duration_ms: z.number().int().optional().nullable(),
});

router.post("/internal/growth/provider-runs", async (req: Request, res: Response) => {
  const parsed = createRunSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;
  try {
    const [inserted] = await db
      .insert(growthProviderRuns)
      .values({
        tenantId: d.tenant_id,
        campaignId: d.campaign_id ?? null,
        assetId: d.asset_id ?? null,
        provider: d.provider,
        runType: d.run_type ?? "generate",
        requestPayload: d.request_payload ?? null,
        responsePayload: d.response_payload ?? null,
        status: d.status ?? "queued",
        externalJobId: d.external_job_id ?? null,
        errorMessage: d.error_message ?? null,
        costEstimateCents: d.cost_estimate_cents ?? null,
        durationMs: d.duration_ms ?? null,
      })
      .returning();
    res.status(201).json(inserted);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao criar provider run");
    res.status(500).json({ error: "Erro ao criar provider run" });
  }
});

router.get("/internal/growth/provider-runs", async (req: Request, res: Response) => {
  const { campaign_id, asset_id, provider, status, tenant_id } = req.query as Record<string, string | undefined>;

  const conditions = [];
  if (tenant_id) conditions.push(eq(growthProviderRuns.tenantId, tenant_id));
  if (campaign_id) conditions.push(eq(growthProviderRuns.campaignId, campaign_id));
  if (asset_id) conditions.push(eq(growthProviderRuns.assetId, asset_id));
  if (provider) conditions.push(eq(growthProviderRuns.provider, provider as any));
  if (status) conditions.push(eq(growthProviderRuns.status, status as any));

  try {
    const rows = await db
      .select()
      .from(growthProviderRuns)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(growthProviderRuns.createdAt));
    res.json(rows);
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth: erro ao listar provider runs");
    res.status(500).json({ error: "Erro ao listar provider runs" });
  }
});

function handleHeygenError(err: unknown, res: Response, context: string) {
  if (err instanceof HeygenConfigError) {
    logger.error({ context }, "internal/growth/heygen: credencial ausente");
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof HeygenApiError) {
    logger.error({ context, status: err.status, body: err.body }, "internal/growth/heygen: erro da API HeyGen");
    res.status(502).json({ error: err.message, heygen_status: err.status, heygen_response: err.body });
    return;
  }
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  logger.error({ context, err: message }, "internal/growth/heygen: erro inesperado");
  res.status(500).json({ error: message });
}

const heygenGenerateSchema = z.object({
  tenant_id: z.string().min(1),
  campaign_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  title: z.string().optional().nullable(),
  script: z.string().min(1),
  avatar_id: z.string().optional().nullable(),
  avatar_type: z.enum(["avatar", "talking_photo"]).optional().nullable(),
  voice_id: z.string().optional().nullable(),
  aspect_ratio: z.string().optional().nullable(),
  cta: z.string().optional().nullable(),
  created_by: z.string().optional().nullable(),
});

router.post("/internal/growth/providers/heygen/generate", async (req: Request, res: Response) => {
  const parsed = heygenGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;

  const [asset] = await db
    .insert(growthAssets)
    .values({
      tenantId: d.tenant_id,
      brandId: d.brand_id ?? null,
      campaignId: d.campaign_id ?? null,
      assetType: "video",
      provider: "heygen",
      title: d.title ?? null,
      promptInput: {
        script: d.script,
        avatar_id: d.avatar_id ?? null,
        voice_id: d.voice_id ?? null,
        aspect_ratio: d.aspect_ratio ?? null,
        cta: d.cta ?? null,
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
      provider: "heygen",
      runType: "generate",
      status: "queued",
      requestPayload: req.body,
    })
    .returning();

  try {
    await db
      .update(growthProviderRuns)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(growthProviderRuns.id, run.id));
    await db.update(growthAssets).set({ status: "generating", updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));

    const startedAt = Date.now();
    const { externalJobId, requestPayload, responsePayload } = await createHeygenVideoJob({
      title: d.title,
      script: d.script,
      avatarId: d.avatar_id,
      avatarType: d.avatar_type,
      voiceId: d.voice_id,
      aspectRatio: d.aspect_ratio,
    });
    const durationMs = Date.now() - startedAt;

    const [updatedRun] = await db
      .update(growthProviderRuns)
      .set({
        status: "success",
        externalJobId,
        requestPayload,
        responsePayload,
        durationMs,
        updatedAt: new Date(),
      })
      .where(eq(growthProviderRuns.id, run.id))
      .returning();

    res.status(201).json({ asset, provider_run: updatedRun });
  } catch (err) {
    await db
      .update(growthProviderRuns)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        updatedAt: new Date(),
      })
      .where(eq(growthProviderRuns.id, run.id));
    await db
      .update(growthAssets)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        updatedAt: new Date(),
      })
      .where(eq(growthAssets.id, asset.id));

    handleHeygenError(err, res, "generate");
  }
});

router.get("/internal/growth/providers/heygen/job/:jobId", async (req: Request, res: Response) => {
  try {
    const jobStatus = await getHeygenVideoJob(String(req.params.jobId));
    res.json(jobStatus);
  } catch (err) {
    handleHeygenError(err, res, "job-status");
  }
});

router.post("/internal/growth/providers/heygen/job/:jobId/sync", async (req: Request, res: Response) => {
  const jobId = String(req.params.jobId);

  const [run] = await db
    .select()
    .from(growthProviderRuns)
    .where(eq(growthProviderRuns.externalJobId, jobId))
    .orderBy(desc(growthProviderRuns.createdAt))
    .limit(1);

  if (!run) {
    res.status(404).json({ error: "Nenhum provider run encontrado para esse external_job_id" });
    return;
  }

  try {
    const startedAt = Date.now();
    const jobStatus = await getHeygenVideoJob(jobId);
    const durationMs = Date.now() - startedAt;

    const [pollRun] = await db
      .insert(growthProviderRuns)
      .values({
        tenantId: run.tenantId,
        campaignId: run.campaignId,
        assetId: run.assetId,
        provider: "heygen",
        runType: "poll",
        externalJobId: jobId,
        status: jobStatus.status,
        responsePayload: jobStatus.rawResponse as any,
        errorMessage: jobStatus.errorMessage ?? null,
        durationMs,
      })
      .returning();

    let updatedAsset = null;
    if (run.assetId) {
      if (jobStatus.status === "success" && jobStatus.outputUrl) {
        [updatedAsset] = await db
          .update(growthAssets)
          .set({
            status: "awaiting_approval",
            outputUrl: jobStatus.outputUrl,
            outputData: jobStatus.rawResponse as any,
            updatedAt: new Date(),
          })
          .where(eq(growthAssets.id, run.assetId))
          .returning();
      } else if (jobStatus.status === "failed") {
        [updatedAsset] = await db
          .update(growthAssets)
          .set({
            status: "failed",
            errorMessage: jobStatus.errorMessage ?? "Falha reportada pelo HeyGen",
            updatedAt: new Date(),
          })
          .where(eq(growthAssets.id, run.assetId))
          .returning();
      } else {
        [updatedAsset] = await db
          .update(growthAssets)
          .set({ status: "generating", updatedAt: new Date() })
          .where(eq(growthAssets.id, run.assetId))
          .returning();
      }
    }

    res.json({ job_status: jobStatus, provider_run: pollRun, asset: updatedAsset });
  } catch (err) {
    handleHeygenError(err, res, "sync");
  }
});

function handleBananaError(err: unknown, res: Response, context: string) {
  if (err instanceof BananaConfigError) {
    logger.error({ context }, "internal/growth/banana: integração Gemini não configurada");
    res.status(503).json({ error: err.message });
    return;
  }
  if (err instanceof BananaApiError) {
    logger.error({ context, cause: (err.cause as any)?.message }, "internal/growth/banana: erro da API Gemini");
    res.status(502).json({ error: err.message });
    return;
  }
  const message = err instanceof Error ? err.message : "Erro desconhecido";
  logger.error({ context, err: message }, "internal/growth/banana: erro inesperado");
  res.status(500).json({ error: message });
}

const bananaGenerateSchema = z.object({
  tenant_id: z.string().min(1),
  campaign_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  title: z.string().optional().nullable(),
  prompt: z.string().min(1),
  asset_type_hint: z.enum(["image_fast", "image_generic", "image_premium"]).optional().nullable(),
  created_by: z.string().optional().nullable(),
});

router.post("/internal/growth/providers/banana/generate", async (req: Request, res: Response) => {
  const parsed = bananaGenerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;

  const [asset] = await db
    .insert(growthAssets)
    .values({
      tenantId: d.tenant_id,
      brandId: d.brand_id ?? null,
      campaignId: d.campaign_id ?? null,
      assetType: "image",
      provider: "banana",
      title: d.title ?? null,
      promptInput: { prompt: d.prompt, asset_type_hint: d.asset_type_hint ?? null },
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
      requestPayload: req.body,
    })
    .returning();

  try {
    await db
      .update(growthProviderRuns)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(growthProviderRuns.id, run.id));
    await db.update(growthAssets).set({ status: "generating", updatedAt: new Date() }).where(eq(growthAssets.id, asset.id));

    const startedAt = Date.now();
    const result = await generateBananaImage({
      prompt: d.prompt,
      tenantId: d.tenant_id,
      campaignId: d.campaign_id,
    });
    const durationMs = Date.now() - startedAt;

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

    res.status(201).json({ asset: updatedAsset, provider_run: updatedRun });
  } catch (err) {
    await db
      .update(growthProviderRuns)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        updatedAt: new Date(),
      })
      .where(eq(growthProviderRuns.id, run.id));
    await db
      .update(growthAssets)
      .set({
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Erro desconhecido",
        updatedAt: new Date(),
      })
      .where(eq(growthAssets.id, asset.id));

    handleBananaError(err, res, "generate");
  }
});

const providerRouteSchema = z.object({
  tenant_id: z.string().min(1).optional().nullable(),
  asset_type: z.enum([
    "copy",
    "headline",
    "script",
    "image",
    "video",
    "cta",
    "caption",
    "hook",
    "video_avatar",
    "image_premium",
    "image_fast",
    "image_generic",
  ]),
  campaign_id: z.string().uuid().optional().nullable(),
  title: z.string().optional().nullable(),
  priority: z.enum(["quality", "speed", "cost"]).optional().nullable(),
  failed_provider: providerEnum.optional().nullable(),
});

router.post("/internal/growth/providers/route", (req: Request, res: Response) => {
  const parsed = providerRouteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload inválido", details: parsed.error.issues });
    return;
  }
  const d = parsed.data;

  const availability = getProviderAvailability();
  const routeInput = {
    assetType: d.asset_type,
    priority: d.priority ?? null,
    tenantId: d.tenant_id ?? null,
  };

  const decision = d.failed_provider
    ? resolveGrowthFallback(routeInput, d.failed_provider, availability)
    : selectGrowthProvider(routeInput, availability);

  logger.info(
    {
      tenantId: d.tenant_id ?? null,
      campaignId: d.campaign_id ?? null,
      assetType: d.asset_type,
      failedProvider: d.failed_provider ?? null,
      decision,
    },
    "growthProviderRouter: decisão de roteamento"
  );

  res.json({
    selected_provider: decision.selectedProvider,
    fallback_provider: decision.fallbackProvider,
    selection_reason: decision.selectionReason,
    provider_available: decision.providerAvailable,
    requires_manual_review: decision.requiresManualReview,
    availability,
  });
});

// ── Criar criativo de tela real do Hub (screenshot → Growth) ─────────────────

router.post("/internal/growth/product-screenshot-campaign", async (req: Request, res: Response) => {
  try {
    const { Pool } = await import("pg");
    const { readFile } = await import("fs/promises");
    const { existsSync } = await import("fs");
    const { randomUUID } = await import("crypto");
    const { objectStorageClient } = await import("../../lib/objectStorage");
    const { openai } = await import("@workspace/integrations-openai-ai-server");
    const { pool: dbPool } = await import("@workspace/db");

    const tenantId      = (req.body.tenant_id as string) ?? "mirage";
    const moduleName    = (req.body.module as string) ?? "kanban";
    const screenshotFile = (req.body.screenshot_file as string) ?? "kanban-preview-creative.jpg";

    const screenshotPath = `/home/runner/workspace/screenshots/${screenshotFile}`;
    if (!existsSync(screenshotPath)) {
      return res.status(422).json({ error: `Screenshot não encontrada: ${screenshotPath}` });
    }
    const imageBuffer = await readFile(screenshotPath);

    // Upload GCS via objectStorageClient (usa sidecar Replit)
    const privateDir  = process.env["PRIVATE_OBJECT_DIR"] ?? "";
    const clean       = privateDir.startsWith("/") ? privateDir.slice(1) : privateDir;
    const slashIdx    = clean.indexOf("/");
    const bucketName  = slashIdx >= 0 ? clean.slice(0, slashIdx) : clean;
    const dirInBucket = slashIdx >= 0 ? clean.slice(slashIdx + 1) : "";
    if (!bucketName) return res.status(500).json({ error: "PRIVATE_OBJECT_DIR não configurado" });

    const uuid       = randomUUID();
    const assetPath  = `growth-assets/${tenantId}/product-screenshots/${uuid}.jpg`;
    const objectName = dirInBucket ? `${dirInBucket}/${assetPath}` : assetPath;
    await objectStorageClient.bucket(bucketName).file(objectName).save(imageBuffer, { contentType: "image/jpeg", resumable: false });
    const outputUrl = `/objects/${assetPath}`;

    // Copy via OpenAI
    const MODULE_CONTEXT: Record<string, string> = {
      kanban:     "Kanban de Produção — controle visual das 14 fases da confecção, ordens de produção, prazos e CMO em tempo real.",
      plm:        "PLM — ficha técnica, BOM, modelagem e aprovação de coleção.",
      crm:        "CRM Comercial — funil de leads, automação de follow-up e relatórios de conversão.",
      financeiro: "Módulo Financeiro — fluxo de caixa, contas a pagar/receber e Open Banking Stone.",
      erp:        "ERP Mirage (VhSys) — NF-e, PDV, estoque e gestão financeira integrada.",
    };
    const context = MODULE_CONTEXT[moduleName] ?? `Módulo ${moduleName} do Mirage Hub`;

    const cc = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: `Você é copywriter SaaS B2B para moda/confecção. Retorne JSON com { "headline": "...", "caption": "..." }. headline: até 10 palavras. caption: 3-4 frases + CTA + 4 hashtags. PT-BR.` },
        { role: "user", content: `Crie copy para post do Instagram mostrando a tela real do sistema:\n${context}\nFoco: produtividade, controle e integração com o Hub Mirage.` },
      ],
      response_format: { type: "json_object" },
    });
    const copyJson = JSON.parse(cc.choices[0]?.message?.content ?? "{}");
    const headline = String(copyJson.headline ?? `${moduleName} — Mirage Hub`);
    const caption  = String(copyJson.caption  ?? `Gerencie sua confecção com o Mirage Hub.`);

    // Campanha
    const campRes = await dbPool.query<{ id: string }>(
      `INSERT INTO growth_campaigns (tenant_id, name, objective, channel, source, creative_mode, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [tenantId, `${moduleName.charAt(0).toUpperCase()}${moduleName.slice(1)} — Telas Reais`, context, "instagram", "product_screenshot", "product_screenshot", "active"]
    );
    const campaignId = campRes.rows[0]!.id;

    // Slot
    const slotRes = await dbPool.query<{ id: string }>(
      `INSERT INTO growth_campaign_slots (tenant_id, campaign_id, slot_type, slot_index, creative_axis, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [tenantId, campaignId, "feed", 1, `Tela real — ${moduleName}`, "pending_generation"]
    );
    const slotId = slotRes.rows[0]!.id;

    // Asset
    const assetRes = await dbPool.query<{ id: string }>(
      `INSERT INTO growth_assets (tenant_id, campaign_id, asset_type, provider, title, output_url, headline, caption, status, source_pipeline, prompt_input)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
      [tenantId, campaignId, "image", "manual", `${moduleName} — Tela Real #1`, outputUrl, headline, caption, "awaiting_approval", "product_screenshot",
       JSON.stringify({ module: moduleName, source: "hub_real_screen", screenshot_file: screenshotFile })]
    );
    const assetId = assetRes.rows[0]!.id;

    // Vincular
    await dbPool.query(`UPDATE growth_campaign_slots SET asset_id=$1, status='generated' WHERE id=$2`, [assetId, slotId]);

    logger.info({ tenantId, campaignId, slotId, assetId }, "internal/growth/product-screenshot-campaign: ✅");
    res.json({ ok: true, campaign_id: campaignId, slot_id: slotId, asset_id: assetId, output_url: outputUrl, headline, caption });
  } catch (err: any) {
    logger.error({ err: err.message }, "internal/growth/product-screenshot-campaign: erro");
    res.status(500).json({ error: err.message });
  }
});

export default router;
