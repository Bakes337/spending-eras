import { db, transactionsTable, spendingErasTable, eraAnalysisCacheTable } from "@workspace/db";
import type { Transaction } from "@workspace/db";
import { count, asc } from "drizzle-orm";
import OpenAI from "openai";
import { logger } from "./logger";
import { DUMMY_ERAS } from "./dummyData";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Category → Era personality mapping
// Plaid formats categories as title-case strings with spaces, e.g. "Food And Drink"
// ---------------------------------------------------------------------------

interface EraPersonality {
  name: string;
  tagline: string;
  description: string;
  emoji: string;
  colorTheme: string;
}

const SEASON_NAMES = ["Winter", "Spring", "Summer", "Fall"];

function getQuarterSeason(quarterNum: number): string {
  // Q1=Winter, Q2=Spring, Q3=Summer, Q4=Fall
  return SEASON_NAMES[quarterNum - 1] ?? "Unknown";
}

function getCategoryKey(category: string): string {
  return category.toLowerCase().replace(/[^a-z]/g, "");
}

function getEraPersonality(
  topCategory: string,
  season: string,
  totalSpent: number,
  topMerchantName: string,
): EraPersonality {
  const cat = getCategoryKey(topCategory);

  if (cat.includes("travel") || cat.includes("airlines") || cat.includes("hotel")) {
    return {
      name: `The Wanderlust Era`,
      tagline: "Flights, hotels, and passport stamps",
      description: `You caught the travel bug this ${season.toLowerCase()}. Flights, accommodation, and adventures — your bank account went places with you.`,
      emoji: "✈️",
      colorTheme: "#B45309",
    };
  }

  if (cat.includes("food") || cat.includes("drink") || cat.includes("restaurant") || cat.includes("dining")) {
    return {
      name: `The Foodie Era`,
      tagline: "Your stomach led the way",
      description: `Dining was the vibe this ${season.toLowerCase()}. Restaurants, bars, and delivery apps — you treated every meal like an event.`,
      emoji: "🍽️",
      colorTheme: "#9D174D",
    };
  }

  if (cat.includes("entertainment") || cat.includes("nightlife") || cat.includes("recreation")) {
    return {
      name: `The Good Times Era`,
      tagline: "You lived a little (a lot)",
      description: `This ${season.toLowerCase()} was all about the experience. Shows, events, going out — you invested in memories over things.`,
      emoji: "🎉",
      colorTheme: "#7C3AED",
    };
  }

  if (cat.includes("transportation") || cat.includes("rideshare") || cat.includes("gas")) {
    return {
      name: `The On-The-Move Era`,
      tagline: "Always somewhere to be",
      description: `You were constantly in motion this ${season.toLowerCase()}. Rideshares, gas, transit — you had places to be and you got there.`,
      emoji: "🚗",
      colorTheme: "#0369A1",
    };
  }

  if (cat.includes("generalmerchandise") || cat.includes("shopping") || cat.includes("retail")) {
    return {
      name: `The Retail Therapy Era`,
      tagline: "If it was on sale, it was meant to be",
      description: `The ${season.toLowerCase()} of stuff. Clothes, gadgets, things you definitely needed — your cart was always full.`,
      emoji: "🛍️",
      colorTheme: "#BE185D",
    };
  }

  if (cat.includes("homeimprovement") || cat.includes("home") || cat.includes("homesupply")) {
    return {
      name: `The Nesting Era`,
      tagline: "Making your space yours",
      description: `This ${season.toLowerCase()} you invested in your home. Furniture, repairs, upgrades — you turned your space into exactly what you wanted.`,
      emoji: "🏠",
      colorTheme: "#065F46",
    };
  }

  if (cat.includes("medical") || cat.includes("health") || cat.includes("fitness") || cat.includes("personalcare")) {
    return {
      name: `The Self-Care Era`,
      tagline: "You put yourself first",
      description: `This ${season.toLowerCase()} was dedicated to wellness. Doctor visits, gym memberships, self-care — you invested in the most important thing: you.`,
      emoji: "💪",
      colorTheme: "#0891B2",
    };
  }

  if (cat.includes("groceries") || cat.includes("grocery")) {
    return {
      name: `The Homebody Era`,
      tagline: "Cozy, intentional, grounded",
      description: `This ${season.toLowerCase()} you stayed in and thrived. Groceries, home essentials, cooking — your kitchen became your happy place.`,
      emoji: "🏡",
      colorTheme: "#1E3A5F",
    };
  }

  if (cat.includes("rent") || cat.includes("utilities") || cat.includes("bills")) {
    return {
      name: `The Adulting Era`,
      tagline: "Bills paid, life managed",
      description: `Pure adulting this ${season.toLowerCase()}. Rent, utilities, recurring expenses — you kept the lights on and called it a win.`,
      emoji: "📋",
      colorTheme: "#4B5563",
    };
  }

  // Default
  return {
    name: `The ${season} Spending Era`,
    tagline: "A season of varied chapters",
    description: `Your ${season.toLowerCase()} spending told a rich story across many categories. No single obsession — just life, in full.`,
    emoji: "💳",
    colorTheme: "#2dd4bf",
  };
}

function generateFunFact(
  topMerchants: Array<{ name: string; amount: number; visits: number; category: string }>,
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number; transactionCount: number }>,
  totalSpent: number,
  weeklyAverage: number,
): string {
  const top = topMerchants[0];
  if (top && top.visits >= 3) {
    return `You visited ${top.name} ${top.visits} times — averaging once every ${Math.round(13 / top.visits)} weeks.`;
  }
  const topCat = categoryBreakdown[0];
  if (topCat && topCat.percentage >= 40) {
    return `${topCat.percentage}% of your spending this era went to ${topCat.category}. It defined the season.`;
  }
  return `Your weekly average was $${weeklyAverage.toFixed(0)}. Some weeks were busier than others.`;
}

// ---------------------------------------------------------------------------
// Categories excluded from analysis — these are fixed costs or accounting
// entries that don't tell a story about discretionary spending behaviour.
// Must stay in sync with the EXCLUDED_CATEGORIES set in routes/plaid.ts.
// ---------------------------------------------------------------------------
const ANALYSIS_EXCLUDED = new Set([
  "LOAN PAYMENTS",
  "RENT AND UTILITIES",
  "BANK FEES",
]);

// ---------------------------------------------------------------------------
// v2 subcategory → readable label
// Strips the primary prefix from Plaid's v2 detailed subcategory and returns
// a human-readable label, e.g.:
//   GENERAL_MERCHANDISE_CLOTHING_AND_ACCESSORIES → "Clothing & Accessories"
//   FOOD_AND_DRINK_GROCERIES                     → "Groceries"
//   TRAVEL_FLIGHTS                               → "Flights"
// Falls back to a formatted primary name for "OTHER_*" catch-alls.
// ---------------------------------------------------------------------------
const KNOWN_PRIMARIES = [
  "GENERAL_MERCHANDISE",
  "FOOD_AND_DRINK",
  "TRAVEL",
  "TRANSPORTATION",
  "ENTERTAINMENT",
  "PERSONAL_CARE",
  "MEDICAL",
  "HOME_IMPROVEMENT",
  "GENERAL_SERVICES",
  "GOVERNMENT_AND_NON_PROFIT",
  "INCOME",
  "LOAN_PAYMENTS",
  "RENT_AND_UTILITIES",
  "BANK_FEES",
];

function toTitleCase(snake: string): string {
  return snake
    .split("_")
    .filter(Boolean)
    .map((w) => w === "AND" ? "&" : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatSubcategory(subcategory: string | null | undefined, primaryCategory: string | null | undefined): string {
  if (subcategory) {
    for (const prefix of KNOWN_PRIMARIES) {
      if (subcategory.startsWith(prefix + "_")) {
        const detail = subcategory.slice(prefix.length + 1);
        // Skip generic "OTHER_*" catch-alls — fall through to primary
        if (!detail.startsWith("OTHER")) {
          return toTitleCase(detail);
        }
        break;
      }
    }
  }
  // Fall back to formatted primary
  if (primaryCategory) {
    return toTitleCase(primaryCategory.replace(/ /g, "_"));
  }
  return "Other";
}

// ---------------------------------------------------------------------------
// Monthly category aggregation for LLM input (capped at 24 months)
// ---------------------------------------------------------------------------

interface MonthlyCategoryTotal {
  month: string;
  categories: Record<string, number>;
}

interface NotableTransaction {
  date: string;
  name: string;
  amount: number;
  category: string;
}

// Sanitize the LLM signature purchase — strip trailing date/amount/category
// appended by older prompt versions, returning just the merchant/item name.
function sanitizeSignaturePurchase(raw: string): string {
  if (!raw) return "";
  // If the LLM included a comma followed by what looks like a date or dollar amount, trim there
  const parts = raw.split(",");
  if (parts.length > 1) {
    const second = parts[1].trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(second) || /^\$[\d,]+/.test(second)) {
      return parts[0].trim();
    }
  }
  return raw.trim();
}

function aggregateMonthlyTotals(transactions: Transaction[]): MonthlyCategoryTotal[] {
  const dates = transactions.map((t) => t.date).sort();
  const latestDate = dates[dates.length - 1] ?? new Date().toISOString().slice(0, 10);
  const latest = new Date(latestDate);
  const cutoff = new Date(latest.getFullYear(), latest.getMonth() - 23, 1);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}`;

  const monthMap = new Map<string, Record<string, number>>();

  for (const txn of transactions) {
    if (ANALYSIS_EXCLUDED.has(txn.category || "")) continue;

    const date = new Date(txn.date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const key = `${year}-${month}`;

    if (key < cutoffStr) continue;

    const category = formatSubcategory(txn.subcategory, txn.category);
    const amount = parseFloat(txn.amount);

    if (!monthMap.has(key)) monthMap.set(key, {});
    const cats = monthMap.get(key)!;
    cats[category] = (cats[category] ?? 0) + amount;
  }

  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, categories]) => {
      const rounded: Record<string, number> = {};
      for (const [cat, amt] of Object.entries(categories)) {
        rounded[cat] = Math.round(amt * 100) / 100;
      }
      return { month, categories: rounded };
    });
}

// Top 5 transactions per quarter by amount — gives the LLM real names to write
// specific "signature purchase" lines from.
function getNotableTransactions(transactions: Transaction[]): NotableTransaction[] {
  const quarterMap = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    if (ANALYSIS_EXCLUDED.has(txn.category || "")) continue;
    const d = new Date(txn.date);
    const q = Math.floor(d.getMonth() / 3) + 1;
    const key = `${d.getFullYear()}-Q${q}`;
    if (!quarterMap.has(key)) quarterMap.set(key, []);
    quarterMap.get(key)!.push(txn);
  }

  const notable: NotableTransaction[] = [];
  for (const [, txns] of [...quarterMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const top5 = [...txns]
      .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
      .slice(0, 5);
    for (const t of top5) {
      notable.push({
        date: t.date,
        name: t.merchantName || t.name,
        amount: Math.round(parseFloat(t.amount) * 100) / 100,
        category: formatSubcategory(t.subcategory, t.category),
      });
    }
  }

  return notable;
}

// ---------------------------------------------------------------------------
// LLM era analysis — client loaded lazily inside try block to prevent startup crash
// ---------------------------------------------------------------------------

// Default prompt file path, overridable via ERA_PROMPT_FILE env var.
// At runtime the bundle is at dist/index.mjs, so __dirname === <artifact-dir>/dist.
// The prompts directory lives one level up at <artifact-dir>/prompts.
//
// Deployment note:
//   The `prompts/` directory must be present alongside `dist/` in every environment.
//   To use a different prompt file without a code change, set ERA_PROMPT_FILE to its
//   absolute path (e.g. ERA_PROMPT_FILE=/srv/prompts/era-analysis-v2.txt).
//   The file must begin with a `# version: <semver>` line followed by the prompt text.
const DEFAULT_PROMPT_FILE = path.resolve(__dirname, "../prompts/era-analysis.txt");

interface SystemPrompt {
  content: string;
  version: string;
}

function loadSystemPrompt(): SystemPrompt {
  const promptFile = process.env.ERA_PROMPT_FILE ?? DEFAULT_PROMPT_FILE;
  const raw = fs.readFileSync(promptFile, "utf-8");
  const lines = raw.split("\n");

  let version = "unknown";
  let contentStartIndex = 0;

  const firstLine = lines[0]?.trim() ?? "";
  const versionMatch = firstLine.match(/^#\s*version:\s*(.+)$/);
  if (versionMatch) {
    version = versionMatch[1].trim();
    contentStartIndex = 1;
    // Skip any blank line immediately after the version header
    if ((lines[1]?.trim() ?? "") === "") {
      contentStartIndex = 2;
    }
  }

  const content = lines.slice(contentStartIndex).join("\n").trim();
  return { content, version };
}

const ERA_USER_MESSAGE_SUFFIX = `

Respond ONLY with a valid JSON array — no preamble, no commentary, no markdown code fences. Each object in the array must have exactly these fields:
- eraName: string (2-4 words, cinematic)
- narratorLine: string (one deadpan sentence)
- therapyTakeaway: string (one honest insight)
- signaturePurchase: string (one specific, dry transaction description)
- categoryVibe: string (2-5 word evocative noun phrase derived from actual merchants, NOT a Plaid category name; empty string if spending is too diffuse)
- topCategories: array of 2-3 category name strings from the data
- startQuarter: string in format "YYYY-QN" (e.g. "2024-Q1")
- endQuarter: string in format "YYYY-QN" (e.g. "2024-Q2")`;

// Generic/bucket-label patterns that should be suppressed from the categoryVibe display.
// All-caps Plaid-style keys, underscore-separated tokens, or known generic labels.
const GENERIC_VIBE_RE = /^[A-Z_]+$|_/;
const GENERIC_VIBE_LABELS = new Set([
  "general merchandise",
  "shopping",
  "retail",
  "food and drink",
  "food & drink",
  "entertainment",
  "travel",
  "transportation",
  "groceries",
  "other",
  "miscellaneous",
]);

function sanitizeCategoryVibe(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (GENERIC_VIBE_RE.test(trimmed)) return "";
  if (GENERIC_VIBE_LABELS.has(trimmed.toLowerCase())) return "";
  return trimmed;
}

interface LLMEra {
  eraName: string;
  narratorLine: string;
  therapyTakeaway: string;
  signaturePurchase: string;
  categoryVibe: string;
  topCategories: string[];
  startQuarter: string;
  endQuarter: string;
}

function createOpenAIClient(): OpenAI {
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseURL || !apiKey) {
    throw new Error("AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY must be set");
  }
  return new OpenAI({ apiKey, baseURL });
}

async function analyzeErasWithLLM(transactions: Transaction[]): Promise<LLMEra[]> {
  const openai = createOpenAIClient();
  const { content: systemPrompt, version: promptVersion } = loadSystemPrompt();

  logger.info({ promptVersion, promptFile: process.env.ERA_PROMPT_FILE ?? DEFAULT_PROMPT_FILE }, "Starting LLM era analysis");

  const monthlyTotals = aggregateMonthlyTotals(transactions);
  const notableTxns = getNotableTransactions(transactions);

  const userMessage =
    "## Monthly spending totals by category\n" +
    JSON.stringify(monthlyTotals, null, 2) +
    "\n\n## Notable individual transactions (top 5 per quarter by amount — use these for signature purchases)\n" +
    JSON.stringify(notableTxns, null, 2) +
    ERA_USER_MESSAGE_SUFFIX;

  const response = await openai.chat.completions.create({
    model: "gpt-5.1",
    max_completion_tokens: 8192,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "";

  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("LLM response did not contain a JSON array");
  }

  const parsed = JSON.parse(jsonMatch[0]) as unknown[];

  logger.info({ promptVersion, eraCount: parsed.length }, "LLM era analysis complete");

  return parsed.map((item: unknown, idx: number) => {
    const obj = item as Record<string, unknown>;
    if (
      typeof obj.eraName !== "string" ||
      typeof obj.narratorLine !== "string" ||
      typeof obj.therapyTakeaway !== "string" ||
      typeof obj.signaturePurchase !== "string" ||
      !Array.isArray(obj.topCategories) ||
      typeof obj.startQuarter !== "string" ||
      typeof obj.endQuarter !== "string"
    ) {
      throw new Error(`LLM era at index ${idx} is missing required fields`);
    }
    return {
      eraName: obj.eraName,
      narratorLine: obj.narratorLine,
      therapyTakeaway: obj.therapyTakeaway,
      signaturePurchase: obj.signaturePurchase,
      categoryVibe: sanitizeCategoryVibe(obj.categoryVibe),
      topCategories: (obj.topCategories as unknown[]).map(String),
      startQuarter: obj.startQuarter,
      endQuarter: obj.endQuarter,
    };
  });
}

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

interface AnalyzedEra {
  name: string;
  tagline: string;
  description: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  totalSpent: number;
  topCategory: string;
  colorTheme: string;
  emoji: string;
  rank: number;
  categoryBreakdown: Array<{ category: string; amount: number; percentage: number; transactionCount: number }>;
  topMerchants: Array<{ name: string; amount: number; visits: number; category: string }>;
  weeklyAverage: number;
  peakWeek: string;
  funFact: string;
  categoryVibe: string;
}

function parseQuarter(quarterStr: string): { year: number; q: number } | null {
  const match = quarterStr.match(/^(\d{4})-Q([1-4])$/);
  if (!match) return null;
  return { year: parseInt(match[1]), q: parseInt(match[2]) };
}

function quarterStartDate(year: number, q: number): string {
  const startMonth = (q - 1) * 3 + 1;
  return `${year}-${String(startMonth).padStart(2, "0")}-01`;
}

function quarterEndDate(year: number, q: number): string {
  const endMonth = (q - 1) * 3 + 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function computeQuarterStats(
  transactions: Transaction[],
  startDate: string,
  endDate: string,
) {
  const txns = transactions.filter(
    (t) => t.date >= startDate && t.date <= endDate && !ANALYSIS_EXCLUDED.has(t.category || ""),
  );
  const totalSpent = txns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const catMap = new Map<string, { amount: number; count: number }>();
  for (const t of txns) {
    const cat = formatSubcategory(t.subcategory, t.category);
    if (!catMap.has(cat)) catMap.set(cat, { amount: 0, count: 0 });
    const entry = catMap.get(cat)!;
    entry.amount += parseFloat(t.amount);
    entry.count += 1;
  }

  const sortedCats = [...catMap.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const categoryBreakdown = sortedCats.slice(0, 6).map(([cat, stats]) => ({
    category: cat,
    amount: Math.round(stats.amount * 100) / 100,
    percentage: Math.round((stats.amount / totalSpent) * 100),
    transactionCount: stats.count,
  }));

  const merchantMap = new Map<string, { amount: number; visits: number; category: string }>();
  for (const t of txns) {
    const merchant = t.merchantName || t.name;
    if (!merchantMap.has(merchant)) merchantMap.set(merchant, { amount: 0, visits: 0, category: formatSubcategory(t.subcategory, t.category) });
    const entry = merchantMap.get(merchant)!;
    entry.amount += parseFloat(t.amount);
    entry.visits += 1;
  }

  const topMerchants = [...merchantMap.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, 4)
    .map(([name, stats]) => ({
      name,
      amount: Math.round(stats.amount * 100) / 100,
      visits: stats.visits,
      category: stats.category,
    }));

  const WEEKS_PER_QUARTER = 13;
  const weeklyAverage = totalSpent / WEEKS_PER_QUARTER;

  const weekMap = new Map<string, number>();
  for (const t of txns) {
    const d = new Date(t.date);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const weekKey = monday.toISOString().slice(0, 10);
    weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + parseFloat(t.amount));
  }
  const peakWeek = [...weekMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return { totalSpent, categoryBreakdown, topMerchants, weeklyAverage, peakWeek };
}

async function buildErasWithLLM(transactions: Transaction[]): Promise<AnalyzedEra[]> {
  const llmEras = await analyzeErasWithLLM(transactions);
  const eras: AnalyzedEra[] = [];
  let rank = 1;

  for (const llmEra of llmEras) {
    const startParsed = parseQuarter(llmEra.startQuarter);
    const endParsed = parseQuarter(llmEra.endQuarter);

    if (!startParsed || !endParsed) {
      logger.warn({ eraName: llmEra.eraName }, "Skipping LLM era with unparseable quarter");
      continue;
    }

    const startDate = quarterStartDate(startParsed.year, startParsed.q);
    const endDate = quarterEndDate(endParsed.year, endParsed.q);
    const stats = computeQuarterStats(transactions, startDate, endDate);

    if (stats.totalSpent === 0) continue;

    const topCategory = llmEra.topCategories[0] ?? "Other";
    const season = getQuarterSeason(startParsed.q);
    const personality = getEraPersonality(topCategory, season, stats.totalSpent, stats.topMerchants[0]?.name ?? "");

    eras.push({
      name: llmEra.eraName,
      tagline: llmEra.therapyTakeaway,
      description: llmEra.narratorLine,
      season,
      year: startParsed.year,
      startDate,
      endDate,
      totalSpent: stats.totalSpent,
      topCategory,
      colorTheme: personality.colorTheme,
      emoji: personality.emoji,
      rank,
      categoryBreakdown: stats.categoryBreakdown,
      topMerchants: stats.topMerchants,
      weeklyAverage: stats.weeklyAverage,
      peakWeek: stats.peakWeek,
      funFact: sanitizeSignaturePurchase(llmEra.signaturePurchase),
      categoryVibe: llmEra.categoryVibe,
    });

    rank++;
  }

  return eras;
}

function buildErasRuleBased(transactions: Transaction[]): AnalyzedEra[] {
  const quarterMap = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    const date = new Date(txn.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const q = Math.floor(month / 3) + 1;
    const key = `${year}-Q${q}`;
    if (!quarterMap.has(key)) quarterMap.set(key, []);
    quarterMap.get(key)!.push(txn);
  }

  const sortedKeys = [...quarterMap.keys()].sort();
  const eras: AnalyzedEra[] = [];
  let rank = 1;

  for (const key of sortedKeys) {
    const txns = quarterMap.get(key)!;
    if (txns.length < 3) continue;

    const [yearStr, qStr] = key.split("-Q");
    const year = parseInt(yearStr);
    const q = parseInt(qStr);

    const startMonth = (q - 1) * 3;
    const endMonth = startMonth + 2;
    const startDate = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(year, endMonth + 1, 0).getDate();
    const endDate = `${year}-${String(endMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const season = getQuarterSeason(q);
    const discretionaryTxns = txns.filter((t) => !ANALYSIS_EXCLUDED.has(t.category || ""));
    const totalSpent = discretionaryTxns.reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const catMap = new Map<string, { amount: number; count: number }>();
    for (const t of discretionaryTxns) {
      const cat = formatSubcategory(t.subcategory, t.category);
      if (!catMap.has(cat)) catMap.set(cat, { amount: 0, count: 0 });
      const entry = catMap.get(cat)!;
      entry.amount += parseFloat(t.amount);
      entry.count += 1;
    }

    const sortedCats = [...catMap.entries()].sort((a, b) => b[1].amount - a[1].amount);

    // Fixed, non-discretionary categories shouldn't define the era's personality.
    // Use the top discretionary category instead; fall back to the absolute top if all are fixed.
    const FIXED_CATEGORIES = new Set(["RENT AND UTILITIES", "LOAN PAYMENTS", "BANK FEES"]);
    const topDiscretionary = sortedCats.find(([cat]) => !FIXED_CATEGORIES.has(cat));
    const topCategory = (topDiscretionary ?? sortedCats[0])?.[0] ?? "Other";

    const categoryBreakdown = sortedCats.slice(0, 6).map(([cat, stats]) => ({
      category: cat,
      amount: Math.round(stats.amount * 100) / 100,
      percentage: Math.round((stats.amount / totalSpent) * 100),
      transactionCount: stats.count,
    }));

    const merchantMap = new Map<string, { amount: number; visits: number; category: string }>();
    for (const t of discretionaryTxns) {
      const merchant = t.merchantName || t.name;
      if (!merchantMap.has(merchant)) merchantMap.set(merchant, { amount: 0, visits: 0, category: formatSubcategory(t.subcategory, t.category) });
      const entry = merchantMap.get(merchant)!;
      entry.amount += parseFloat(t.amount);
      entry.visits += 1;
    }

    const topMerchants = [...merchantMap.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 4)
      .map(([name, stats]) => ({
        name,
        amount: Math.round(stats.amount * 100) / 100,
        visits: stats.visits,
        category: stats.category,
      }));

    const WEEKS_PER_QUARTER = 13;
    const weeklyAverage = totalSpent / WEEKS_PER_QUARTER;

    const weekMap = new Map<string, number>();
    for (const t of txns) {
      const d = new Date(t.date);
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const weekKey = monday.toISOString().slice(0, 10);
      weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + parseFloat(t.amount));
    }
    const peakWeek = [...weekMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

    const personality = getEraPersonality(topCategory, season, totalSpent, topMerchants[0]?.name ?? "");
    const funFact = generateFunFact(topMerchants, categoryBreakdown, totalSpent, weeklyAverage);

    eras.push({
      ...personality,
      season,
      year,
      startDate,
      endDate,
      totalSpent,
      topCategory,
      rank,
      categoryBreakdown,
      topMerchants,
      weeklyAverage,
      peakWeek,
      funFact,
      categoryVibe: "",
    });

    rank++;
  }

  return eras;
}

async function analyzeTransactions(transactions: Transaction[]): Promise<AnalyzedEra[] | null> {
  try {
    const llmEras = await buildErasWithLLM(transactions);
    if (llmEras.length > 0) {
      return llmEras;
    }
    logger.warn("LLM returned no usable eras, falling back to rule-based analyzer");
  } catch (err) {
    logger.error({ err }, "LLM era analysis failed, falling back to rule-based analyzer");
  }

  const ruleEras = buildErasRuleBased(transactions);
  if (ruleEras.length === 0) return null;
  return ruleEras;
}

export async function buildErasFromTransactions(): Promise<AnalyzedEra[] | null> {
  const transactions = await db.select().from(transactionsTable);
  if (transactions.length === 0) return null;
  return analyzeTransactions(transactions);
}

export async function runEraAnalysis() {
  // Check current transaction count
  const [{ value: currentTxnCount }] = await db.select({ value: count() }).from(transactionsTable);

  // Check cache: if transaction count matches last analysis, return existing eras immediately.
  // The cache table uses a singleton primary key ("default") so there is always at most one row.
  const [cacheEntry] = await db.select().from(eraAnalysisCacheTable);

  if (cacheEntry && cacheEntry.transactionCount === currentTxnCount) {
    logger.info(
      { transactionCount: currentTxnCount, analyzedAt: cacheEntry.analyzedAt },
      "Skipping LLM analysis — transaction count unchanged since last analysis",
    );
    const existingEras = await db
      .select()
      .from(spendingErasTable)
      .orderBy(asc(spendingErasTable.startDate));
    if (existingEras.length > 0) {
      return existingEras;
    }
    logger.info("Cache hit but no eras in DB, proceeding with full analysis");
  }

  await db.delete(spendingErasTable);

  const transactions = await db.select().from(transactionsTable);

  // Load the prompt version before analysis so we can store it in the cache
  let promptVersion = "unknown";
  try {
    const { version } = loadSystemPrompt();
    promptVersion = version;
  } catch {
    // Prompt file may not be available (e.g. rule-based fallback path)
  }

  // When no transactions exist at all, seed dummy eras so the UI has something to show.
  // When transactions exist but are too sparse, return empty (client shows analyzing state).
  let erasToInsert: AnalyzedEra[];
  if (transactions.length === 0) {
    erasToInsert = DUMMY_ERAS;
  } else {
    erasToInsert = (await analyzeTransactions(transactions)) ?? [];
  }

  const inserted = [];
  for (const era of erasToInsert) {
    const [row] = await db
      .insert(spendingErasTable)
      .values({
        name: era.name,
        tagline: era.tagline,
        description: era.description,
        season: era.season,
        year: era.year,
        startDate: era.startDate,
        endDate: era.endDate,
        totalSpent: era.totalSpent.toFixed(2),
        topCategory: era.topCategory,
        colorTheme: era.colorTheme,
        emoji: era.emoji,
        rank: era.rank,
        categoryBreakdown: JSON.stringify(era.categoryBreakdown),
        topMerchants: JSON.stringify(era.topMerchants),
        weeklyAverage: era.weeklyAverage.toFixed(2),
        peakWeek: era.peakWeek,
        funFact: era.funFact,
        categoryVibe: era.categoryVibe,
      })
      .returning();
    inserted.push(row);
  }

  // Upsert the singleton cache row (singletonKey = 'default' is always the same row)
  await db
    .insert(eraAnalysisCacheTable)
    .values({
      singletonKey: "default",
      transactionCount: currentTxnCount,
      promptVersion,
      analyzedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: eraAnalysisCacheTable.singletonKey,
      set: {
        transactionCount: currentTxnCount,
        promptVersion,
        analyzedAt: new Date(),
      },
    });

  logger.info({ transactionCount: currentTxnCount, promptVersion }, "Era analysis cache updated");

  return inserted;
}
