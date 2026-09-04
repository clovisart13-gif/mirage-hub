import { pgTable, uuid, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

export const texintelCompanies = pgTable("texintel_companies", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  cnpj:                text("cnpj").notNull().unique(),
  razao_social:        text("razao_social"),
  nome_fantasia:       text("nome_fantasia"),
  situacao:            text("situacao"),
  abertura:            text("abertura"),
  atividade_principal: text("atividade_principal"),
  municipio:           text("municipio"),
  uf:                  text("uf"),
  website:             text("website"),
  // Enrichment (output do Claude)
  dores:               jsonb("dores").$type<string[]>(),
  faturamento_estimado: text("faturamento_estimado"),
  fit_crm:             integer("fit_crm"),
  fit_erp:             integer("fit_erp"),
  fit_plm:             integer("fit_plm"),
  fit_comunidade:      integer("fit_comunidade"),
  modulo_recomendado:  text("modulo_recomendado"),
  justificativa:       text("justificativa"),
  raw_analysis:        text("raw_analysis"),
  scraping_content:    text("scraping_content"),
  status:              text("status").default("pending"),  // pending | done | error
  error_message:       text("error_message"),
  processed_at:        timestamp("processed_at", { withTimezone: true }),
  created_at:          timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type TexintelCompany     = typeof texintelCompanies.$inferSelect;
export type NewTexintelCompany  = typeof texintelCompanies.$inferInsert;
