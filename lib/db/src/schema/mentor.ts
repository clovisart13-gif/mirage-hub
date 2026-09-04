import { pgTable, serial, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mentorMessages = pgTable("mentor_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  messageType: text("message_type").notNull().default("text"),
  attachmentUrl: text("attachment_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mirageEnvironmentSnapshot = pgTable("mirage_environment_snapshot", {
  id: serial("id").primaryKey(),
  snapshotData: jsonb("snapshot_data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const mentorSettings = pgTable("mentor_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertMentorMessageSchema = createInsertSchema(mentorMessages).omit({
  id: true,
  createdAt: true,
});

export type MentorMessage = typeof mentorMessages.$inferSelect;
export type InsertMentorMessage = z.infer<typeof insertMentorMessageSchema>;
export type MirageEnvironmentSnapshot = typeof mirageEnvironmentSnapshot.$inferSelect;
export type MentorSetting = typeof mentorSettings.$inferSelect;
