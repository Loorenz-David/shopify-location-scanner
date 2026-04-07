import { useEffect } from "react";

import { scannerActions } from "../actions/scanner.actions";
import { type ScannerPageContextValue } from "../context/scanner-page-context";
import { ScannerPageProvider } from "../context/scanner-page.context";
import { useScannerLinkFlow } from "../flows/use-scanner-link.flow";
import { useScannerQrcodeFlow } from "../flows/use-scanner-qrcode.flow";
import { useLocationOptionsStore } from "../stores/location-options.store";
import { useScannerStore } from "../stores/scanner.store";

interface ScannerFeatureProviderProps {
  children: React.ReactNode;
}

export function ScannerFeatureProvider({
  children,
}: ScannerFeatureProviderProps) {
  const scannerStep = useScannerStore((state) => state.scannerStep);
  const selectedLensId = useScannerStore((state) => state.selectedLensId);
  const {
    scannerRegionId,
    isCameraReady,
    cameraError,
    frozenFrame,
    decodedText,
    clearDecodedScan,
    resetScannerVisualCycle,
  } = useScannerQrcodeFlow(scannerStep, selectedLensId);
  const selectedItem = useScannerStore((state) => state.selectedItem);
  const selectedLocation = useScannerStore((state) => state.selectedLocation);
  const frozenFrameAt = useScannerStore((state) => state.frozenFrameAt);
  const flashEnabled = useScannerStore((state) => state.flashEnabled);
  const availableLenses = useScannerStore((state) => state.availableLenses);
  const canScanNext = useScannerStore((state) => state.canScanNext);
  const onScanAsk = useScannerStore((state) => state.onScanAsk);
  const isLinking = useScannerStore((state) => state.isLinking);
  const lastError = useScannerStore((state) => state.lastError);
  const hasLocationOptions = useLocationOptionsStore(
    (state) => state.options.length > 0,
  );

  useScannerLinkFlow();

  useEffect(() => {
    if (hasLocationOptions) {
      return;
    }

    void scannerActions.bootstrapLocationOptions();
  }, [hasLocationOptions]);

  const handleManualInput =
    scannerStep === "item"
      ? scannerActions.openManualItemInput
      : scannerActions.openManualLocationInput;

  const handleMockScan =
    scannerStep === "item"
      ? scannerActions.scanMockItem
      : scannerActions.scanMockLocation;

  const handleScanNext = () => {
    resetScannerVisualCycle();
    scannerActions.scanNext();
  };

  const contextValue: ScannerPageContextValue = {
    scannerRegionId,
    isCameraReady,
    cameraError,
    frozenFrame,
    decodedText,
    scannerStep,
    selectedItem,
    selectedLocation,
    frozenFrameAt,
    flashEnabled,
    availableLenses,
    selectedLensId,
    canScanNext,
    onScanAsk,
    isLinking,
    errorMessage: lastError?.compactMessage ?? null,
    onBack: scannerActions.backFromScanner,
    onRescan: scannerActions.rescanCurrentStep,
    onToggleFlash: scannerActions.toggleFlash,
    onSelectLens: scannerActions.selectLens,
    onManualInput: handleManualInput,
    onMockScan: handleMockScan,
    onClearDecodedScan: clearDecodedScan,
    onGoToLocationStep: scannerActions.goToLocationStep,
    onOpenErrorDetails: scannerActions.openErrorDetails,
    onScanNext: handleScanNext,
  };

  return (
    <ScannerPageProvider value={contextValue}>{children}</ScannerPageProvider>
  );
}
