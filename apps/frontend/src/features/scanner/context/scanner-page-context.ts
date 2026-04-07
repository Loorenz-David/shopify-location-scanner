import { createContext, useContext } from "react";

import type {
  ScannerFrozenFrame,
  ScannerItem,
  ScannerLens,
  ScannerLocation,
  ScannerStep,
} from "../types/scanner.types";

export interface ScannerPageContextValue {
  scannerRegionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
  frozenFrame: ScannerFrozenFrame | null;
  decodedText: string | null;
  scannerStep: ScannerStep;
  selectedItem: ScannerItem | null;
  selectedLocation: ScannerLocation | null;
  frozenFrameAt: string | null;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  canScanNext: boolean;
  onScanAsk: boolean;
  isLinking: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onRescan: () => void;
  onToggleFlash: () => void;
  onSelectLens: (lensId: string) => void;
  onManualInput: () => void;
  onClearDecodedScan: () => void;
  onGoToLocationStep: () => void;
  onMockScan: () => void;
  onOpenErrorDetails: () => void;
  onScanNext: () => void;
}

export const scannerPageContext = createContext<ScannerPageContextValue | null>(
  null,
);

export function useScannerPageContext(): ScannerPageContextValue {
  const context = useContext(scannerPageContext);

  if (!context) {
    throw new Error(
      "useScannerPageContext must be used within ScannerPageProvider.",
    );
  }

  return context;
}
