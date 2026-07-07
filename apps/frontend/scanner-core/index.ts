export type { ScannerLens, ScannerFrozenFrame } from "./types";

export { getCameraRegionId } from "./domain/camera-session.manager";
export type { CameraSessionId } from "./domain/camera-session.manager";
export {
  prewarmCameraSession,
  attachDecodeSession,
  releaseAllCameraSessions,
  suspendAllCameraSessions,
  resumePrewarmedCameraSessions,
  CAMERA_IDLE_RELEASE_MS,
} from "./domain/camera-session.manager";
export {
  mapCameraDevicesToLenses,
  resolvePreferredLensId,
  getRememberedLensId,
  rememberLensId,
} from "./domain/scanner-camera-lens";
export {
  getScannerGuideRect,
  SCANNER_GUIDE_OFFSET_TOP_PX,
  SCANNER_GUIDE_VIEWPORT_SIZE_RATIO,
  SCANNER_GUIDE_MIN_SIZE_PX,
  SCANNER_GUIDE_MAX_SIZE_PX,
} from "./domain/scanner-guide";

export {
  useCameraPrewarm,
  CAMERA_IDLE_RELEASE_MS as PREWARM_IDLE_RELEASE_MS,
} from "./flows/use-camera-prewarm";
export { useCameraAppLifecycleFlow } from "./flows/use-camera-app-lifecycle";
export { useQrScanner } from "./flows/use-qr-scanner";
export type {
  UseQrScannerOptions,
  UseQrScannerResult,
} from "./flows/use-qr-scanner";

export { ScannerGuideOverlay } from "./ui/ScannerGuideOverlay";
export { FrozenFrameCanvas } from "./ui/FrozenFrameCanvas";
