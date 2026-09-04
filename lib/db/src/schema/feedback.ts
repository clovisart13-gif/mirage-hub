import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const feedback = pgTable("feedback", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }),
  tenantName: varchar("tenant_name", { length: 255 }),
  userEmail: varchar("user_email", { length: 255 }),
  type: varchar("type", { length: 20 }).notNull().default("sugestao"), // bug | sugestao | melhoria
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  pageUrl: varchar("page_url", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("novo"), // novo | em_analise | resolvido
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const errorLogs = pgTable("error_logs", {
  id: varchar("id", { length: 36 }).primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: varchar("tenant_id", { length: 36 }),
  userEmail: varchar("user_email", { length: 255 }),
  errorMessage: text("error_message").notNull(),
  stack: text("stack"),
  pageUrl: varchar("page_url", { length: 500 }),
  userAgent: varchar("user_agent", { length: 500 }),
  context: text("context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
