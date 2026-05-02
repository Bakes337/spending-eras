import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const spendingErasTable = pgTable("spending_eras", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  description: text("description").notNull(),
  season: text("season").notNull(),
  year: integer("year").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalSpent: numeric("total_spent", { precision: 12, scale: 2 }).notNull(),
  topCategory: text("top_category").notNull(),
  colorTheme: text("color_theme").notNull(),
  emoji: text("emoji").notNull(),
  rank: integer("rank").notNull(),
  categoryBreakdown: text("category_breakdown").notNull().default("[]"),
  topMerchants: text("top_merchants").notNull().default("[]"),
  weeklyAverage: numeric("weekly_average", { precision: 12, scale: 2 }).notNull().default("0"),
  peakWeek: text("peak_week").notNull().default(""),
  funFact: text("fun_fact").notNull().default(""),
  categoryVibe: text("category_vibe").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpendingEraSchema = createInsertSchema(spendingErasTable).omit({ id: true, createdAt: true });
export type InsertSpendingEra = z.infer<typeof insertSpendingEraSchema>;
export type SpendingEra = typeof spendingErasTable.$inferSelect;
