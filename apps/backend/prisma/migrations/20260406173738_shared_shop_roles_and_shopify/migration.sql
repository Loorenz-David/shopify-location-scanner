-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScanHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "userId" TEXT,
    "barcode" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "status" TEXT NOT NULL,
    "requestPayload" TEXT,
    "responsePayload" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScanHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ScanHistory" ("barcode", "createdAt", "errorCode", "errorMessage", "id", "operation", "requestPayload", "responsePayload", "shopId", "status", "targetId", "targetType", "updatedAt") SELECT "barcode", "createdAt", "errorCode", "errorMessage", "id", "operation", "requestPayload", "responsePayload", "shopId", "status", "targetId", "targetType", "updatedAt" FROM "ScanHistory";
DROP TABLE "ScanHistory";
ALTER TABLE "new_ScanHistory" RENAME TO "ScanHistory";
CREATE INDEX "ScanHistory_shopId_createdAt_idx" ON "ScanHistory"("shopId", "createdAt");
CREATE INDEX "ScanHistory_userId_createdAt_idx" ON "ScanHistory"("userId", "createdAt");
CREATE INDEX "ScanHistory_barcode_idx" ON "ScanHistory"("barcode");
CREATE INDEX "ScanHistory_status_idx" ON "ScanHistory"("status");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'worker',
    "shopId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "id", "passwordHash", "updatedAt", "username") SELECT "createdAt", "id", "passwordHash", "updatedAt", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE INDEX "User_shopId_idx" ON "User"("shopId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
