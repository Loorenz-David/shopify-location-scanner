/**
 * fix-locations-and-categories.ts
 *
 * Targeted fix script for two issues found in production data:
 *
 *   Issue 1 — latestLocation = "SOLD_ORDER:..."
 *     Some records have the internal sold-order sentinel stored as the
 *     display location instead of the real physical location. This happens
 *     when an order is processed for an item that was never physically scanned
 *     (fallback path in appendSoldTerminalEventWithFallback).
 *     Fix: set latestLocation to the last ScanHistoryEvent location that is
 *     not a SOLD_ORDER: sentinel.
 *
 *   Issue 2 — itemCategory = "unknown" despite a parseable title
 *     Items whose titles weren't in the old dictionary received "unknown".
 *     After expanding the category dictionary the parser can now resolve them.
 *     Fix: re-run the parser on every "unknown" record; update those it resolves.
 *
 *   Stats correction after Issue 2
 *     LocationCategoryStatsDaily entries bucketed under "unknown" are adjusted:
 *     the values that belong to the newly resolved category are moved from the
 *     "unknown" bucket to the correct one. Only physical-channel sold events
 *     contribute to this table, so only those are iterated.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/fix-locations-and-categories.ts
 *   npx tsx scripts/fix-locations-and-categories.ts
 */

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { categoryParserService } from "../src/shared/category/category-parser.service.js";

const DRY_RUN = process.env.DRY_RUN === "true";

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

const log = (msg: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  console.log(data ? `[${ts}] ${msg} ${JSON.stringify(data)}` : `[${ts}] ${msg}`);
};

const warn = (msg: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  console.warn(data ? `[${ts}] WARN ${msg} ${JSON.stringify(data)}` : `[${ts}] WARN ${msg}`);
};

const logError = (msg: string, err: unknown, extra?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  console.error(`[${ts}] ERROR ${msg}`, JSON.stringify({
    error: err instanceof Error ? err.message : String(err),
    ...extra,
  }));
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const startOfUtcDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const parsePriceValue = (price?: string | null): number => {
  if (!price) return 0;
  const parsed = Number.parseFloat(price.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDurationSeconds = (from: Date, to: Date): number => {
  const s = (to.getTime() - from.getTime()) / 1_000;
  return s > 0 ? s : 0;
};

const isSoldOrderLocation = (location: string | null | undefined): boolean =>
  (location ?? "").startsWith("SOLD_ORDER:");

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  if (DRY_RUN) {
    log("DRY_RUN=true — no database writes will occur");
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Fix 1 — latestLocation = SOLD_ORDER:...
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Fix 1: Restoring real latestLocation from SOLD_ORDER: sentinel ===");

  const soldOrderRecords = await prisma.scanHistory.findMany({
    where: {
      latestLocation: { startsWith: "SOLD_ORDER:" },
    },
    include: {
      events: { orderBy: { happenedAt: "asc" } },
    },
  });

  log(`Records with SOLD_ORDER: in latestLocation: ${soldOrderRecords.length}`);

  let fix1Updated = 0;
  let fix1NoRealLocation = 0;
  let fix1Failed = 0;

  for (const record of soldOrderRecords) {
    // Last event whose location is a real physical location (not SOLD_ORDER:)
    const realLocationEvent = [...record.events]
      .reverse()
      .find((e) => !isSoldOrderLocation(e.location));

    if (!realLocationEvent) {
      warn(`No real location event found — keeping SOLD_ORDER: location`, {
        scanHistoryId: record.id,
        productId: record.productId,
        title: record.itemTitle,
      });
      fix1NoRealLocation++;
      continue;
    }

    log(`Fixing latestLocation`, {
      title: record.itemTitle,
      from: record.latestLocation,
      to: realLocationEvent.location,
    });

    try {
      if (!DRY_RUN) {
        await prisma.scanHistory.update({
          where: { id: record.id },
          data: { latestLocation: realLocationEvent.location },
        });
      }
      fix1Updated++;
    } catch (err) {
      logError("Failed to update latestLocation", err, {
        scanHistoryId: record.id,
      });
      fix1Failed++;
    }
  }

  log(`Fix 1 complete`, {
    updated: fix1Updated,
    noRealLocation: fix1NoRealLocation,
    failed: fix1Failed,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fix 2 — Re-parse "unknown" categories
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Fix 2: Re-parsing unknown categories ===");

  const unknownRecords = await prisma.scanHistory.findMany({
    where: { itemCategory: "unknown" },
    include: {
      events: { orderBy: { happenedAt: "asc" } },
      priceHistory: { orderBy: { happenedAt: "asc" } },
    },
  });

  log(`Records with itemCategory = "unknown": ${unknownRecords.length}`);

  // Map: scanHistoryId → newCategory (only for records that changed)
  const categoryChanges = new Map<string, { record: typeof unknownRecords[0]; newCategory: string }>();

  let fix2Updated = 0;
  let fix2StillUnknown = 0;
  let fix2Failed = 0;

  for (const record of unknownRecords) {
    const parsed = categoryParserService.parse(record.itemTitle);
    if (!parsed) {
      fix2StillUnknown++;
      continue;
    }

    log(`Category resolved`, {
      title: record.itemTitle,
      newCategory: parsed,
    });

    try {
      if (!DRY_RUN) {
        await prisma.scanHistory.update({
          where: { id: record.id },
          data: { itemCategory: parsed },
        });
      }
      categoryChanges.set(record.id, { record, newCategory: parsed });
      fix2Updated++;
    } catch (err) {
      logError("Failed to update itemCategory", err, {
        scanHistoryId: record.id,
      });
      fix2Failed++;
    }
  }

  log(`Fix 2 complete`, {
    updated: fix2Updated,
    stillUnknown: fix2StillUnknown,
    failed: fix2Failed,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Fix 3 — Correct LocationCategoryStatsDaily
  //
  // For each record that changed from "unknown" to a new category:
  //   Find its physical sold_terminal events.
  //   For each: move the stats contribution from the "unknown" bucket
  //   to the new category bucket.
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Fix 3: Correcting LocationCategoryStatsDaily ===");

  if (categoryChanges.size === 0) {
    log("No category changes — stats correction skipped");
  } else {
    log(`Correcting stats for ${categoryChanges.size} re-categorised records`);

    let fix3EventsProcessed = 0;
    let fix3Failed = 0;

    for (const { record, newCategory } of categoryChanges.values()) {
      for (let idx = 0; idx < record.events.length; idx++) {
        const event = record.events[idx]!;

        if (
          event.eventType !== "sold_terminal" ||
          event.salesChannel !== "physical"
        ) {
          continue;
        }

        // Find the last location_update / unknown_position before this sold event
        const arrivedEvent = record.events
          .slice(0, idx)
          .reverse()
          .find(
            (e) =>
              e.eventType === "location_update" ||
              e.eventType === "unknown_position",
          );

        const arrivedLocation = arrivedEvent?.location ?? "UNKNOWN_POSITION";
        const arrivedTime = arrivedEvent?.happenedAt ?? event.happenedAt;
        const timeToSellSeconds = toDurationSeconds(arrivedTime, event.happenedAt);

        // Find the price for this sold event
        const priceRecord = record.priceHistory.find(
          (p) =>
            p.terminalType === "sold_terminal" &&
            (event.orderId
              ? p.orderId === event.orderId
              : p.orderGroupId === event.orderGroupId),
        );
        const soldValuation = parsePriceValue(priceRecord?.price);
        const statsDate = startOfUtcDay(event.happenedAt);

        log(`Moving stats contribution`, {
          title: record.itemTitle,
          statsDate: statsDate.toISOString(),
          arrivedLocation,
          from: "unknown",
          to: newCategory,
          soldValuation,
          timeToSellSeconds,
        });

        try {
          if (!DRY_RUN) {
            await prisma.$transaction(async (tx) => {
              // Subtract from the "unknown" bucket
              await tx.locationCategoryStatsDaily.updateMany({
                where: {
                  date: statsDate,
                  location: arrivedLocation,
                  itemCategory: "unknown",
                },
                data: {
                  itemsSold: { decrement: 1 },
                  totalRevenue: { decrement: soldValuation },
                  totalTimeToSellSeconds: { decrement: timeToSellSeconds },
                },
              });

              // Add to the correct category bucket
              await tx.locationCategoryStatsDaily.upsert({
                where: {
                  date_location_itemCategory: {
                    date: statsDate,
                    location: arrivedLocation,
                    itemCategory: newCategory,
                  },
                },
                create: {
                  date: statsDate,
                  location: arrivedLocation,
                  itemCategory: newCategory,
                  itemsSold: 1,
                  totalRevenue: soldValuation,
                  totalTimeToSellSeconds: timeToSellSeconds,
                },
                update: {
                  itemsSold: { increment: 1 },
                  totalRevenue: { increment: soldValuation },
                  totalTimeToSellSeconds: { increment: timeToSellSeconds },
                },
              });
            });
          }
          fix3EventsProcessed++;
        } catch (err) {
          logError("Failed to correct stats entry", err, {
            scanHistoryId: record.id,
            statsDate: statsDate.toISOString(),
            arrivedLocation,
            newCategory,
          });
          fix3Failed++;
        }
      }
    }

    log(`Fix 3 complete`, {
      soldEventsProcessed: fix3EventsProcessed,
      failed: fix3Failed,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  log("=== COMPLETE ===", {
    dryRun: DRY_RUN,
    fix1: { latestLocationFixed: fix1Updated, noRealLocation: fix1NoRealLocation, failed: fix1Failed },
    fix2: { categoriesResolved: fix2Updated, stillUnknown: fix2StillUnknown, failed: fix2Failed },
    fix3: { statsEntriesMoved: categoryChanges.size },
  });
};

main()
  .catch((err) => {
    console.error(`[${new Date().toISOString()}] FATAL`, err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
