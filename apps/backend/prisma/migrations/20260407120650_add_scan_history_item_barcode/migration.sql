-- AlterTable
ALTER TABLE "ScanHistory" ADD COLUMN "itemBarcode" TEXT;

-- CreateIndex
CREATE INDEX "ScanHistory_shopId_itemBarcode_idx" ON "ScanHistory"("shopId", "itemBarcode");
