/**
 * ============================================================
 *  SCHEMA ATHOS MEMORY — Base de Consciência Estratégica 360°
 * ============================================================
 *
 *  Separada do histórico de chat (mentor_messages).
 *  Persiste conhecimento estruturado sobre empresas, mercados,
 *  decisões e snapshots executivos para o ATHOS operar como
 *  mentor com memória contínua.
 *
 *  Sincronizar: pnpm --filter @workspace/db run push-force
 */

import {
  pgTable, serial, text, timestamp, jsonb, numeric, integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── 1. Company Master Blueprints ──────────────────────────────────────────────
// Blueprint estratégico principal por empresa. Fonte oficial de identidade.
export const companyMasterBlueprints = pgTable("company_master_blueprints", {
  id:                  serial("id").primaryKey(),
  companySlug:         text("company_slug").notNull().unique(),
  companyName:         text("company_name").notNull(),
  type:                text("type").notNull().default("other"), // mirage | r2pb | other
  brandIdentityJson:   jsonb("brand_identity_json"),
  positioningJson:     jsonb("positioning_json"),
  audienceJson:        jsonb("audience_json"),
  offersJson:          jsonb("offers_json"),
  channelsJson:        jsonb("channels_json"),
  operationsJson:      jsonb("operations_json"),
  goalsJson:           jsonb("goals_json"),
  objectionsJson:      jsonb("objections_json"),
  competitorsJson:     jsonb("competitors_json"),
  visualSystemJson:    jsonb("visual_system_json"),
  strategicNotesJson:  jsonb("strategic_notes_json"),
  confidenceScore:     numeric("confidence_score", { precision: 4, scale: 1 }).default("0"),
  status:              text("status").notNull().default("draft"), // draft | validated | official
  updatedBy:           text("updated_by"),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── 2. Market Intelligence Profiles ──────────────────────────────────────────
// Dossiês de mercado / setor. Permite múltiplos domínios independentes.
export const marketIntelligenceProfiles = pgTable("market_intelligence_profiles", {
  id:                   serial("id").primaryKey(),
  domainKey:            text("domain_key").notNull().unique(), // saas_confeccao, private_label_premium, etc.
  title:                text("title").notNull(),
  marketSummaryJson:    jsonb("market_summary_json"),
  customerBehaviorJson: jsonb("customer_behavior_json"),
  painsJson:            jsonb("pains_json"),
  opportunitiesJson:    jsonb("opportunities_json"),
  threatsJson:          jsonb("threats_json"),
  competitorsJson:      jsonb("competitors_json"),
  trendsJson:           jsonb("trends_json"),
  terminologyJson:      jsonb("terminology_json"),
  confidenceScore:      numeric("confidence_score", { precision: 4, scale: 1 }).default("0"),
  status:               text("status").notNull().default("draft"),
  createdAt:            timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── 3. Strategic Memory Entries ───────────────────────────────────────────────
// Memória granular e pesquisável: decisões, aprendizados, contextos.
export const strategicMemoryEntries = pgTable("strategic_memory_entries", {
  id:              serial("id").primaryKey(),
  entityType:      text("entity_type").notNull(), // company | market | product | decision
  entityKey:       text("entity_key").notNull(),  // company_slug ou domain_key
  category:        text("category").notNull(),    // positioning | audience | channel | ops | risk | decision
  title:           text("title").notNull(),
  content:         text("content").notNull(),
  sourceType:      text("source_type").notNull().default("manual"), // manual | chat_synthesis | snapshot | analysis
  confidenceLevel: text("confidence_level").notNull().default("medium"), // low | medium | high | verified
  tags:            jsonb("tags"),
  effectiveFrom:   timestamp("effective_from", { withTimezone: true }),
  effectiveUntil:  timestamp("effective_until", { withTimezone: true }),
  createdAt:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:       timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── 4. Executive Snapshots ────────────────────────────────────────────────────
// Snapshot vivo e resumido por empresa. Atualizado manualmente ou por síntese.
export const executiveSnapshots = pgTable("executive_snapshots", {
  id:               serial("id").primaryKey(),
  companySlug:      text("company_slug").notNull().unique(),
  summaryJson:      jsonb("summary_json"),
  prioritiesJson:   jsonb("priorities_json"),
  risksJson:        jsonb("risks_json"),
  opportunitiesJson: jsonb("opportunities_json"),
  metricsJson:      jsonb("metrics_json"),
  currentStage:     text("current_stage"),
  status:           text("status").notNull().default("draft"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Zod schemas ───────────────────────────────────────────────────────────────

export const insertCompanyMasterBlueprintSchema = createInsertSchema(companyMasterBlueprints).omit({
  id: true, createdAt: true, updatedAt: true,
});
export const insertMarketIntelligenceProfileSchema = createInsertSchema(marketIntelligenceProfiles).omit({
  id: true, createdAt: true, updatedAt: true,
});
export const insertStrategicMemoryEntrySchema = createInsertSchema(strategicMemoryEntries).omit({
  id: true, createdAt: true, updatedAt: true,
});
export const insertExecutiveSnapshotSchema = createInsertSchema(executiveSnapshots).omit({
  id: true, createdAt: true, updatedAt: true,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompanyMasterBlueprint       = typeof companyMasterBlueprints.$inferSelect;
export type MarketIntelligenceProfile    = typeof marketIntelligenceProfiles.$inferSelect;
export type StrategicMemoryEntry         = typeof strategicMemoryEntries.$inferSelect;
export type ExecutiveSnapshot            = typeof executiveSnapshots.$inferSelect;
export type InsertCompanyMasterBlueprint    = z.infer<typeof insertCompanyMasterBlueprintSchema>;
export type InsertMarketIntelligenceProfile = z.infer<typeof insertMarketIntelligenceProfileSchema>;
export type InsertStrategicMemoryEntry      = z.infer<typeof insertStrategicMemoryEntrySchema>;
export type InsertExecutiveSnapshot         = z.infer<typeof insertExecutiveSnapshotSchema>;
