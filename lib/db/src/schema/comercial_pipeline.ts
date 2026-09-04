import {
  pgTable,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── comercial_leads ───────────────────────────────────────────────────────────
// Registra leads que entraram no pipeline humano via handoff do n8n.
// Upsert por (tenant_id, phone) — phone é o identificador único do lead.
// Extensível: pipeline_key e stage_key são strings livres, definidas pelo n8n.

export const comercialLeads = pgTable(
  "comercial_leads",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId:      varchar("tenant_id", { length: 100 }).notNull(),

    // Identificação do lead
    leadName:      varchar("lead_name", { length: 255 }),
    phone:         varchar("phone", { length: 50 }).notNull(),
    email:         varchar("email", { length: 255 }),

    // Canal e origem
    canal:         varchar("canal", { length: 50 }),   // zapi | meta_oficial | wts | etc.
    origem:        varchar("origem", { length: 100 }),  // resgate | confirmacao | robo | etc.
    handoffReason: varchar("handoff_reason", { length: 100 }), // lead_reativado | sem_resposta | etc.

    // Última mensagem recebida
    mensagemRecebida: text("mensagem_recebida"),

    // Pipeline / estágio atual
    pipelineKey:   varchar("pipeline_key", { length: 100 }),  // ex: comercial_humano
    stageKey:      varchar("stage_key", { length: 100 }),      // ex: aguardando_atendimento

    // Responsável humano (opcional, preenchido pelo n8n ou pelo Hub)
    responsavelId: varchar("responsavel_id", { length: 100 }),
    responsavelNome: varchar("responsavel_nome", { length: 255 }),

    // Status do atendimento — controla elegibilidade para automação.
    // "aberto": em atendimento humano, NENHUMA automação pode falar com o lead.
    // "fechado": humano concluiu a conversa, lead volta a ficar elegível para automação.
    status:        varchar("status", { length: 20 }).default("aberto").notNull(),
    closedAt:      timestamp("closed_at", { withTimezone: true }),
    closedBy:      varchar("closed_by", { length: 100 }),

    // Rastreabilidade
    lastHandoffAt: timestamp("last_handoff_at", { withTimezone: true }).defaultNow(),
    createdAt:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt:     timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    tenantPhoneUnique: uniqueIndex("comercial_leads_tenant_phone_idx").on(t.tenantId, t.phone),
  })
);

export type ComercialLead = typeof comercialLeads.$inferSelect;
export type NewComercialLead = typeof comercialLeads.$inferInsert;
