import {
  pgTable,
  varchar,
  timestamp,
  boolean,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const leadsEspelho = pgTable(
  "leads_espelho",
  {
    id:            varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId:      varchar("tenant_id", { length: 100 }).notNull(), // ⚠️ sem default — sempre fornecer explicitamente
    nome:          varchar("nome", { length: 255 }).notNull(),
    email:         varchar("email", { length: 255 }).notNull(),
    whatsapp:      varchar("whatsapp", { length: 50 }).notNull(),
    agendou:       boolean("agendou").notNull().default(false),
    followupSent:  boolean("followup_sent").notNull().default(false),
    createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantEmailUnique: uniqueIndex("leads_espelho_tenant_email_idx").on(table.tenantId, table.email),
  })
);

export type LeadEspelho = typeof leadsEspelho.$inferSelect;
export type NewLeadEspelho = typeof leadsEspelho.$inferInsert;

// ── Lead AI Events — auditoria de classificações por IA ───────────────────────
import { text, index } from "drizzle-orm/pg-core";

export const leadAiEvents = pgTable(
  "lead_ai_events",
  {
    id:                    varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId:              varchar("tenant_id", { length: 100 }).notNull(),
    phone:                 varchar("phone", { length: 50 }).notNull(),
    leadName:              varchar("lead_name", { length: 255 }),
    messageSnippet:        text("message_snippet"),
    leadType:              varchar("lead_type", { length: 50 }),   // novo_lead | lead_recorrente | lead_reativado | lead_perdido_que_voltou
    intention:             varchar("intention", { length: 50 }),   // compra | duvida | preco | urgencia | desistencia | reclamacao
    objection:             varchar("objection", { length: 50 }),   // preco | tempo | concorrente | nao_precisa | nao_confia | null
    suggestedResponse:     text("suggested_response"),
    route:                 varchar("route", { length: 30 }),        // nurture | rescue | human_handoff | ignore | hold_human
    operationalStatus:     varchar("operational_status", { length: 50 }), // da classificação do lead-context
    promptTokens:          varchar("prompt_tokens", { length: 20 }),
    completionTokens:      varchar("completion_tokens", { length: 20 }),
    createdAt:             timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantPhoneIdx: index("lead_ai_events_tenant_phone_idx").on(table.tenantId, table.phone),
    tenantCreatedIdx: index("lead_ai_events_tenant_created_idx").on(table.tenantId, table.createdAt),
  })
);

export type LeadAiEvent = typeof leadAiEvents.$inferSelect;
export type NewLeadAiEvent = typeof leadAiEvents.$inferInsert;

// ── Lead Conversation State — estado de conversa por lead ──────────────────────
// Uma linha por lead (upsert por tenant_id + phone).
// Controla quantos turnos automáticos já aconteceram e se deve fazer handoff.

export const leadConversationState = pgTable(
  "lead_conversation_state",
  {
    id:                  varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId:            varchar("tenant_id", { length: 100 }).notNull(),
    phone:               varchar("phone", { length: 50 }).notNull(),

    // Estado atual: active | handoff | closed | expired
    conversationStatus:  varchar("conversation_status", { length: 20 }).notNull().default("active"),

    // Controle de turnos automáticos
    turnCount:           integer("turn_count").notNull().default(0),
    maxTurns:            integer("max_turns").notNull().default(3),

    // Objetivo da conversa: qualify | schedule | rescue | objection_handling
    conversationGoal:    varchar("conversation_goal", { length: 50 }),

    // Últimas mensagens para contexto na próxima resposta
    lastAiResponse:      text("last_ai_response"),
    lastLeadMessage:     text("last_lead_message"),

    // Handoff
    handoffRequired:     boolean("handoff_required").notNull().default(false),
    handoffReason:       varchar("handoff_reason", { length: 100 }),

    // Janela de tempo
    windowOpenedAt:      timestamp("window_opened_at", { withTimezone: true }).defaultNow().notNull(),
    lastActivityAt:      timestamp("last_activity_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    // Controle de humano ativo — protege contra automação em cima de atendimento humano
    humanInControl:      boolean("human_in_control").notNull().default(false),
    humanTookOverAt:     timestamp("human_took_over_at", { withTimezone: true }),
    humanAgentName:      varchar("human_agent_name", { length: 255 }),
  },
  (table) => ({
    tenantPhoneUnique: uniqueIndex("lead_conv_state_tenant_phone_idx").on(table.tenantId, table.phone),
  })
);

export type LeadConversationState = typeof leadConversationState.$inferSelect;
export type NewLeadConversationState = typeof leadConversationState.$inferInsert;
