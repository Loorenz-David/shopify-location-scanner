-- CreateTable
CREATE TABLE "ScanHistoryPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanHistoryId" TEXT NOT NULL,
    "price" TEXT,
    "terminalType" TEXT,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanHistoryPrice_scanHistoryId_fkey" FOREIGN KEY ("scanHistoryId") REFERENCES "ScanHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScanHistoryPrice_scanHistoryId_happenedAt_idx" ON "ScanHistoryPrice"("scanHistoryId", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryPrice_scanHistoryId_terminalType_happenedAt_idx" ON "ScanHistoryPrice"("scanHistoryId", "terminalType", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryPrice_terminalType_happenedAt_idx" ON "ScanHistoryPrice"("terminalType", "happenedAt");
