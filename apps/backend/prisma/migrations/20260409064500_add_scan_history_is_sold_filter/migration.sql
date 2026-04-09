ALTER TABLE "ScanHistory" ADD COLUMN "isSold" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "ScanHistory_shopId_isSold_lastModifiedAt_idx"
ON "ScanHistory"("shopId", "isSold", "lastModifiedAt");
