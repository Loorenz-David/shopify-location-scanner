ALTER TABLE "ScanHistory"
ADD COLUMN "latestLocation" TEXT;

UPDATE "ScanHistory"
SET "latestLocation" = (
  SELECT "location"
  FROM "ScanHistoryEvent"
  WHERE "ScanHistoryEvent"."scanHistoryId" = "ScanHistory"."id"
  ORDER BY
    "happenedAt" DESC,
    CASE
      WHEN "eventType" = 'sold_terminal' THEN 2
      WHEN "eventType" = 'location_update' THEN 1
      WHEN "eventType" = 'unknown_position' THEN 0
      ELSE -1
    END DESC,
    "createdAt" DESC,
    "id" DESC
  LIMIT 1
);

CREATE INDEX "ScanHistory_shopId_latestLocation_idx"
ON "ScanHistory"("shopId", "latestLocation");
