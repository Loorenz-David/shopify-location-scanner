# Map Editor Zone Interactions Completed

## Summary
This document captures the current completed state of the fullscreen store-map editor and the core zone-block interactions implemented so far.

## Fullscreen Editor Mode
- The store map settings page starts with a static preview.
- Tapping `Edit` opens a fullscreen editor mode.
- The editor locks page scroll and uses the full viewport for map interaction.
- The previous inline edit header/description inside the fullscreen canvas was removed.
- The editor auto-fits existing zones into the viewport at session start without re-fitting after each shape save.

## Map Navigation
- Single-touch drag pans the map.
- Two-finger touch pinches to zoom in and out.
- Touch controls are organized in [use-map-touch-controls.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-map-touch-controls.flow.ts).
- Pan/zoom state is preserved when switching between map interaction and shape-handle interaction.

## Zone Selection And Menu
- Tapping a zone opens a centered action popup.
- The popup currently supports:
  - `Edit name`
  - `Edit shape`
  - `Delete zone block`
- Deletion uses confirmation before removal.

## Rename Flow
- `Edit name` opens a fixed top overlay bar.
- The rename bar is positioned to avoid layout shifts when the mobile keyboard opens.
- Confirm saves the label.
- Cancel closes the rename flow.
- For new draft zones, cancel removes the unsaved zone entirely.

## Shape Edit Flow
- `Edit shape` opens a fixed top overlay with:
  - live `X`, `Y`, `W`, `H` values
  - undo/back button
  - confirm button
  - cancel button positioned on the outer overlay edge
- The `X / Y / W / H` readout uses stable numeric formatting and fixed-width slots to reduce jitter.
- Cancel warns before discarding if the shape has unsaved changes.
- Confirm keeps the current map viewport stable and does not re-fit or move the map.

## Shape Editing Interactions
- Corner handles provide Figma-like reshape controls.
- Long press on the selected shape body activates whole-shape drag.
- A haptic pulse signals that whole-shape dragging is active.
- While whole-shape dragging is active, a ghost outline shows the original position.
- Touch priority rules:
  - outside shape edit mode, map pan/zoom wins
  - in shape edit mode, map pan/zoom still wins except on active shape handles or after long-press activation on the selected shape body

## Shape Undo
- Shape editing includes undo history through [shape-edit-history.store.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/stores/shape-edit-history.store.ts).
- Undo records shape snapshots when a reshape or whole-shape move starts.
- The user can step back through recorded shape changes while staying in shape mode.
- Undo history is cleared when shape mode exits.

## Zone Creation Flow
- Fullscreen edit mode includes a floating `+` button in the lower-right corner.
- Tapping it rotates the `+` into an `x` and opens nearby action options.
- The first implemented option is create zone block.
- Create flow sequence:
  - create a local draft block
  - open naming overlay
  - confirm name
  - enter shape edit
  - confirm shape
  - persist the new zone
- Draft creation cancellation rules:
  - cancel from naming removes the draft block
  - cancel from shape edit returns to naming
- The floating `+` cluster and `Done` button are hidden during active zone edit flows.

## Layout Notes
- The shape overlay width can be tuned in [StoreMapSettingsPage.tsx](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/ui/StoreMapSettingsPage.tsx) via the shape overlay wrapper `max-w-*` value.
- The metrics row width is also influenced by the inner value slot widths in the same file.
- The floating create cluster spacing is also controlled in the same file through:
  - the cluster wrapper size
  - the option button size
  - the bottom/right offsets
  - the closed-state translation values

## Main Files
- [StoreMapSettingsPage.tsx](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/ui/StoreMapSettingsPage.tsx)
- [use-map-touch-controls.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-map-touch-controls.flow.ts)
- [use-zone-editor.flow.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/flows/use-zone-editor.flow.ts)
- [shape-edit-history.store.ts](/Users/davidloorenz/Desktop/Developer/BeyoApps_2025/Item-Scanner-Shopify/apps/frontend/src/features/analytics/stores/shape-edit-history.store.ts)

## Verification
- `npm run build` passed after the latest map-editor changes.

## Known Next-Step Areas
- More zone action options can be added to the zone popup.
- Zone shape editing can gain richer controls beyond rectangle/corner resize.
- The floating action cluster can support more creation tools.
- Additional editor guidance or onboarding can be layered on top later if needed.
