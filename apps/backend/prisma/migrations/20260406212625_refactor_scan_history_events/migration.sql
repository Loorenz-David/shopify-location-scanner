/*
  Warnings:

  - You are about to drop the column `barcode` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `errorCode` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `errorMessage` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `operation` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `requestPayload` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `responsePayload` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `ScanHistory` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `ScanHistory` table. All the data in the column will be lost.
  - Added the required column `productId` to the `ScanHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `ScanHistory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ScanHistoryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanHistoryId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanHistoryEvent_scanHistoryId_fkey" FOREIGN KEY ("scanHistoryId") REFERENCES "ScanHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    "lastModifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScanHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScanHistory" ("createdAt", "id", "shopId", "updatedAt", "userId") SELECT "createdAt", "id", "shopId", "updatedAt", "userId" FROM "ScanHistory";
DROP TABLE "ScanHistory";
ALTER TABLE "new_ScanHistory" RENAME TO "ScanHistory";
CREATE INDEX "ScanHistory_shopId_lastModifiedAt_idx" ON "ScanHistory"("shopId", "lastModifiedAt");
CREATE INDEX "ScanHistory_userId_lastModifiedAt_idx" ON "ScanHistory"("userId", "lastModifiedAt");
CREATE UNIQUE INDEX "ScanHistory_shopId_productId_key" ON "ScanHistory"("shopId", "productId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ScanHistoryEvent_scanHistoryId_happenedAt_idx" ON "ScanHistoryEvent"("scanHistoryId", "happenedAt");
