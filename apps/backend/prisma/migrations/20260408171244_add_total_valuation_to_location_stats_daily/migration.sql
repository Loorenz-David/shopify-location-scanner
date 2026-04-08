-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_location_stats_daily" (
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "items_sold" INTEGER NOT NULL DEFAULT 0,
    "items_received" INTEGER NOT NULL DEFAULT 0,
    "total_time_to_sell_seconds" REAL NOT NULL DEFAULT 0,
    "total_valuation" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("date", "location")
);
INSERT INTO "new_location_stats_daily" ("date", "items_received", "items_sold", "location", "total_time_to_sell_seconds") SELECT "date", "items_received", "items_sold", "location", "total_time_to_sell_seconds" FROM "location_stats_daily";
DROP TABLE "location_stats_daily";
ALTER TABLE "new_location_stats_daily" RENAME TO "location_stats_daily";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
