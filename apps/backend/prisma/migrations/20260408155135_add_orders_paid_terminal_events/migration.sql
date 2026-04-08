-- CreateTable
CREATE TABLE "ShopifyWebhookDelivery" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShopifyWebhookDelivery_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScanHistoryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scanHistoryId" TEXT NOT NULL,
    "username" TEXT NOT NULL DEFAULT 'unknown',
    "eventType" TEXT NOT NULL DEFAULT 'location_update',
    "location" TEXT NOT NULL,
    "happenedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanHistoryEvent_scanHistoryId_fkey" FOREIGN KEY ("scanHistoryId") REFERENCES "ScanHistory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ScanHistoryEvent" ("createdAt", "happenedAt", "id", "location", "scanHistoryId", "username") SELECT "createdAt", "happenedAt", "id", "location", "scanHistoryId", "username" FROM "ScanHistoryEvent";
DROP TABLE "ScanHistoryEvent";
ALTER TABLE "new_ScanHistoryEvent" RENAME TO "ScanHistoryEvent";
CREATE INDEX "ScanHistoryEvent_scanHistoryId_happenedAt_idx" ON "ScanHistoryEvent"("scanHistoryId", "happenedAt");
CREATE INDEX "ScanHistoryEvent_scanHistoryId_eventType_happenedAt_idx" ON "ScanHistoryEvent"("scanHistoryId", "eventType", "happenedAt");
CREATE INDEX "ScanHistoryEvent_eventType_happenedAt_idx" ON "ScanHistoryEvent"("eventType", "happenedAt");
CREATE INDEX "ScanHistoryEvent_username_idx" ON "ScanHistoryEvent"("username");
CREATE INDEX "ScanHistoryEvent_location_idx" ON "ScanHistoryEvent"("location");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "ShopifyWebhookDelivery_shopId_createdAt_idx" ON "ShopifyWebhookDelivery"("shopId", "createdAt");

-- CreateIndex
CREATE INDEX "ShopifyWebhookDelivery_topic_createdAt_idx" ON "ShopifyWebhookDelivery"("topic", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopifyWebhookDelivery_shopId_topic_webhookId_key" ON "ShopifyWebhookDelivery"("shopId", "topic", "webhookId");
