/**
 * One-shot migration: rename itemCategory from the old snake_case slugs to the
 * closed Title Case vocabulary in src/shared/category/item-categories.ts.
 *
 * Touches the only two columns in the database that store a category:
 *   - ScanHistory.itemCategory
 *   - location_category_stats_daily.itemCategory
 *
 * The stats table is keyed by [date, location, itemCategory], so when two old
 * values map to the same new value the rows must be MERGED (counters summed),
 * not blindly updated — a plain UPDATE would hit a primary-key conflict.
 *
 * Safety:
 *   - Dry run by default; pass APPLY=true to write.
 *   - Fails loudly on any stored value that has no mapping, rather than
 *     guessing or passing it through.
 *   - Idempotent: values already in the new vocabulary are left alone.
 *   - Verifies that total items_sold is unchanged by the merge.
 *
 * Usage:
 *   npx tsx scripts/migrate-item-category-vocabulary.ts            # dry run
 *   APPLY=true npx tsx scripts/migrate-item-category-vocabulary.ts # write
 */
import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import {
  ITEM_CATEGORIES,
  UNKNOWN_ITEM_CATEGORY,
  type ItemCategory,
} from "../src/shared/category/item-categories.js";

const APPLY = process.env.APPLY === "true";

/** Old stored value → new vocabulary value. Confirmed in plan §1.2. */
const CATEGORY_RENAMES: Readonly<
  Record<string, ItemCategory | typeof UNKNOWN_ITEM_CATEGORY>
> = {
  dining_chair: "Dining Chairs",
  dining_table: "Dining Tables",
  side_table: "Side Tables",
  sideboard: "Sideboards",
  bookshelf: "Bookshelves",
  armchair: "Armchairs",
  coffee_table: "Coffee Tables",
  chest_of_drawers: "Chest of Drawers",
  nest_of_tables: "Nest Of Tables",
  mirror: "Mirrors",
  highboard: "Highboards",
  bedside_table: "Bedside Tables",
  secretary_cabinet: "Secretary Cabinets",
  stool: "Stools",
  serving_trolley: "Serving Trolleys",
  writing_desk: "Writing Desks",
  lamp: "Lamps",
  bar_cabinet: "Bar Cabinets",
  sofa: "Sofas",
  poster: "Posters",
  hall_table: "Hall Tables",
  shelving: "Shelving Units",
  bench: "Seating Benches",
  // Orphans of the old vocabulary, mapped to their nearest new home.
  cabinet: "Storage Cabinets",
  corner_cabinet: "Storage Cabinets",
  sewing_table: "Side Tables",
  plant_stand: "Hall Tables",
  conference_table: "Dining Tables",
  small_side_table: "Side Tables",
  // Sentinel — deliberately unchanged.
  [UNKNOWN_ITEM_CATEGORY]: UNKNOWN_ITEM_CATEGORY,
};

const KNOWN_NEW_VALUES = new Set<string>([
  ...ITEM_CATEGORIES,
  UNKNOWN_ITEM_CATEGORY,
]);

const log = (message: string): void => console.log(`[migrate] ${message}`);

/** Returns the target value, or null when the value is already migrated. */
const resolveTarget = (stored: string, table: string): string | null => {
  if (KNOWN_NEW_VALUES.has(stored)) {
    return null;
  }
  const target = CATEGORY_RENAMES[stored];
  if (!target) {
    throw new Error(
      `Unmapped itemCategory ${JSON.stringify(stored)} found in ${table}. ` +
        `Add it to CATEGORY_RENAMES before running this migration.`,
    );
  }
  return target;
};

async function main(): Promise<void> {
  await initializeDatabaseRuntime();

  log(
    APPLY
      ? "APPLY=true — changes WILL be written"
      : "dry run — no writes (set APPLY=true to write)",
  );

  // ── ScanHistory ──────────────────────────────────────────────────────────
  const historyGroups = await prisma.scanHistory.groupBy({
    by: ["itemCategory"],
    _count: { _all: true },
  });

  log("");
  log("=== ScanHistory.itemCategory ===");
  let historyToChange = 0;
  const historyPlan: Array<{ from: string; to: string; rows: number }> = [];

  for (const group of historyGroups) {
    const stored = group.itemCategory;
    if (stored === null) continue;
    const target = resolveTarget(stored, "ScanHistory");
    if (target === null) {
      log(`  skip   ${String(group._count._all).padStart(5)}  ${stored} (already migrated)`);
      continue;
    }
    historyPlan.push({ from: stored, to: target, rows: group._count._all });
    historyToChange += group._count._all;
    log(`  rename ${String(group._count._all).padStart(5)}  ${stored} -> ${target}`);
  }
  log(`  ${historyToChange} rows to rename across ${historyPlan.length} values`);

  // ── location_category_stats_daily ────────────────────────────────────────
  const statsRows = await prisma.locationCategoryStatsDaily.findMany();
  const soldBefore = statsRows.reduce((sum, row) => sum + row.itemsSold, 0);

  type StatsRow = (typeof statsRows)[number];
  const merged = new Map<string, { key: StatsRow; sources: StatsRow[] }>();

  for (const row of statsRows) {
    const target = resolveTarget(row.itemCategory, "location_category_stats_daily");
    const nextCategory = target ?? row.itemCategory;
    const mapKey = `${row.date.toISOString()}|${row.location}|${nextCategory}`;
    const bucket = merged.get(mapKey);
    if (bucket) {
      bucket.sources.push(row);
    } else {
      merged.set(mapKey, { key: { ...row, itemCategory: nextCategory }, sources: [row] });
    }
  }

  const collisions = [...merged.values()].filter((b) => b.sources.length > 1);
  const statsToChange = statsRows.filter(
    (row) => resolveTarget(row.itemCategory, "location_category_stats_daily") !== null,
  ).length;

  log("");
  log("=== location_category_stats_daily.itemCategory ===");
  log(`  ${statsRows.length} rows total, ${statsToChange} to rename`);
  log(`  ${collisions.length} merge collision(s) (rows sharing date+location+new category)`);
  for (const bucket of collisions) {
    const from = bucket.sources.map((r) => r.itemCategory).join(" + ");
    log(
      `    merge ${from} -> ${bucket.key.itemCategory} ` +
        `on ${bucket.key.date.toISOString().slice(0, 10)} @ ${bucket.key.location}`,
    );
  }
  log(`  total items_sold before: ${soldBefore}`);

  if (!APPLY) {
    log("");
    log("dry run complete — nothing written");
    return;
  }

  // ── Apply ────────────────────────────────────────────────────────────────
  log("");
  log("applying...");

  await prisma.$transaction(async (tx) => {
    for (const { from, to } of historyPlan) {
      const result = await tx.scanHistory.updateMany({
        where: { itemCategory: from },
        data: { itemCategory: to },
      });
      log(`  ScanHistory ${from} -> ${to}: ${result.count} rows`);
    }

    // Rebuild the stats table from the merged buckets: delete every row that
    // needs to change, then re-insert the summed survivors.
    await tx.locationCategoryStatsDaily.deleteMany({});
    for (const { key, sources } of merged.values()) {
      await tx.locationCategoryStatsDaily.create({
        data: {
          date: key.date,
          location: key.location,
          itemCategory: key.itemCategory,
          itemsSold: sources.reduce((s, r) => s + r.itemsSold, 0),
          totalRevenue: sources.reduce((s, r) => s + r.totalRevenue, 0),
          totalTimeToSellSeconds: sources.reduce(
            (s, r) => s + r.totalTimeToSellSeconds,
            0,
          ),
        },
      });
    }
    log(`  location_category_stats_daily rebuilt: ${merged.size} rows`);
  });

  // ── Verify ───────────────────────────────────────────────────────────────
  const after = await prisma.locationCategoryStatsDaily.findMany();
  const soldAfter = after.reduce((sum, row) => sum + row.itemsSold, 0);
  log("");
  log(`total items_sold after: ${soldAfter} (before: ${soldBefore})`);
  if (soldAfter !== soldBefore) {
    throw new Error(
      `items_sold total changed during merge (${soldBefore} -> ${soldAfter}).`,
    );
  }

  const leftover = await prisma.scanHistory.groupBy({
    by: ["itemCategory"],
    _count: { _all: true },
  });
  const stale = leftover
    .map((g) => g.itemCategory)
    .filter((c): c is string => c !== null && !KNOWN_NEW_VALUES.has(c));
  if (stale.length > 0) {
    throw new Error(`Stale category values remain: ${stale.join(", ")}`);
  }

  log("migration complete — all values are in the vocabulary");
}

main()
  .catch((error: unknown) => {
    console.error("[migrate] failed:", error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
