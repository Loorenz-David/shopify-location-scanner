import { homeShellActions } from "../../home/actions/home-shell.actions";
import { bootstrapLocationOptionsApi } from "../api/bootstrap-location-options.api";
import { linkItemPositionsApi } from "../api/link-item-positions.api";
import { searchItemsBySkuApi } from "../api/search-items.api";
import {
  filterLocationOptionsByQuery,
  toLimitedLocationResults,
} from "../domain/location-options.domain";
import {
  buildItemFromScannedValue,
  buildLocationFromScannedValue,
  canApplyScannedValue,
} from "../domain/scanner-decoder.domain";
import { buildLinkError, buildPairKey } from "../domain/scanner-message.domain";
import { useLocationOptionsStore } from "../stores/location-options.store";
import { useScannerStore } from "../stores/scanner.store";
import type {
  ScannerItem,
  ScannerLocation,
  ScannerStep,
} from "../types/scanner.types";

export async function searchItemsController(query: string): Promise<void> {
  const store = useScannerStore.getState();
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    store.setItemSearchResults([]);
    store.setSearchingItems(false);
    return;
  }

  try {
    const results = await searchItemsBySkuApi(normalizedQuery);
    const currentStore = useScannerStore.getState();

    if (currentStore.itemSearchQuery.trim() !== normalizedQuery) {
      return;
    }

    currentStore.setItemSearchResults(results);
  } finally {
    const currentStore = useScannerStore.getState();

    if (currentStore.itemSearchQuery.trim() === normalizedQuery) {
      currentStore.setSearchingItems(false);
    }
  }
}

export async function searchLocationsController(query: string): Promise<void> {
  const store = useScannerStore.getState();
  store.setSearchingLocations(true);

  try {
    const options = useLocationOptionsStore.getState().options;
    const filteredOptions = filterLocationOptionsByQuery(options, query);
    store.setLocationSearchState(
      query,
      toLimitedLocationResults(filteredOptions),
    );
  } finally {
    useScannerStore.getState().setSearchingLocations(false);
  }
}

export async function bootstrapLocationOptionsController(): Promise<void> {
  const options = await bootstrapLocationOptionsApi();
  useLocationOptionsStore.getState().setOptions(options);

  const scannerStore = useScannerStore.getState();
  scannerStore.setLocationSearchState("", toLimitedLocationResults(options));
}

export function applyScannedItemController(item: ScannerItem): void {
  const store = useScannerStore.getState();

  store.setSelectedItem(item);
  if (!store.onScanAsk) {
    store.setScannerStep("location");
  }
  store.setFrozenFrameAt(new Date().toISOString());
  store.setLastError(null);
  homeShellActions.closeOverlayPage();
}

export function applyScannedLocationController(
  location: ScannerLocation,
): void {
  const store = useScannerStore.getState();

  store.setSelectedLocation(location);
  store.setFrozenFrameAt(new Date().toISOString());
  store.setLastError(null);
  homeShellActions.closeOverlayPage();
}

export function applyDecodedScannerValueController(
  value: string,
  step: ScannerStep,
): void {
  if (!canApplyScannedValue(value, step)) {
    return;
  }

  if (step === "item") {
    applyScannedItemController(buildItemFromScannedValue(value));
    return;
  }

  applyScannedLocationController(buildLocationFromScannedValue(value));
}

export async function linkCurrentSelectionController(): Promise<void> {
  const store = useScannerStore.getState();
  if (!store.selectedItem || !store.selectedLocation) {
    return;
  }

  const pairKey = buildPairKey(store.selectedItem, store.selectedLocation);
  if (store.lastLinkedPairKey === pairKey || store.isLinking) {
    return;
  }

  store.setLastLinkedPairKey(pairKey);
  store.setCanScanNext(true);
  store.setLinking(true);
  store.setLastError(null);

  try {
    await linkItemPositionsApi({
      idType: store.selectedItem.idType,
      itemId: store.selectedItem.itemId,
      location: store.selectedLocation.code,
    });
  } catch (error) {
    const state = useScannerStore.getState();
    state.setLastError(
      buildLinkError(error, state.selectedItem, state.selectedLocation),
    );
  } finally {
    useScannerStore.getState().setLinking(false);
  }
}
