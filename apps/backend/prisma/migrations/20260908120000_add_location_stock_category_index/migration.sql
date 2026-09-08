-- Prefix location patterns ("LC%") make the item category the reconciliation
-- unit: candidate definitions are read by (shopId, itemCategory) and filtered
-- by the matcher, so location is no longer part of that lookup.
CREATE INDEX "LocationStock_shopId_itemCategory_idx" ON "LocationStock"("shopId", "itemCategory");
