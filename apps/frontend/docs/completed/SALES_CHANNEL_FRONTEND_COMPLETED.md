# Sales Channel Frontend Completed Work

## Scope

Completed the frontend changes required by [SALES_CHANNEL_FRONTEND_PLAN.md](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/docs/backend_handoffs/SALES_CHANNEL_FRONTEND_PLAN.md).

The implementation aligns the app with the backend sales-channel model:
- `webshop`
- `physical`
- `imported`
- `unknown`

## Analytics

Implemented:
- `SalesChannel` and `SalesChannelOverviewItem` in `src/features/analytics/types/analytics.types.ts`
- New channel overview API in `src/features/analytics/apis/get-sales-channel-overview.api.ts`
- Updated velocity API in `src/features/analytics/apis/get-sales-velocity.api.ts` to accept optional `salesChannel`
- New analytics store state in `src/features/analytics/stores/analytics.store.ts`
  - `channelOverview`
  - `velocityChannel`
- Updated analytics loading flow in `src/features/analytics/flows/use-analytics-page.flow.ts`
  - loads sales-channel overview with the main analytics payload
  - re-fetches velocity independently when the velocity channel changes
- New channel breakdown chart in `src/features/analytics/components/charts/SalesChannelChart.tsx`
- Updated analytics page in `src/features/analytics/pages/AnalyticsPage.tsx`
  - adds a “Sales by channel” section
  - adds velocity channel toggle for `All`, `Physical`, and `Webshop`
- Updated zone panel in `src/features/analytics/components/panels/ZoneStatsPanel.tsx`
  - adds the note: physical sales only, webshop excluded

Architecture decisions:
- Kept channel overview as first-class analytics state instead of deriving it in the page
- Kept velocity channel changes scoped to the velocity dataset so switching channels does not reload all analytics sections
- Preserved the current page structure and slotted the new channel section between zone ranking and velocity, per the handoff

## Scan History

Implemented:
- Added `salesChannel` to history filters in `src/features/item-scan-history/types/item-scan-history-filters.types.ts`
- Updated filter normalization and active-filter counting in `src/features/item-scan-history/domain/item-scan-history-filters.domain.ts`
- Updated history API query building in `src/features/item-scan-history/api/get-item-scan-history.api.ts`
- Added `lastSoldChannel` to scan-history DTOs and normalized item types:
  - `src/features/item-scan-history/types/item-scan-history.dto.ts`
  - `src/features/item-scan-history/types/item-scan-history.types.ts`
  - `src/features/item-scan-history/domain/item-scan-history.domain.ts`
- Added sales-channel pills to the filters UI in `src/features/item-scan-history/ui/ItemScanHistoryFiltersPanel.tsx`
- Added sold-channel badge rendering in `src/features/item-scan-history/ui/ItemScanHistoryCard.tsx`
- Updated optimistic history items in `src/features/item-scan-history/controllers/item-scan-history-optimistic.controller.ts` to include `lastSoldChannel`

Implementation note:
- The filter UI exposes `All channels`, `Physical`, `Webshop`, and `Unknown`, matching the handoff.
- `imported` is supported in the frontend data model and badge rendering, but is not currently exposed as a history filter pill because the handoff did not include it in the requested filter options.

## Verification

Verification completed:
- `npm run build` passed

## Final Summary

The frontend is now aligned with the backend sales-channel rollout across:
- analytics channel breakdown
- velocity-by-channel filtering
- physical-only clarification in zone stats
- scan-history filtering by channel
- sold-item channel badges in history cards

Remaining dependency:
- The backend must return `lastSoldChannel` in scan-history payloads and support:
  - `GET /stats/channels`
  - `GET /stats/velocity?salesChannel=...`
  - `GET /scanner/history?...&salesChannel=...`
