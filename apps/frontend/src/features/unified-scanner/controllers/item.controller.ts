import { homeShellActions } from "../../home/actions/home-shell.actions";
import { searchUnifiedItemsApi } from "../api/search-unified-items.api";
import { resolveLocationScannerMode } from "../domain/item-mode.domain";
import { applyLocationByValueController } from "./location.controller";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
import type { UnifiedScannerItem } from "../types/unified-scanner.types";

export async function lookupItemByValueController(value: string): Promise<void> {
  const store = useUnifiedScannerStore.getState();
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    store.setIsLookingUpItem(false);
    return;
  }

  store.setIsLookingUpItem(true);
  store.setItemLookupError(null);
  store.setSelectedItem(null);
  store.setLocationMode(null);
  store.setSelectedLocation(null);
  store.setPendingLocation(null);
  store.setPendingWarnings([]);
  store.setActiveWarning(null);
  store.setRequiresZoneMismatchAfterFixCheck(false);
  store.setLocationWarningBanner(null);
  store.setLastPlacementError(null);
  store.setCanScanNext(false);

  const results = await searchUnifiedItemsApi(normalizedValue);

  if (results.length === 0) {
    const currentStore = useUnifiedScannerStore.getState();
    currentStore.setIsLookingUpItem(false);
    currentStore.setPendingLocationValue(null);
    currentStore.setSelectedLocation(null);
    currentStore.setPendingLocation(null);
    currentStore.setPendingWarnings([]);
    currentStore.setActiveWarning(null);
    currentStore.setRequiresZoneMismatchAfterFixCheck(false);
    currentStore.setLocationMode(null);
    currentStore.setPhase("scanning-item");
    currentStore.setItemLookupError("No item was found with that value.");
    return;
  }

  const [item] = results;
  useUnifiedScannerStore.getState().setIsLookingUpItem(false);
  applyItemController(item);
}

export function applyItemController(item: UnifiedScannerItem): void {
  const store = useUnifiedScannerStore.getState();
  const locationMode = resolveLocationScannerMode(item);
  const pendingLocationValue = store.pendingLocationValue;
  const nextPhase =
    store.phase === "scanning-location"
      ? "scanning-location"
      : store.phase === "scanning-item"
        ? "scanning-item"
      : store.onScanAsk
        ? "item-confirmed"
        : "scanning-location";

  store.setSelectedItem(item);
  store.setLocationMode(locationMode);
  store.setSelectedLocation(null);
  store.setPendingLocationValue(null);
  store.setPendingLocation(null);
  store.setPendingWarnings([]);
  store.setActiveWarning(null);
  store.setRequiresZoneMismatchAfterFixCheck(false);
  store.setFrozenFrameAt(new Date().toISOString());
  store.setIsLookingUpItem(false);
  store.setItemLookupError(null);
  store.setLocationWarningBanner(null);
  store.setLastPlacementError(null);
  store.setCanScanNext(false);
  store.setPhase(nextPhase);

  homeShellActions.closeOverlayPage();

  if (pendingLocationValue && nextPhase === "scanning-location") {
    applyLocationByValueController(pendingLocationValue);
  }
}
