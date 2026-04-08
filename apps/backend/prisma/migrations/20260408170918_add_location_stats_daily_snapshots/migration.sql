-- CreateTable
CREATE TABLE "location_stats_daily" (
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "items_sold" INTEGER NOT NULL DEFAULT 0,
    "items_received" INTEGER NOT NULL DEFAULT 0,
    "total_time_to_sell_seconds" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("date", "location")
);
