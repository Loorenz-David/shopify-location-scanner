-- CreateTable
CREATE TABLE "LocationStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "itemCategory" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "propertiesCanonical" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "stockState" TEXT NOT NULL DEFAULT 'out_of_stock',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUsername" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedByUsername" TEXT NOT NULL,
    CONSTRAINT "LocationStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockThresholdsLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "locationStockId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "thresholdQuantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUsername" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedByUsername" TEXT NOT NULL,
    CONSTRAINT "StockThresholdsLocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockThresholdsLocation_locationStockId_fkey" FOREIGN KEY ("locationStockId") REFERENCES "LocationStock" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "LocationStock_shopId_location_itemCategory_idx" ON "LocationStock"("shopId", "location", "itemCategory");

-- CreateIndex
CREATE UNIQUE INDEX "LocationStock_shopId_location_itemCategory_propertiesCanonical_key" ON "LocationStock"("shopId", "location", "itemCategory", "propertiesCanonical");

-- CreateIndex
CREATE INDEX "StockThresholdsLocation_shopId_idx" ON "StockThresholdsLocation"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "StockThresholdsLocation_locationStockId_state_key" ON "StockThresholdsLocation"("locationStockId", "state");
