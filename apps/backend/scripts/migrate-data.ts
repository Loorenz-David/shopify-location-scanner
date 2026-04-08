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

async function migrateTable<T>(
  tableName: string,
  fetchFn: () => Promise<T[]>,
  insertFn: (row: T) => Promise<any>,
) {
  console.log(`[migrate] ${tableName}`);

  const rows = await fetchFn();
  console.log(`[migrate] ${tableName} → ${rows.length} rows`);

  for (const row of rows) {
    try {
      await insertFn(row);
    } catch (err) {
      console.error(`[migrate][${tableName}] failed row`, err);
    }
  }
}

async function main() {
  // 1. SHOP (fix unique constraint)
  await migrateTable(
    "Shop",
    () => oldDb.shop.findMany(),
    (row) =>
      newDb.shop.upsert({
        where: { shopDomain: row.shopDomain },
        update: {},
        create: row,
      }),
  );

  // 2. USER (already correct)
  await migrateTable(
    "User",
    () => oldDb.user.findMany(),
    (row) =>
      newDb.user.upsert({
        where: { username: row.username },
        update: {},
        create: row,
      }),
  );

  // 3. SCAN HISTORY (CRITICAL FIX)
  await migrateTable(
    "ScanHistory",
    () =>
      oldDb.$queryRawUnsafe<any[]>(`
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
        FROM ScanHistory
      `),
    (row) =>
      newDb.scanHistory.upsert({
        where: {
          shopId_productId: {
            shopId: row.shopId,
            productId: row.productId,
          },
        },
        update: {},
        create: {
          ...row,
          itemBarcode: null, // safe fallback
        },
      }),
  );

  // 4. SCAN HISTORY EVENTS
  await migrateTable(
    "ScanHistoryEvent",
    () => oldDb.scanHistoryEvent.findMany(),
    (row) =>
      newDb.scanHistoryEvent.create({
        data: row,
      }),
  );

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
