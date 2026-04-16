/**
 * Data Correction Script — correct-scan-history-data.ts
 *
 * Fixes three categories of historical data bugs in ScanHistory:
 *
 *   Bug 1 — Missing/wrong dimensions & categories
 *     Old logic stored wrong metafield keys (e.g. "height" instead of
 *     "totalheight") and resolved category from smart collections instead of
 *     the parser. Fix: batch-fetch from Shopify and rewrite all records.
 *
 *   Bug 2 — Missing POS sales (izettle / orders/create)
 *     The system previously only listened to orders/paid (webshop). POS orders
 *     arrived via orders/create with financial_status:"paid" and were ignored.
 *     Fix: fetch all paid Shopify orders, find unrecorded ones, create sold events.
 *
 *   Bug 3 — Echo bug
 *     After an order was sold, a products/update webhook rewrote latestLocation
 *     and set isSold = false. Fix: remove post-sold location events, restore
 *     isSold = true and the correct latestLocation.
 *
 * After correcting ScanHistory, all three stats tables are cleared and rebuilt
 * from scratch so the dashboards reflect the corrected data.
 *
 * Usage on EC2:
 *   TOKEN=<shopify_access_token> DOMAIN=<shop.myshopify.com> \
 *     npx tsx scripts/correct-scan-history-data.ts
 *
 *   Add DRY_RUN=true to preview actions without writing anything.
 *   Add SHOPIFY_API_VERSION=2024-10 to override the default API version.
 */

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { categoryParserService } from "../src/shared/category/category-parser.service.js";
import { classifyShopifyOrderChannel } from "../src/shared/sales-channel/classify-sales-channel.js";
import { type SalesChannel } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN = process.env.TOKEN;
const DOMAIN = process.env.DOMAIN;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2024-10";
const DRY_RUN = process.env.DRY_RUN === "true";

if (!TOKEN || !DOMAIN) {
  console.error(
    "[correct] TOKEN and DOMAIN env vars are required.\n" +
      "  Usage: TOKEN=<token> DOMAIN=<shop.myshopify.com> npx tsx scripts/correct-scan-history-data.ts",
  );
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Logging
// ─────────────────────────────────────────────────────────────────────────────

const log = (msg: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  if (data) {
    console.log(`[${ts}] ${msg}`, JSON.stringify(data));
  } else {
    console.log(`[${ts}] ${msg}`);
  }
};

const warn = (msg: string, data?: Record<string, unknown>): void => {
  const ts = new Date().toISOString();
  if (data) {
    console.warn(`[${ts}] WARN ${msg}`, JSON.stringify(data));
  } else {
    console.warn(`[${ts}] WARN ${msg}`);
  }
};

const logError = (
  msg: string,
  err: unknown,
  extra?: Record<string, unknown>,
): void => {
  const ts = new Date().toISOString();
  console.error(
    `[${ts}] ERROR ${msg}`,
    JSON.stringify({
      error: err instanceof Error ? err.message : String(err),
      ...extra,
    }),
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shopify GraphQL client
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

const shopifyGraphql = async <T>(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
): Promise<T> => {
  const resp = await fetch(
    `https://${DOMAIN}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": TOKEN!,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (resp.status === 429 && attempt < 5) {
    const retryAfter = resp.headers.get("retry-after");
    const delay = retryAfter
      ? Math.max(Number.parseInt(retryAfter, 10) * 1_000, 1_000)
      : Math.min(1_000 * 2 ** attempt, 8_000);
    warn(`HTTP 429 rate limit; retrying in ${delay}ms`, { attempt });
    await sleep(delay);
    return shopifyGraphql(query, variables, attempt + 1);
  }

  if (!resp.ok) {
    throw new Error(
      `Shopify API HTTP ${resp.status}: ${await resp.text().catch(() => "")}`,
    );
  }

  const payload = (await resp.json()) as { data?: T; errors?: unknown };

  if (payload.errors) {
    const errors = payload.errors as Array<Record<string, unknown>>;
    const isThrottled =
      Array.isArray(errors) &&
      errors.some(
        (e) =>
          e?.message === "Throttled" ||
          (e?.extensions as Record<string, unknown> | null)?.code ===
            "THROTTLED",
      );
    if (isThrottled && attempt < 5) {
      const delay = Math.min(1_000 * 2 ** attempt, 8_000);
      warn(`GraphQL throttled; retrying in ${delay}ms`, { attempt });
      await sleep(delay);
      return shopifyGraphql(query, variables, attempt + 1);
    }
    throw new Error(
      `Shopify GraphQL errors: ${JSON.stringify(payload.errors)}`,
    );
  }

  if (!payload.data) {
    throw new Error("Shopify GraphQL returned no data");
  }

  return payload.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

const parseDimensionCm = (value?: string | null): number | null => {
  if (!value) return null;
  const match = value.match(/-?\d+(?:[\.,]\d+)?/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[0].replace(/,/g, "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parsePriceValue = (price?: string | null): number => {
  if (!price) return 0;
  const parsed = Number.parseFloat(price.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
};

const startOfUtcDay = (date: Date): Date => {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

const toDurationSeconds = (from: Date, to: Date): number => {
  const s = (to.getTime() - from.getTime()) / 1_000;
  return s > 0 ? s : 0;
};

const normalizeProductId = (raw: number | string): string => {
  const s = String(raw).trim();
  if (s.startsWith("gid://shopify/Product/")) return s;
  if (/^\d+$/.test(s)) return `gid://shopify/Product/${s}`;
  return s;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 1 — Batch-fetch product data from Shopify
// ─────────────────────────────────────────────────────────────────────────────

type ShopifyProductData = {
  id: string;
  imageUrl: string | null;
  itemCategory: string;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  sku: string | null;
  barcode: string | null;
};

const batchFetchProducts = async (
  productIds: string[],
): Promise<Map<string, ShopifyProductData>> => {
  const result = new Map<string, ShopifyProductData>();
  const BATCH = 50; // safe below Shopify complexity limits with all the metafield aliases

  for (let i = 0; i < productIds.length; i += BATCH) {
    const batch = productIds.slice(i, i + BATCH);
    const end = Math.min(i + BATCH, productIds.length);

    try {
      const data = await shopifyGraphql<{
        nodes: Array<{
          __typename: string;
          id: string;
          title?: string;
          featuredImage?: { url: string } | null;
          itemCategoryMeta?: { value: string | null } | null;
          itemHeight?: { value: string | null } | null;
          itemWidth?: { value: string | null } | null;
          itemDepth?: { value: string | null } | null;
          variants?: {
            edges: Array<{
              node: { sku: string | null; barcode: string | null };
            }>;
          };
        }>;
      }>(
        `#graphql
        query BatchGetProducts($ids: [ID!]!) {
          nodes(ids: $ids) {
            __typename
            ... on Product {
              id
              title
              featuredImage { url }
              itemCategoryMeta: metafield(namespace: "custom", key: "productcategory") { value }
              itemHeight: metafield(namespace: "custom", key: "totalheight") { value }
              itemWidth: metafield(namespace: "custom", key: "totalwidth") { value }
              itemDepth: metafield(namespace: "custom", key: "totaldepth") { value }
              variants(first: 1) {
                edges {
                  node { sku barcode }
                }
              }
            }
          }
        }`,
        { ids: batch },
      );

      for (const node of data.nodes) {
        if (node.__typename !== "Product" || !node.title) continue;

        const h = parseDimensionCm(node.itemHeight?.value);
        const w = parseDimensionCm(node.itemWidth?.value);
        const d = parseDimensionCm(node.itemDepth?.value);

        const metafieldCategory = node.itemCategoryMeta?.value?.trim() || null;
        const parsedCategory = categoryParserService.parse(node.title);
        const itemCategory = metafieldCategory ?? parsedCategory ?? "unknown";

        result.set(node.id, {
          id: node.id,
          imageUrl: node.featuredImage?.url ?? null,
          itemCategory,
          itemHeight: h,
          itemWidth: w,
          itemDepth: d,
          volume: h !== null && w !== null && d !== null ? h * w * d : null,
          sku: node.variants?.edges[0]?.node.sku ?? null,
          barcode: node.variants?.edges[0]?.node.barcode ?? null,
        });
      }

      log(`Product batch ${i + 1}–${end} / ${productIds.length} fetched`);
    } catch (err) {
      warn(`Failed to fetch product batch ${i + 1}–${end}`, {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    if (i + BATCH < productIds.length) {
      await sleep(250);
    }
  }

  return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// Phase 4 — Fetch all paid Shopify orders
// ─────────────────────────────────────────────────────────────────────────────

type ShopifyOrderLineItem = {
  productId: string | null;
  sku: string | null;
  title: string;
  price: string | null;
};

type ShopifyOrder = {
  id: string; // GID
  legacyId: string; // numeric string — used as orderId in the DB
  name: string; // #1001
  number: number; // 1001
  processedAt: string;
  createdAt: string;
  sourceName: string | null;
  appId: number | null;
  noteAttributes: Array<{ name: string; value: string | null }>;
  lineItems: ShopifyOrderLineItem[];
};

type ListOrdersResponse = {
  orders: {
    pageInfo: { hasNextPage: boolean };
    edges: Array<{
      cursor: string;
      node: {
        id: string;
        legacyResourceId: string;
        name: string;
        number: number;
        processedAt: string | null;
        createdAt: string;
        sourceName: string | null;
        app: { id: string } | null;
        customAttributes: Array<{ key: string; value: string | null }>;
        lineItems: {
          edges: Array<{
            node: {
              product: { id: string } | null;
              sku: string | null;
              title: string;
              originalUnitPriceSet: { shopMoney: { amount: string } } | null;
            };
          }>;
        };
      };
    }>;
  };
};

const fetchAllPaidOrders = async (sinceDate: Date): Promise<ShopifyOrder[]> => {
  const allOrders: ShopifyOrder[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;
  const since = sinceDate.toISOString().slice(0, 10);
  const queryStr = `financial_status:paid processed_at:>=${since}`;

  log(`Querying Shopify orders with: ${queryStr}`);

  while (hasNextPage) {
    const data: ListOrdersResponse = await shopifyGraphql<ListOrdersResponse>(
      `#graphql
      query ListPaidOrders($first: Int!, $after: String, $query: String!) {
        orders(first: $first, after: $after, query: $query, sortKey: CREATED_AT) {
          pageInfo { hasNextPage }
          edges {
            cursor
            node {
              id
              legacyResourceId
              name
              number
              processedAt
              createdAt
              sourceName
              app { id }
              customAttributes { key value }
              lineItems(first: 50) {
                edges {
                  node {
                    product { id }
                    sku
                    title
                    originalUnitPriceSet {
                      shopMoney { amount }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { first: 100, after: cursor, query: queryStr },
    );

    for (const edge of data.orders.edges) {
      const n = edge.node;
      const appIdStr = n.app?.id?.match(/\d+$/)?.[0];
      const appId = appIdStr ? Number.parseInt(appIdStr, 10) : null;

      allOrders.push({
        id: n.id,
        legacyId: n.legacyResourceId,
        name: n.name,
        number: n.number,
        processedAt: n.processedAt ?? n.createdAt,
        createdAt: n.createdAt,
        sourceName: n.sourceName,
        appId,
        noteAttributes: n.customAttributes.map((a) => ({
          name: a.key,
          value: a.value ?? null,
        })),
        lineItems: n.lineItems.edges
          .filter((e) => e.node.product !== null)
          .map((e) => ({
            productId: e.node.product?.id ?? null,
            sku: e.node.sku ?? null,
            title: e.node.title,
            price: e.node.originalUnitPriceSet?.shopMoney.amount ?? null,
          })),
      });
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.edges.at(-1)?.cursor ?? null;

    if (allOrders.length % 500 === 0 || !hasNextPage) {
      log(`Orders fetched so far: ${allOrders.length}`);
    }

    if (hasNextPage) {
      await sleep(250);
    }
  }

  return allOrders;
};

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  if (DRY_RUN) {
    log("DRY_RUN=true — no database writes will occur");
  }

  // Resolve shop from domain
  const shop = await prisma.shop.findUnique({
    where: { shopDomain: DOMAIN! },
  });
  if (!shop) {
    throw new Error(`No shop found for domain: ${DOMAIN}`);
  }
  log(`Shop resolved`, { id: shop.id, domain: shop.shopDomain });

  // ──────────────────────────────────────────────────────────────────────────
  // Load all ScanHistory
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Loading ScanHistory ===");

  const allRecords = await prisma.scanHistory.findMany({
    where: { shopId: shop.id },
    include: {
      events: { orderBy: { happenedAt: "asc" } },
      priceHistory: { orderBy: { happenedAt: "asc" } },
    },
  });

  if (allRecords.length === 0) {
    log("No ScanHistory records found — nothing to do");
    return;
  }

  log(`Loaded ${allRecords.length} ScanHistory records`);

  const oldestRecord = allRecords.reduce((a, b) =>
    a.createdAt < b.createdAt ? a : b,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 1 — Fetch product metadata from Shopify
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Phase 1: Fetching product data from Shopify ===");

  const productIds = [...new Set(allRecords.map((r) => r.productId))];
  log(`Unique product IDs: ${productIds.length}`);

  const productMap = await batchFetchProducts(productIds);
  log(
    `Shopify product data resolved: ${productMap.size} / ${productIds.length}`,
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 2 — Update dimensions, categories, images
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Phase 2: Updating dimensions, categories, and images ===");

  let p2Updated = 0;
  let p2Skipped = 0;
  let p2Failed = 0;

  for (const record of allRecords) {
    const shopify = productMap.get(record.productId);
    if (!shopify) {
      warn(`No Shopify data for product`, {
        productId: record.productId,
        title: record.itemTitle,
      });
      p2Skipped++;
      continue;
    }

    try {
      if (!DRY_RUN) {
        await prisma.scanHistory.update({
          where: { id: record.id },
          data: {
            itemHeight: shopify.itemHeight ?? record.itemHeight,
            itemWidth: shopify.itemWidth ?? record.itemWidth,
            itemDepth: shopify.itemDepth ?? record.itemDepth,
            volume: shopify.volume ?? record.volume,
            itemCategory: shopify.itemCategory,
            itemImageUrl: shopify.imageUrl ?? record.itemImageUrl,
            itemSku: shopify.sku ?? record.itemSku,
            itemBarcode: shopify.barcode ?? record.itemBarcode,
          },
        });
      }
      p2Updated++;
    } catch (err) {
      logError("Failed to update record", err, {
        scanHistoryId: record.id,
        productId: record.productId,
      });
      p2Failed++;
    }
  }

  log(`Phase 2 complete`, {
    updated: p2Updated,
    skipped: p2Skipped,
    failed: p2Failed,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 3 — Fix echo bug
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Phase 3: Fixing echo bug ===");

  let p3Checked = 0;
  let p3Fixed = 0;
  let p3Failed = 0;

  for (const record of allRecords) {
    const soldEvents = record.events.filter(
      (e) => e.eventType === "sold_terminal",
    );
    if (soldEvents.length === 0) continue;

    p3Checked++;

    // Use the last sold event as the canonical terminal point
    const lastSoldEvent = soldEvents[soldEvents.length - 1]!;

    // The last real physical location before the sold event
    const soldEventIdx = record.events.indexOf(lastSoldEvent);
    const preSoldLocationEvent = record.events
      .slice(0, soldEventIdx)
      .reverse()
      .find(
        (e) =>
          e.eventType === "location_update" ||
          e.eventType === "unknown_position",
      );
    const preSoldLocation =
      preSoldLocationEvent?.location ??
      record.latestLocation ??
      "UNKNOWN_POSITION";

    // Events that arrived AFTER the sold terminal
    const postSoldLocationEvents = record.events.filter(
      (e) =>
        e.happenedAt > lastSoldEvent.happenedAt &&
        e.eventType === "location_update",
    );

    // Already correct: sold and no echo events
    if (postSoldLocationEvents.length === 0 && record.isSold) continue;

    // Case A: isSold is wrong but no echo events — just fix the flag
    if (postSoldLocationEvents.length === 0 && !record.isSold) {
      log(`isSold flag wrong (no echo events)`, {
        productId: record.productId,
        title: record.itemTitle,
      });

      try {
        if (!DRY_RUN) {
          await prisma.scanHistory.update({
            where: { id: record.id },
            data: {
              isSold: true,
              latestLocation: preSoldLocation,
              lastSoldChannel:
                lastSoldEvent.salesChannel ?? record.lastSoldChannel,
              orderId: lastSoldEvent.orderId ?? record.orderId,
              lastModifiedAt: lastSoldEvent.happenedAt,
            },
          });
        }
        p3Fixed++;
      } catch (err) {
        logError("Failed to fix isSold flag", err, {
          scanHistoryId: record.id,
        });
        p3Failed++;
      }
      continue;
    }

    // Case B: echo bug — post-sold location events exist
    log(`Echo bug detected`, {
      productId: record.productId,
      title: record.itemTitle,
      soldAt: lastSoldEvent.happenedAt.toISOString(),
      echoEventCount: postSoldLocationEvents.length,
      currentIsSold: record.isSold,
    });

    try {
      if (!DRY_RUN) {
        await prisma.$transaction(async (tx) => {
          // Remove all post-sold events (the echo writes)
          await tx.scanHistoryEvent.deleteMany({
            where: {
              scanHistoryId: record.id,
              happenedAt: { gt: lastSoldEvent.happenedAt },
            },
          });

          // Remove price records written by the echo (no orderId means not from a real sale)
          await tx.scanHistoryPrice.deleteMany({
            where: {
              scanHistoryId: record.id,
              happenedAt: { gt: lastSoldEvent.happenedAt },
              orderId: null,
            },
          });

          // Restore the correct sold state
          await tx.scanHistory.update({
            where: { id: record.id },
            data: {
              isSold: true,
              latestLocation: preSoldLocation,
              lastSoldChannel:
                lastSoldEvent.salesChannel ?? record.lastSoldChannel,
              orderId: lastSoldEvent.orderId ?? record.orderId,
              lastModifiedAt: lastSoldEvent.happenedAt,
            },
          });
        });
      }
      p3Fixed++;
    } catch (err) {
      logError("Failed to fix echo bug", err, {
        scanHistoryId: record.id,
        productId: record.productId,
      });
      p3Failed++;
    }
  }

  log(`Phase 3 complete`, {
    withSoldEvents: p3Checked,
    fixed: p3Fixed,
    failed: p3Failed,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 4 — Fix missed POS sales
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Phase 4: Fixing missed POS (and any other missed) sales ===");
  log(`Fetching Shopify orders since ${oldestRecord.createdAt.toISOString()}`);

  const allOrders = await fetchAllPaidOrders(oldestRecord.createdAt);
  log(`Total paid orders from Shopify: ${allOrders.length}`);

  // Reload ScanHistory after Phase 3 fixes so event checks are accurate
  const freshRecords = await prisma.scanHistory.findMany({
    where: { shopId: shop.id },
    include: {
      events: { orderBy: { happenedAt: "asc" } },
    },
  });

  // Build productId → ScanHistory map
  const scanHistoryByProductId = new Map(
    freshRecords.map((r) => [r.productId, r]),
  );

  let p4Added = 0;
  let p4AlreadyPresent = 0;
  let p4NoHistory = 0;
  let p4Failed = 0;

  for (const order of allOrders) {
    const channel = classifyShopifyOrderChannel({
      sourceName: order.sourceName,
      appId: order.appId,
      noteAttributes: order.noteAttributes,
    });

    const orderId = order.legacyId;
    const orderGroupId = `order:${orderId}`;
    const soldLocation = `SOLD_ORDER:${orderId}`;
    const happenedAt = new Date(order.processedAt ?? order.createdAt);

    for (const lineItem of order.lineItems) {
      if (!lineItem.productId) continue;

      const productId = normalizeProductId(lineItem.productId);
      const scanHistory = scanHistoryByProductId.get(productId);

      if (!scanHistory) {
        // Item was never scanned in-store; nothing to link
        p4NoHistory++;
        continue;
      }

      // Check if a sold_terminal event for this exact orderId already exists
      const alreadyRecorded = scanHistory.events.some(
        (e) => e.eventType === "sold_terminal" && e.orderId === orderId,
      );

      if (alreadyRecorded) {
        p4AlreadyPresent++;
        continue;
      }

      log(`Missing sold record found`, {
        productId,
        title: lineItem.title,
        orderId,
        orderName: order.name,
        channel,
        happenedAt: happenedAt.toISOString(),
      });

      try {
        if (!DRY_RUN) {
          await prisma.$transaction(async (tx) => {
            await tx.scanHistoryEvent.create({
              data: {
                scanHistoryId: scanHistory.id,
                username: "system:correction",
                eventType: "sold_terminal",
                orderId,
                orderGroupId,
                salesChannel: channel,
                location: soldLocation,
                happenedAt,
              },
            });

            await tx.scanHistoryPrice.create({
              data: {
                scanHistoryId: scanHistory.id,
                price: lineItem.price,
                terminalType: "sold_terminal",
                orderId,
                orderGroupId,
                happenedAt,
              },
            });

            await tx.scanHistory.update({
              where: { id: scanHistory.id },
              data: {
                isSold: true,
                lastSoldChannel: channel,
                orderId,
                orderNumber: order.number,
                latestLocation: soldLocation,
                lastModifiedAt: happenedAt,
              },
            });
          });

          // Keep the in-memory map fresh so duplicates within the same order are caught
          scanHistoryByProductId.set(productId, {
            ...scanHistory,
            isSold: true,
            lastSoldChannel: channel as any,
            orderId,
            events: [
              ...scanHistory.events,
              {
                id: "_tmp",
                scanHistoryId: scanHistory.id,
                username: "system:correction",
                eventType: "sold_terminal" as any,
                orderId,
                orderGroupId,
                salesChannel: channel as any,
                location: soldLocation,
                happenedAt,
                createdAt: new Date(),
              },
            ],
          });
        }

        p4Added++;
      } catch (err) {
        logError("Failed to create missed sold record", err, {
          scanHistoryId: scanHistory.id,
          orderId,
          productId,
        });
        p4Failed++;
      }
    }
  }

  log(`Phase 4 complete`, {
    ordersProcessed: allOrders.length,
    added: p4Added,
    alreadyPresent: p4AlreadyPresent,
    noHistory: p4NoHistory,
    failed: p4Failed,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 5 — Rebuild stats
  // ──────────────────────────────────────────────────────────────────────────
  log("=== Phase 5: Rebuilding stats ===");

  // Reload all records with corrected events
  const correctedRecords = await prisma.scanHistory.findMany({
    where: { shopId: shop.id },
    include: {
      events: { orderBy: { happenedAt: "asc" } },
      priceHistory: { orderBy: { happenedAt: "asc" } },
    },
  });

  log(`Computing stats from ${correctedRecords.length} ScanHistory records`);

  // Accumulate stats in memory before writing
  type LocKey = string;
  type CatKey = string;
  type ChanKey = string;

  const locationStats = new Map<
    LocKey,
    {
      date: Date;
      location: string;
      itemsReceived: number;
      itemsSold: number;
      totalTimeToSellSeconds: number;
      totalValuation: number;
    }
  >();

  const categoryStats = new Map<
    CatKey,
    {
      date: Date;
      location: string;
      itemCategory: string;
      itemsSold: number;
      totalRevenue: number;
      totalTimeToSellSeconds: number;
    }
  >();

  const channelStats = new Map<
    ChanKey,
    {
      date: Date;
      shopId: string;
      salesChannel: SalesChannel;
      itemsSold: number;
      totalRevenue: number;
    }
  >();

  const getLocStat = (date: Date, location: string) => {
    const key: LocKey = `${date.toISOString()}|${location}`;
    if (!locationStats.has(key)) {
      locationStats.set(key, {
        date,
        location,
        itemsReceived: 0,
        itemsSold: 0,
        totalTimeToSellSeconds: 0,
        totalValuation: 0,
      });
    }
    return locationStats.get(key)!;
  };

  const getCatStat = (date: Date, location: string, itemCategory: string) => {
    const key: CatKey = `${date.toISOString()}|${location}|${itemCategory}`;
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

  const getChanStat = (date: Date, salesChannel: SalesChannel) => {
    const key: ChanKey = `${date.toISOString()}|${shop.id}|${salesChannel}`;
    if (!channelStats.has(key)) {
      channelStats.set(key, {
        date,
        shopId: shop.id,
        salesChannel,
        itemsSold: 0,
        totalRevenue: 0,
      });
    }
    return channelStats.get(key)!;
  };

  for (const record of correctedRecords) {
    const itemCategory = record.itemCategory ?? "unknown";

    for (let idx = 0; idx < record.events.length; idx++) {
      const event = record.events[idx]!;

      // itemsReceived: every location_update event
      if (event.eventType === "location_update") {
        const statsDate = startOfUtcDay(event.happenedAt);
        getLocStat(statsDate, event.location).itemsReceived += 1;
      }

      // Sales stats: every sold_terminal event
      if (event.eventType === "sold_terminal") {
        const channel =
          (event.salesChannel as SalesChannel | null) ??
          (record.lastSoldChannel as SalesChannel | null) ??
          ("unknown" as SalesChannel);
        const statsDate = startOfUtcDay(event.happenedAt);

        // Find the price associated with this sale
        const priceRecord = record.priceHistory.find(
          (p) =>
            p.terminalType === "sold_terminal" &&
            (event.orderId
              ? p.orderId === event.orderId
              : p.orderGroupId === event.orderGroupId),
        );
        const soldValuation = parsePriceValue(priceRecord?.price);

        // Sales channel stats — all channels
        getChanStat(statsDate, channel).itemsSold += 1;
        getChanStat(statsDate, channel).totalRevenue += soldValuation;

        // Location + category stats — physical channel only
        if (channel === "physical") {
          // Last location_update or unknown_position before this sold event
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
          const timeToSellSeconds = toDurationSeconds(
            arrivedTime,
            event.happenedAt,
          );

          const locStat = getLocStat(statsDate, arrivedLocation);
          locStat.itemsSold += 1;
          locStat.totalTimeToSellSeconds += timeToSellSeconds;
          locStat.totalValuation += soldValuation;

          const catStat = getCatStat(statsDate, arrivedLocation, itemCategory);
          catStat.itemsSold += 1;
          catStat.totalRevenue += soldValuation;
          catStat.totalTimeToSellSeconds += timeToSellSeconds;
        }
      }
    }
  }

  log(`Stats computed`, {
    locationEntries: locationStats.size,
    categoryEntries: categoryStats.size,
    channelEntries: channelStats.size,
  });

  if (!DRY_RUN) {
    // Clear and rebuild atomically in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.locationStatsDaily.deleteMany({});
      await tx.locationCategoryStatsDaily.deleteMany({});
      await tx.salesChannelStatsDaily.deleteMany({
        where: { shopId: shop.id },
      });

      for (const stat of locationStats.values()) {
        await tx.locationStatsDaily.create({ data: stat });
      }

      for (const stat of categoryStats.values()) {
        await tx.locationCategoryStatsDaily.create({ data: stat });
      }

      for (const stat of channelStats.values()) {
        await tx.salesChannelStatsDaily.create({ data: stat });
      }
    });

    log(`Phase 5 complete — stats tables cleared and rebuilt`, {
      locationRows: locationStats.size,
      categoryRows: categoryStats.size,
      channelRows: channelStats.size,
    });
  } else {
    log(`Phase 5 complete (DRY_RUN — no writes)`, {
      wouldWrite: {
        locationRows: locationStats.size,
        categoryRows: categoryStats.size,
        channelRows: channelStats.size,
      },
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────────────────────
  log("=== CORRECTION COMPLETE ===", {
    dryRun: DRY_RUN,
    totalRecords: allRecords.length,
    phase2: { updated: p2Updated, skipped: p2Skipped, failed: p2Failed },
    phase3: { echoBugsFixed: p3Fixed, failed: p3Failed },
    phase4: {
      missedSalesAdded: p4Added,
      alreadyPresent: p4AlreadyPresent,
      failed: p4Failed,
    },
    phase5: {
      locationRows: locationStats.size,
      categoryRows: categoryStats.size,
      channelRows: channelStats.size,
    },
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
