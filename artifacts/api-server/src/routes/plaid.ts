import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, plaidAccountsTable, transactionsTable } from "@workspace/db";
import {
  CreateLinkTokenResponse,
  ExchangeTokenBody,
  ExchangeTokenResponse,
  GetAccountsResponse,
  SyncTransactionsResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const PLAID_CLIENT_ID = process.env["PLAID_CLIENT_ID"];
// Normalize env: accept "PRODUCTION" or "production", default to "production"
const PLAID_ENV = (process.env["PLAID_ENV"] ?? "production").toLowerCase();
const PLAID_SECRET =
  PLAID_ENV === "sandbox"
    ? process.env["PLAID_SECRET_SANDBOX"]
    : process.env["PLAID_SECRET_PROD"];

const isPlaidConfigured = !!(PLAID_CLIENT_ID && PLAID_SECRET);

if (!isPlaidConfigured) {
  logger.warn(
    "PLAID_CLIENT_ID or PLAID_SECRET not set — running in dummy/placeholder mode.",
  );
} else {
  logger.info({ env: PLAID_ENV }, "Plaid configured");
}

// Initialize the Plaid client once at module load (not per-request)
async function getPlaidClient() {
  const { PlaidApi, PlaidEnvironments, Configuration } = await import("plaid");

  const envKey = PLAID_ENV as keyof typeof PlaidEnvironments;
  const basePath = PlaidEnvironments[envKey] ?? PlaidEnvironments.production;

  const config = new Configuration({
    basePath,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": PLAID_CLIENT_ID!,
        "PLAID-SECRET": PLAID_SECRET!,
        "Plaid-Version": "2020-09-14",
      },
    },
  });

  return new PlaidApi(config);
}

router.post("/plaid/create-link-token", async (req, res): Promise<void> => {
  if (!isPlaidConfigured) {
    res.json(
      CreateLinkTokenResponse.parse({
        linkToken: "link-sandbox-placeholder-token-for-demo",
        expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    );
    return;
  }

  try {
    const { Products, CountryCode } = await import("plaid");
    const plaidClient = await getPlaidClient();

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "spending-eras-user" },
      client_name: "Spending Eras",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      transactions: { days_requested: 730 },
    });

    res.json(
      CreateLinkTokenResponse.parse({
        linkToken: response.data.link_token,
        expiration: response.data.expiration,
      }),
    );
  } catch (err: any) {
    const plaidError = err?.response?.data;
    req.log.error({ err, plaidError }, "Failed to create Plaid link token");
    res.status(500).json({
      error: plaidError?.error_message ?? "Failed to create link token",
    });
  }
});

router.post("/plaid/exchange-token", async (req, res): Promise<void> => {
  const parsed = ExchangeTokenBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { publicToken, institutionName } = parsed.data;

  if (!isPlaidConfigured) {
    const [account] = await db
      .insert(plaidAccountsTable)
      .values({
        institutionName: institutionName ?? "Demo Bank",
        accountName: "Checking ••••4242",
        accountType: "depository",
        mask: "4242",
        accessToken: "access-sandbox-placeholder",
        plaidItemId: `item-demo-${Date.now()}`,
        transactionCount: 0,
      })
      .returning();
    res.json(ExchangeTokenResponse.parse({ success: true, accountId: account.id }));
    return;
  }

  try {
    const plaidClient = await getPlaidClient();

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Fetch ALL accounts on this item (a single Plaid item can expose multiple accounts)
    const authResponse = await plaidClient.accountsGet({ access_token: accessToken });
    const plaidAccounts = authResponse.data.accounts;

    if (plaidAccounts.length === 0) {
      res.status(400).json({ error: "No accounts found for this institution." });
      return;
    }

    // Insert one row per account — they all share the same access token and item ID
    let firstId = 0;
    for (const acct of plaidAccounts) {
      const [row] = await db
        .insert(plaidAccountsTable)
        .values({
          institutionName: institutionName ?? "Unknown Bank",
          accountName: acct.name,
          accountType: acct.type ?? "depository",
          mask: acct.mask ?? null,
          accessToken,
          plaidItemId: itemId,
          plaidAccountId: acct.account_id,
          transactionCount: 0,
        })
        .returning();
      if (firstId === 0) firstId = row.id;
    }

    req.log.info({ itemId, accountCount: plaidAccounts.length }, "Plaid accounts saved");
    res.json(ExchangeTokenResponse.parse({ success: true, accountId: firstId }));
  } catch (err: any) {
    const plaidError = err?.response?.data;
    req.log.error({ err, plaidError }, "Failed to exchange Plaid token");
    res.status(500).json({
      error: plaidError?.error_message ?? "Failed to exchange token",
    });
  }
});

router.get("/plaid/accounts", async (_req, res): Promise<void> => {
  const accounts = await db.select().from(plaidAccountsTable);
  res.json(
    GetAccountsResponse.parse(
      accounts.map((a) => ({
        id: a.id,
        institutionName: a.institutionName,
        accountName: a.accountName,
        accountType: a.accountType,
        mask: a.mask,
        connectedAt: a.connectedAt.toISOString(),
        transactionCount: a.transactionCount,
      })),
    ),
  );
});

router.post("/plaid/transactions/sync", async (req, res): Promise<void> => {
  const accounts = await db.select().from(plaidAccountsTable);
  if (accounts.length === 0) {
    res.status(400).json({ error: "No accounts connected. Connect a bank account first." });
    return;
  }

  if (!isPlaidConfigured) {
    res.json(SyncTransactionsResponse.parse({ added: 0, modified: 0, removed: 0, total: 0 }));
    return;
  }

  try {
    const plaidClient = await getPlaidClient();

    // Two years back
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    const startDateStr = startDate.toISOString().split("T")[0]!;
    const endDateStr = new Date().toISOString().split("T")[0]!;

    let totalAdded = 0;

    // Build a map from Plaid account_id → our internal DB row id
    // Multiple accounts can share one access_token (same Plaid item)
    const plaidAccountIdToInternalId = new Map<string, number>();
    for (const account of accounts) {
      if (account.plaidAccountId) {
        plaidAccountIdToInternalId.set(account.plaidAccountId, account.id);
      }
    }

    // Deduplicate by access_token — one Plaid item = one sync call.
    // All three maps are built over ALL accounts before any sync loop runs so
    // they are order-independent (DB query order is non-deterministic without ORDER BY).
    const seenTokens = new Set<string>();

    // Fallback account id for transactions that can't be mapped by plaid_account_id
    const fallbackId = new Map<string, number>();
    // Canonical row for cursor storage — always the lowest id for this token
    const cursorRowId = new Map<string, number>();
    // The stored cursor for this token — taken from whichever account has one
    const cursorByToken = new Map<string, string | undefined>();

    for (const account of accounts) {
      const token = account.accessToken;
      // lowest id wins as canonical cursor row
      if (!cursorRowId.has(token) || account.id < cursorRowId.get(token)!) {
        cursorRowId.set(token, account.id);
      }
      if (!fallbackId.has(token)) {
        fallbackId.set(token, account.id);
      }
      // grab cursor from whichever account row has one stored
      if (!cursorByToken.has(token) && account.syncCursor) {
        cursorByToken.set(token, account.syncCursor);
      }
    }

    for (const account of accounts) {
      if (account.accessToken === "access-sandbox-placeholder") continue;
      if (seenTokens.has(account.accessToken)) continue;
      seenTokens.add(account.accessToken);

      // transactionsSync is cursor-based. Plaid loads the full 730-day history
      // asynchronously after a new item is connected — repeated syncs pick up
      // more history as it becomes available. We persist the cursor so each call
      // only fetches what's new since the last sync.
      let cursor: string | undefined = cursorByToken.get(account.accessToken);
      let hasMore = true;

      while (hasMore) {
        const syncResponse = await plaidClient.transactionsSync({
          access_token: account.accessToken,
          ...(cursor ? { cursor } : {}),
          options: { include_personal_finance_category: true },
        });

        const { added, next_cursor, has_more } = syncResponse.data;
        cursor = next_cursor;
        hasMore = has_more;

        // Persist the cursor after every page so an interruption mid-pagination
        // doesn't force a full re-fetch from the beginning next time.
        await db
          .update(plaidAccountsTable)
          .set({ syncCursor: cursor })
          .where(eq(plaidAccountsTable.id, cursorRowId.get(account.accessToken)!));

        // Only keep discretionary spending within the 730-day window.
        // Excluded: income, transfers, credit card/loan payments (double-counting),
        // rent (fixed cost, not part of the spending story), and bank fees.
        const EXCLUDED_CATEGORIES = new Set([
          "INCOME", "TRANSFER_IN", "TRANSFER_OUT",
          "LOAN_PAYMENTS", "RENT_AND_UTILITIES", "BANK_FEES",
        ]);
        const spending = added.filter((t) => {
          const rawCat = t.personal_finance_category?.primary ?? "";
          return !EXCLUDED_CATEGORIES.has(rawCat) && t.amount > 0 && t.date >= startDateStr;
        });

        for (const txn of spending) {
          const rawCategory = txn.personal_finance_category?.primary ?? "";
          const category = rawCategory.replace(/_/g, " ") || txn.category?.[0] || "Other";

          const internalAccountId =
            plaidAccountIdToInternalId.get(txn.account_id) ??
            fallbackId.get(account.accessToken)!;

          const city = txn.location?.city ?? null;
          const state = txn.location?.region ?? null;
          const country = txn.location?.country ?? null;
          const lat = txn.location?.lat != null ? String(txn.location.lat) : null;
          const lon = txn.location?.lon != null ? String(txn.location.lon) : null;

          await db
            .insert(transactionsTable)
            .values({
              plaidTransactionId: txn.transaction_id,
              accountId: internalAccountId,
              amount: txn.amount.toFixed(2),
              date: txn.date,
              name: txn.name,
              merchantName: txn.merchant_name ?? null,
              category,
              subcategory: txn.personal_finance_category?.detailed ?? null,
              city,
              state,
              country,
              lat,
              lon,
            })
            .onConflictDoUpdate({
              target: transactionsTable.plaidTransactionId,
              set: { city, state, country, lat, lon },
            });

          totalAdded += 1;
        }
      }

      // Update transaction count for each account in this item
      for (const acct of accounts.filter((a) => a.accessToken === account.accessToken)) {
        const rows = await db
          .select()
          .from(transactionsTable)
          .where(eq(transactionsTable.accountId, acct.id));

        await db
          .update(plaidAccountsTable)
          .set({ transactionCount: rows.length })
          .where(eq(plaidAccountsTable.id, acct.id));
      }
    }

    res.json(
      SyncTransactionsResponse.parse({
        added: totalAdded,
        modified: 0,
        removed: 0,
        total: totalAdded,
      }),
    );
  } catch (err: any) {
    const plaidError = err?.response?.data;
    req.log.error({ err, plaidError }, "Failed to sync transactions");
    res.status(500).json({
      error: plaidError?.error_message ?? "Failed to sync transactions",
    });
  }
});

export default router;
