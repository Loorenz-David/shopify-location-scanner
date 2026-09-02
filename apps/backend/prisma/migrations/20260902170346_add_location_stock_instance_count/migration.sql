-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LocationStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "itemCategory" TEXT NOT NULL,
    "properties" JSONB NOT NULL,
    "propertiesCanonical" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "instanceCount" INTEGER NOT NULL DEFAULT 0,
    "stockState" TEXT NOT NULL DEFAULT 'out_of_stock',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUsername" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedByUsername" TEXT NOT NULL,
    CONSTRAINT "LocationStock_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_LocationStock" ("createdAt", "createdByUsername", "id", "itemCategory", "location", "properties", "propertiesCanonical", "quantity", "shopId", "stockState", "updatedAt", "updatedByUsername") SELECT "createdAt", "createdByUsername", "id", "itemCategory", "location", "properties", "propertiesCanonical", "quantity", "shopId", "stockState", "updatedAt", "updatedByUsername" FROM "LocationStock";
DROP TABLE "LocationStock";
ALTER TABLE "new_LocationStock" RENAME TO "LocationStock";
CREATE INDEX "LocationStock_shopId_location_itemCategory_idx" ON "LocationStock"("shopId", "location", "itemCategory");
CREATE UNIQUE INDEX "LocationStock_shopId_location_itemCategory_propertiesCanonical_key" ON "LocationStock"("shopId", "location", "itemCategory", "propertiesCanonical");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
