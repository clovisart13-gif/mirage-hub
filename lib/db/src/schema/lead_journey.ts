import {
  pgTable,
  varchar,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── Status oficiais da jornada ────────────────────────────────────────────────
export const JOURNEY_STATUSES = [
  "novo",
  "aguardando_formulario",
  "em_triagem",
  "aprovado_vendas",
  "nutricao",
  "fora_de_perfil",
  "suporte",
  "producao",
  "fornecedor",
  "reativacao",
  "pos_venda",
  "fechado",
  "perdido",
] as const;

export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];

// ── Tipos de evento da jornada ────────────────────────────────────────────────
export const JOURNEY_EVENT_TYPES = [
  "mensagem_recebida",
  "status_mudado",
  "enviado_pipeline",
  "entrou_nutricao",
  "handoff_humano",
  "formulario_preenchido",
  "aprovado",
  "reprovado",
  "reativado",
  "fechado",
  "perdido",
  "origem_registrada",
  "etapa_atualizada",
] as const;

export type JourneyEventType = (typeof JOURNEY_EVENT_TYPES)[number];

// ── lead_journey — fonte soberana de estado da jornada ────────────────────────
// Uma linha por lead (tenant_id + phone). Upsert sempre.
// Esta tabela é a fonte de verdade que roteadores, n8n e relatórios consultam.

export const leadJourney = pgTable(
  "lead_journey",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),

    // Identificação
    nome: varchar("nome", { length: 255 }),
    origem: varchar("origem", { length: 100 }),        // whatsapp_zapi | whatsapp_meta | formulario | manual
    canalAtual: varchar("canal_atual", { length: 50 }), // whatsapp | email | telefone

    // Estado soberano da jornada
    status: varchar("status", { length: 50 }).notNull().default("novo"),
    etapaAtual: varchar("etapa_atual", { length: 255 }),
    perguntaPendente: text("pergunta_pendente"),

    // Roteamento
    pipelineAtual: varchar("pipeline_atual", { length: 100 }),
    departamentoDestino: varchar("departamento_destino", { length: 100 }),

    // Responsável humano
    responsavelHumano: varchar("responsavel_humano", { length: 255 }),
    responsavelId: varchar("responsavel_id", { length: 100 }),

    // Timestamps
    ultimaInteracao: timestamp("ultima_interacao", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantPhoneUnique: uniqueIndex("lead_journey_tenant_phone_idx").on(table.tenantId, table.phone),
    tenantStatusIdx: index("lead_journey_tenant_status_idx").on(table.tenantId, table.status),
    tenantUpdatedIdx: index("lead_journey_tenant_updated_idx").on(table.tenantId, table.updatedAt),
  })
);

export type LeadJourney = typeof leadJourney.$inferSelect;
export type NewLeadJourney = typeof leadJourney.$inferInsert;

// ── lead_journey_events — histórico de transições e auditoria ─────────────────
// Append-only. Registra tudo que acontece com o lead: mensagens, mudanças de
// status, handoffs, envios de pipeline, entrada em nutrição, etc.

export const leadJourneyEvents = pgTable(
  "lead_journey_events",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    tenantId: varchar("tenant_id", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),

    evento: varchar("evento", { length: 100 }).notNull(),
    statusAnterior: varchar("status_anterior", { length: 50 }),
    statusNovo: varchar("status_novo", { length: 50 }),
    dados: jsonb("dados"),            // payload livre para contexto adicional
    origem: varchar("origem", { length: 100 }),   // n8n | formulario | api | manual
    criadoPor: varchar("criado_por", { length: 100 }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tenantPhoneIdx: index("lead_journey_events_tenant_phone_idx").on(table.tenantId, table.phone),
    tenantCreatedIdx: index("lead_journey_events_tenant_created_idx").on(table.tenantId, table.createdAt),
  })
);

export type LeadJourneyEvent = typeof leadJourneyEvents.$inferSelect;
export type NewLeadJourneyEvent = typeof leadJourneyEvents.$inferInsert;
