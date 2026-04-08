-- AlterTable
ALTER TABLE "ScanHistoryEvent" ADD COLUMN "orderGroupId" TEXT;
ALTER TABLE "ScanHistoryEvent" ADD COLUMN "orderId" TEXT;

-- AlterTable
ALTER TABLE "ScanHistoryPrice" ADD COLUMN "orderGroupId" TEXT;
ALTER TABLE "ScanHistoryPrice" ADD COLUMN "orderId" TEXT;

-- CreateIndex
CREATE INDEX "ScanHistoryEvent_scanHistoryId_orderGroupId_happenedAt_idx" ON "ScanHistoryEvent"("scanHistoryId", "orderGroupId", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryEvent_orderGroupId_happenedAt_idx" ON "ScanHistoryEvent"("orderGroupId", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryPrice_scanHistoryId_orderGroupId_happenedAt_idx" ON "ScanHistoryPrice"("scanHistoryId", "orderGroupId", "happenedAt");

-- CreateIndex
CREATE INDEX "ScanHistoryPrice_orderGroupId_happenedAt_idx" ON "ScanHistoryPrice"("orderGroupId", "happenedAt");
