import { pgTable, text, integer, jsonb, timestamp, uuid, pgEnum, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const growthAssetTypeEnum = pgEnum("growth_asset_type", [
  "copy",
  "headline",
  "script",
  "image",
  "video",
  "cta",
  "caption",
  "hook",
]);

export const growthProviderEnum = pgEnum("growth_provider", [
  "openai",
  "heygen",
  "midjourney",
  "banana",
  "manual",
]);

export const growthAssetStatusEnum = pgEnum("growth_asset_status", [
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

export const growthRunTypeEnum = pgEnum("growth_run_type", [
  "generate",
  "poll",
  "retry",
  "fallback",
]);

export const growthRunStatusEnum = pgEnum("growth_run_status", [
  "queued",
  "running",
  "success",
  "failed",
]);

export const growthCampaigns = pgTable("growth_campaigns", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  objective: text("objective"),
  channel: text("channel"),
  status: text("status").notNull().default("active"),
  createdBy: text("created_by"),
  /** Metadados estruturados da campanha-mãe: quotas, segmentos, ratios, períodos */
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const growthAssets = pgTable("growth_assets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  brandId: uuid("brand_id"),
  campaignId: uuid("campaign_id"),
  assetType: growthAssetTypeEnum("asset_type").notNull(),
  provider: growthProviderEnum("provider").notNull(),
  title: text("title"),
  promptInput: jsonb("prompt_input"),
  outputData: jsonb("output_data"),
  outputUrl: text("output_url"),
  status: growthAssetStatusEnum("status").notNull().default("requested"),
  versionNumber: integer("version_number").notNull().default(1),
  parentAssetId: uuid("parent_asset_id"),
  errorMessage: text("error_message"),
  costEstimateCents: integer("cost_estimate_cents"),
  generationTimeMs: integer("generation_time_ms"),
  /** Legenda/caption do post para Instagram (gerada junto com o criativo) */
  caption: text("caption"),
  /** Headline curta sobreposta visualmente na imagem (máx 6 palavras) */
  headline: text("headline"),
  /** CTA do post, ex: "Fale com um especialista" */
  cta: text("cta"),
  /** true quando composição final (logo + footer) foi aplicada */
  compositionApplied: boolean("composition_applied").notNull().default(false),
  /** "legacy" = pipeline antigo sem composição; "v2" = pipeline com branding */
  sourcePipeline: text("source_pipeline").notNull().default("legacy"),
  /** Destino de publicação: feed | story | reel */
  publishDestination: text("publish_destination"),
  /** Data/hora de agendamento interno */
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  /** Data/hora de publicação efetivada */
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdBy: text("created_by"),
  approvedBy: text("approved_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const growthAssetVersions = pgTable("growth_asset_versions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  assetId: uuid("asset_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  promptInput: jsonb("prompt_input"),
  outputData: jsonb("output_data"),
  outputUrl: text("output_url"),
  changeReason: text("change_reason"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

/**
 * Slots de campanha — a campanha define o mix de formatos antes da geração.
 * Cada slot representa uma "vaga" para um criativo: feed, story ou reel.
 * O criativo nasce com o formato já definido, não escolhido depois.
 */
export const growthCampaignSlots = pgTable("growth_campaign_slots", {
  id:             uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId:       text("tenant_id").notNull(),
  campaignId:     uuid("campaign_id").notNull(),
  /** feed | story | reel */
  slotType:       text("slot_type").notNull(),
  slotIndex:      integer("slot_index").notNull().default(1),
  /** YYYY-MM-DD — data de publicação planejada */
  plannedDate:    text("planned_date"),
  /** autoridade_fabrica | lifestyle_nicho */
  creativeAxis:   text("creative_axis"),
  /** fábrica | streetwear | fitness | alfaiataria | genérico */
  segment:        text("segment"),
  objective:      text("objective"),
  /** true = fora da cota principal (reserva/backup) */
  isExtra:        boolean("is_extra").notNull().default(false),
  /**
   * pending_generation | generating | generated |
   * approved | scheduled | published | rejected
   */
  status:         text("status").notNull().default("pending_generation"),
  /** Aponta para outro slot cujo criativo foi rejeitado — rastreia regenerações */
  regenerationOf: uuid("regeneration_of"),
  /** Asset atual vinculado a este slot */
  assetId:        uuid("asset_id"),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const growthProviderRuns = pgTable("growth_provider_runs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  campaignId: uuid("campaign_id"),
  assetId: uuid("asset_id"),
  provider: growthProviderEnum("provider").notNull(),
  runType: growthRunTypeEnum("run_type").notNull().default("generate"),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  status: growthRunStatusEnum("status").notNull().default("queued"),
  externalJobId: text("external_job_id"),
  errorMessage: text("error_message"),
  costEstimateCents: integer("cost_estimate_cents"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
