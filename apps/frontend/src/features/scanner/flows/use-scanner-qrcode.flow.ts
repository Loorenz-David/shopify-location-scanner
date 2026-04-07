import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

import { scannerActions } from "../actions/scanner.actions";
import {
  getRememberedLensId,
  mapCameraDevicesToLenses,
  resolvePreferredLensId,
} from "../domain/scanner-camera-lens.domain";
import { useScannerStore } from "../stores/scanner.store";
import type { ScannerFrozenFrame } from "../types/scanner.types";
import type { ScannerStep } from "../types/scanner.types";

const scannerRegionId = "scanner-qr-reader";
const SCAN_LOOP_LOG_EVERY = 180;
const ITEM_FREEZE_CONFIRMATION_DELAY_MS = 600;
const SCAN_REGION_OFFSET_TOP_PX = 0;
const SCANNER_FPS = 20;
const CAMERA_IDEAL_WIDTH = 1920;
const CAMERA_IDEAL_HEIGHT = 1080;
const CAMERA_IDEAL_FRAME_RATE = 30;

const HTML5_QRCODE_SCANNING_STATE = 2;
const HTML5_QRCODE_PAUSED_STATE = 3;

function getScannerErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "");
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes("mediadevices api is unavailable") ||
      lowerMessage.includes("secure context")
    ) {
      return message;
    }

    if (
      lowerMessage.includes("permissions policy") ||
      lowerMessage.includes("embedded")
    ) {
      return "Camera is blocked in this embedded browser context. Open the app in a standalone browser tab and allow camera access.";
    }
  }

  if (typeof error === "string") {
    const lowerError = error.toLowerCase();
    if (lowerError.includes("notallowed") || lowerError.includes("denied")) {
      return "Camera permission was denied. Enable camera access in browser/site settings.";
    }
    if (lowerError.includes("notfound") || lowerError.includes("no camera")) {
      return "No camera device was found on this device/browser.";
    }
    if (lowerError.includes("notreadable") || lowerError.includes("in use")) {
      return "Camera is busy or blocked by another app/tab.";
    }
    if (lowerError.includes("security") || lowerError.includes("secure")) {
      return "Camera is blocked due to insecure context. Use localhost or HTTPS.";
    }
  }

  if (error && typeof error === "object" && "name" in error) {
    const name = String((error as { name?: unknown }).name);

    if (name === "NotAllowedError") {
      return "Camera permission was denied. Enable camera access in browser/site settings.";
    }

    if (name === "NotFoundError") {
      return "No camera device was found on this device/browser.";
    }

    if (name === "NotReadableError") {
      return "Camera is busy or blocked by another app/tab.";
    }

    if (name === "OverconstrainedError") {
      return "Requested camera constraints are not supported on this device.";
    }

    if (name === "SecurityError") {
      return "Camera is blocked due to insecure context. Use localhost or HTTPS.";
    }
  }

  return "Camera access denied or unavailable.";
}

function buildMediaDevicesUnavailableMessage(): string {
  if (!window.isSecureContext) {
    return "Camera is blocked due to insecure context. Open this app on localhost or HTTPS.";
  }

  if (window.top !== window.self) {
    return "Camera is unavailable in this embedded browser context. Open the app in a standalone browser tab and allow camera access.";
  }

  return "MediaDevices API is unavailable in this browser.";
}

async function requestCameraPermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(buildMediaDevicesUnavailableMessage());
  }
}

async function safelyStopAndClearScanner(scanner: Html5Qrcode): Promise<void> {
  try {
    const scannerState = scanner.getState();
    if (
      scannerState === HTML5_QRCODE_SCANNING_STATE ||
      scannerState === HTML5_QRCODE_PAUSED_STATE
    ) {
      await scanner.stop();
    }
  } catch {
    // Ignore teardown race conditions while scanner mounts/unmounts quickly.
  }

  try {
    scanner.clear();
  } catch {
    // Ignore clear errors if scanner UI was never fully rendered.
  }
}

async function applyTorchConstraint(enabled: boolean): Promise<boolean> {
  const scannerRoot = document.getElementById(scannerRegionId);
  const videoElement = scannerRoot?.querySelector("video");
  if (!(videoElement instanceof HTMLVideoElement)) {
    return false;
  }

  const stream = videoElement.srcObject;
  if (!(stream instanceof MediaStream)) {
    return false;
  }

  const [videoTrack] = stream.getVideoTracks();
  if (!videoTrack || typeof videoTrack.applyConstraints !== "function") {
    return false;
  }

  const capabilities =
    typeof videoTrack.getCapabilities === "function"
      ? videoTrack.getCapabilities()
      : null;

  if (!capabilities || !("torch" in capabilities) || !capabilities.torch) {
    return false;
  }

  try {
    const torchConstraint = {
      torch: enabled,
    } as unknown as MediaTrackConstraintSet;

    await videoTrack.applyConstraints({
      advanced: [torchConstraint],
    });
    return true;
  } catch {
    return false;
  }
}

interface UseScannerQrcodeFlowResult {
  scannerRegionId: string;
  isCameraReady: boolean;
  cameraError: string | null;
  frozenFrame: ScannerFrozenFrame | null;
  decodedText: string | null;
  clearDecodedScan: () => void;
  resetScannerVisualCycle: () => void;
}

function buildScanRegion(
  viewfinderWidth: number,
  viewfinderHeight: number,
): { width: number; height: number } {
  const shortestEdge = Math.min(viewfinderWidth, viewfinderHeight);
  const boxSize = Math.floor(shortestEdge * 0.8);

  return {
    width: boxSize,
    height: boxSize,
  };
}

type Html5QrcodeVideoCapabilities = {
  frameRate?: { max?: number };
};

function isLikelyFrontFacingCameraLabel(label: string): boolean {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("front") ||
    normalized.includes("selfie") ||
    normalized.includes("user") ||
    normalized.includes("facetime")
  );
}

function buildPostStartVideoConstraints(
  capabilities: Html5QrcodeVideoCapabilities | null,
): MediaTrackConstraints {
  return {
    width: { ideal: CAMERA_IDEAL_WIDTH },
    height: { ideal: CAMERA_IDEAL_HEIGHT },
    frameRate: {
      ideal: capabilities?.frameRate?.max ?? CAMERA_IDEAL_FRAME_RATE,
    },
  };
}

async function applyPostStartVideoConstraints(
  scanner: Html5Qrcode,
): Promise<void> {
  try {
    const capabilities =
      scanner.getRunningTrackCapabilities() as Html5QrcodeVideoCapabilities | null;

    await scanner.applyVideoConstraints(
      buildPostStartVideoConstraints(capabilities),
    );
  } catch {
    // Ignore unsupported browsers/devices that do not expose advanced constraints.
  }
}

function forceScannerViewportFill(): void {
  const scannerRoot = document.getElementById(scannerRegionId);
  if (!scannerRoot) {
    return;
  }

  const scannerOffsetCompensationPx = Math.abs(SCAN_REGION_OFFSET_TOP_PX);

  scannerRoot.style.setProperty("width", "100%", "important");
  scannerRoot.style.setProperty("height", "100%", "important");
  scannerRoot.style.setProperty("top", "0", "important");
  scannerRoot.style.setProperty("min-width", "100%", "important");
  scannerRoot.style.setProperty("min-height", "100%", "important");
  scannerRoot.style.setProperty("overflow", "hidden", "important");

  const scanRegion = scannerRoot.querySelector(
    `#${scannerRegionId}__scan_region`,
  );
  if (scanRegion instanceof HTMLElement) {
    scanRegion.style.setProperty("width", "100%", "important");
    scanRegion.style.setProperty("height", "100%", "important");
    scanRegion.style.setProperty("position", "absolute", "important");
    scanRegion.style.setProperty("inset", "0", "important");
    scanRegion.style.setProperty("overflow", "hidden", "important");
  }

  const dashboard = scannerRoot.querySelector(
    `#${scannerRegionId}__dashboard_section`,
  );
  if (dashboard instanceof HTMLElement) {
    dashboard.style.setProperty("display", "none", "important");
  }

  const video = scannerRoot.querySelector("video");
  if (video instanceof HTMLVideoElement) {
    video.style.setProperty("width", "100%", "important");
    video.style.setProperty(
      "height",
      `calc(100% + ${scannerOffsetCompensationPx}px)`,
      "important",
    );
    video.style.setProperty("object-fit", "cover", "important");
    video.style.setProperty("position", "absolute", "important");
    video.style.setProperty("inset", "0", "important");
    video.style.setProperty(
      "transform",
      `translateY(${SCAN_REGION_OFFSET_TOP_PX}px)`,
      "important",
    );
  }
}

export function useScannerQrcodeFlow(
  scannerStep: ScannerStep,
  selectedLensId: string | null,
): UseScannerQrcodeFlowResult {
  const flashEnabled = useScannerStore((state) => state.flashEnabled);
  const selectedItem = useScannerStore((state) => state.selectedItem);
  const selectedLocation = useScannerStore((state) => state.selectedLocation);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [itemFrozenFrame, setItemFrozenFrame] =
    useState<ScannerFrozenFrame | null>(null);
  const [itemDecodedText, setItemDecodedText] = useState<string | null>(null);
  const [locationFrozenFrame, setLocationFrozenFrame] =
    useState<ScannerFrozenFrame | null>(null);
  const [locationDecodedText, setLocationDecodedText] = useState<string | null>(
    null,
  );
  const [pendingItemTransitionValue, setPendingItemTransitionValue] = useState<
    string | null
  >(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStepRef = useRef<ScannerStep>(scannerStep);
  const itemFrozenFrameRef = useRef<ScannerFrozenFrame | null>(null);
  const locationFrozenFrameRef = useRef<ScannerFrozenFrame | null>(null);
  const pendingItemTransitionRef = useRef<string | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const loopMissCountRef = useRef(0);
  const itemTransitionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    itemFrozenFrameRef.current = itemFrozenFrame;
  }, [itemFrozenFrame]);

  useEffect(() => {
    locationFrozenFrameRef.current = locationFrozenFrame;
  }, [locationFrozenFrame]);

  useEffect(() => {
    pendingItemTransitionRef.current = pendingItemTransitionValue;
  }, [pendingItemTransitionValue]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const nextItemDecodedValue = selectedItem.sku;
    if (
      itemDecodedText === nextItemDecodedValue &&
      itemFrozenFrameRef.current
    ) {
      return;
    }

    const frame = captureCurrentFrame();
    if (frame) {
      setItemFrozenFrame(frame);
    }

    setItemDecodedText(nextItemDecodedValue);
  }, [selectedItem, itemDecodedText]);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const nextLocationDecodedValue =
      selectedLocation.label || selectedLocation.code;
    if (
      locationDecodedText === nextLocationDecodedValue &&
      locationFrozenFrameRef.current
    ) {
      return;
    }

    const frame = captureCurrentFrame();
    if (frame) {
      setLocationFrozenFrame(frame);
    }

    setLocationDecodedText(nextLocationDecodedValue);

    const scanner = scannerRef.current;
    if (!scanner || scannerStepRef.current !== "location") {
      return;
    }

    try {
      if (scanner.getState() === HTML5_QRCODE_SCANNING_STATE) {
        scanner.pause(true);
      }
    } catch {
      // Ignore pause races during manual selection synchronization.
    }
  }, [selectedLocation, locationDecodedText]);

  const frozenFrame =
    scannerStep === "item" ? itemFrozenFrame : locationFrozenFrame;
  const decodedText =
    scannerStep === "item" ? itemDecodedText : locationDecodedText;

  const clearDecodedScan = () => {
    if (scannerStepRef.current === "location") {
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
      scannerActions.rescanCurrentStep();

      const scanner = scannerRef.current;
      if (!scanner) {
        return;
      }

      try {
        if (scanner.getState() === HTML5_QRCODE_PAUSED_STATE) {
          scanner.resume();
        }
      } catch {
        // Ignore resume errors and let the active scanner loop continue.
      }

      return;
    }

    setItemFrozenFrame(null);
    setItemDecodedText(null);
    setPendingItemTransitionValue(null);
    scannerActions.rescanCurrentStep();

    if (itemTransitionTimerRef.current) {
      window.clearTimeout(itemTransitionTimerRef.current);
      itemTransitionTimerRef.current = null;
    }

    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }

    try {
      if (scanner.getState() === HTML5_QRCODE_PAUSED_STATE) {
        scanner.resume();
      }
    } catch {
      // Ignore resume errors and let the active scanner loop continue.
    }
  };

  const resetScannerVisualCycle = () => {
    setItemFrozenFrame(null);
    setItemDecodedText(null);
    setLocationFrozenFrame(null);
    setLocationDecodedText(null);
    setPendingItemTransitionValue(null);

    if (itemTransitionTimerRef.current) {
      window.clearTimeout(itemTransitionTimerRef.current);
      itemTransitionTimerRef.current = null;
    }

    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }

    try {
      if (scanner.getState() === HTML5_QRCODE_PAUSED_STATE) {
        scanner.resume();
      }
    } catch {
      // Ignore resume races during cycle reset.
    }
  };

  function captureCurrentFrame(): ScannerFrozenFrame | null {
    const scannerRoot = document.getElementById(scannerRegionId);
    const videoElement = scannerRoot?.querySelector("video");
    if (!(videoElement instanceof HTMLVideoElement)) {
      return null;
    }

    const frameWidth = videoElement.videoWidth;
    const frameHeight = videoElement.videoHeight;
    if (!frameWidth || !frameHeight) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.drawImage(videoElement, 0, 0, frameWidth, frameHeight);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: frameWidth,
      height: frameHeight,
    };
  }

  useEffect(() => {
    scannerStepRef.current = scannerStep;

    if (scannerStep === "item") {
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
    }
  }, [scannerStep]);

  useEffect(() => {
    const scanner = scannerRef.current;
    if (!scanner) {
      return;
    }

    try {
      if (scannerStep === "location") {
        if (locationFrozenFrameRef.current) {
          if (scanner.getState() === HTML5_QRCODE_SCANNING_STATE) {
            scanner.pause(true);
          }
          return;
        }

        if (scanner.getState() === HTML5_QRCODE_PAUSED_STATE) {
          scanner.resume();
        }
        return;
      }

      if (itemFrozenFrameRef.current) {
        if (scanner.getState() === HTML5_QRCODE_SCANNING_STATE) {
          scanner.pause(true);
        }
        return;
      }

      if (scanner.getState() === HTML5_QRCODE_PAUSED_STATE) {
        scanner.resume();
      }
    } catch {
      // Ignore scanner step transition races.
    }
  }, [scannerStep]);

  useEffect(() => {
    if (!pendingItemTransitionValue || !itemFrozenFrame) {
      return;
    }

    const decodedValue = pendingItemTransitionValue;
    itemTransitionTimerRef.current = window.setTimeout(() => {
      scannerActions.applyDecodedScannerValue(decodedValue, "item");
      setPendingItemTransitionValue(null);
      itemTransitionTimerRef.current = null;
    }, ITEM_FREEZE_CONFIRMATION_DELAY_MS);

    return () => {
      if (itemTransitionTimerRef.current) {
        window.clearTimeout(itemTransitionTimerRef.current);
        itemTransitionTimerRef.current = null;
      }
    };
  }, [pendingItemTransitionValue, itemFrozenFrame]);

  useEffect(() => {
    if (!isCameraReady) {
      return;
    }

    let isDisposed = false;

    const syncTorch = async () => {
      const applied = await applyTorchConstraint(flashEnabled);
      if (!applied && flashEnabled && !isDisposed) {
        useScannerStore.getState().setFlashEnabled(false);
      }
    };

    void syncTorch();
    const timerId = window.setTimeout(() => {
      void syncTorch();
    }, 150);

    return () => {
      isDisposed = true;
      window.clearTimeout(timerId);
    };
  }, [flashEnabled, isCameraReady, selectedLensId]);

  useEffect(() => {
    let isDisposed = false;

    const handleResize = () => {
      forceScannerViewportFill();
    };

    window.addEventListener("resize", handleResize);

    async function startScanner(): Promise<void> {
      const scanner = new Html5Qrcode(scannerRegionId, { verbose: false });
      scannerRef.current = scanner;
      loopMissCountRef.current = 0;

      if (import.meta.env.DEV) {
        console.info("[scanner] initializing html5-qrcode");
      }

      try {
        await requestCameraPermission();
        if (isDisposed) {
          await safelyStopAndClearScanner(scanner);
          return;
        }

        const onScanSuccess = (decodedText: string) => {
          const currentStep = scannerStepRef.current;

          if (
            currentStep === "item" &&
            (itemFrozenFrameRef.current || pendingItemTransitionRef.current)
          ) {
            return;
          }

          if (currentStep === "location" && locationFrozenFrameRef.current) {
            return;
          }

          const now = Date.now();
          const lastScan = lastScanRef.current;
          if (
            lastScan &&
            lastScan.value === decodedText &&
            now - lastScan.at < 1200
          ) {
            return;
          }

          lastScanRef.current = {
            value: decodedText,
            at: now,
          };

          if (currentStep === "item") {
            const frame = captureCurrentFrame();
            if (frame) {
              setItemFrozenFrame(frame);
            }

            setItemDecodedText(decodedText);
            setPendingItemTransitionValue(decodedText);

            try {
              if (scanner.getState() === HTML5_QRCODE_SCANNING_STATE) {
                scanner.pause(true);
              }
            } catch {
              // Ignore pause races during state transitions.
            }
          }

          if (import.meta.env.DEV) {
            console.info("[scanner] qr decoded", {
              step: scannerStepRef.current,
              value: decodedText,
            });
          }

          if (currentStep === "location") {
            const frame = captureCurrentFrame();
            if (frame) {
              setLocationFrozenFrame(frame);
            }

            setLocationDecodedText(decodedText);

            try {
              if (scanner.getState() === HTML5_QRCODE_SCANNING_STATE) {
                scanner.pause(true);
              }
            } catch {
              // Ignore pause races during state transitions.
            }

            scannerActions.applyDecodedScannerValue(decodedText, currentStep);
          }
        };

        const onScanError = () => {
          loopMissCountRef.current += 1;

          if (
            import.meta.env.DEV &&
            loopMissCountRef.current % SCAN_LOOP_LOG_EVERY === 0
          ) {
            console.info("[scanner] scan loop heartbeat", {
              misses: loopMissCountRef.current,
              step: scannerStepRef.current,
            });
          }
        };

        const cameras = await Html5Qrcode.getCameras();
        if (isDisposed) {
          await safelyStopAndClearScanner(scanner);
          return;
        }

        const availableLenses = mapCameraDevicesToLenses(cameras);
        scannerActions.setAvailableLenses(availableLenses);

        const rememberedLensId = getRememberedLensId();

        const cameraId = resolvePreferredLensId(
          cameras,
          selectedLensId,
          rememberedLensId,
        );

        const selectedCameraLabel =
          (cameraId &&
            cameras.find((camera) => camera.id === cameraId)?.label) ||
          "";
        const disableFlip =
          !isLikelyFrontFacingCameraLabel(selectedCameraLabel);

        const scanConfig = {
          fps: SCANNER_FPS,
          qrbox: buildScanRegion,
          disableFlip,
        };

        if (cameraId && cameraId !== selectedLensId) {
          scannerActions.selectLens(cameraId);
        }

        if (cameraId) {
          await scanner.start(
            {
              deviceId: { exact: cameraId },
            },
            scanConfig,
            onScanSuccess,
            onScanError,
          );
        } else {
          await scanner.start(
            {
              facingMode: "environment",
            },
            scanConfig,
            onScanSuccess,
            onScanError,
          );
        }

        if (isDisposed) {
          await safelyStopAndClearScanner(scanner);
          return;
        }

        setIsCameraReady(true);
        setCameraError(null);

        // Apply non-critical camera tuning without blocking first visible preview.
        void applyPostStartVideoConstraints(scanner);

        forceScannerViewportFill();
        requestAnimationFrame(() => forceScannerViewportFill());
        window.setTimeout(() => forceScannerViewportFill(), 180);

        if (isDisposed) {
          await safelyStopAndClearScanner(scanner);
          return;
        }

        if (import.meta.env.DEV) {
          console.info("[scanner] camera stream ready");
        }
      } catch (error) {
        if (isDisposed) {
          await safelyStopAndClearScanner(scanner);
          return;
        }

        setIsCameraReady(false);
        setCameraError(getScannerErrorMessage(error));

        if (import.meta.env.DEV) {
          console.error("[scanner] startup failed", error);
        }
      }
    }

    void startScanner();

    return () => {
      isDisposed = true;
      window.removeEventListener("resize", handleResize);
      setIsCameraReady(false);
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
      loopMissCountRef.current = 0;
      setPendingItemTransitionValue(null);

      if (itemTransitionTimerRef.current) {
        window.clearTimeout(itemTransitionTimerRef.current);
        itemTransitionTimerRef.current = null;
      }

      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (!scanner) {
        return;
      }

      void safelyStopAndClearScanner(scanner);
    };
  }, [selectedLensId]);

  return {
    scannerRegionId,
    isCameraReady,
    cameraError,
    frozenFrame,
    decodedText,
    clearDecodedScan,
    resetScannerVisualCycle,
  };
}
