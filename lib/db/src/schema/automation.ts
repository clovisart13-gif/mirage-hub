import {
  pgTable,
  varchar,
  text,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const salesAutomationConfig = pgTable(
  "sales_automation_config",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id", { length: 100 }).notNull(),

    // ── CRM ───────────────────────────────────────────────────────────────
    crmProvider: varchar("crm_provider", { length: 50 }).notNull().default("helena"),
    crmBaseUrl:  varchar("crm_base_url", { length: 500 }).notNull().default("https://api.wts.chat"),
    crmApiKey:   varchar("crm_api_key", { length: 500 }),

    // ── Pipelines ─────────────────────────────────────────────────────────
    pipelineVendasId:   varchar("pipeline_vendas_id", { length: 100 }),
    pipelineVendasNome: varchar("pipeline_vendas_nome", { length: 255 }),
    pipelineNutricaoId:   varchar("pipeline_nutricao_id", { length: 100 }),
    pipelineNutricaoNome: varchar("pipeline_nutricao_nome", { length: 255 }),
    pipelineStarterId:   varchar("pipeline_starter_id", { length: 100 }),
    pipelineStarterNome: varchar("pipeline_starter_nome", { length: 255 }),
    pipelinePosVendasId:   varchar("pipeline_pos_vendas_id", { length: 100 }),
    pipelinePosVendasNome: varchar("pipeline_pos_vendas_nome", { length: 255 }),

    // ── Estágios (JSON array: [{id, nome, tipo: 'ganho'|'perdido'|'inicio'|'outro'}]) ─
    estagios: jsonb("estagios"),

    // ── WhatsApp — lista dinâmica de instâncias (N por tenant) ────────────
    // Estrutura de cada item:
    // { id, nome, canal, baseUrl?, instanceId?, token?, clientToken?, usos[] }
    // usos: "atendimento" | "confirmacao" | "campanhas" | "robo" | "outro"
    whatsappInstances: jsonb("whatsapp_instances"),

    // ── Templates de mensagem ─────────────────────────────────────────────
    msgConfirmacao:   text("msg_confirmacao"),
    msgLembrete:      text("msg_lembrete"),
    msgReengajamento: text("msg_reengajamento"),
    msgResgate:       text("msg_resgate"),

    // ── Estado ────────────────────────────────────────────────────────────
    ativo: boolean("ativo").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantUnique: uniqueIndex("sales_automation_config_tenant_idx").on(t.tenantId),
  })
);

export type SalesAutomationConfig = typeof salesAutomationConfig.$inferSelect;
export type NewSalesAutomationConfig = typeof salesAutomationConfig.$inferInsert;
