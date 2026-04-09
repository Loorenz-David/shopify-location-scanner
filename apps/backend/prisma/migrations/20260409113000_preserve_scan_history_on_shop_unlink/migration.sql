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
    "lastModifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScanHistory_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScanHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_ScanHistory" (
  "id",
  "shopId",
  "userId",
  "username",
  "productId",
  "itemCategory",
  "itemSku",
  "itemBarcode",
  "itemImageUrl",
  "itemType",
  "itemTitle",
  "itemHeight",
  "itemWidth",
  "itemDepth",
  "volume",
  "latestLocation",
  "isSold",
  "lastModifiedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  "id",
  "shopId",
  "userId",
  "username",
  "productId",
  "itemCategory",
  "itemSku",
  "itemBarcode",
  "itemImageUrl",
  "itemType",
  "itemTitle",
  "itemHeight",
  "itemWidth",
  "itemDepth",
  "volume",
  "latestLocation",
  "isSold",
  "lastModifiedAt",
  "createdAt",
  "updatedAt"
FROM "ScanHistory";

DROP TABLE "ScanHistory";
ALTER TABLE "new_ScanHistory" RENAME TO "ScanHistory";

CREATE UNIQUE INDEX "ScanHistory_shopId_productId_key" ON "ScanHistory"("shopId", "productId");
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

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
