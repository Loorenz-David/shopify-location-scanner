import { homeShellActions } from "../../home/actions/home-shell.actions";
import {
  applyDecodedScannerValueController,
  bootstrapLocationOptionsController,
  applyScannedItemController,
  applyScannedLocationController,
  linkCurrentSelectionController,
  searchItemsController,
  searchLocationsController,
} from "../controllers/scanner.controller";
import { rememberLensId } from "../domain/scanner-camera-lens.domain";
import { useScannerStore } from "../stores/scanner.store";
import type {
  ScannerItem,
  ScannerLens,
  ScannerLocation,
  ScannerStep,
} from "../types/scanner.types";

const mockItem: ScannerItem = {
  id: "itm-mock-001",
  idType: "sku",
  itemId: "SKU-MOCK-001",
  sku: "SKU-MOCK-001",
  title: "Scanned Demo Item",
  imageUrl: "https://placehold.co/80x80/png",
};

const mockLocation: ScannerLocation = {
  code: "A1",
  label: "A1",
};

export const scannerActions = {
  async bootstrapLocationOptions(): Promise<void> {
    await bootstrapLocationOptionsController();
  },
  async searchItems(query: string): Promise<void> {
    await searchItemsController(query);
  },
  setManualItemSearchQuery(query: string): void {
    const store = useScannerStore.getState();
    const normalizedQuery = query;

    store.setItemSearchQuery(normalizedQuery);

    if (!normalizedQuery.trim()) {
      store.setItemSearchResults([]);
      store.setSearchingItems(false);
      return;
    }

    store.setSearchingItems(true);
  },
  async searchLocations(query: string): Promise<void> {
    await searchLocationsController(query);
  },
  setManualLocationSearchQuery(query: string): void {
    useScannerStore.getState().setLocationSearchState(query, []);
  },
  selectItem(item: ScannerItem): void {
    applyScannedItemController(item);
  },
  selectLocation(location: ScannerLocation): void {
    applyScannedLocationController(location);
  },
  applyDecodedScannerValue(value: string, step: ScannerStep): void {
    applyDecodedScannerValueController(value, step);
  },
  scanMockItem(): void {
    applyScannedItemController(mockItem);
  },
  scanMockLocation(): void {
    applyScannedLocationController(mockLocation);
  },
  async attemptLinkForCurrentSelection(): Promise<void> {
    await linkCurrentSelectionController();
  },
  openManualItemInput(): void {
    homeShellActions.openOverlayPage("scanner-item-manual", "Find Item");
  },
  openManualLocationInput(): void {
    homeShellActions.openOverlayPage(
      "scanner-location-manual",
      "Select Location",
    );
  },
  openErrorDetails(): void {
    homeShellActions.openOverlayPage("scanner-error-detail", "Link Error");
  },
  closeOverlay(): void {
    homeShellActions.closeOverlayPage();
  },
  toggleFlash(): void {
    const store = useScannerStore.getState();
    store.setFlashEnabled(!store.flashEnabled);
  },
  selectLens(lensId: string): void {
    rememberLensId(lensId);
    useScannerStore.getState().setSelectedLensId(lensId);
  },
  setAvailableLenses(lenses: ScannerLens[]): void {
    useScannerStore.getState().setAvailableLenses(lenses);
  },
  setOnScanAsk(enabled: boolean): void {
    useScannerStore.getState().setOnScanAsk(enabled);
  },
  backFromScanner(): void {
    const store = useScannerStore.getState();
    if (store.scannerStep === "location") {
      store.setScannerStep("item");
      store.setSelectedLocation(null);
      store.setFrozenFrameAt(null);
      return;
    }

    store.resetCycle();
    store.setScannerStep("item");
    homeShellActions.closeFullFeaturePage();
  },
  rescanCurrentStep(): void {
    const store = useScannerStore.getState();
    store.setFrozenFrameAt(null);

    if (store.scannerStep === "item") {
      store.setSelectedItem(null);
      return;
    }

    store.setSelectedLocation(null);
  },
  scanNext(): void {
    const store = useScannerStore.getState();
    store.resetCycle();
    store.setScannerStep("item");
  },
  goToLocationStep(): void {
    const store = useScannerStore.getState();
    if (!store.selectedItem) {
      return;
    }

    store.setScannerStep("location");
  },
  rescanItemFromError(): void {
    const store = useScannerStore.getState();
    store.setSelectedItem(null);
    store.setScannerStep("item");
    store.setFrozenFrameAt(null);
    store.setCanScanNext(false);
    homeShellActions.closeOverlayPage();
  },
  rescanLocationFromError(): void {
    const store = useScannerStore.getState();
    store.setSelectedLocation(null);
    store.setScannerStep("location");
    store.setFrozenFrameAt(null);
    store.setCanScanNext(false);
    homeShellActions.closeOverlayPage();
  },
};
