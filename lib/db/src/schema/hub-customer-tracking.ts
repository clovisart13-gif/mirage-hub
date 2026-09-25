import { boolean, date, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Platform-master follow-up only. Contact and subscription data remain in their source systems.
export const hubCustomerTracking = pgTable("hub_customer_tracking", {
  scopeId: text("scope_id").primaryKey(),
  userId: text("user_id").notNull(),
  tenantId: text("tenant_id"),
  contactStatus: text("contact_status").notNull().default("novo"),
  notes: text("notes"),
  nextActionAt: date("next_action_at", { mode: "string" }),
  isTest: boolean("is_test").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertHubCustomerTrackingSchema = createInsertSchema(hubCustomerTracking);
export type InsertHubCustomerTracking = typeof hubCustomerTracking.$inferInsert;
export type HubCustomerTracking = typeof hubCustomerTracking.$inferSelect;