-- CreateTable
CREATE TABLE "OutboundWebhookTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutboundWebhookTarget_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "OutboundWebhookTarget_shopId_targetUrl_eventType_key" ON "OutboundWebhookTarget"("shopId", "targetUrl", "eventType");

-- CreateIndex
CREATE INDEX "OutboundWebhookTarget_shopId_eventType_active_idx" ON "OutboundWebhookTarget"("shopId", "eventType", "active");
