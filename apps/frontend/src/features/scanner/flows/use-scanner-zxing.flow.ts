import { BrowserMultiFormatReader } from "@zxing/browser";
import { useCallback, useEffect, useRef, useState } from "react";

import { scannerActions } from "../actions/scanner.actions";
import {
  getRememberedLensId,
  mapCameraDevicesToLenses,
  resolvePreferredLensId,
} from "../domain/scanner-camera-lens.domain";
import { toScannerItemDisplayValue } from "../domain/scanner-decoder.domain";
import {
  getScannerGuideRect,
  SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
} from "../domain/scanner-guide.domain";
import { useScannerStore } from "../stores/scanner.store";
import type { ScannerEngineFlowResult } from "../types/scanner-engine.types";
import type { ScannerFrozenFrame } from "../types/scanner.types";
import type { ScannerStep } from "../types/scanner.types";

const scannerRegionId = "scanner-qr-reader";
const ITEM_FREEZE_CONFIRMATION_DELAY_MS = 600;
const SCANNER_IDLE_RELEASE_TIMEOUT_MS = 60_000;

let scheduledScannerReleaseTimerId: number | null = null;
let scheduledScannerRelease: (() => void) | null = null;

function clearScheduledScannerRelease(): void {
  if (scheduledScannerReleaseTimerId) {
    window.clearTimeout(scheduledScannerReleaseTimerId);
    scheduledScannerReleaseTimerId = null;
  }

  scheduledScannerRelease = null;
}

function flushScheduledScannerRelease(): void {
  const release = scheduledScannerRelease;
  clearScheduledScannerRelease();
  release?.();
}

function scheduleScannerRelease(release: () => void): void {
  clearScheduledScannerRelease();
  scheduledScannerRelease = release;
  scheduledScannerReleaseTimerId = window.setTimeout(() => {
    const pendingRelease = scheduledScannerRelease;
    clearScheduledScannerRelease();
    pendingRelease?.();
  }, SCANNER_IDLE_RELEASE_TIMEOUT_MS);
}

function getScannerErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return (
      String((error as { message?: unknown }).message ?? "") ||
      "Camera access denied or unavailable."
    );
  }

  if (typeof error === "string") {
    return error;
  }

  return "Camera access denied or unavailable.";
}

async function requestCameraPermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("MediaDevices API is unavailable in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
  stream.getTracks().forEach((track) => track.stop());
}

function ensureScannerVideoElement(): HTMLVideoElement {
  const scannerRoot = document.getElementById(scannerRegionId);
  if (!scannerRoot) {
    throw new Error("Scanner container is unavailable.");
  }

  let videoElement = scannerRoot.querySelector("video");
  if (!(videoElement instanceof HTMLVideoElement)) {
    videoElement = document.createElement("video");
    videoElement.setAttribute("playsinline", "true");
    videoElement.muted = true;
    videoElement.autoplay = true;
    scannerRoot.appendChild(videoElement);
  }

  videoElement.style.setProperty("width", "100%", "important");
  videoElement.style.setProperty("height", "100%", "important");
  videoElement.style.setProperty("object-fit", "cover", "important");
  videoElement.style.setProperty("position", "absolute", "important");
  videoElement.style.setProperty("inset", "0", "important");

  return videoElement;
}

function releaseScannerVideoElement(): void {
  const scannerRoot = document.getElementById(scannerRegionId);
  const videoElement = scannerRoot?.querySelector("video");
  if (!(videoElement instanceof HTMLVideoElement)) {
    return;
  }

  const stream = videoElement.srcObject;
  if (stream instanceof MediaStream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  videoElement.srcObject = null;
  videoElement.remove();
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

function isDecodedResultInsideGuideRegion(
  resultPoints: Array<{ getX: () => number; getY: () => number }> | null,
  videoElement: HTMLVideoElement,
): boolean {
  if (!resultPoints || resultPoints.length === 0) {
    return true;
  }

  const viewportWidth = videoElement.clientWidth;
  const viewportHeight = videoElement.clientHeight;
  const sourceWidth = videoElement.videoWidth;
  const sourceHeight = videoElement.videoHeight;

  if (!viewportWidth || !viewportHeight || !sourceWidth || !sourceHeight) {
    return true;
  }

  const scale = Math.max(
    viewportWidth / sourceWidth,
    viewportHeight / sourceHeight,
  );
  const displayWidth = sourceWidth * scale;
  const displayHeight = sourceHeight * scale;
  const cropLeft = (displayWidth - viewportWidth) / 2;
  const cropTop = (displayHeight - viewportHeight) / 2;

  const guideRect = getScannerGuideRect({
    viewportWidth,
    viewportHeight,
    paddingPx: SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
  });

  return resultPoints.every((point) => {
    const viewportX = point.getX() * scale - cropLeft;
    const viewportY = point.getY() * scale - cropTop;

    return (
      viewportX >= guideRect.left &&
      viewportX <= guideRect.right &&
      viewportY >= guideRect.top &&
      viewportY <= guideRect.bottom
    );
  });
}

type ScannerDecodeResult = {
  getText: () => string;
  getResultPoints: () => Array<{ getX: () => number; getY: () => number }>;
};

function triggerScanHapticFeedback(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }

  navigator.vibrate(32);
}

export function useScannerZxingFlow(
  scannerStep: ScannerStep,
  selectedLensId: string | null,
): ScannerEngineFlowResult {
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
  const scannerStepRef = useRef<ScannerStep>(scannerStep);
  const decodePausedRef = useRef(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const itemTransitionTimerRef = useRef<number | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);
  const hasCameraPermissionRef = useRef(false);

  const frozenFrame =
    scannerStep === "item" ? itemFrozenFrame : locationFrozenFrame;
  const decodedText =
    scannerStep === "item" ? itemDecodedText : locationDecodedText;

  const captureCurrentFrame = useCallback((): ScannerFrozenFrame | null => {
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
  }, []);

  useEffect(() => {
    scannerStepRef.current = scannerStep;

    if (scannerStep !== "item") {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [scannerStep]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      const frame = captureCurrentFrame();
      if (frame) {
        setItemFrozenFrame(frame);
      }

      setItemDecodedText(selectedItem.sku);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [selectedItem, captureCurrentFrame]);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      const frame = captureCurrentFrame();
      if (frame) {
        setLocationFrozenFrame(frame);
      }

      setLocationDecodedText(selectedLocation.label || selectedLocation.code);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [selectedLocation, captureCurrentFrame]);

  const clearDecodedScan = () => {
    if (scannerStepRef.current === "location") {
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
      scannerActions.rescanCurrentStep();
      decodePausedRef.current = false;
      return;
    }

    setItemFrozenFrame(null);
    setItemDecodedText(null);
    setPendingItemTransitionValue(null);
    scannerActions.rescanCurrentStep();
    decodePausedRef.current = false;

    if (itemTransitionTimerRef.current) {
      window.clearTimeout(itemTransitionTimerRef.current);
      itemTransitionTimerRef.current = null;
    }
  };

  const resetScannerVisualCycle = () => {
    setItemFrozenFrame(null);
    setItemDecodedText(null);
    setLocationFrozenFrame(null);
    setLocationDecodedText(null);
    setPendingItemTransitionValue(null);
    decodePausedRef.current = false;

    if (itemTransitionTimerRef.current) {
      window.clearTimeout(itemTransitionTimerRef.current);
      itemTransitionTimerRef.current = null;
    }
  };

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

    return () => {
      isDisposed = true;
    };
  }, [flashEnabled, isCameraReady, selectedLensId]);

  useEffect(() => {
    let isDisposed = false;

    async function startScanner(): Promise<void> {
      try {
        flushScheduledScannerRelease();

        setIsCameraReady(false);
        setCameraError(null);

        try {
          scannerControlsRef.current?.stop();
        } catch {
          // Ignore teardown races while switching devices quickly.
        }
        scannerControlsRef.current = null;
        releaseScannerVideoElement();

        if (!hasCameraPermissionRef.current) {
          await requestCameraPermission();
          hasCameraPermissionRef.current = true;
        }

        if (isDisposed) {
          return;
        }

        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        const cameras = (await navigator.mediaDevices.enumerateDevices())
          .filter((device) => device.kind === "videoinput")
          .map((device) => ({
            id: device.deviceId,
            label: device.label,
          }));

        const availableLenses = mapCameraDevicesToLenses(cameras);
        scannerActions.setAvailableLenses(availableLenses);

        const rememberedLensId = getRememberedLensId();
        const cameraId = resolvePreferredLensId(
          cameras,
          selectedLensId,
          rememberedLensId,
        );

        if (cameraId && cameraId !== selectedLensId) {
          scannerActions.selectLens(cameraId);
        }

        const videoElement = ensureScannerVideoElement();

        const controls = await reader.decodeFromVideoDevice(
          cameraId ?? undefined,
          videoElement,
          (result: ScannerDecodeResult | null | undefined) => {
            if (isDisposed) {
              return;
            }

            if (!result || decodePausedRef.current) {
              return;
            }

            const resultPoints = result.getResultPoints() ?? null;
            if (!isDecodedResultInsideGuideRegion(resultPoints, videoElement)) {
              return;
            }

            const decodedValue = result.getText().trim();
            if (!decodedValue) {
              return;
            }

            const now = Date.now();
            const lastScan = lastScanRef.current;
            if (
              lastScan &&
              lastScan.value === decodedValue &&
              now - lastScan.at < 1200
            ) {
              return;
            }

            lastScanRef.current = {
              value: decodedValue,
              at: now,
            };

            triggerScanHapticFeedback();

            const currentStep = scannerStepRef.current;
            if (currentStep === "item") {
              const frame = captureCurrentFrame();
              if (frame) {
                setItemFrozenFrame(frame);
              }

              setItemDecodedText(toScannerItemDisplayValue(decodedValue));
              setPendingItemTransitionValue(decodedValue);
              decodePausedRef.current = true;
              return;
            }

            const frame = captureCurrentFrame();
            if (frame) {
              setLocationFrozenFrame(frame);
            }

            setLocationDecodedText(decodedValue);
            decodePausedRef.current = true;
            scannerActions.applyDecodedScannerValue(decodedValue, currentStep);
          },
        );

        scannerControlsRef.current = controls;
        setIsCameraReady(true);
        setCameraError(null);
      } catch (error) {
        if (isDisposed) {
          return;
        }

        setIsCameraReady(false);
        setCameraError(getScannerErrorMessage(error));
      }
    }

    void startScanner();

    return () => {
      isDisposed = true;
      setIsCameraReady(false);
      decodePausedRef.current = false;

      if (itemTransitionTimerRef.current) {
        window.clearTimeout(itemTransitionTimerRef.current);
        itemTransitionTimerRef.current = null;
      }

      const releaseResources = () => {
        try {
          scannerControlsRef.current?.stop();
        } catch {
          // Ignore teardown races.
        }

        scannerControlsRef.current = null;
        readerRef.current = null;
        releaseScannerVideoElement();
      };

      scheduleScannerRelease(releaseResources);
    };
  }, [selectedLensId, captureCurrentFrame]);

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
