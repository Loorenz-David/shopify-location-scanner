/*
  Warnings:

  - Added the required column `itemTitle` to the `ScanHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `itemType` to the `ScanHistory` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScanHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "userId" TEXT,
    "username" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "itemSku" TEXT,
    "itemType" TEXT NOT NULL,
    "itemTitle" TEXT NOT NULL,
    "lastModifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScanHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScanHistory" ("createdAt", "id", "lastModifiedAt", "productId", "shopId", "updatedAt", "userId", "username") SELECT "createdAt", "id", "lastModifiedAt", "productId", "shopId", "updatedAt", "userId", "username" FROM "ScanHistory";
DROP TABLE "ScanHistory";
ALTER TABLE "new_ScanHistory" RENAME TO "ScanHistory";
CREATE INDEX "ScanHistory_shopId_lastModifiedAt_idx" ON "ScanHistory"("shopId", "lastModifiedAt");
CREATE INDEX "ScanHistory_userId_lastModifiedAt_idx" ON "ScanHistory"("userId", "lastModifiedAt");
CREATE INDEX "ScanHistory_shopId_username_idx" ON "ScanHistory"("shopId", "username");
CREATE INDEX "ScanHistory_shopId_itemSku_idx" ON "ScanHistory"("shopId", "itemSku");
CREATE INDEX "ScanHistory_shopId_itemType_idx" ON "ScanHistory"("shopId", "itemType");
CREATE INDEX "ScanHistory_shopId_itemTitle_idx" ON "ScanHistory"("shopId", "itemTitle");
CREATE UNIQUE INDEX "ScanHistory_shopId_productId_key" ON "ScanHistory"("shopId", "productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ScanHistoryEvent_location_idx" ON "ScanHistoryEvent"("location");
