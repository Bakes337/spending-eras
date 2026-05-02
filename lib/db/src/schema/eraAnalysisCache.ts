import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const eraAnalysisCacheTable = pgTable("era_analysis_cache", {
  singletonKey: text("singleton_key").primaryKey().notNull().default("default"),
  transactionCount: integer("transaction_count").notNull(),
  promptVersion: text("prompt_version").notNull().default("unknown"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EraAnalysisCache = typeof eraAnalysisCacheTable.$inferSelect;
