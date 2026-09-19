-- SQLite stores Prisma enums as TEXT; no table rebuild is needed for event values.
CREATE TABLE "OutboundWebhookDelivery" (
  "id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "targetId" TEXT,
  "eventType" TEXT NOT NULL, "subjectKey" TEXT, "status" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0, "requestBody" TEXT NOT NULL,
  "responseStatus" INTEGER, "responseBody" TEXT, "lastError" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastAttemptAt" DATETIME,
  "completedAt" DATETIME,
  CONSTRAINT "OutboundWebhookDelivery_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "OutboundWebhookDelivery_shopId_eventType_createdAt_idx" ON "OutboundWebhookDelivery"("shopId", "eventType", "createdAt");
CREATE INDEX "OutboundWebhookDelivery_shopId_subjectKey_idx" ON "OutboundWebhookDelivery"("shopId", "subjectKey");
CREATE INDEX "OutboundWebhookDelivery_status_createdAt_idx" ON "OutboundWebhookDelivery"("status", "createdAt");
CREATE TABLE "ManagerStockLedger" (
  "id" TEXT NOT NULL PRIMARY KEY, "shopId" TEXT NOT NULL, "itemCategory" TEXT NOT NULL,
  "propertiesCanonical" TEXT NOT NULL, "properties" JSONB NOT NULL, "state" TEXT NOT NULL DEFAULT 'active',
  "lastSentQuantity" INTEGER, "lastAppliedQuantity" INTEGER, "lastOutcome" TEXT,
  "lastSentAt" DATETIME, "lastDeliveryId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ManagerStockLedger_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ManagerStockLedger_shopId_itemCategory_propertiesCanonical_key" ON "ManagerStockLedger"("shopId", "itemCategory", "propertiesCanonical");
