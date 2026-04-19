/**
 * Repair Script — repair-scan-history-order-metadata.ts
 *
 * Repairs historical ScanHistory data issues and rebuilds category stats:
 *
 *   1. orderNumber missing while orderId exists
 *      Primary source: stored Shopify webhook intake payloads
 *      Fallback source: live Shopify Admin API lookup by order id
 *
 *   2. sold-item product snapshot gaps
 *      Source: live Shopify product metadata via getProductWithLocation()
 *      Repairs:
 *        - itemCategory overridden to "unknown" / null
 *        - missing itemBarcode
 *        - missing itemImageUrl
 *        - missing itemHeight / itemWidth / itemDepth / volume
 *        - missing itemSku / itemTitle when Shopify has a better value
 *
 *   3. locationCategoryStatsDaily rebuild
 *      Recomputes the per-location category stats from corrected ScanHistory
 *      so stale "unknown" aggregates are removed.
 *
 * Notes:
 *   - There is no separate "dimensions stats" table in the backend.
 *     /api/stats/dimensions is computed live from ScanHistory, so repairing
 *     ScanHistory dimension fields automatically fixes the dimensions charts.
 *   - This script includes a final verification phase that reports any sold
 *     rows still missing dimensions after the repair.
 *
 * Usage:
 *   DRY_RUN=true npx tsx scripts/repair-scan-history-order-metadata.ts
 *   npx tsx scripts/repair-scan-history-order-metadata.ts
 *
 * Optional env:
 *   SHOP_ID=<shopId>               Limit to one shop
 *   SHOPIFY_API_VERSION=2024-10    Override default API version for REST fallback
 */

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { shopifyAdminApi } from "../src/modules/shopify/integrations/shopify-admin-api.integration.js";
import {
  ShopifyOrdersCreateWebhookPayloadSchema,
  ShopifyOrdersPaidWebhookPayloadSchema,
} from "../src/modules/shopify/contracts/shopify.contract.js";
import type { SalesChannel } from "@prisma/client";

const DRY_RUN = process.env.DRY_RUN === "true";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2024-10";

const log = (message: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  if (data) {
    console.log(`[${ts}] ${message}`, JSON.stringify(data));
    return;
  }

  console.log(`[${ts}] ${message}`);
};

const warn = (message: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  if (data) {
    console.warn(`[${ts}] WARN ${message}`, JSON.stringify(data));
    return;
  }

  console.warn(`[${ts}] WARN ${message}`);
};

const logError = (
  message: string,
  error: unknown,
  data?: Record<string, unknown>,
): void => {
  const ts = new Date().toISOString();
  console.error(
    `[${ts}] ERROR ${message}`,
    JSON.stringify({
      error: error instanceof Error ? error.message : String(error),
      ...data,
    }),
  );
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const parsePriceValue = (price?: string | null): number => {
  if (!price) return 0;
  const parsed = Number.parseFloat(price.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const startOfUtcDay = (date: Date): Date => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
};

const toDurationSeconds = (from: Date, to: Date): number => {
  const seconds = (to.getTime() - from.getTime()) / 1000;
  return seconds > 0 ? seconds : 0;
};

const normalizeOrderId = (value: string | number | bigint): string => {
  return String(value).trim();
};

const fetchOrderNumberFromShopify = async (input: {
  shopDomain: string;
  accessToken: string;
  orderId: string;
  attempt?: number;
}): Promise<number | null> => {
  const attempt = input.attempt ?? 0;
  const response = await fetch(
    `https://${input.shopDomain}/admin/api/${API_VERSION}/orders/${input.orderId}.json?fields=id,order_number`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": input.accessToken,
      },
    },
  );

  if (response.status === 429 && attempt < 5) {
    const retryAfter = response.headers.get("retry-after");
    const delay = retryAfter
      ? Math.max(Number.parseInt(retryAfter, 10) * 1_000, 1_000)
      : Math.min(1_000 * 2 ** attempt, 8_000);
    warn("Shopify order lookup throttled; retrying", {
      shopDomain: input.shopDomain,
      orderId: input.orderId,
      delay,
      attempt: attempt + 1,
    });
    await sleep(delay);
    return fetchOrderNumberFromShopify({ ...input, attempt: attempt + 1 });
  }

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Shopify order lookup failed with HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    order?: {
      order_number?: number | null;
    } | null;
  };

  const orderNumber = payload.order?.order_number;
  return typeof orderNumber === "number" && Number.isInteger(orderNumber)
    ? orderNumber
    : null;
};

const buildOrderNumberMapFromWebhookIntake = async (
  shopId: string,
): Promise<Map<string, number>> => {
  const records = await prisma.webhookIntakeRecord.findMany({
    where: {
      shopId,
      topic: {
        in: ["orders/create", "orders/paid"],
      },
    },
    select: {
      id: true,
      topic: true,
      rawPayload: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const orderNumbers = new Map<string, number>();

  for (const record of records) {
    try {
      const parsedPayload = JSON.parse(record.rawPayload) as unknown;
      const payload =
        record.topic === "orders/create"
          ? ShopifyOrdersCreateWebhookPayloadSchema.parse(parsedPayload)
          : ShopifyOrdersPaidWebhookPayloadSchema.parse(parsedPayload);

      const orderId = normalizeOrderId(payload.id);
      const orderNumber = payload.order_number;

      if (typeof orderNumber !== "number" || !Number.isInteger(orderNumber)) {
        continue;
      }

      const existing = orderNumbers.get(orderId);
      if (existing !== undefined && existing !== orderNumber) {
        warn("Conflicting orderNumber values found in webhook payloads", {
          shopId,
          orderId,
          existing,
          incoming: orderNumber,
          webhookIntakeId: record.id,
          topic: record.topic,
        });
        continue;
      }

      orderNumbers.set(orderId, orderNumber);
    } catch (error) {
      warn("Skipping unparsable webhook intake payload", {
        shopId,
        webhookIntakeId: record.id,
        topic: record.topic,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return orderNumbers;
};

const repairOrderNumbersForShop = async (shop: {
  id: string;
  shopDomain: string;
  accessToken: string | null;
}): Promise<void> => {
  log("=== Phase 1: Repairing missing orderNumber values ===", {
    shopId: shop.id,
    shopDomain: shop.shopDomain,
  });

  const candidates = await prisma.scanHistory.findMany({
    where: {
      shopId: shop.id,
      orderId: { not: null },
      orderNumber: null,
    },
    select: {
      id: true,
      productId: true,
      orderId: true,
      orderNumber: true,
      latestLocation: true,
      itemTitle: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  log("OrderNumber repair candidates loaded", {
    shopId: shop.id,
    count: candidates.length,
  });

  if (candidates.length === 0) {
    return;
  }

  const orderNumberMap = await buildOrderNumberMapFromWebhookIntake(shop.id);
  log("Webhook order number map built", {
    shopId: shop.id,
    mappedOrders: orderNumberMap.size,
  });

  let fixedFromWebhook = 0;
  let fixedFromApi = 0;
  let unresolved = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const orderId = candidate.orderId?.trim();
    if (!orderId) {
      unresolved += 1;
      continue;
    }

    let orderNumber = orderNumberMap.get(orderId) ?? null;
    let source: "webhook" | "shopify_api" | null =
      orderNumber !== null ? "webhook" : null;

    if (orderNumber === null && shop.accessToken) {
      try {
        orderNumber = await fetchOrderNumberFromShopify({
          shopDomain: shop.shopDomain,
          accessToken: shop.accessToken,
          orderId,
        });
        if (orderNumber !== null) {
          source = "shopify_api";
        }
      } catch (error) {
        logError("Failed to fetch orderNumber from Shopify", error, {
          shopId: shop.id,
          scanHistoryId: candidate.id,
          orderId,
          productId: candidate.productId,
        });
        failed += 1;
        continue;
      }
    }

    if (orderNumber === null || source === null) {
      warn("Could not resolve orderNumber", {
        shopId: shop.id,
        scanHistoryId: candidate.id,
        orderId,
        productId: candidate.productId,
        latestLocation: candidate.latestLocation,
      });
      unresolved += 1;
      continue;
    }

    log("Repairing orderNumber", {
      shopId: shop.id,
      scanHistoryId: candidate.id,
      productId: candidate.productId,
      orderId,
      orderNumber,
      source,
      latestLocation: candidate.latestLocation,
    });

    try {
      if (!DRY_RUN) {
        await prisma.scanHistory.update({
          where: { id: candidate.id },
          data: { orderNumber },
        });
      }

      if (source === "webhook") {
        fixedFromWebhook += 1;
      } else {
        fixedFromApi += 1;
      }
    } catch (error) {
      logError("Failed to update orderNumber", error, {
        shopId: shop.id,
        scanHistoryId: candidate.id,
        orderId,
        orderNumber,
      });
      failed += 1;
    }
  }

  log("Phase 1 complete", {
    shopId: shop.id,
    dryRun: DRY_RUN,
    fixedFromWebhook,
    fixedFromApi,
    unresolved,
    failed,
  });
};

const repairSoldProductSnapshotForShop = async (shop: {
  id: string;
  shopDomain: string;
  accessToken: string | null;
}): Promise<void> => {
  log("=== Phase 2: Repairing sold product snapshot gaps ===", {
    shopId: shop.id,
    shopDomain: shop.shopDomain,
  });

  if (!shop.accessToken) {
    warn("Skipping sold snapshot repair: shop has no access token", {
      shopId: shop.id,
      shopDomain: shop.shopDomain,
    });
    return;
  }

  const candidates = await prisma.scanHistory.findMany({
    where: {
      shopId: shop.id,
      orderId: { not: null },
      isSold: true,
      OR: [
        { itemCategory: null },
        { itemCategory: "unknown" },
        { itemSku: null },
        { itemBarcode: null },
        { itemImageUrl: null },
        { itemHeight: null },
        { itemWidth: null },
        { itemDepth: null },
        { volume: null },
      ],
    },
    select: {
      id: true,
      productId: true,
      itemTitle: true,
      itemCategory: true,
      itemSku: true,
      itemBarcode: true,
      itemImageUrl: true,
      itemHeight: true,
      itemWidth: true,
      itemDepth: true,
      volume: true,
      orderId: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  log("Sold snapshot repair candidates loaded", {
    shopId: shop.id,
    count: candidates.length,
  });

  let updated = 0;
  let skippedNoChanges = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const product = await shopifyAdminApi.getProductWithLocation({
        shopDomain: shop.shopDomain,
        accessToken: shop.accessToken,
        productId: candidate.productId,
      });

      const nextCategory = product.itemCategory?.trim() || "unknown";
      const currentCategory = candidate.itemCategory?.trim() || "unknown";
      const nextSku = product.sku?.trim() || null;
      const nextBarcode = product.barcode?.trim() || null;
      const nextImageUrl = product.imageUrl?.trim() || null;
      const nextTitle = product.title.trim();

      const updateData: Record<string, string | number | null> = {};

      if (currentCategory !== nextCategory && nextCategory !== "unknown") {
        updateData["itemCategory"] = nextCategory;
      }

      if (candidate.itemSku === null && nextSku !== null) {
        updateData["itemSku"] = nextSku;
      }

      if (candidate.itemBarcode === null && nextBarcode !== null) {
        updateData["itemBarcode"] = nextBarcode;
      }

      if (candidate.itemImageUrl === null && nextImageUrl !== null) {
        updateData["itemImageUrl"] = nextImageUrl;
      }

      if (
        (!candidate.itemTitle || candidate.itemTitle.trim().length === 0) &&
        nextTitle
      ) {
        updateData["itemTitle"] = nextTitle;
      }

      if (candidate.itemHeight === null && product.itemHeight !== null) {
        updateData["itemHeight"] = product.itemHeight;
      }

      if (candidate.itemWidth === null && product.itemWidth !== null) {
        updateData["itemWidth"] = product.itemWidth;
      }

      if (candidate.itemDepth === null && product.itemDepth !== null) {
        updateData["itemDepth"] = product.itemDepth;
      }

      if (candidate.volume === null && product.volume !== null) {
        updateData["volume"] = product.volume;
      }

      if (Object.keys(updateData).length === 0) {
        skippedNoChanges += 1;
        continue;
      }

      log("Repairing sold product snapshot", {
        shopId: shop.id,
        scanHistoryId: candidate.id,
        productId: candidate.productId,
        orderId: candidate.orderId,
        currentCategory,
        nextCategory,
        itemTitle: candidate.itemTitle,
        fields: Object.keys(updateData),
      });

      if (!DRY_RUN) {
        await prisma.scanHistory.update({
          where: { id: candidate.id },
          data: updateData,
        });
      }

      updated += 1;
    } catch (error) {
      logError("Failed to repair sold product snapshot", error, {
        shopId: shop.id,
        scanHistoryId: candidate.id,
        productId: candidate.productId,
        orderId: candidate.orderId,
      });
      failed += 1;
    }
  }

  log("Phase 2 complete", {
    shopId: shop.id,
    dryRun: DRY_RUN,
    updated,
    skippedNoChanges,
    failed,
  });
};

const rebuildCategoryStatsTable = async (): Promise<void> => {
  log("=== Phase 3: Rebuilding category stats table ===", {
    scope: "global",
  });

  const records = await prisma.scanHistory.findMany({
    include: {
      events: {
        orderBy: { happenedAt: "asc" },
      },
      priceHistory: {
        orderBy: { happenedAt: "asc" },
      },
    },
  });

  type CategoryStat = {
    date: Date;
    location: string;
    itemCategory: string;
    itemsSold: number;
    totalRevenue: number;
    totalTimeToSellSeconds: number;
  };

  const categoryStats = new Map<string, CategoryStat>();
  const getCategoryStat = (
    date: Date,
    location: string,
    itemCategory: string,
  ): CategoryStat => {
    const key = `${date.toISOString()}|${location}|${itemCategory}`;
    if (!categoryStats.has(key)) {
      categoryStats.set(key, {
        date,
        location,
        itemCategory,
        itemsSold: 0,
        totalRevenue: 0,
        totalTimeToSellSeconds: 0,
      });
    }

    return categoryStats.get(key)!;
  };

  for (const record of records) {
    const itemCategory = record.itemCategory ?? "unknown";

    for (let idx = 0; idx < record.events.length; idx += 1) {
      const event = record.events[idx]!;
      if (event.eventType !== "sold_terminal") {
        continue;
      }

      const channel =
        (event.salesChannel as SalesChannel | null) ??
        (record.lastSoldChannel as SalesChannel | null) ??
        ("unknown" as SalesChannel);

      if (channel !== "physical") {
        continue;
      }

      const statsDate = startOfUtcDay(event.happenedAt);
      const priceRecord = record.priceHistory.find(
        (pricePoint) =>
          pricePoint.terminalType === "sold_terminal" &&
          (event.orderId
            ? pricePoint.orderId === event.orderId
            : pricePoint.orderGroupId === event.orderGroupId),
      );
      const soldValuation = parsePriceValue(priceRecord?.price);
      const quantity =
        typeof record.quantity === "number" && record.quantity >= 1
          ? record.quantity
          : 1;

      const arrivedEvent = record.events
        .slice(0, idx)
        .reverse()
        .find((entry) => entry.eventType === "location_update");

      const arrivedLocation = arrivedEvent?.location ?? "UNKNOWN_POSITION";
      const arrivedTime = arrivedEvent?.happenedAt ?? event.happenedAt;
      const timeToSellSeconds = toDurationSeconds(
        arrivedTime,
        event.happenedAt,
      );

      const stat = getCategoryStat(statsDate, arrivedLocation, itemCategory);
      stat.itemsSold += quantity;
      stat.totalRevenue += soldValuation;
      stat.totalTimeToSellSeconds += quantity * timeToSellSeconds;
    }
  }

  const unknownRows = [...categoryStats.values()].filter(
    (row) => row.itemCategory === "unknown",
  ).length;

  if (!DRY_RUN) {
    await prisma.$transaction(async (tx) => {
      await tx.locationCategoryStatsDaily.deleteMany({});

      for (const stat of categoryStats.values()) {
        await tx.locationCategoryStatsDaily.create({
          data: stat,
        });
      }
    });
  }

  log("Phase 3 complete", {
    dryRun: DRY_RUN,
    rebuiltRows: categoryStats.size,
    unknownRowsAfterRebuild: unknownRows,
  });
};

const verifyDimensionsCoverage = async (): Promise<void> => {
  log("=== Phase 4: Verifying dimensions coverage after repair ===");

  const soldRowsMissingAnyDimension = await prisma.scanHistory.count({
    where: {
      isSold: true,
      OR: [
        { itemHeight: null },
        { itemWidth: null },
        { itemDepth: null },
        { volume: null },
      ],
    },
  });

  const soldRowsWithCompleteDimensions = await prisma.scanHistory.count({
    where: {
      isSold: true,
      itemHeight: { not: null },
      itemWidth: { not: null },
      itemDepth: { not: null },
      volume: { not: null },
    },
  });

  log("Phase 4 complete", {
    dryRun: DRY_RUN,
    soldRowsWithCompleteDimensions,
    soldRowsMissingAnyDimension,
    note: "/api/stats/dimensions is computed live from ScanHistory; no separate rebuild is required",
  });
};

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  const shops = await prisma.shop.findMany({
    where: {
      ...(SHOP_ID ? { id: SHOP_ID } : {}),
    },
    select: {
      id: true,
      shopDomain: true,
      accessToken: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (shops.length === 0) {
    log("No shops found for repair run", { shopId: SHOP_ID });
    return;
  }

  log("Repair run started", {
    dryRun: DRY_RUN,
    shopCount: shops.length,
    shopIdFilter: SHOP_ID,
  });

  for (const shop of shops) {
    await repairOrderNumbersForShop(shop);
    await repairSoldProductSnapshotForShop(shop);
  }

  await rebuildCategoryStatsTable();
  await verifyDimensionsCoverage();

  log("Repair run complete", {
    dryRun: DRY_RUN,
    shopCount: shops.length,
  });
};

main()
  .catch((error) => {
    logError("Repair script failed", error, {
      dryRun: DRY_RUN,
      shopId: SHOP_ID,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
