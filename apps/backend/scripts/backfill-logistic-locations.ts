/**
 * Backfill Script — backfill-logistic-locations.ts
 *
 * Corrects historical ScanHistory data for items that were sold, then
 * physically moved to logistic staging areas before LogisticLocation records
 * existed. Those post-sale movements were recorded as regular location_update
 * events, which incorrectly reset isSold = false.
 *
 * This script runs in three phases:
 *
 *   Phase 1 — DISCOVERY
 *     Finds all ScanHistory records that have a sold_terminal event followed
 *     by one or more location_update events (the post-sale logistic moves).
 *
 *   Phase 2 — LOGISTIC LOCATION SETUP  (interactive)
 *     For each unique location string found in post-sold events, prompts you for:
 *       - Confirmed location name  (pre-filled with the existing string)
 *       - Zone type  (for_delivery / for_pickup / for_fixing)
 *     Creates LogisticLocation records (skips any that already exist).
 *
 *   Phase 3 — CORRECTIONS
 *     For each affected ScanHistory item:
 *       - Creates ScanHistoryLogistic "placed" events for each post-sold movement
 *       - Restores isSold = true
 *       - Restores latestLocation to the last known pre-sale shop-floor position
 *       - Auto-assigns intention from ZONE_TYPE_DEFAULT_INTENTION if not set
 *       - Updates the Shopify product metafield with the pre-sale location
 *
 * Usage:
 *   npx tsx scripts/backfill-logistic-locations.ts
 *
 * Optional env:
 *   DRY_RUN=true     Preview all actions without writing anything
 *   SHOP_ID=<id>     Required when multiple shops exist in the database
 */

import readline from "readline";
import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { shopifyAdminApi } from "../src/modules/shopify/integrations/shopify-admin-api.integration.js";
import { ZONE_TYPE_DEFAULT_INTENTION } from "../src/modules/logistic/domain/logistic.domain.js";
import { startOfUtcDay } from "../src/shared/utils/date.js";
import type {
  LogisticIntention,
  LogisticZoneType,
} from "../src/modules/logistic/domain/logistic.domain.js";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const DRY_RUN = process.env.DRY_RUN === "true";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

const log = (msg: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  if (data) {
    console.log(`[${ts}] ${msg}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${ts}] ${msg}`);
  }
};

const warn = (msg: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  if (data) {
    console.warn(`[${ts}] WARN ${msg}`, JSON.stringify(data, null, 2));
  } else {
    console.warn(`[${ts}] WARN ${msg}`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Interactive helpers
// ─────────────────────────────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

const closeRl = (): void => rl.close();

const ZONE_OPTIONS: LogisticZoneType[] = [
  "for_delivery",
  "for_pickup",
  "for_fixing",
];

async function pickZoneType(): Promise<LogisticZoneType> {
  while (true) {
    console.log("  Zone type options:");
    ZONE_OPTIONS.forEach((opt, i) => console.log(`    ${i + 1}. ${opt}`));
    const answer = (await question("  Select zone type [1/2/3]: ")).trim();
    const idx = parseInt(answer, 10) - 1;
    if (idx >= 0 && idx < ZONE_OPTIONS.length) {
      return ZONE_OPTIONS[idx] as LogisticZoneType;
    }
    console.log("  Invalid selection — please enter 1, 2, or 3.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RawEvent = {
  id: string;
  eventType: string;
  location: string;
  username: string;
  happenedAt: Date;
};

type AffectedItem = {
  id: string;
  shopId: string;
  productId: string;
  itemTitle: string;
  orderId: string | null;
  intention: string | null;
  isSold: boolean;
  latestLocation: string | null;
  preSoldLocation: string | null;
  postSoldEvents: RawEvent[];
  existingLogisticCount: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1: Discovery
// ─────────────────────────────────────────────────────────────────────────────

async function discoverAffectedItems(shopId: string): Promise<AffectedItem[]> {
  log("Phase 1 — Discovery: scanning for affected ScanHistory records...");

  const candidates = await prisma.scanHistory.findMany({
    where: {
      shopId,
      events: {
        some: { eventType: "sold_terminal" },
      },
    },
    select: {
      id: true,
      shopId: true,
      productId: true,
      itemTitle: true,
      orderId: true,
      intention: true,
      isSold: true,
      latestLocation: true,
      events: {
        orderBy: { happenedAt: "asc" },
        select: {
          id: true,
          eventType: true,
          location: true,
          username: true,
          happenedAt: true,
        },
      },
      logisticEvents: {
        select: { id: true },
      },
    },
  });

  const affected: AffectedItem[] = [];

  for (const item of candidates) {
    const events = item.events as RawEvent[];

    // Index of the LAST sold_terminal event (items can only be sold once, but defensive)
    const soldTerminalIdx = events.reduce<number>((last, e, i) => {
      return e.eventType === "sold_terminal" ? i : last;
    }, -1);

    if (soldTerminalIdx === -1) continue;

    // location_update events that came AFTER the sold_terminal
    const postSoldEvents = events
      .slice(soldTerminalIdx + 1)
      .filter((e) => e.eventType === "location_update");

    if (postSoldEvents.length === 0) continue;

    // Last location_update event BEFORE the sold_terminal (the shop-floor position)
    const preSoldLocationUpdates = events
      .slice(0, soldTerminalIdx)
      .filter((e) => e.eventType === "location_update");
    const preSoldLocation =
      preSoldLocationUpdates[preSoldLocationUpdates.length - 1]?.location ?? null;

    affected.push({
      id: item.id,
      shopId: item.shopId,
      productId: item.productId,
      itemTitle: item.itemTitle,
      orderId: item.orderId,
      intention: item.intention,
      isSold: item.isSold,
      latestLocation: item.latestLocation,
      preSoldLocation,
      postSoldEvents,
      existingLogisticCount: (item.logisticEvents as { id: string }[]).length,
    });
  }

  log(`Found ${affected.length} affected ScanHistory record(s).`);

  for (const item of affected) {
    log(`  → "${item.itemTitle}" (id: ${item.id})`, {
      productId: item.productId,
      isSold: item.isSold,
      preSoldLocation: item.preSoldLocation,
      postSoldLocations: [
        ...new Set(item.postSoldEvents.map((e) => e.location)),
      ],
      existingLogisticEvents: item.existingLogisticCount,
    });
  }

  return affected;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: Interactive Logistic Location Setup
// ─────────────────────────────────────────────────────────────────────────────

async function interactiveLocationSetup(
  items: AffectedItem[],
  shopId: string,
): Promise<Map<string, { id: string; zoneType: LogisticZoneType }>> {
  log("\nPhase 2 — Logistic Location Setup: configuring locations...");

  const uniqueLocationStrings = Array.from(
    new Set(items.flatMap((item) => item.postSoldEvents.map((e) => e.location))),
  ).sort();

  log(
    `Found ${uniqueLocationStrings.length} unique post-sold location string(s): ${uniqueLocationStrings.join(", ")}`,
  );

  // Check which already exist as LogisticLocation records
  const existing = await prisma.logisticLocation.findMany({
    where: {
      shopId,
      location: { in: uniqueLocationStrings },
    },
    select: { id: true, location: true, zoneType: true },
  });

  const locationMap = new Map<string, { id: string; zoneType: LogisticZoneType }>(
    existing.map((l) => [
      l.location,
      { id: l.id, zoneType: l.zoneType as LogisticZoneType },
    ]),
  );

  if (existing.length > 0) {
    log(
      `${existing.length} location(s) already exist as LogisticLocation records:`,
      Object.fromEntries(existing.map((l) => [l.location, `${l.id} (${l.zoneType})`])),
    );
  }

  const toCreate = uniqueLocationStrings.filter((loc) => !locationMap.has(loc));

  if (toCreate.length === 0) {
    log("All locations already registered — skipping interactive setup.");
    return locationMap;
  }

  log(`\n${toCreate.length} new LogisticLocation(s) need to be registered.`);
  if (DRY_RUN) {
    log("DRY_RUN: prompts will run but no records will be written to the DB.");
  }

  for (let i = 0; i < toCreate.length; i++) {
    const originalLocation = toCreate[i]!;
    console.log(`\n${"─".repeat(50)}`);
    console.log(`Location ${i + 1} of ${toCreate.length}:`);
    console.log(`  Raw location string from events: "${originalLocation}"`);

    const nameAnswer = (
      await question(`  Location name [${originalLocation}]: `)
    ).trim();
    const confirmedLocation = nameAnswer || originalLocation;

    const zoneType = await pickZoneType();

    if (!DRY_RUN) {
      const created = await prisma.logisticLocation.create({
        data: {
          shopId,
          location: confirmedLocation,
          zoneType: zoneType as any,
        },
        select: { id: true, zoneType: true },
      });
      const entry = { id: created.id, zoneType: created.zoneType as LogisticZoneType };
      locationMap.set(originalLocation, entry);
      if (confirmedLocation !== originalLocation) {
        locationMap.set(confirmedLocation, entry);
      }
      log(
        `  ✓ Created LogisticLocation: id=${created.id}, location="${confirmedLocation}", zoneType=${zoneType}`,
      );
    } else {
      const dryEntry = { id: `dry-run-${i}`, zoneType };
      locationMap.set(originalLocation, dryEntry);
      if (confirmedLocation !== originalLocation) {
        locationMap.set(confirmedLocation, dryEntry);
      }
      log(
        `  [DRY_RUN] Would create LogisticLocation: location="${confirmedLocation}", zoneType=${zoneType}`,
      );
    }
  }

  return locationMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 3: Apply Corrections
// ─────────────────────────────────────────────────────────────────────────────

async function applyCorrections(
  items: AffectedItem[],
  locationMap: Map<string, { id: string; zoneType: LogisticZoneType }>,
  shop: { id: string; shopDomain: string; accessToken: string | null },
): Promise<void> {
  log("\nPhase 3 — Applying corrections...");

  let corrected = 0;
  let skipped = 0;
  let shopifyUpdated = 0;
  let shopifySkipped = 0;

  for (const item of items) {
    console.log(`\n${"─".repeat(50)}`);
    log(`Processing: "${item.itemTitle}" (id: ${item.id})`);

    // Skip items that already have logistic events — script may have run before
    if (item.existingLogisticCount > 0) {
      warn(
        `  Skipping — already has ${item.existingLogisticCount} ScanHistoryLogistic event(s). Run again after manually cleaning those if needed.`,
      );
      skipped++;
      continue;
    }

    // Resolve each post-sold event to its LogisticLocation
    type MappedEvent = {
      event: RawEvent;
      logisticLocation: { id: string; zoneType: LogisticZoneType };
    };

    const mappedEvents: MappedEvent[] = [];
    let unmapped = false;

    for (const event of item.postSoldEvents) {
      const ll = locationMap.get(event.location);
      if (!ll) {
        warn(
          `  No LogisticLocation found for location string "${event.location}" — skipping item`,
        );
        unmapped = true;
        break;
      }
      mappedEvents.push({ event, logisticLocation: ll });
    }

    if (unmapped || mappedEvents.length === 0) {
      skipped++;
      continue;
    }

    const lastMapped = mappedEvents[mappedEvents.length - 1] as MappedEvent;
    const finalLogisticLocation = lastMapped.logisticLocation;

    // Derive intention from zone type when not already set
    let finalIntention = item.intention as LogisticIntention | null;
    if (finalIntention === null) {
      finalIntention =
        ZONE_TYPE_DEFAULT_INTENTION[finalLogisticLocation.zoneType] ?? null;
    }

    log(`  preSoldLocation    : ${item.preSoldLocation ?? "(none — will be set to null)"}`, {});
    log(`  finalLogisticLoc   : ${finalLogisticLocation.id} (${finalLogisticLocation.zoneType})`, {});
    log(`  intention          : ${finalIntention ?? "(not derivable, left null)"}`, {});
    log(`  postSoldMovements  : ${mappedEvents.length}`, {});

    if (!DRY_RUN) {
      // Create one ScanHistoryLogistic "placed" event per post-sold location movement
      for (const { event, logisticLocation } of mappedEvents) {
        await prisma.scanHistoryLogistic.create({
          data: {
            scanHistoryId: item.id,
            shopId: item.shopId,
            orderId: item.orderId ?? null,
            logisticLocationId: logisticLocation.id,
            username: event.username,
            eventType: "placed",
            happenedAt: event.happenedAt,
          },
        });
      }

      // Restore ScanHistory to its correct sold state, preserving the original timeline
      await prisma.scanHistory.update({
        where: { id: item.id },
        data: {
          isSold: true,
          latestLocation: item.preSoldLocation ?? null,
          lastLogisticEventType: "placed",
          logisticLocationId: finalLogisticLocation.id,
          lastModifiedAt: lastMapped.event.happenedAt,
          ...(finalIntention !== null && item.intention === null
            ? { intention: finalIntention as any }
            : {}),
        },
      });

      // Remove the post-sold location_update events from ScanHistoryEvent.
      // They are now correctly represented by ScanHistoryLogistic records,
      // so sold_terminal becomes the last event in the item's event history.
      await prisma.scanHistoryEvent.deleteMany({
        where: {
          id: { in: mappedEvents.map(({ event }) => event.id) },
        },
      });

      // Undo the phantom itemsReceived increments in LocationStatsDaily.
      // appendLocationEvent always increments itemsReceived by 1 (quantity defaults
      // to 1 when not passed) for every location_update that changes the location.
      // Every event in postSoldEvents is a real location change (same-location
      // returns early without writing an event), so each one needs a −1 correction.
      for (const { event } of mappedEvents) {
        const statsDate = startOfUtcDay(event.happenedAt);
        await prisma.locationStatsDaily.updateMany({
          where: {
            date: statsDate,
            location: event.location,
          },
          data: {
            itemsReceived: { decrement: 1 },
          },
        });
      }

      log(`  ✓ DB corrections applied`);
    } else {
      log(
        `  [DRY_RUN] Would create ${mappedEvents.length} ScanHistoryLogistic event(s),` +
        ` delete ${mappedEvents.length} post-sold ScanHistoryEvent(s),` +
        ` update ScanHistory (lastModifiedAt: ${lastMapped.event.happenedAt.toISOString()}),` +
        ` and decrement LocationStatsDaily.itemsReceived for ${mappedEvents.length} location movement(s)`,
      );
    }

    // Shopify metafield update — restore to pre-sale shop-floor location
    if (item.preSoldLocation && shop.accessToken) {
      if (!DRY_RUN) {
        try {
          await shopifyAdminApi.updateProductLocation({
            shopDomain: shop.shopDomain,
            accessToken: shop.accessToken,
            productId: item.productId,
            location: item.preSoldLocation,
          });
          log(`  ✓ Shopify metafield restored to "${item.preSoldLocation}"`);
          shopifyUpdated++;
        } catch (err) {
          warn(`  Shopify update failed for product ${item.productId}`, {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } else {
        log(`  [DRY_RUN] Would update Shopify metafield to "${item.preSoldLocation}"`);
        shopifyUpdated++;
      }
    } else if (!item.preSoldLocation) {
      warn(
        `  Shopify update skipped — no pre-sale location found in event history. Metafield will remain unchanged.`,
      );
      shopifySkipped++;
    } else {
      warn(`  Shopify update skipped — shop has no access token.`);
      shopifySkipped++;
    }

    corrected++;
  }

  console.log(`\n${"═".repeat(50)}`);
  log("Phase 3 complete", {
    corrected,
    skipped,
    shopifyMetafieldUpdated: shopifyUpdated,
    shopifyMetafieldSkipped: shopifySkipped,
    dryRun: DRY_RUN,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  initializeDatabaseRuntime();

  if (DRY_RUN) {
    console.log(`\n${"═".repeat(50)}`);
    log("DRY RUN MODE — no changes will be written to the DB or Shopify");
    console.log(`${"═".repeat(50)}\n`);
  }

  // Resolve shop
  let shopId = SHOP_ID;

  if (!shopId) {
    const shops = await prisma.shop.findMany({
      select: { id: true, shopDomain: true },
    });

    if (shops.length === 0) {
      console.error("[error] No shops found in the database.");
      process.exit(1);
    }

    if (shops.length > 1) {
      console.error(
        "[error] Multiple shops found. Set SHOP_ID to specify which one:\n" +
          shops.map((s) => `  SHOP_ID=${s.id}  (${s.shopDomain})`).join("\n"),
      );
      process.exit(1);
    }

    shopId = shops[0]!.id;
  }

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, shopDomain: true, accessToken: true },
  });

  if (!shop) {
    console.error(`[error] Shop not found: ${shopId}`);
    process.exit(1);
  }

  log(`Shop: ${shop.shopDomain} (id: ${shop.id})`);

  if (!shop.accessToken) {
    warn("Shop has no Shopify access token — Shopify metafield updates will be skipped.");
  }

  try {
    // Phase 1
    const affected = await discoverAffectedItems(shop.id);

    if (affected.length === 0) {
      log("No affected items found — nothing to do.");
      return;
    }

    // Phase 2
    const locationMap = await interactiveLocationSetup(affected, shop.id);

    // Confirm before writing
    console.log(`\n${"═".repeat(50)}`);
    const confirm = (
      await question(
        `Ready to apply corrections to ${affected.length} item(s)${DRY_RUN ? " (DRY RUN)" : ""}. Proceed? [y/N]: `,
      )
    )
      .trim()
      .toLowerCase();

    if (confirm !== "y" && confirm !== "yes") {
      log("Aborted by user — no changes were made.");
      return;
    }

    // Phase 3
    await applyCorrections(affected, locationMap, shop);

    log("\nScript completed successfully.");
  } finally {
    closeRl();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("[fatal]", err);
  closeRl();
  process.exit(1);
});
