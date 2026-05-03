/**
 * Reconcile Active Items Sold In Shopify
 *
 * Finds ScanHistory records that are still active locally (`isSold = false`)
 * even though Shopify has a paid order for the same product. For missing sold
 * records, it calls the normal sold process so ScanHistoryEvent,
 * ScanHistoryPrice, and daily stats are updated consistently.
 *
 * Usage:
 *   npx tsx scripts/reconcile-active-sold-items.ts
 *
 * Optional:
 *   DRY_RUN=true npx tsx scripts/reconcile-active-sold-items.ts
 *   SHOP_ID=<shop_id> npx tsx scripts/reconcile-active-sold-items.ts
 *   SINCE_DATE=2024-01-01 npx tsx scripts/reconcile-active-sold-items.ts
 *   TOKEN=<token> DOMAIN=<shop.myshopify.com> npx tsx scripts/reconcile-active-sold-items.ts
 */

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { scanHistoryRepository } from "../src/modules/scanner/repositories/scan-history.repository.js";
import {
  classifyShopifyOrderChannel,
  type SalesChannel,
} from "../src/shared/sales-channel/classify-sales-channel.js";

const DRY_RUN = process.env.DRY_RUN === "true";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const TOKEN = process.env.TOKEN?.trim() || null;
const DOMAIN = process.env.DOMAIN?.trim() || null;
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? "2024-10";
const SINCE_DATE = process.env.SINCE_DATE?.trim() || "2020-01-01";
const PAGE_SIZE = Number.parseInt(process.env.PAGE_SIZE ?? "100", 10);
const WEBHOOK_ACTOR = "system:active-sold-reconcile";
const UNKNOWN_POSITION_LOCATION = "UNKNOWN_POSITION";

type ActiveScanHistory = {
  id: string;
  shopId: string;
  productId: string;
  userId: string | null;
  username: string;
  itemSku: string | null;
  itemBarcode: string | null;
  itemImageUrl: string | null;
  itemType: string;
  itemTitle: string;
  itemCategory: string | null;
  itemHeight: number | null;
  itemWidth: number | null;
  itemDepth: number | null;
  volume: number | null;
  quantity: number;
  latestLocation: string | null;
  orderId: string | null;
  orderNumber: number | null;
  events: Array<{
    eventType: string;
    orderId: string | null;
    happenedAt: Date;
  }>;
};

type ShopifyOrderLineItem = {
  productId: string;
  sku: string | null;
  title: string;
  price: string | null;
};

type MatchedShopifyOrder = {
  id: string;
  legacyId: string;
  name: string;
  number: number | null;
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
        number: number | null;
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

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const normalizeProductId = (raw: string | number): string => {
  const value = String(raw).trim();
  if (value.startsWith("gid://shopify/Product/")) return value;
  if (/^\d+$/.test(value)) return `gid://shopify/Product/${value}`;
  return value;
};

const parseDate = (value: string): Date => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return parsed;
};

const shopifyGraphql = async <T>(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
): Promise<T> => {
  const response = await fetch(
    `https://${shopDomain}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (response.status === 429 && attempt < 5) {
    const retryAfter = response.headers.get("retry-after");
    const delay = retryAfter
      ? Math.max(Number.parseInt(retryAfter, 10) * 1_000, 1_000)
      : Math.min(1_000 * 2 ** attempt, 8_000);
    warn("Shopify HTTP 429; retrying", { attempt, delay });
    await sleep(delay);
    return shopifyGraphql(
      shopDomain,
      accessToken,
      query,
      variables,
      attempt + 1,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Shopify API HTTP ${response.status}: ${await response
        .text()
        .catch(() => "")}`,
    );
  }

  const payload = (await response.json()) as { data?: T; errors?: unknown };
  if (payload.errors) {
    const errors = payload.errors as Array<Record<string, unknown>>;
    const throttled = errors.some(
      (error) =>
        error?.message === "Throttled" ||
        (error?.extensions as Record<string, unknown> | undefined)?.code ===
          "THROTTLED",
    );

    if (throttled && attempt < 5) {
      const delay = Math.min(1_000 * 2 ** attempt, 8_000);
      warn("Shopify GraphQL throttled; retrying", { attempt, delay });
      await sleep(delay);
      return shopifyGraphql(
        shopDomain,
        accessToken,
        query,
        variables,
        attempt + 1,
      );
    }

    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(payload.errors)}`);
  }

  if (!payload.data) {
    throw new Error("Shopify GraphQL returned no data");
  }

  return payload.data;
};

const resolveShop = async (): Promise<{
  id: string;
  shopDomain: string;
  accessToken: string;
}> => {
  if (SHOP_ID) {
    const shop = await prisma.shop.findUnique({ where: { id: SHOP_ID } });
    if (!shop) throw new Error(`Shop not found: ${SHOP_ID}`);
    const accessToken = TOKEN ?? shop.accessToken;
    const shopDomain = DOMAIN ?? shop.shopDomain;
    if (!accessToken) throw new Error(`Shop has no access token: ${SHOP_ID}`);
    return { id: shop.id, shopDomain, accessToken };
  }

  const shops = await prisma.shop.findMany({
    where: { accessToken: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  if (shops.length === 0) {
    if (TOKEN && DOMAIN) {
      throw new Error("SHOP_ID is required when TOKEN/DOMAIN are used without a linked shop");
    }
    throw new Error("No linked shop with accessToken found");
  }

  if (shops.length > 1) {
    throw new Error(
      `Multiple linked shops found. Set SHOP_ID. Candidate ids: ${shops
        .map((shop) => shop.id)
        .join(", ")}`,
    );
  }

  const [shop] = shops;
  if (!shop?.accessToken) {
    throw new Error("Selected shop has no access token");
  }

  return {
    id: shop.id,
    shopDomain: DOMAIN ?? shop.shopDomain,
    accessToken: TOKEN ?? shop.accessToken,
  };
};

const fetchPaidOrdersMatchingProducts = async (input: {
  shopDomain: string;
  accessToken: string;
  activeProductIds: Set<string>;
}): Promise<Map<string, MatchedShopifyOrder>> => {
  const matchedOrdersByProductId = new Map<string, MatchedShopifyOrder>();
  const since = parseDate(SINCE_DATE).toISOString().slice(0, 10);
  const queryString = `financial_status:paid processed_at:>=${since}`;
  const first = Number.isInteger(PAGE_SIZE) && PAGE_SIZE > 0 ? PAGE_SIZE : 100;
  let cursor: string | null = null;
  let hasNextPage = true;
  let scannedOrders = 0;
  let scannedLineItems = 0;

  log("Fetching paid Shopify orders", {
    query: queryString,
    activeProductCount: input.activeProductIds.size,
    pageSize: first,
  });

  while (hasNextPage) {
    const data: ListOrdersResponse = await shopifyGraphql<ListOrdersResponse>(
      input.shopDomain,
      input.accessToken,
      `#graphql
      query ListPaidOrders($first: Int!, $after: String, $query: String!) {
        orders(first: $first, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
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
              lineItems(first: 100) {
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
      { first, after: cursor, query: queryString },
    );

    for (const edge of data.orders.edges) {
      scannedOrders += 1;
      const order = edge.node;
      const matchedLineItems: ShopifyOrderLineItem[] = [];

      for (const lineItemEdge of order.lineItems.edges) {
        scannedLineItems += 1;
        const productId = lineItemEdge.node.product?.id
          ? normalizeProductId(lineItemEdge.node.product.id)
          : null;

        if (!productId || !input.activeProductIds.has(productId)) {
          continue;
        }

        matchedLineItems.push({
          productId,
          sku: lineItemEdge.node.sku ?? null,
          title: lineItemEdge.node.title,
          price:
            lineItemEdge.node.originalUnitPriceSet?.shopMoney.amount ?? null,
        });
      }

      if (matchedLineItems.length === 0) {
        continue;
      }

      const appIdText = order.app?.id?.match(/\d+$/)?.[0];
      const appId = appIdText ? Number.parseInt(appIdText, 10) : null;
      const matchedOrder: MatchedShopifyOrder = {
        id: order.id,
        legacyId: order.legacyResourceId,
        name: order.name,
        number: order.number ?? null,
        processedAt: order.processedAt ?? order.createdAt,
        createdAt: order.createdAt,
        sourceName: order.sourceName,
        appId,
        noteAttributes: order.customAttributes.map(
          (attribute: { key: string; value: string | null }) => ({
            name: attribute.key,
            value: attribute.value ?? null,
          }),
        ),
        lineItems: matchedLineItems,
      };

      for (const lineItem of matchedLineItems) {
        if (!matchedOrdersByProductId.has(lineItem.productId)) {
          matchedOrdersByProductId.set(lineItem.productId, matchedOrder);
        }
      }
    }

    hasNextPage = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.edges.at(-1)?.cursor ?? null;

    log("Paid orders page processed", {
      scannedOrders,
      scannedLineItems,
      matchedProducts: matchedOrdersByProductId.size,
      hasNextPage,
    });

    if (matchedOrdersByProductId.size >= input.activeProductIds.size) {
      log("All active products matched; stopping Shopify order scan early");
      break;
    }

    if (hasNextPage) {
      await sleep(250);
    }
  }

  return matchedOrdersByProductId;
};

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  const shop = await resolveShop();
  log("Starting active/sold reconciliation", {
    shopId: shop.id,
    shopDomain: shop.shopDomain,
    apiVersion: API_VERSION,
    sinceDate: SINCE_DATE,
    dryRun: DRY_RUN,
  });

  const activeRecords = (await prisma.scanHistory.findMany({
    where: {
      shopId: shop.id,
      isSold: false,
    },
    include: {
      events: {
        where: { eventType: "sold_terminal" },
        orderBy: { happenedAt: "desc" },
      },
    },
    orderBy: { lastModifiedAt: "desc" },
  })) as ActiveScanHistory[];

  const activeProductIds = new Set(
    activeRecords.map((record) => normalizeProductId(record.productId)),
  );

  log("Loaded active ScanHistory records", {
    activeRecords: activeRecords.length,
    activeProducts: activeProductIds.size,
  });

  if (activeRecords.length === 0) {
    log("No active records found; nothing to reconcile");
    return;
  }

  const matchedOrdersByProductId = await fetchPaidOrdersMatchingProducts({
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
    activeProductIds,
  });

  let updatedToSold = 0;
  let dryRunWouldUpdate = 0;
  let alreadyHadSoldEvent = 0;
  let noPaidOrder = 0;
  let failed = 0;

  for (const record of activeRecords) {
    const productId = normalizeProductId(record.productId);
    const order = matchedOrdersByProductId.get(productId);

    if (!order) {
      noPaidOrder += 1;
      continue;
    }

    const lineItem =
      order.lineItems.find((item) => item.productId === productId) ??
      order.lineItems[0];
    const orderId = order.legacyId;
    const orderGroupId = `order:${orderId}`;
    const soldLocation = `SOLD_ORDER:${orderId}`;
    const happenedAt = parseDate(order.processedAt ?? order.createdAt);
    const salesChannel: SalesChannel = classifyShopifyOrderChannel({
      sourceName: order.sourceName,
      appId: order.appId,
      noteAttributes: order.noteAttributes,
    });
    const existingSoldEvent = record.events.find(
      (event) => event.eventType === "sold_terminal" && event.orderId === orderId,
    );

    log("Active item has paid Shopify order", {
      scanHistoryId: record.id,
      productId,
      title: record.itemTitle,
      sku: record.itemSku,
      latestLocation: record.latestLocation,
      orderId,
      orderName: order.name,
      orderNumber: order.number,
      happenedAt: happenedAt.toISOString(),
      salesChannel,
      price: lineItem?.price ?? null,
      existingSoldEvent: Boolean(existingSoldEvent),
    });

    try {
      if (DRY_RUN) {
        dryRunWouldUpdate += 1;
        continue;
      }

      if (existingSoldEvent) {
        await prisma.scanHistory.update({
          where: { id: record.id },
          data: {
            isSold: true,
            lastSoldChannel: salesChannel,
            orderId,
            orderNumber: order.number ?? record.orderNumber ?? null,
            lastModifiedAt: existingSoldEvent.happenedAt,
          },
        });
        alreadyHadSoldEvent += 1;
        updatedToSold += 1;
        continue;
      }

      await scanHistoryRepository.appendSoldTerminalEventWithFallback({
        shopId: shop.id,
        userId: null,
        username: WEBHOOK_ACTOR,
        productId,
        itemSku: record.itemSku ?? lineItem?.sku ?? null,
        itemBarcode: record.itemBarcode ?? null,
        itemImageUrl: record.itemImageUrl ?? null,
        itemType: record.itemType || "product_id",
        itemTitle: record.itemTitle || lineItem?.title || productId,
        itemCategory: record.itemCategory ?? null,
        itemHeight: record.itemHeight ?? null,
        itemWidth: record.itemWidth ?? null,
        itemDepth: record.itemDepth ?? null,
        volume: record.volume ?? null,
        soldPrice: lineItem?.price ?? null,
        orderId,
        orderNumber: order.number,
        orderGroupId,
        unknownLocation: UNKNOWN_POSITION_LOCATION,
        soldLocation,
        happenedAt,
        salesChannel,
        quantity: record.quantity,
      });

      updatedToSold += 1;
    } catch (error) {
      failed += 1;
      warn("Failed to reconcile active sold item", {
        scanHistoryId: record.id,
        productId,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  log("Active/sold reconciliation complete", {
    activeRecords: activeRecords.length,
    paidOrderMatches: matchedOrdersByProductId.size,
    updatedToSold,
    dryRunWouldUpdate,
    alreadyHadSoldEvent,
    noPaidOrder,
    failed,
  });
};

main()
  .catch((error) => {
    console.error(
      `[${new Date().toISOString()}] ERROR reconcile-active-sold-items failed`,
      error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
