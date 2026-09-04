import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Fila de handoff entre agentes (ATHOS → Replit, etc.)
 * Permite que ATHOS registre tarefas estruturadas para o Replit executar
 * sem depender de Clóvis como intermediário manual.
 */
export const agentHandoffs = pgTable("agent_handoffs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

  // Status do ciclo
  status: text("status").notNull().default("pending"),
  // pending | sent | in_progress | done | failed

  // Agentes
  originAgent: text("origin_agent").notNull().default("athos"),
  targetAgent: text("target_agent").notNull().default("replit"),

  // Tarefa
  title: text("title").notNull(),
  context: text("context"),
  instruction: text("instruction").notNull(),
  relevantFiles: jsonb("relevant_files"),   // string[] de paths/nomes
  acceptanceCriteria: text("acceptance_criteria"),

  // Resultado (preenchido pelo executor)
  resultSummary: text("result_summary"),
  resultPayload: jsonb("result_payload"),
  errorMessage: text("error_message"),

  // Metadados opcionais
  priority: text("priority").default("normal"),   // low | normal | high | critical
  tags: jsonb("tags"),                             // string[]
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});
