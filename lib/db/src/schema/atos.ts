/**
 * ============================================================
 *  SCHEMA ATOS — Sistema Operacional ATHOS→ATOS
 * ============================================================
 *
 *  BANCO: PostgreSQL local (helium/heliumdb)
 *  Sincronizar: pnpm --filter @workspace/db run push-force
 *
 *  CICLO:
 *  decisão → plano → tasks → dispatcher (n8n) → resultado/erro
 *
 *  STATUS PADRÃO:
 *  pending | ready | running | blocked | completed | failed | cancelled
 *
 *  TASK TYPES:
 *  n8n_workflow_builder | n8n_workflow_activation |
 *  http_integration_test | hub_backend_handoff | supabase_schema_ops
 */

import {
  pgTable, text, timestamp, jsonb, integer, boolean, serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ── Decisões Estratégicas ──────────────────────────────────────────────────
export const atosDecisions = pgTable("atos_decisions", {
  id:            serial("id").primaryKey(),
  title:         text("title").notNull(),
  summary:       text("summary").notNull(),
  justification: text("justification"),
  scope:         text("scope"),
  decisionType:  text("decision_type").default("strategic"),
  companySlug:   text("company_slug"), // ⚠️ sempre fornecer explicitamente — sem default para evitar gravação em tenant errado
  status:        text("status").notNull().default("pending"),
  metadataJson:  jsonb("metadata_json"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Planos de Execução ─────────────────────────────────────────────────────
export const atosPlans = pgTable("atos_plans", {
  id:           serial("id").primaryKey(),
  decisionId:   integer("decision_id").notNull().references(() => atosDecisions.id),
  planTitle:    text("plan_title").notNull(),
  planVersion:  text("plan_version").default("v1"),
  status:       text("status").notNull().default("pending"),
  planJson:     jsonb("plan_json"),
  createdAt:    timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Tasks de Execução ──────────────────────────────────────────────────────
export const atosTasks = pgTable("atos_tasks", {
  id:             serial("id").primaryKey(),
  planId:         integer("plan_id").notNull().references(() => atosPlans.id),
  decisionId:     integer("decision_id").notNull().references(() => atosDecisions.id),
  taskCode:       text("task_code").notNull(),
  title:          text("title").notNull(),
  description:    text("description"),
  taskType:       text("task_type").notNull(),
  executorTarget: text("executor_target"),
  payloadJson:    jsonb("payload_json"),
  dependsOn:      jsonb("depends_on"),
  priority:       integer("priority").default(5),
  status:         text("status").notNull().default("pending"),
  resultJson:     jsonb("result_json"),
  errorJson:      jsonb("error_json"),
  attemptCount:   integer("attempt_count").default(0),
  createdAt:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Log de Erros ───────────────────────────────────────────────────────────
export const atosErrors = pgTable("atos_errors", {
  id:            serial("id").primaryKey(),
  source:        text("source"),
  taskId:        integer("task_id"),
  workflowName:  text("workflow_name"),
  errorMessage:  text("error_message").notNull(),
  errorJson:     jsonb("error_json"),
  createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Entregas do Replit Agent ───────────────────────────────────────────────
export const atosDeliveries = pgTable("atos_deliveries", {
  id:                  serial("id").primaryKey(),
  source:              text("source").notNull().default("replit_agent"),
  title:               text("title").notNull(),
  summary:             text("summary"),
  status:              text("status").notNull().default("delivered"),
  relatedDecisionId:   integer("related_decision_id").references(() => atosDecisions.id),
  relatedPlanId:       integer("related_plan_id").references(() => atosPlans.id),
  relatedTaskId:       integer("related_task_id").references(() => atosTasks.id),
  filesChangedJson:    jsonb("files_changed_json"),
  endpointsChangedJson: jsonb("endpoints_changed_json"),
  workflowsChangedJson: jsonb("workflows_changed_json"),
  databaseChangesJson: jsonb("database_changes_json"),
  validationJson:      jsonb("validation_json"),
  rawOutputJson:       jsonb("raw_output_json"),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Histórico de Eventos por Task (auditoria de ciclo do Replit Agent) ─────
export const atosTaskEvents = pgTable("atos_task_events", {
  id:          serial("id").primaryKey(),
  taskId:      integer("task_id").notNull().references(() => atosTasks.id),
  fromStatus:  text("from_status"),
  toStatus:    text("to_status").notNull(),
  origin:      text("origin").notNull().default("system"), // "athos" | "replit_agent" | "system"
  notes:       text("notes"),
  createdAt:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Zod schemas ────────────────────────────────────────────────────────────
export const insertAtosDecisionSchema = createInsertSchema(atosDecisions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAtosPlanSchema     = createInsertSchema(atosPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAtosTaskSchema     = createInsertSchema(atosTasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAtosErrorSchema    = createInsertSchema(atosErrors).omit({ id: true, createdAt: true });

export type AtosDecision   = typeof atosDecisions.$inferSelect;
export type AtosPlan       = typeof atosPlans.$inferSelect;
export type AtosTask       = typeof atosTasks.$inferSelect;
export type AtosError      = typeof atosErrors.$inferSelect;
export type AtosTaskEvent  = typeof atosTaskEvents.$inferSelect;
export type InsertAtosDecision = z.infer<typeof insertAtosDecisionSchema>;
export type InsertAtosPlan     = z.infer<typeof insertAtosPlanSchema>;
export type InsertAtosTask     = z.infer<typeof insertAtosTaskSchema>;
