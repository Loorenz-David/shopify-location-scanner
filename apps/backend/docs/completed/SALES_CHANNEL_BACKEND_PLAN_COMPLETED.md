# Sales Channel Backend Completed

## Summary

Implemented the sales-channel dimension end to end:

- added `SalesChannel` to Prisma and persisted it on sold scan-history events
- added `lastSoldChannel` on `ScanHistory`
- added `SalesChannelStatsDaily` for channel-aware daily rollups
- classified Shopify order sources centrally from `source_name`
- gated physical zone stats so only physical sales affect zone/location analytics
- added cross-channel analytics via `GET /stats/channels`
- added optional `salesChannel` filtering to `/stats/velocity` and `/scanner/history`

Verification:

- `npm run prisma:generate`
- `npm run build`

## Implemented Changes

- Schema updates in [schema.prisma](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/prisma/schema.prisma)
- Migration in [migration.sql](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/prisma/migrations/20260409143000_add_sales_channel_dimension/migration.sql)
- Central classifier in [classify-sales-channel.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/shared/sales-channel/classify-sales-channel.ts)
- Shopify webhook payload and ingestion updates in [shopify.contract.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/contracts/shopify.contract.ts) and [handle-orders-paid-webhook.command.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/shopify/commands/handle-orders-paid-webhook.command.ts)
- Scan-history persistence and filtering updates in [scan-history.repository.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/repositories/scan-history.repository.ts), [scan-history.contract.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/contracts/scan-history.contract.ts), [scanner.controller.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/controllers/scanner.controller.ts), and [get-scan-history.query.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/scanner/queries/get-scan-history.query.ts)
- Stats updates in [stats.repository.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/stats/repositories/stats.repository.ts), [stats.controller.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/stats/controllers/stats.controller.ts), and [stats.routes.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/backend/src/modules/stats/routes/stats.routes.ts)

## Notes

- Historical aggregate data in `LocationStatsDaily` and `LocationCategoryStatsDaily` is not retroactively corrected.
- New sales from this point forward are channel-classified correctly.
- `GET /stats/velocity` now reads `SalesChannelStatsDaily` when a channel filter is present.
