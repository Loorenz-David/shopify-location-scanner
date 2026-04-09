import "../src/config/load-env.js";
import { initializeDatabaseRuntime } from "../src/shared/database/sqlite-runtime.js";
import { prisma } from "../src/shared/database/prisma-client.js";
import { scanHistoryRepository } from "../src/modules/scanner/repositories/scan-history.repository.js";
import { shopRepository } from "../src/modules/shopify/repositories/shop.repository.js";
import { shopifyAdminApi } from "../src/modules/shopify/integrations/shopify-admin-api.integration.js";
import { AppError } from "../src/shared/errors/app-error.js";

const RESTORE_ACTOR = "system:restore-scan-history";

const getRestoreTimestamp = (): Date => {
  const restoreAt = new Date();
  restoreAt.setDate(restoreAt.getDate() - 1);
  restoreAt.setHours(15, 0, 0, 0);
  return restoreAt;
};

const main = async (): Promise<void> => {
  await initializeDatabaseRuntime();

  const linkedShop = await shopRepository.findAnyLinkedShop();
  if (!linkedShop || !linkedShop.accessToken) {
    throw new Error("No currently linked shop with access token was found");
  }

  const restoreTimestamp = getRestoreTimestamp();
  console.log(
    `[restore-scan-history] Restoring shop ${linkedShop.shopDomain} at ${restoreTimestamp.toISOString()}`,
  );

  const products = await shopifyAdminApi.listProductsWithLocation({
    shopDomain: linkedShop.shopDomain,
    accessToken: linkedShop.accessToken,
  });

  console.log(
    `[restore-scan-history] Found ${products.length} Shopify products with location metafield`,
  );

  let restored = 0;
  let refreshedExisting = 0;
  let failed = 0;

  for (const product of products) {
    try {
      const existing = await scanHistoryRepository.findByShopAndProduct({
        shopId: linkedShop.id,
        productId: product.id,
      });

      if (existing) {
        await prisma.scanHistory.update({
          where: {
            shopId_productId: {
              shopId: linkedShop.id,
              productId: product.id,
            },
          },
          data: {
            itemCategory: product.itemCategory,
            itemSku: product.sku,
            itemBarcode: product.barcode,
            itemImageUrl: product.imageUrl,
            itemTitle: product.title,
            itemHeight: product.itemHeight,
            itemWidth: product.itemWidth,
            itemDepth: product.itemDepth,
            volume: product.volume,
          },
        });

        refreshedExisting += 1;
        continue;
      }

      if (!product.location?.trim()) {
        continue;
      }

      await scanHistoryRepository.appendLocationEvent({
        shopId: linkedShop.id,
        userId: null,
        username: RESTORE_ACTOR,
        currentPrice: product.price,
        itemHeight: product.itemHeight,
        itemWidth: product.itemWidth,
        itemDepth: product.itemDepth,
        volume: product.volume,
        productId: product.id,
        itemCategory: product.itemCategory,
        itemSku: product.sku,
        itemBarcode: product.barcode,
        itemImageUrl: product.imageUrl,
        itemType: "product_id",
        itemTitle: product.title,
        location: product.location.trim(),
        happenedAt: restoreTimestamp,
      });

      restored += 1;

      if (restored % 25 === 0) {
        console.log(
          `[restore-scan-history] Restored ${restored} item(s) so far`,
        );
      }
    } catch (error) {
      failed += 1;
      console.error("[restore-scan-history] Failed product restore", {
        productId: product.id,
        title: product.title,
        error: error instanceof Error ? error.message : "unknown",
        details: error instanceof AppError ? error.details : undefined,
      });
    }
  }

  console.log("[restore-scan-history] Completed", {
    restored,
    refreshedExisting,
    failed,
    totalSeen: products.length,
  });
};

main()
  .catch((error) => {
    console.error("[restore-scan-history] Fatal error", {
      error: error instanceof Error ? error.message : "unknown",
      details: error instanceof AppError ? error.details : undefined,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
