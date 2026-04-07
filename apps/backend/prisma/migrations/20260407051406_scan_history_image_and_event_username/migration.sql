-- AlterTable
ALTER TABLE "ScanHistory" ADD COLUMN "itemImageUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScanHistoryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanHistoryId" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT 'unknown',
    "location" TEXT NOT NULL,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanHistoryEvent_scanHistoryId_fkey" FOREIGN KEY ("scanHistoryId") REFERENCES "ScanHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScanHistoryEvent" ("createdAt", "happenedAt", "id", "location", "scanHistoryId") SELECT "createdAt", "happenedAt", "id", "location", "scanHistoryId" FROM "ScanHistoryEvent";
DROP TABLE "ScanHistoryEvent";
ALTER TABLE "new_ScanHistoryEvent" RENAME TO "ScanHistoryEvent";
CREATE INDEX "ScanHistoryEvent_scanHistoryId_happenedAt_idx" ON "ScanHistoryEvent"("scanHistoryId", "happenedAt");
CREATE INDEX "ScanHistoryEvent_username_idx" ON "ScanHistoryEvent"("username");
CREATE INDEX "ScanHistoryEvent_location_idx" ON "ScanHistoryEvent"("location");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
