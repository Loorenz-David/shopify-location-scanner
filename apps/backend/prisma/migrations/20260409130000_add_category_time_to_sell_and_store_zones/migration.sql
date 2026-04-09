ALTER TABLE "location_category_stats_daily"
ADD COLUMN "total_time_to_sell_seconds" REAL NOT NULL DEFAULT 0;

CREATE TABLE "StoreZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'zone',
    "x_pct" REAL NOT NULL,
    "y_pct" REAL NOT NULL,
    "width_pct" REAL NOT NULL,
    "height_pct" REAL NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreZone_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "StoreZone_shopId_sortOrder_idx" ON "StoreZone"("shopId", "sortOrder");
CREATE INDEX "StoreZone_shopId_type_idx" ON "StoreZone"("shopId", "type");
