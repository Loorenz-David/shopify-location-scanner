import { homeShellActions } from "../../home/actions/home-shell.actions";
import { markItemFixedApi } from "../../logistic-tasks/api/mark-item-fixed.api";
import { useTaskCountStore } from "../../logistic-tasks/stores/task-count.store";
import { useLogisticTasksStore } from "../../logistic-tasks/stores/logistic-tasks.store";
import { applyItemController } from "../controllers/item.controller";
import { rememberLensId } from "../domain/scanner-camera-lens.domain";
import {
  applyResolvedLocationController,
  applyLocationByValueController,
} from "../controllers/location.controller";
import { placementController } from "../controllers/placement.controller";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
import type {
  ResolvedLocation,
  ScannerLens,
  UnifiedScannerItem,
} from "../types/unified-scanner.types";

interface ApplyItemActionOptions {
  transition?: "deferred" | "immediate";
}

function finishPendingPlacement(): void {
  const store = useUnifiedScannerStore.getState();
  const pendingLocation = store.pendingLocation;

  if (!pendingLocation) {
    return;
  }

  store.setSelectedLocation(pendingLocation);
  store.setPendingLocation(null);
  store.setPendingWarnings([]);
  store.setActiveWarning(null);
  store.setRequiresZoneMismatchAfterFixCheck(false);
  store.setLastPlacementError(null);
  store.setPhase("placing");

  void placementController();
}

function openNextWarningIfAny(): boolean {
  const store = useUnifiedScannerStore.getState();
  if (store.pendingWarnings.length === 0) {
    return false;
  }

  store.advanceWarning();
  store.setRequiresZoneMismatchAfterFixCheck(false);

  const nextWarning = useUnifiedScannerStore.getState().activeWarning;
  if (!nextWarning) {
    return false;
  }

  homeShellActions.popupFeaturePage(
    nextWarning.type === "fix-check"
      ? "unified-scanner-fix-check"
      : "unified-scanner-zone-mismatch",
  );

  return true;
}

export const unifiedScannerActions = {
  applyItem(
    item: UnifiedScannerItem,
    options?: ApplyItemActionOptions,
  ): void {
    applyItemController(item, options);
  },
  applyLocation(location: ResolvedLocation): void {
    applyResolvedLocationController(location);
  },
  applyLocationByValue(value: string): void {
    applyLocationByValueController(value);
  },
  goToLocationStep(): void {
    const store = useUnifiedScannerStore.getState();
    if (!store.selectedItem) {
      return;
    }

    store.setPhase("scanning-location");
  },
  retryLocation(): void {
    const store = useUnifiedScannerStore.getState();
    store.setSelectedLocation(null);
    store.setPendingLocationValue(null);
    store.setPendingLocation(null);
    store.setPendingWarnings([]);
    store.setActiveWarning(null);
    store.setRequiresZoneMismatchAfterFixCheck(false);
    store.setLocationWarningBanner(null);
    store.setLastPlacementError(null);
    store.setCanScanNext(false);
    store.setPhase("scanning-location");
  },
  scanNext(): void {
    useUnifiedScannerStore.getState().resetCycle();
  },
  closeScanner(): void {
    useUnifiedScannerStore.getState().resetCycle();
    homeShellActions.closeFullFeaturePage();
  },
  clearItemLookupError(): void {
    useUnifiedScannerStore.getState().setItemLookupError(null);
  },
  clearLocationWarningBanner(): void {
    useUnifiedScannerStore.getState().setLocationWarningBanner(null);
  },
  clearPlacementError(): void {
    const store = useUnifiedScannerStore.getState();
    store.setSelectedLocation(null);
    store.setPendingLocationValue(null);
    store.setPendingLocation(null);
    store.setPendingWarnings([]);
    store.setActiveWarning(null);
    store.setRequiresZoneMismatchAfterFixCheck(false);
    store.setLastPlacementError(null);
    store.setCanScanNext(false);
    store.setPhase("scanning-location");
  },
  setAvailableLenses(lenses: ScannerLens[]): void {
    useUnifiedScannerStore.getState().setAvailableLenses(lenses);
  },
  toggleFlash(): void {
    const store = useUnifiedScannerStore.getState();
    store.setFlashEnabled(!store.flashEnabled);
  },
  selectLens(lensId: string): void {
    rememberLensId(lensId);
    useUnifiedScannerStore.getState().setSelectedLensId(lensId);
  },
  setOnScanAsk(enabled: boolean): void {
    useUnifiedScannerStore.getState().setOnScanAsk(enabled);
  },
  toggleOnScanAsk(): void {
    const store = useUnifiedScannerStore.getState();
    store.setOnScanAsk(!store.onScanAsk);
  },
  async confirmMarkFixed(): Promise<void> {
    const store = useUnifiedScannerStore.getState();
    const selectedItem = store.selectedItem;

    homeShellActions.closePopupPage();

    if (!selectedItem?.id) {
      finishPendingPlacement();
      return;
    }

    const existingTask = useLogisticTasksStore
      .getState()
      .items.find((item) => item.id === selectedItem.id);

    if (existingTask) {
      useLogisticTasksStore
        .getState()
        .upsertItem({ ...existingTask, isItemFixed: true });
    }
    useTaskCountStore.getState().removeId(selectedItem.id);

    try {
      await markItemFixedApi({ scanHistoryId: selectedItem.id });
      const currentStore = useUnifiedScannerStore.getState();
      currentStore.setSelectedItem({
        ...selectedItem,
        isItemFixed: true,
      });

      if (!openNextWarningIfAny()) {
        finishPendingPlacement();
      }
    } catch {
      if (existingTask) {
        useLogisticTasksStore.getState().upsertItem(existingTask);
      }

      const currentStore = useUnifiedScannerStore.getState();
      currentStore.setLastPlacementError(
        "Unable to mark item as fixed. Please try again.",
      );
      currentStore.setCanScanNext(false);
      currentStore.setPhase("error");
    }
  },
  skipFixCheck(): void {
    homeShellActions.closePopupPage();

    if (!openNextWarningIfAny()) {
      finishPendingPlacement();
    }
  },
  confirmZoneMismatch(): void {
    homeShellActions.closePopupPage();
    finishPendingPlacement();
  },
  cancelPlacement(): void {
    homeShellActions.closePopupPage();

    const store = useUnifiedScannerStore.getState();
    store.setPendingLocationValue(null);
    store.setPendingLocation(null);
    store.setPendingWarnings([]);
    store.setActiveWarning(null);
    store.setRequiresZoneMismatchAfterFixCheck(false);
    store.setCanScanNext(false);
    store.setPhase("scanning-location");
  },
};
