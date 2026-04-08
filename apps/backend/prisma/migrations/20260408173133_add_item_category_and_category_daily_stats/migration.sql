-- AlterTable
ALTER TABLE "ScanHistory" ADD COLUMN "itemCategory" TEXT;

-- CreateTable
CREATE TABLE "location_category_stats_daily" (
    "date" DATETIME NOT NULL,
    "location" TEXT NOT NULL,
    "itemCategory" TEXT NOT NULL,
    "items_sold" INTEGER NOT NULL DEFAULT 0,
    "total_revenue" REAL NOT NULL DEFAULT 0,

    PRIMARY KEY ("date", "location", "itemCategory")
);

-- CreateIndex
CREATE INDEX "ScanHistory_shopId_itemCategory_idx" ON "ScanHistory"("shopId", "itemCategory");
