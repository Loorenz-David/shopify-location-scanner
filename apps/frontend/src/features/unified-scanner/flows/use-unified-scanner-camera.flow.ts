import { useCallback, useEffect, useRef, useState } from "react";

import {
  attachDecodeSession,
  CAMERA_REGION_IDS,
} from "../domain/camera-session.manager";
import {
  getRememberedLensId,
  mapCameraDevicesToLenses,
  resolvePreferredLensId,
} from "../domain/scanner-camera-lens.domain";
import { lookupItemByValueController } from "../controllers/item.controller";
import { applyLocationByValueController } from "../controllers/location.controller";
import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
import type { ScannerFrozenFrame } from "../types/unified-scanner.types";

const unifiedScannerRegionId = CAMERA_REGION_IDS["unified-scanner"];
const ITEM_TO_LOCATION_TRANSITION_DELAY_MS = 600;

function getCameraErrorMessage(error: unknown): string {
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

async function applyTorchToUnifiedRegion(enabled: boolean): Promise<boolean> {
  const scannerRoot = document.getElementById(unifiedScannerRegionId);
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

function captureCurrentFrame(): ScannerFrozenFrame | null {
  const scannerRoot = document.getElementById(unifiedScannerRegionId);
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

function triggerScanHapticFeedback(): void {
  if (typeof navigator === "undefined" || !navigator.vibrate) {
    return;
  }

  navigator.vibrate(32);
}

export interface UnifiedScannerCameraFlowResult {
  isCameraReady: boolean;
  cameraError: string | null;
  itemFrozenFrame: ScannerFrozenFrame | null;
  itemDecodedText: string | null;
  locationFrozenFrame: ScannerFrozenFrame | null;
  locationDecodedText: string | null;
  clearItemScan: () => void;
  clearLocationScan: () => void;
  resetScannerVisualCycle: () => void;
}

export function useUnifiedScannerCameraFlow(): UnifiedScannerCameraFlowResult {
  const phase = useUnifiedScannerStore((state) => state.phase);
  const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);
  const selectedLocation = useUnifiedScannerStore(
    (state) => state.selectedLocation,
  );
  const flashEnabled = useUnifiedScannerStore((state) => state.flashEnabled);
  const selectedLensId = useUnifiedScannerStore(
    (state) => state.selectedLensId,
  );

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

  const phaseRef = useRef(phase);
  const decodePausedRef = useRef(false);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const itemToLocationTimerRef = useRef<number | null>(null);
  const previousSelectedLocationRef = useRef(selectedLocation);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const initLensesFromDevices = useCallback(async () => {
    try {
      const cameras = (await navigator.mediaDevices.enumerateDevices())
        .filter((device) => device.kind === "videoinput")
        .map((device) => ({
          id: device.deviceId,
          label: device.label,
        }));

      const availableLenses = mapCameraDevicesToLenses(cameras);
      unifiedScannerActions.setAvailableLenses(availableLenses);

      const preferredLensId = resolvePreferredLensId(
        cameras,
        selectedLensId,
        getRememberedLensId(),
      );

      if (preferredLensId && preferredLensId !== selectedLensId) {
        unifiedScannerActions.selectLens(preferredLensId);
      }
    } catch {
      unifiedScannerActions.setAvailableLenses([]);
    }
  }, [selectedLensId]);

  useEffect(() => {
    if (!selectedItem) {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      const frame = captureCurrentFrame();
      if (frame) {
        setItemFrozenFrame(frame);
      }

      setItemDecodedText(selectedItem.title ?? selectedItem.sku);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      const frame = captureCurrentFrame();
      if (frame) {
        setLocationFrozenFrame(frame);
      }

      setLocationDecodedText(
        selectedLocation.mode === "shop"
          ? selectedLocation.label
          : selectedLocation.location,
      );
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [selectedLocation]);

  useEffect(() => {
    if (phase !== "scanning-item") {
      return;
    }

    const animationId = window.requestAnimationFrame(() => {
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
    });

    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "scanning-location" && !selectedLocation) {
      decodePausedRef.current = false;
    }
  }, [phase, selectedLocation]);

  useEffect(() => {
    const previousSelectedLocation = previousSelectedLocationRef.current;

    if (previousSelectedLocation && !selectedLocation) {
      setLocationFrozenFrame(null);
      setLocationDecodedText(null);
      decodePausedRef.current = false;
    }

    previousSelectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  const clearItemScan = useCallback(() => {
    setItemFrozenFrame(null);
    setItemDecodedText(null);
    decodePausedRef.current = false;
    lastScanRef.current = null;

    if (itemToLocationTimerRef.current) {
      window.clearTimeout(itemToLocationTimerRef.current);
      itemToLocationTimerRef.current = null;
    }
  }, []);

  const clearLocationScan = useCallback(() => {
    setLocationFrozenFrame(null);
    setLocationDecodedText(null);
    decodePausedRef.current = false;
    lastScanRef.current = null;
  }, []);

  const resetScannerVisualCycle = useCallback(() => {
    clearItemScan();
    clearLocationScan();
  }, [clearItemScan, clearLocationScan]);

  useEffect(() => {
    if (!isCameraReady) {
      return;
    }

    let disposed = false;

    const syncTorch = async () => {
      const applied = await applyTorchToUnifiedRegion(flashEnabled);
      if (!applied && flashEnabled && !disposed) {
        useUnifiedScannerStore.getState().setFlashEnabled(false);
      }
    };

    void syncTorch();

    return () => {
      disposed = true;
    };
  }, [flashEnabled, isCameraReady, selectedLensId]);

  useEffect(() => {
    setIsCameraReady(false);
    setCameraError(null);
    decodePausedRef.current = false;

    const detach = attachDecodeSession(
      "unified-scanner",
      (rawValue) => {
        if (decodePausedRef.current) {
          return;
        }

        const normalizedValue = rawValue.trim();
        if (!normalizedValue) {
          return;
        }

        const now = Date.now();
        const lastScan = lastScanRef.current;
        if (
          lastScan &&
          lastScan.value === normalizedValue &&
          now - lastScan.at < 1200
        ) {
          return;
        }

        lastScanRef.current = { value: normalizedValue, at: now };
        triggerScanHapticFeedback();

        const currentPhase = phaseRef.current;
        if (currentPhase === "scanning-item") {
          const frame = captureCurrentFrame();
          if (frame) {
            setItemFrozenFrame(frame);
          }

          setItemDecodedText(normalizedValue);
          decodePausedRef.current = true;

          if (itemToLocationTimerRef.current) {
            window.clearTimeout(itemToLocationTimerRef.current);
          }

          itemToLocationTimerRef.current = window.setTimeout(() => {
            itemToLocationTimerRef.current = null;
            const store = useUnifiedScannerStore.getState();

            if (
              !store.onScanAsk &&
              store.phase === "scanning-item" &&
              !store.itemLookupError &&
              (store.isLookingUpItem || !!store.selectedItem)
            ) {
              store.setPhase("scanning-location");
            }
          }, ITEM_TO_LOCATION_TRANSITION_DELAY_MS);

          void lookupItemByValueController(normalizedValue);
          return;
        }

        if (currentPhase === "scanning-location") {
          const frame = captureCurrentFrame();
          if (frame) {
            setLocationFrozenFrame(frame);
          }

          setLocationDecodedText(normalizedValue);
          decodePausedRef.current = true;
          applyLocationByValueController(normalizedValue);
        }
      },
      (ready, error) => {
        setIsCameraReady(ready);
        setCameraError(error ?? null);

        if (ready) {
          void initLensesFromDevices();
        }
      },
      selectedLensId ?? undefined,
    );

    return () => {
      detach();
      setIsCameraReady(false);
      setCameraError(null);
      decodePausedRef.current = false;

      if (itemToLocationTimerRef.current) {
        window.clearTimeout(itemToLocationTimerRef.current);
        itemToLocationTimerRef.current = null;
      }
    };
  }, [initLensesFromDevices, selectedLensId]);

  return {
    isCameraReady,
    cameraError: cameraError ? getCameraErrorMessage(cameraError) : null,
    itemFrozenFrame,
    itemDecodedText,
    locationFrozenFrame,
    locationDecodedText,
    clearItemScan,
    clearLocationScan,
    resetScannerVisualCycle,
  };
}
