import { PrismaClient } from "@prisma/client";

const oldDb = new PrismaClient({
  datasources: {
    db: { url: "file:/var/lib/shopify-scanner/dev.db.backup" },
  },
});

const newDb = new PrismaClient({
  datasources: {
    db: { url: "file:/var/lib/shopify-scanner/dev.db" },
  },
});

type LegacyScanHistoryRow = {
  id: string;
  shopId: string;
  userId: string | null;
  username: string;
  productId: string;
  itemSku: string | null;
  itemImageUrl: string | null;
  itemType: string;
  itemTitle: string;
  lastModifiedAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

async function createManyInChunks<T>(
  tableName: string,
  rows: T[],
  insertChunk: (chunk: T[]) => Promise<void>,
  chunkSize = 250,
) {
  if (rows.length === 0) {
    console.log(`[migrate] ${tableName} → no rows to insert`);
    return;
  }

  const chunks = chunkArray(rows, chunkSize);
  console.log(
    `[migrate] ${tableName} → inserting ${rows.length} rows in ${chunks.length} chunk(s)`,
  );

  for (const [index, chunk] of chunks.entries()) {
    await insertChunk(chunk);
    console.log(`[migrate] ${tableName} → chunk ${index + 1}/${chunks.length}`);
  }
}

async function main() {
  console.log("[migrate] Starting clean import from backup DB to new DB");

  const [shops, users, refreshTokens, scanHistoryRows, scanHistoryEvents] =
    await Promise.all([
      oldDb.shop.findMany(),
      oldDb.user.findMany(),
      oldDb.refreshToken.findMany(),
      oldDb.$queryRaw<LegacyScanHistoryRow[]>`
        SELECT
          id,
          shopId,
          userId,
          username,
          productId,
          itemSku,
          itemImageUrl,
          itemType,
          itemTitle,
          lastModifiedAt,
          createdAt,
          updatedAt
        FROM "ScanHistory"
      `,
      oldDb.scanHistoryEvent.findMany(),
    ]);

  console.log("[migrate] Source counts");
  console.log(`[migrate] Shop: ${shops.length}`);
  console.log(`[migrate] User: ${users.length}`);
  console.log(`[migrate] RefreshToken: ${refreshTokens.length}`);
  console.log(`[migrate] ScanHistory: ${scanHistoryRows.length}`);
  console.log(`[migrate] ScanHistoryEvent: ${scanHistoryEvents.length}`);

  const shopIds = new Set(shops.map((row) => row.id));
  const userIds = new Set(users.map((row) => row.id));
  const scanHistoryIds = new Set(scanHistoryRows.map((row) => row.id));

  let usersWithoutShop = 0;
  const normalizedUsers = users.map((row) => {
    if (row.shopId && !shopIds.has(row.shopId)) {
      usersWithoutShop += 1;
      return { ...row, shopId: null };
    }

    return row;
  });

  const normalizedScanHistory = scanHistoryRows
    .filter((row) => {
      if (!shopIds.has(row.shopId)) {
        return false;
      }
      return true;
    })
    .map((row) => ({
      ...row,
      userId: row.userId && userIds.has(row.userId) ? row.userId : null,
      itemBarcode: null,
    }));

  const skippedScanHistory = scanHistoryRows.length - normalizedScanHistory.length;
  const validScanHistoryIds = new Set(normalizedScanHistory.map((row) => row.id));

  const normalizedRefreshTokens = refreshTokens.filter((row) =>
    userIds.has(row.userId),
  );
  const skippedRefreshTokens = refreshTokens.length - normalizedRefreshTokens.length;

  const normalizedScanHistoryEvents = scanHistoryEvents.filter((row) =>
    validScanHistoryIds.has(row.scanHistoryId),
  );
  const skippedScanHistoryEvents =
    scanHistoryEvents.length - normalizedScanHistoryEvents.length;

  if (usersWithoutShop > 0) {
    console.warn(
      `[migrate] User: normalized ${usersWithoutShop} row(s) with missing shopId to null`,
    );
  }
  if (skippedScanHistory > 0) {
    console.warn(
      `[migrate] ScanHistory: skipped ${skippedScanHistory} row(s) referencing missing shopId`,
    );
  }
  if (skippedRefreshTokens > 0) {
    console.warn(
      `[migrate] RefreshToken: skipped ${skippedRefreshTokens} row(s) referencing missing userId`,
    );
  }
  if (skippedScanHistoryEvents > 0) {
    console.warn(
      `[migrate] ScanHistoryEvent: skipped ${skippedScanHistoryEvents} row(s) referencing missing scanHistoryId`,
    );
  }

  await newDb.$transaction(async (tx) => {
    console.log("[migrate] Clearing target tables");
    await tx.scanHistoryEvent.deleteMany();
    await tx.scanHistory.deleteMany();
    await tx.refreshToken.deleteMany();
    await tx.user.deleteMany();
    await tx.shop.deleteMany();

    await createManyInChunks("Shop", shops, async (chunk) => {
      await tx.shop.createMany({ data: chunk });
    });

    await createManyInChunks("User", normalizedUsers, async (chunk) => {
      await tx.user.createMany({ data: chunk });
    });

    await createManyInChunks(
      "RefreshToken",
      normalizedRefreshTokens,
      async (chunk) => {
        await tx.refreshToken.createMany({ data: chunk });
      },
    );

    await createManyInChunks(
      "ScanHistory",
      normalizedScanHistory,
      async (chunk) => {
        await tx.scanHistory.createMany({ data: chunk });
      },
    );

    await createManyInChunks(
      "ScanHistoryEvent",
      normalizedScanHistoryEvents,
      async (chunk) => {
        await tx.scanHistoryEvent.createMany({ data: chunk });
      },
    );

    const [shopCount, userCount, refreshTokenCount, scanHistoryCount, scanEventCount] =
      await Promise.all([
        tx.shop.count(),
        tx.user.count(),
        tx.refreshToken.count(),
        tx.scanHistory.count(),
        tx.scanHistoryEvent.count(),
      ]);

    const mismatches: string[] = [];

    if (shopCount !== shops.length) {
      mismatches.push(`Shop expected ${shops.length}, got ${shopCount}`);
    }
    if (userCount !== normalizedUsers.length) {
      mismatches.push(`User expected ${normalizedUsers.length}, got ${userCount}`);
    }
    if (refreshTokenCount !== normalizedRefreshTokens.length) {
      mismatches.push(
        `RefreshToken expected ${normalizedRefreshTokens.length}, got ${refreshTokenCount}`,
      );
    }
    if (scanHistoryCount !== normalizedScanHistory.length) {
      mismatches.push(
        `ScanHistory expected ${normalizedScanHistory.length}, got ${scanHistoryCount}`,
      );
    }
    if (scanEventCount !== normalizedScanHistoryEvents.length) {
      mismatches.push(
        `ScanHistoryEvent expected ${normalizedScanHistoryEvents.length}, got ${scanEventCount}`,
      );
    }

    if (mismatches.length > 0) {
      throw new Error(`[migrate] Verification failed: ${mismatches.join(" | ")}`);
    }

    console.log("[migrate] Verification passed");
    console.log(`[migrate] Shop: ${shopCount}`);
    console.log(`[migrate] User: ${userCount}`);
    console.log(`[migrate] RefreshToken: ${refreshTokenCount}`);
    console.log(`[migrate] ScanHistory: ${scanHistoryCount}`);
    console.log(`[migrate] ScanHistoryEvent: ${scanEventCount}`);
  });

  console.log("[migrate] done");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await oldDb.$disconnect();
    await newDb.$disconnect();
  });
