import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { db, spendingErasTable, plaidAccountsTable } from "@workspace/db";
import {
  GetErasResponse,
  AnalyzeErasResponse,
  GetEraParams,
  GetEraResponse,
  GetErasSummaryResponse,
} from "@workspace/api-zod";
import { runEraAnalysis } from "../lib/analyzeEras";

const router: IRouter = Router();


function parseEra(era: typeof spendingErasTable.$inferSelect) {
  return {
    id: era.id,
    name: era.name,
    tagline: era.tagline,
    description: era.description,
    season: era.season,
    year: era.year,
    startDate: era.startDate,
    endDate: era.endDate,
    totalSpent: parseFloat(era.totalSpent),
    topCategory: era.topCategory,
    colorTheme: era.colorTheme,
    emoji: era.emoji,
    rank: era.rank,
    categoryVibe: era.categoryVibe ?? "",
    categoryBreakdown: JSON.parse(era.categoryBreakdown),
    topMerchants: JSON.parse(era.topMerchants),
    weeklyAverage: parseFloat(era.weeklyAverage ?? "0"),
    peakWeek: era.peakWeek ?? "",
    funFact: era.funFact ?? "",
  };
}

function toEraListRow(e: typeof spendingErasTable.$inferSelect) {
  const breakdown: Array<{ category: string }> = (() => {
    try { return JSON.parse(e.categoryBreakdown) as Array<{ category: string }>; } catch { return []; }
  })();
  const topCategories = breakdown.slice(0, 3).map((c) => c.category);

  const merchants: Array<{ name: string; amount: number; visits: number; category: string }> = (() => {
    try { return JSON.parse(e.topMerchants) as Array<{ name: string; amount: number; visits: number; category: string }>; } catch { return []; }
  })();

  return {
    id: e.id,
    name: e.name,
    tagline: e.tagline,
    description: e.description,
    season: e.season,
    year: e.year,
    startDate: e.startDate,
    endDate: e.endDate,
    totalSpent: parseFloat(e.totalSpent),
    topCategory: e.topCategory,
    colorTheme: e.colorTheme,
    emoji: e.emoji,
    rank: e.rank,
    categoryVibe: e.categoryVibe ?? "",
    topCategories,
    topMerchants: merchants.slice(0, 3),
  };
}

// Chronological order — oldest era first so the timeline reads naturally
router.get("/eras", async (_req, res): Promise<void> => {
  const eras = await db
    .select()
    .from(spendingErasTable)
    .orderBy(asc(spendingErasTable.startDate));

  res.json(GetErasResponse.parse(eras.map(toEraListRow)));
});

router.post("/eras/analyze", async (req, res): Promise<void> => {
  const inserted = await runEraAnalysis();

  res.json(AnalyzeErasResponse.parse(inserted.map(toEraListRow)));
});

router.get("/eras/summary", async (_req, res): Promise<void> => {
  const eras = await db.select().from(spendingErasTable);
  const accounts = await db.select().from(plaidAccountsTable);

  if (eras.length === 0) {
    res.json(
      GetErasSummaryResponse.parse({
        totalEras: 0,
        totalSpent: 0,
        biggestEra: "",
        mostFrequentCategory: "",
        dateRangeStart: "",
        dateRangeEnd: "",
        transactionCount: 0,
        connected: accounts.length > 0,
      }),
    );
    return;
  }

  const totalSpent = eras.reduce((sum, e) => sum + parseFloat(e.totalSpent), 0);
  const biggestEra = eras.reduce((max, e) =>
    parseFloat(e.totalSpent) > parseFloat(max.totalSpent) ? e : max,
  );

  const categoryCount: Record<string, number> = {};
  for (const era of eras) {
    categoryCount[era.topCategory] = (categoryCount[era.topCategory] ?? 0) + 1;
  }
  const mostFrequentCategory =
    Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  const sortedByDate = [...eras].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const dateRangeStart = sortedByDate[0]?.startDate ?? "";
  const dateRangeEnd = sortedByDate[sortedByDate.length - 1]?.endDate ?? "";

  const transactionCount = accounts.reduce((sum, a) => sum + a.transactionCount, 0);

  res.json(
    GetErasSummaryResponse.parse({
      totalEras: eras.length,
      totalSpent,
      biggestEra: biggestEra.name,
      mostFrequentCategory,
      dateRangeStart,
      dateRangeEnd,
      transactionCount,
      connected: accounts.length > 0,
    }),
  );
});

router.get("/eras/:id", async (req, res): Promise<void> => {
  const params = GetEraParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [era] = await db
    .select()
    .from(spendingErasTable)
    .where(eq(spendingErasTable.id, params.data.id));

  if (!era) {
    res.status(404).json({ error: "Era not found" });
    return;
  }

  res.json(GetEraResponse.parse(parseEra(era)));
});

export default router;
