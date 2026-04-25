import { useCallback, useEffect } from "react";

import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { bootstrapLocationOptionsController } from "../controllers/location-options.controller";
import { UnifiedScannerPageProvider } from "../context/unified-scanner.context";
import { useUnifiedScannerCameraFlow } from "../flows/use-unified-scanner-camera.flow";
import { useLocationOptionsStore } from "../stores/location-options.store";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
import type {
  UnifiedScannerPageContextValue,
  UnifiedScannerPhase,
} from "../types/unified-scanner.types";

interface UnifiedScannerProviderProps {
  children: React.ReactNode;
}

export function UnifiedScannerProvider({
  children,
}: UnifiedScannerProviderProps) {
  const cameraFlow = useUnifiedScannerCameraFlow();

  const hasLocationOptions = useLocationOptionsStore(
    (state) => state.options.length > 0,
  );
  const phase = useUnifiedScannerStore((state) => state.phase);
  const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);
  const locationMode = useUnifiedScannerStore((state) => state.locationMode);
  const selectedLocation = useUnifiedScannerStore(
    (state) => state.selectedLocation,
  );
  const isLookingUpItem = useUnifiedScannerStore(
    (state) => state.isLookingUpItem,
  );
  const itemLookupError = useUnifiedScannerStore(
    (state) => state.itemLookupError,
  );
  const locationWarningBanner = useUnifiedScannerStore(
    (state) => state.locationWarningBanner,
  );
  const lastPlacementError = useUnifiedScannerStore(
    (state) => state.lastPlacementError,
  );
  const canScanNext = useUnifiedScannerStore((state) => state.canScanNext);
  const flashEnabled = useUnifiedScannerStore((state) => state.flashEnabled);
  const availableLenses = useUnifiedScannerStore(
    (state) => state.availableLenses,
  );
  const selectedLensId = useUnifiedScannerStore(
    (state) => state.selectedLensId,
  );
  const onScanAsk = useUnifiedScannerStore((state) => state.onScanAsk);

  useEffect(() => {
    if (hasLocationOptions) {
      return;
    }

    void bootstrapLocationOptionsController();
  }, [hasLocationOptions]);

  useEffect(() => {
    return () => {
      useUnifiedScannerStore.getState().resetCycle();
    };
  }, []);

  const handleScanNext = useCallback(() => {
    cameraFlow.resetScannerVisualCycle();
    unifiedScannerActions.scanNext();
  }, [cameraFlow]);

  const handleClearItemScan = useCallback(() => {
    cameraFlow.clearItemScan();

    const store = useUnifiedScannerStore.getState();
    store.setSelectedItem(null);
    store.setLocationMode(null);
    store.setSelectedLocation(null);
    store.setPendingLocationValue(null);
    store.setPendingLocation(null);
    store.setPendingWarnings([]);
    store.setActiveWarning(null);
    store.setRequiresZoneMismatchAfterFixCheck(false);
    store.setFrozenFrameAt(null);
    store.setIsLookingUpItem(false);
    store.setItemLookupError(null);
    store.setLocationWarningBanner(null);
    store.setLastPlacementError(null);
    store.setCanScanNext(false);
    store.setPhase("scanning-item");
  }, [cameraFlow]);

  const handleClearLocationScan = useCallback(() => {
    cameraFlow.clearLocationScan();
    unifiedScannerActions.retryLocation();
  }, [cameraFlow]);

  const handleDismissItemError = useCallback(() => {
    handleClearItemScan();
  }, [handleClearItemScan]);

  const scannerStep: "item" | "location" = (
    [
      "scanning-location",
      "warning-pending",
      "placing",
      "placed",
      "error",
    ] as UnifiedScannerPhase[]
  ).includes(phase)
    ? "location"
    : "item";

  const contextValue: UnifiedScannerPageContextValue = {
    isCameraReady: cameraFlow.isCameraReady,
    cameraError: cameraFlow.cameraError,
    itemFrozenFrame: cameraFlow.itemFrozenFrame,
    itemDecodedText: cameraFlow.itemDecodedText,
    locationFrozenFrame: cameraFlow.locationFrozenFrame,
    locationDecodedText: cameraFlow.locationDecodedText,
    phase,
    scannerStep,
    selectedItem,
    locationMode,
    selectedLocation,
    isLookingUpItem,
    itemLookupError,
    locationWarningBanner,
    lastPlacementError,
    canScanNext,
    flashEnabled,
    availableLenses,
    selectedLensId,
    onScanAsk,
    onBack: unifiedScannerActions.closeScanner,
    onToggleFlash: unifiedScannerActions.toggleFlash,
    onSelectLens: unifiedScannerActions.selectLens,
    onGoToLocationStep: unifiedScannerActions.goToLocationStep,
    onClearItemScan: handleClearItemScan,
    onClearLocationScan: handleClearLocationScan,
    onScanNext: handleScanNext,
    onDismissItemError: handleDismissItemError,
    onDismissLocationWarning: unifiedScannerActions.clearLocationWarningBanner,
    onDismissPlacementError: unifiedScannerActions.clearPlacementError,
    onToggleOnScanAsk: unifiedScannerActions.toggleOnScanAsk,
  };

  return (
    <UnifiedScannerPageProvider value={contextValue}>
      {children}
    </UnifiedScannerPageProvider>
  );
}
