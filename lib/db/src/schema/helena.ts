import {
  pgTable,
  varchar,
  timestamp,
  numeric,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const helenaCardMigrations = pgTable("helena_card_migrations", {
  id:               varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tenantId:         varchar("tenant_id", { length: 100 }).notNull().default(""),
  cardId:           varchar("card_id", { length: 36 }).notNull(),
  cardTitle:        varchar("card_title", { length: 500 }).notNull(),
  cardKey:          varchar("card_key", { length: 50 }),
  outcome:          varchar("outcome", { length: 10 }).notNull(), // 'WON' | 'LOST'
  sourceStepId:     varchar("source_step_id", { length: 36 }).notNull(),
  sourceStepTitle:  varchar("source_step_title", { length: 255 }),
  contactName:      varchar("contact_name", { length: 255 }),
  contactPhone:     varchar("contact_phone", { length: 100 }),
  monetaryAmount:   numeric("monetary_amount", { precision: 12, scale: 2 }),
  destinationCardId: varchar("destination_card_id", { length: 36 }),
  migratedAt:       timestamp("migrated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type HelenaCardMigration = typeof helenaCardMigrations.$inferSelect;
export type NewHelenaCardMigration = typeof helenaCardMigrations.$inferInsert;
