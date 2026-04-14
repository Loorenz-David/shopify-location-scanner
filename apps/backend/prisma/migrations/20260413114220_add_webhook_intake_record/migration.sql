-- CreateTable
CREATE TABLE "WebhookIntakeRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processedAt" DATETIME,
    "lastError" TEXT,
    "retryable" BOOLEAN NOT NULL DEFAULT true,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WebhookIntakeRecord_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WebhookIntakeRecord_dedupeKey_key" ON "WebhookIntakeRecord"("dedupeKey");

-- CreateIndex
CREATE INDEX "WebhookIntakeRecord_shopId_status_idx" ON "WebhookIntakeRecord"("shopId", "status");

-- CreateIndex
CREATE INDEX "WebhookIntakeRecord_topic_status_idx" ON "WebhookIntakeRecord"("topic", "status");

-- CreateIndex
CREATE INDEX "WebhookIntakeRecord_status_createdAt_idx" ON "WebhookIntakeRecord"("status", "createdAt");
