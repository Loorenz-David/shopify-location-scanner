-- CreateTable
CREATE TABLE "floor_plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Ground Floor',
    "width_cm" REAL NOT NULL,
    "depth_cm" REAL NOT NULL,
    "shape" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "floor_plan_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreZone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "floor_plan_id" TEXT,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'zone',
    "x_pct" REAL NOT NULL,
    "y_pct" REAL NOT NULL,
    "width_pct" REAL NOT NULL,
    "height_pct" REAL NOT NULL,
    "width_cm" REAL,
    "depth_cm" REAL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StoreZone_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StoreZone_floor_plan_id_fkey" FOREIGN KEY ("floor_plan_id") REFERENCES "floor_plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StoreZone" ("createdAt", "height_pct", "id", "label", "shopId", "sortOrder", "type", "updatedAt", "width_pct", "x_pct", "y_pct") SELECT "createdAt", "height_pct", "id", "label", "shopId", "sortOrder", "type", "updatedAt", "width_pct", "x_pct", "y_pct" FROM "StoreZone";
DROP TABLE "StoreZone";
ALTER TABLE "new_StoreZone" RENAME TO "StoreZone";
CREATE INDEX "StoreZone_shopId_sortOrder_idx" ON "StoreZone"("shopId", "sortOrder");
CREATE INDEX "StoreZone_shopId_type_idx" ON "StoreZone"("shopId", "type");
CREATE INDEX "StoreZone_floor_plan_id_sortOrder_idx" ON "StoreZone"("floor_plan_id", "sortOrder");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "floor_plan_shopId_sortOrder_idx" ON "floor_plan"("shopId", "sortOrder");
