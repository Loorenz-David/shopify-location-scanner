-- CreateTable
CREATE TABLE "LogisticLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "zoneType" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LogisticLocation_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScanHistoryLogistic" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanHistoryId" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "orderId" TEXT,
    "logisticLocationId" TEXT,
    "username" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanHistoryLogistic_scanHistoryId_fkey" FOREIGN KEY ("scanHistoryId") REFERENCES "ScanHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanHistoryLogistic_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanHistoryLogistic_logisticLocationId_fkey" FOREIGN KEY ("logisticLocationId") REFERENCES "LogisticLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScanHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemCategory" TEXT,
    "itemSku" TEXT,
    "itemBarcode" TEXT,
    "itemImageUrl" TEXT,
    "itemType" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "itemHeight" REAL,
    "itemWidth" REAL,
    "itemDepth" REAL,
    "volume" REAL,
    "latestLocation" TEXT,
    "isSold" BOOLEAN NOT NULL DEFAULT false,
    "lastSoldChannel" TEXT,
    "orderId" TEXT,
    "intention" TEXT,
    "fixItem" BOOLEAN,
    "scheduledDate" DATETIME,
    "lastLogisticEventType" TEXT,
    "logisticLocationId" TEXT,
    "logisticsCompletedAt" DATETIME,
    "lastModifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScanHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScanHistory_logisticLocationId_fkey" FOREIGN KEY ("logisticLocationId") REFERENCES "LogisticLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScanHistory" ("createdAt", "id", "isSold", "itemBarcode", "itemCategory", "itemDepth", "itemHeight", "itemImageUrl", "itemSku", "itemTitle", "itemType", "itemWidth", "lastModifiedAt", "lastSoldChannel", "latestLocation", "productId", "shopId", "updatedAt", "userId", "username", "volume") SELECT "createdAt", "id", "isSold", "itemBarcode", "itemCategory", "itemDepth", "itemHeight", "itemImageUrl", "itemSku", "itemTitle", "itemType", "itemWidth", "lastModifiedAt", "lastSoldChannel", "latestLocation", "productId", "shopId", "updatedAt", "userId", "username", "volume" FROM "ScanHistory";
DROP TABLE "ScanHistory";
ALTER TABLE "new_ScanHistory" RENAME TO "ScanHistory";
CREATE INDEX "ScanHistory_shopId_lastModifiedAt_idx" ON "ScanHistory"("shopId", "lastModifiedAt");
CREATE INDEX "ScanHistory_userId_lastModifiedAt_idx" ON "ScanHistory"("userId", "lastModifiedAt");
CREATE INDEX "ScanHistory_shopId_username_idx" ON "ScanHistory"("shopId", "username");
CREATE INDEX "ScanHistory_shopId_itemCategory_idx" ON "ScanHistory"("shopId", "itemCategory");
CREATE INDEX "ScanHistory_shopId_itemSku_idx" ON "ScanHistory"("shopId", "itemSku");
CREATE INDEX "ScanHistory_shopId_itemBarcode_idx" ON "ScanHistory"("shopId", "itemBarcode");
CREATE INDEX "ScanHistory_shopId_itemType_idx" ON "ScanHistory"("shopId", "itemType");
CREATE INDEX "ScanHistory_shopId_itemTitle_idx" ON "ScanHistory"("shopId", "itemTitle");
CREATE INDEX "ScanHistory_shopId_latestLocation_idx" ON "ScanHistory"("shopId", "latestLocation");
CREATE INDEX "ScanHistory_shopId_isSold_lastModifiedAt_idx" ON "ScanHistory"("shopId", "isSold", "lastModifiedAt");
CREATE INDEX "ScanHistory_shopId_lastSoldChannel_lastModifiedAt_idx" ON "ScanHistory"("shopId", "lastSoldChannel", "lastModifiedAt");
CREATE INDEX "ScanHistory_shopId_intention_idx" ON "ScanHistory"("shopId", "intention");
CREATE INDEX "ScanHistory_shopId_lastLogisticEventType_idx" ON "ScanHistory"("shopId", "lastLogisticEventType");
CREATE INDEX "ScanHistory_shopId_logisticsCompletedAt_idx" ON "ScanHistory"("shopId", "logisticsCompletedAt");
CREATE INDEX "ScanHistory_shopId_orderId_idx" ON "ScanHistory"("shopId", "orderId");
CREATE UNIQUE INDEX "ScanHistory_shopId_productId_key" ON "ScanHistory"("shopId", "productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "LogisticLocation_shopId_zoneType_idx" ON "LogisticLocation"("shopId", "zoneType");

-- CreateIndex
CREATE INDEX "LogisticLocation_shopId_location_idx" ON "LogisticLocation"("shopId", "location");

-- CreateIndex
CREATE INDEX "ScanHistoryLogistic_scanHistoryId_happenedAt_idx" ON "ScanHistoryLogistic"("scanHistoryId", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryLogistic_scanHistoryId_eventType_idx" ON "ScanHistoryLogistic"("scanHistoryId", "eventType");

-- CreateIndex
CREATE INDEX "ScanHistoryLogistic_shopId_eventType_happenedAt_idx" ON "ScanHistoryLogistic"("shopId", "eventType", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryLogistic_orderId_happenedAt_idx" ON "ScanHistoryLogistic"("orderId", "happenedAt");
