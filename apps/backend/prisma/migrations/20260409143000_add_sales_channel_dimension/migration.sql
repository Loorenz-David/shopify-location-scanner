ALTER TABLE "ScanHistory" ADD COLUMN "lastSoldChannel" TEXT;
ALTER TABLE "ScanHistoryEvent" ADD COLUMN "salesChannel" TEXT;

CREATE INDEX "ScanHistory_shopId_lastSoldChannel_lastModifiedAt_idx"
ON "ScanHistory"("shopId", "lastSoldChannel", "lastModifiedAt");

CREATE TABLE "sales_channel_stats_daily" (
    "date" DATETIME NOT NULL,
    "shopId" TEXT NOT NULL,
    "salesChannel" TEXT NOT NULL,
    "items_sold" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("date", "shopId", "salesChannel")
);

CREATE INDEX "sales_channel_stats_daily_shopId_date_idx"
ON "sales_channel_stats_daily"("shopId", "date");
