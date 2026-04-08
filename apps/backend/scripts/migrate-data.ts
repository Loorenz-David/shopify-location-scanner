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
  // ORDER MATTERS (relations)
  await migrateTable(
    "Shop",
    () => oldDb.shop.findMany(),
    (row) =>
      newDb.shop.create({
        data: row,
      }),
  );

  await migrateTable(
    "User",
    () => oldDb.user.findMany(),
    (row) =>
      newDb.user.create({
        data: row,
      }),
  );

  await migrateTable(
    "ScanHistory",
    () => oldDb.scanHistory.findMany(),
    (row) =>
      newDb.scanHistory.create({
        data: {
          ...row,
          itemBarcode: row.itemBarcode ?? null, // handle new field
        },
      }),
  );

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
