import { useCallback, useEffect, useRef, useState } from "react";

import {
  attachDecodeSession,
  getCameraRegionId,
} from "../domain/camera-session.manager";
import {
  getRememberedLensId,
  mapCameraDevicesToLenses,
  resolvePreferredLensId,
} from "../domain/scanner-camera-lens";
import type { ScannerFrozenFrame, ScannerLens } from "../types";

export interface UseQrScannerOptions {
  sessionId: string;
  onDecode: (value: string) => void;
  selectedLensId?: string | null;
  lensSelectionRevision?: number;
  dedupeWindowMs?: number;
}

export interface UseQrScannerResult {
  isCameraReady: boolean;
  cameraError: string | null;
  availableLenses: ScannerLens[];
  activeLensId: string | null;
  captureFrame: () => ScannerFrozenFrame | null;
  restart: () => void;
}

function isPermissionDeniedError(msg: string): boolean {
  const s = msg.trim().toLowerCase();
  return (
    s.includes("notallowederror") ||
    s.includes("permission denied") ||
    s.includes("user denied") ||
    s.includes("denied permission")
  );
}

function formatCameraError(raw: string): string {
  if (isPermissionDeniedError(raw)) {
    return "Camera permission denied. Please allow camera access and try again.";
  }
  return raw || "Camera access denied or unavailable.";
}

export function useQrScanner({
  sessionId,
  onDecode,
  selectedLensId = null,
  lensSelectionRevision = 0,
  dedupeWindowMs = 1200,
}: UseQrScannerOptions): UseQrScannerResult {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0);
  const [availableLenses, setAvailableLenses] = useState<ScannerLens[]>([]);
  const [activeLensId, setActiveLensId] = useState<string | null>(null);

  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;

  const captureFrame = useCallback((): ScannerFrozenFrame | null => {
    const root = document.getElementById(getCameraRegionId(sessionId));
    const video = root?.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) return null;
    if (!video.videoWidth || !video.videoHeight) return null;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);

    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.95),
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }, [sessionId]);

  const initLenses = useCallback(async (activeDeviceId?: string | null) => {
    try {
      const cameras = (await navigator.mediaDevices.enumerateDevices())
        .filter((d) => d.kind === "videoinput")
        .map((d) => ({ id: d.deviceId, label: d.label }));

      const lenses = mapCameraDevicesToLenses(cameras);
      setAvailableLenses(lenses);

      const preferred = resolvePreferredLensId(
        cameras,
        activeDeviceId ?? null,
        getRememberedLensId(),
      );
      setActiveLensId(activeDeviceId ?? preferred ?? null);
    } catch {
      setAvailableLenses([]);
    }
  }, []);

  const restart = useCallback(() => {
    setRestartKey((k) => k + 1);
  }, []);

  useEffect(() => {
    setIsCameraReady(false);
    setCameraError(null);

    const detach = attachDecodeSession(
      sessionId,
      (rawValue) => {
        const value = rawValue.trim();
        if (!value) return;

        const now = Date.now();
        const last = lastScanRef.current;
        if (last && last.value === value && now - last.at < dedupeWindowMs) {
          return;
        }
        lastScanRef.current = { value, at: now };

        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate(32);
        }

        onDecodeRef.current(value);
      },
      (ready, error, activeDeviceId) => {
        setIsCameraReady(ready);
        setCameraError(error ? formatCameraError(error) : null);
        if (ready) void initLenses(activeDeviceId);
      },
      selectedLensId ?? getRememberedLensId() ?? undefined,
      { forceDeviceId: lensSelectionRevision > 0 },
    );

    return () => {
      detach();
      setIsCameraReady(false);
      setCameraError(null);
    };
  }, [
    sessionId,
    selectedLensId,
    lensSelectionRevision,
    dedupeWindowMs,
    initLenses,
    restartKey,
  ]);

  return {
    isCameraReady,
    cameraError,
    availableLenses,
    activeLensId,
    captureFrame,
    restart,
  };
}
