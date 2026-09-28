CREATE TABLE "LogisticTaskClearBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "note" TEXT,
    "clearedCount" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LogisticTaskClearBatch_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

ALTER TABLE "ScanHistory" ADD COLUMN "currentClearBatchId" TEXT REFERENCES "LogisticTaskClearBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanHistoryLogistic" ADD COLUMN "clearBatchId" TEXT REFERENCES "LogisticTaskClearBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LogisticTaskClearBatch_shopId_createdAt_id_idx" ON "LogisticTaskClearBatch"("shopId", "createdAt", "id");
CREATE INDEX "ScanHistory_shopId_currentClearBatchId_idx" ON "ScanHistory"("shopId", "currentClearBatchId");
CREATE INDEX "ScanHistoryLogistic_clearBatchId_id_idx" ON "ScanHistoryLogistic"("clearBatchId", "id");
