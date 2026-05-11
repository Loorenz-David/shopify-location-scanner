/**
 * Update Script — update-scan-history-item-images.ts
 *
 * Refreshes existing ScanHistory itemImageUrl and quantity values from Shopify
 * product data. The Shopify snapshot serializer stores all product image URLs
 * in the existing itemImageUrl string field as:
 *
 *   url_1,url_2,url_3
 *
 * Usage:
 *   npx tsx scripts/update-scan-history-item-images.ts
 *
 * Optional env:
 *   DRY_RUN=true     Preview all actions without writing anything
 *   SHOP_ID=<id>     Required when multiple shops exist in the database
 *
 * Also backfills missing ScanHistoryLogistic.description values for
 * marked_intention events using the current ScanHistory.intention value.
 */

import "../src/config/load-env.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { shopifyAdminApi } from "../src/modules/shopify/integrations/shopify-admin-api.integration.js";

const DRY_RUN = process.env.DRY_RUN === "true";
const SHOP_ID = process.env.SHOP_ID?.trim() || null;
const BATCH_SIZE = Number.parseInt(process.env.BATCH_SIZE?.trim() ?? "25", 10);

type ResolvedShop = {
  id: string;
  shopDomain: string;
  accessToken: string;
};

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

const normalizeImageList = (
  value: string | null | undefined,
): string | null => {
  const urls = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const uniqueUrls = [...new Set(urls)];
  return uniqueUrls.length > 0 ? uniqueUrls.join(",") : null;
};

const summarizeImages = (
  value: string | null,
): {
  count: number;
  first: string | null;
} => {
  const urls = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return {
    count: urls.length,
    first: urls[0] ?? null,
  };
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (!Number.isInteger(size) || size <= 0) {
    return [items];
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const resolveShop = async (): Promise<ResolvedShop> => {
  if (SHOP_ID) {
    const shop = await prisma.shop.findUnique({
      where: { id: SHOP_ID },
      select: { id: true, shopDomain: true, accessToken: true },
    });

    if (!shop) {
      throw new Error(`Shop not found: ${SHOP_ID}`);
    }

    if (!shop.accessToken) {
      throw new Error(`Shop has no access token: ${SHOP_ID}`);
    }

    return {
      id: shop.id,
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
    };
  }

  const shops = await prisma.shop.findMany({
    where: { accessToken: { not: null } },
    select: { id: true, shopDomain: true, accessToken: true },
    orderBy: { createdAt: "asc" },
  });

  if (shops.length === 0) {
    throw new Error("No linked shop with accessToken found");
  }

  if (shops.length > 1) {
    throw new Error(
      "Multiple linked shops found. Set SHOP_ID to specify which one:\n" +
        shops
          .map((shop) => `  SHOP_ID=${shop.id}  (${shop.shopDomain})`)
          .join("\n"),
    );
  }

  const [shop] = shops;
  if (!shop?.accessToken) {
    throw new Error("Selected shop has no access token");
  }

  return {
    id: shop.id,
    shopDomain: shop.shopDomain,
    accessToken: shop.accessToken,
  };
};

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  const shop = await resolveShop();
  const records = await prisma.scanHistory.findMany({
    where: { shopId: shop.id },
    select: {
      id: true,
      productId: true,
      itemTitle: true,
      itemImageUrl: true,
      quantity: true,
      intention: true,
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
  });

  log("Scan history image and quantity refresh started", {
    dryRun: DRY_RUN,
    shopId: shop.id,
    shopDomain: shop.shopDomain,
    itemCount: records.length,
    batchSize: Number.isInteger(BATCH_SIZE) && BATCH_SIZE > 0 ? BATCH_SIZE : 0,
  });

  let checked = 0;
  let updated = 0;
  let unchanged = 0;
  let withoutImages = 0;
  let failed = 0;

  const batches = chunkArray(records, BATCH_SIZE);

  for (const batch of batches) {
    const productSnapshots = await shopifyAdminApi.getProductsWithLocation({
      shopDomain: shop.shopDomain,
      accessToken: shop.accessToken,
      productIds: batch.map((record) => record.productId),
    });

    const productSnapshotById = new Map(
      productSnapshots.map((snapshot) => [snapshot.id, snapshot]),
    );

    for (const record of batch) {
      checked += 1;

      try {
        const product = productSnapshotById.get(record.productId);

        if (!product) {
          failed += 1;
          logError(
            "Shopify product snapshot not found in batch response",
            new Error("Product not found"),
            {
              scanHistoryId: record.id,
              productId: record.productId,
              itemTitle: record.itemTitle,
            },
          );
          continue;
        }

        if (record.intention) {
          const backfillWhere = {
            scanHistoryId: record.id,
            eventType: "marked_intention" as const,
            description: null,
          };

          const descriptionUpdateCount = DRY_RUN
            ? await prisma.scanHistoryLogistic.count({
                where: backfillWhere,
              })
            : (
                await prisma.scanHistoryLogistic.updateMany({
                  where: backfillWhere,
                  data: {
                    description: record.intention,
                  },
                })
              ).count;

          if (descriptionUpdateCount > 0) {
            log(
              DRY_RUN
                ? "DRY_RUN: would backfill marked_intention description"
                : "Backfilled marked_intention description",
              {
                scanHistoryId: record.id,
                productId: record.productId,
                itemTitle: record.itemTitle,
                intention: record.intention,
                updatedEvents: descriptionUpdateCount,
              },
            );
          }
        }

        const currentImageUrl = normalizeImageList(record.itemImageUrl);
        const nextImageUrl = normalizeImageList(product.imageUrl);
        const currentQuantity = record.quantity;
        const nextQuantity = product.quantity;

        if (!nextImageUrl) {
          withoutImages += 1;
          warn("Shopify product has no images", {
            scanHistoryId: record.id,
            productId: record.productId,
            itemTitle: record.itemTitle,
          });
          continue;
        }

        if (
          currentImageUrl === nextImageUrl &&
          currentQuantity === nextQuantity
        ) {
          unchanged += 1;
          continue;
        }

        const before = summarizeImages(currentImageUrl);
        const after = summarizeImages(nextImageUrl);

        log(
          DRY_RUN
            ? "DRY_RUN: would update item images and quantity"
            : "Updating item images and quantity",
          {
            scanHistoryId: record.id,
            productId: record.productId,
            itemTitle: record.itemTitle,
            beforeImageCount: before.count,
            afterImageCount: after.count,
            beforeFirstImage: before.first,
            afterFirstImage: after.first,
            beforeQuantity: currentQuantity,
            afterQuantity: nextQuantity,
            imageChanged: currentImageUrl !== nextImageUrl,
            quantityChanged: currentQuantity !== nextQuantity,
          },
        );

        if (!DRY_RUN) {
          await prisma.scanHistory.update({
            where: { id: record.id },
            data: {
              itemImageUrl: nextImageUrl,
              quantity: nextQuantity,
            },
          });
        }

        updated += 1;
      } catch (error) {
        failed += 1;
        logError("Failed to refresh item images", error, {
          scanHistoryId: record.id,
          productId: record.productId,
          itemTitle: record.itemTitle,
        });
      }
    }
  }

  log("Scan history image and quantity refresh complete", {
    dryRun: DRY_RUN,
    shopId: shop.id,
    checked,
    updated,
    unchanged,
    withoutImages,
    failed,
  });

  if (failed > 0) {
    process.exitCode = 1;
  }
};

main()
  .catch((error) => {
    logError("Scan history image refresh failed", error, {
      dryRun: DRY_RUN,
      shopId: SHOP_ID,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
