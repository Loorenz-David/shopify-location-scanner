import type { ScannerFrozenFrame } from "./scanner.types";

export interface ScannerEngineFlowResult {
  scannerRegionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
  frozenFrame: ScannerFrozenFrame | null;
  decodedText: string | null;
  clearDecodedScan: () => void;
  resetScannerVisualCycle: () => void;
}
