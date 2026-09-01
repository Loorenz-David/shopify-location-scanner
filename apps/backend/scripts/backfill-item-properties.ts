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
 *   BATCH_SIZE=<n>      Products per Shopify query (default 50)
 *   CONCURRENCY=<n>     Parallel purchase-API lookups per batch (default 5)
 *   LIMIT=<n>           Stop after n rows (for a smoke run)
 *
 * Shopify products are fetched in BATCHES, not one query per row. Shopify bills
 * the same ~27 points whether a `nodes(ids:)` query asks for 1 product or 50,
 * so per-row queries burn ~19-27 points each, drain the 2000-point bucket in
 * seconds and spend the rest of the run being throttled. Batches of 50 turn
 * 1107 queries into 23.
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
import type { ProductLocationSnapshot } from "../src/modules/shopify/domain/shopify-shop.js";
import { itemPropertiesResolver } from "../src/shared/item-properties/item-properties-resolver.service.js";

const DRY_RUN = process.env.DRY_RUN === "true";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const BATCH_SIZE = Math.min(
  100,
  Math.max(1, Number.parseInt(process.env.BATCH_SIZE?.trim() ?? "50", 10) || 50),
);
const CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.CONCURRENCY?.trim() ?? "5", 10) || 5,
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
    batchSize: BATCH_SIZE,
    batches: Math.ceil(records.length / BATCH_SIZE),
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
    purchaseAttributesApplied: 0,
    productMissing: 0,
    failed: 0,
  };
  const stillMissingBarcode: string[] = [];

  type Row = (typeof records)[number];

  const processRow = async (record: Row, product: ProductLocationSnapshot): Promise<void> => {
    // Resolves through the same service the live write paths use: Shopify
    // metafields first, then a purchase-API lookup keyed on the product's
    // barcode (skipped when there is no barcode), merged with Shopify winning.
    const resolved = await itemPropertiesResolver.resolve({
      metafieldProperties: product.metafieldProperties,
      articleNumber: product.barcode,
    });

    // Keys in the result that Shopify did not supply came from the purchase API.
    const shopifyKeys = new Set(Object.keys(product.metafieldProperties ?? {}));
    const purchaseKeys = Object.keys(resolved ?? {}).filter(
      (key) => !shopifyKeys.has(key),
    );
    if (purchaseKeys.length > 0) {
      counters.purchaseAttributesApplied += 1;
    }

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
      // No barcode anywhere: this item can never gain purchase-app attributes
      // until someone sets an article number in Shopify.
      counters.barcodeStillMissing += 1;
      stillMissingBarcode.push(`${record.productId} — ${record.itemTitle}`);
    }

    if (resolved === null) {
      counters.propertiesSkippedUnresolved += 1;
    }

    const propertiesChanged =
      resolved !== null && !sameProperties(resolved, record.properties);

    if (propertiesChanged) {
      counters.propertiesUpdated += 1;
    } else if (resolved !== null) {
      counters.propertiesUnchanged += 1;
    }

    if (!propertiesChanged && nextBarcode === null) {
      return;
    }

    if (DRY_RUN) {
      log("DRY_RUN: would update", {
        productId: record.productId,
        title: record.itemTitle,
        ...(propertiesChanged && resolved
          ? { propertyKeys: Object.keys(resolved).length }
          : {}),
        ...(purchaseKeys.length > 0 ? { fromPurchaseApi: purchaseKeys } : {}),
        ...(nextBarcode !== null ? { barcode: nextBarcode } : {}),
      });
      return;
    }

    await prisma.scanHistory.update({
      where: { id: record.id },
      data: {
        ...(propertiesChanged && resolved
          ? {
              properties:
                Object.keys(resolved).length > 0 ? resolved : Prisma.JsonNull,
            }
          : {}),
        ...(nextBarcode !== null ? { itemBarcode: nextBarcode } : {}),
      },
    });
  };

  for (let start = 0; start < records.length; start += BATCH_SIZE) {
    const batch = records.slice(start, start + BATCH_SIZE);

    let snapshots: ProductLocationSnapshot[];
    try {
      snapshots = await shopifyAdminApi.getProductsWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productIds: batch.map((record) => record.productId),
        includeMetafieldProperties: true,
      });
    } catch (error) {
      counters.failed += batch.length;
      counters.checked += batch.length;
      logError("Batch fetch failed", error, {
        from: start,
        size: batch.length,
      });
      continue;
    }

    const byProductId = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot]));

    // Rows within a batch are processed with a small amount of parallelism —
    // the remaining per-row work is a purchase-API lookup, not a Shopify one.
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (cursor < batch.length) {
        const record = batch[cursor];
        cursor += 1;
        if (!record) {
          continue;
        }

        counters.checked += 1;
        const product = byProductId.get(record.productId);

        if (!product) {
          counters.productMissing += 1;
          logError("Product not found in Shopify", new Error("missing"), {
            productId: record.productId,
            title: record.itemTitle,
          });
          continue;
        }

        try {
          await processRow(record, product);
        } catch (error) {
          counters.failed += 1;
          logError("Failed to backfill row", error, {
            productId: record.productId,
            title: record.itemTitle,
          });
        }
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, batch.length) }, () => worker()),
    );

    log("Batch done", {
      checked: counters.checked,
      total: records.length,
      updated: counters.propertiesUpdated,
    });
  }

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
