import { useEffect, useMemo } from "react";

import { useHomeShellStore } from "../home/stores/home-shell.store";
import { filterLocationOptions } from "../location-options/domain/location-options.domain";
import { useLocationOptionsSettingsFlow } from "../location-options/flows/use-location-options-settings.flow";
import { useLocationOptionsSettingsStore } from "../location-options/stores/location-options-settings.store";
import { scannerActions } from "./actions/scanner.actions";
import {
  selectScannerItemSearchQuery,
  selectScannerItemSearchResults,
  selectScannerIsSearchingItems,
  selectScannerLastError,
  selectScannerLocationSearchQuery,
  useScannerStore,
} from "./stores/scanner.store";
import { ErrorDetailPanel } from "./ui/ErrorDetailPanel";
import { ItemManualInputPanel } from "./ui/ItemManualInputPanel";
import { LocationManualInputPanel } from "./ui/LocationManualInputPanel";

interface ScannerOverlayHostProps {
  onClose: () => void;
}

const ITEM_SEARCH_DEBOUNCE_MS = 250;

export function ScannerOverlayHost({ onClose }: ScannerOverlayHostProps) {
  useLocationOptionsSettingsFlow();

  const overlayPageId = useHomeShellStore((state) => state.overlayPageId);
  const itemSearchQuery = useScannerStore(selectScannerItemSearchQuery);
  const itemSearchResults = useScannerStore(selectScannerItemSearchResults);
  const isSearchingItems = useScannerStore(selectScannerIsSearchingItems);
  const locationSearchQuery = useScannerStore(selectScannerLocationSearchQuery);
  const locationOptions = useLocationOptionsSettingsStore(
    (state) => state.options,
  );
  const isLoadingLocationOptions = useLocationOptionsSettingsStore(
    (state) => state.isLoading,
  );
  const lastError = useScannerStore(selectScannerLastError);

  const locationSearchResults = useMemo(
    () =>
      filterLocationOptions(locationOptions, locationSearchQuery).map(
        (option) => ({
          code: option.value,
          label: option.label,
        }),
      ),
    [locationOptions, locationSearchQuery],
  );

  useEffect(() => {
    if (overlayPageId !== "scanner-item-manual") {
      return;
    }

    if (!itemSearchQuery.trim()) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void scannerActions.searchItems(itemSearchQuery);
    }, ITEM_SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [itemSearchQuery, overlayPageId]);

  if (overlayPageId === "scanner-item-manual") {
    return (
      <ItemManualInputPanel
        query={itemSearchQuery}
        items={itemSearchResults}
        isLoading={isSearchingItems}
        onClose={onClose}
        onQueryChange={scannerActions.setManualItemSearchQuery}
        onSelectItem={scannerActions.selectItem}
      />
    );
  }

  if (overlayPageId === "scanner-location-manual") {
    return (
      <LocationManualInputPanel
        query={locationSearchQuery}
        locations={locationSearchResults}
        isLoading={isLoadingLocationOptions}
        onClose={onClose}
        onQueryChange={scannerActions.setManualLocationSearchQuery}
        onSelectLocation={scannerActions.selectLocation}
      />
    );
  }

  if (overlayPageId === "scanner-error-detail") {
    return (
      <ErrorDetailPanel
        error={lastError}
        onRescanLocation={scannerActions.rescanLocationFromError}
        onRescanItem={scannerActions.rescanItemFromError}
      />
    );
  }

  return null;
}
