/**
 * Backfill Script — backfill-item-properties.ts
 *
 * Brings every existing ScanHistory row onto the expanded properties rules:
 * all `custom.*` Shopify metafields (minus the excluded keys) merged with the
 * Beyo Vintage purchase API's item attributes.
 *
 * Rows normally converge on their own — every scan, order and products/update
 * webhook rewrites properties — but only when the item is next touched. This
 * forces convergence for the whole table at once. Worth re-running after any
 * change to the exclusion config in shopify-metafield-properties.ts.
 *
 * It also repairs missing `itemBarcode` values, since the barcode IS the
 * purchase API's article number: a row without one can never gain purchase-app
 * attributes.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/backfill-item-properties.ts   # preview
 *   npx tsx scripts/backfill-item-properties.ts                # write
 *
 * Optional env:
 *   DRY_RUN=true        Preview every action without writing
 *   SHOP_ID=<id>        Required when multiple shops exist
 *   CONCURRENCY=<n>     Parallel Shopify lookups (default 3)
 *   LIMIT=<n>           Stop after n rows (for a smoke run)
 *
 * Deliberately surgical: it writes ONLY `properties` and `itemBarcode` with a
 * direct Prisma update, rather than going through
 * `syncProductSnapshotIfHistoryExists`, so it cannot rewrite `itemCategory`
 * while the category vocabulary refactor is in flight.
 */

import "../src/config/load-env.js";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { shopifyAdminApi } from "../src/modules/shopify/integrations/shopify-admin-api.integration.js";
import { itemPropertiesResolver } from "../src/shared/item-properties/item-properties-resolver.service.js";

const DRY_RUN = process.env.DRY_RUN === "true";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.CONCURRENCY?.trim() ?? "3", 10) || 3,
);
const LIMIT = Number.parseInt(process.env.LIMIT?.trim() ?? "0", 10) || 0;

const log = (message: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  console.log(data ? `[${ts}] ${message} ${JSON.stringify(data)}` : `[${ts}] ${message}`);
};

const logError = (
  message: string,
  error: unknown,
  data?: Record<string, unknown>,
): void => {
  const ts = new Date().toISOString();
  const detail = error instanceof Error ? error.message : String(error ?? "unknown");
  console.error(`[${ts}] ERROR ${message} ${JSON.stringify({ ...data, error: detail })}`);
};

const sameProperties = (
  left: Record<string, string>,
  right: Prisma.JsonValue | null,
): boolean => {
  if (!right || typeof right !== "object" || Array.isArray(right)) {
    return Object.keys(left).length === 0;
  }

  const stored = right as Record<string, unknown>;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(stored).sort();

  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && left[key] === stored[key])
  );
};

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  const shops = await prisma.shop.findMany({
    ...(SHOP_ID ? { where: { id: SHOP_ID } } : {}),
    select: { id: true, shopDomain: true, accessToken: true },
  });
  const shop = shops[0];

  if (shops.length > 1) {
    throw new Error("Multiple shops found — set SHOP_ID to pick one");
  }
  if (!shop?.accessToken) {
    throw new Error("No linked shop with an access token was found");
  }

  const records = await prisma.scanHistory.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      productId: true,
      itemTitle: true,
      itemBarcode: true,
      properties: true,
    },
    orderBy: { createdAt: "asc" },
    ...(LIMIT > 0 ? { take: LIMIT } : {}),
  });

  log("Item properties backfill started", {
    dryRun: DRY_RUN,
    shopId: shop.id,
    shopDomain: shop.shopDomain,
    rows: records.length,
    concurrency: CONCURRENCY,
  });

  const counters = {
    checked: 0,
    propertiesUpdated: 0,
    propertiesUnchanged: 0,
    propertiesSkippedUnresolved: 0,
    barcodeFilled: 0,
    barcodeAlreadyPresent: 0,
    barcodeStillMissing: 0,
    failed: 0,
  };
  const stillMissingBarcode: string[] = [];

  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < records.length) {
      const record = records[cursor];
      cursor += 1;
      if (!record) {
        continue;
      }

      counters.checked += 1;

      try {
        const product = await shopifyAdminApi.getProductWithLocation({
          shopDomain: shop.shopDomain,
          accessToken: shop.accessToken as string,
          productId: record.productId,
          includeMetafieldProperties: true,
        });

        const resolved = await itemPropertiesResolver.resolve({
          metafieldProperties: product.metafieldProperties,
          articleNumber: product.barcode,
        });

        const storedBarcode = record.itemBarcode?.trim() || null;
        const shopifyBarcode = product.barcode?.trim() || null;
        let nextBarcode: string | null = null;

        if (storedBarcode) {
          counters.barcodeAlreadyPresent += 1;
          if (shopifyBarcode && shopifyBarcode !== storedBarcode) {
            nextBarcode = shopifyBarcode;
          }
        } else if (shopifyBarcode) {
          counters.barcodeFilled += 1;
          nextBarcode = shopifyBarcode;
        } else {
          // No barcode anywhere: this item can never gain purchase-app
          // attributes until someone sets an article number in Shopify.
          counters.barcodeStillMissing += 1;
          stillMissingBarcode.push(`${record.productId} — ${record.itemTitle}`);
        }

        if (resolved === null) {
          counters.propertiesSkippedUnresolved += 1;
        }

        const propertiesChanged =
          resolved !== null && !sameProperties(resolved, record.properties);

        if (!propertiesChanged && nextBarcode === null) {
          if (resolved !== null) {
            counters.propertiesUnchanged += 1;
          }
          continue;
        }

        if (propertiesChanged) {
          counters.propertiesUpdated += 1;
        } else if (resolved !== null) {
          counters.propertiesUnchanged += 1;
        }

        const data: Prisma.ScanHistoryUpdateInput = {
          ...(propertiesChanged
            ? {
                properties:
                  Object.keys(resolved).length > 0 ? resolved : Prisma.JsonNull,
              }
            : {}),
          ...(nextBarcode !== null ? { itemBarcode: nextBarcode } : {}),
        };

        if (DRY_RUN) {
          log("DRY_RUN: would update", {
            productId: record.productId,
            title: record.itemTitle,
            ...(propertiesChanged
              ? { propertyKeys: Object.keys(resolved).length }
              : {}),
            ...(nextBarcode !== null ? { barcode: nextBarcode } : {}),
          });
          continue;
        }

        await prisma.scanHistory.update({ where: { id: record.id }, data });
      } catch (error) {
        counters.failed += 1;
        logError("Failed to backfill row", error, {
          productId: record.productId,
          title: record.itemTitle,
        });
      }

      if (counters.checked % 50 === 0) {
        log("Progress", { checked: counters.checked, total: records.length });
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, records.length) }, () => worker()),
  );

  log("Item properties backfill finished", { dryRun: DRY_RUN, ...counters });

  if (stillMissingBarcode.length > 0) {
    log("Items with no barcode in Shopify (no purchase API lookup possible)", {
      count: stillMissingBarcode.length,
    });
    for (const entry of stillMissingBarcode) {
      console.log(`    ${entry}`);
    }
  }

  await prisma.$disconnect();
};

await main();
