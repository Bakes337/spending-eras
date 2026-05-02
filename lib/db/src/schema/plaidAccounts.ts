import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const plaidAccountsTable = pgTable("plaid_accounts", {
  id: serial("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull().default("depository"),
  mask: text("mask"),
  accessToken: text("access_token").notNull(),
  plaidItemId: text("plaid_item_id").notNull(),
  plaidAccountId: text("plaid_account_id"),
  connectedAt: timestamp("connected_at", { withTimezone: true }).notNull().defaultNow(),
  transactionCount: integer("transaction_count").notNull().default(0),
  syncCursor: text("sync_cursor"),
});

export const insertPlaidAccountSchema = createInsertSchema(plaidAccountsTable).omit({ id: true, connectedAt: true });
export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;
export type PlaidAccount = typeof plaidAccountsTable.$inferSelect;
