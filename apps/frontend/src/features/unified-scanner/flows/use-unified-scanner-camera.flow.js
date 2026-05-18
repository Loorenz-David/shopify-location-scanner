import { useCallback, useEffect, useRef, useState } from "react";
import { attachDecodeSession, CAMERA_REGION_IDS, } from "../domain/camera-session.manager";
import { getRememberedLensId, mapCameraDevicesToLenses, resolvePreferredLensId, } from "../domain/scanner-camera-lens.domain";
import { lookupItemByValueController } from "../controllers/item.controller";
import { applyLocationByValueController } from "../controllers/location.controller";
import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../stores/unified-scanner.store";
const unifiedScannerRegionId = CAMERA_REGION_IDS["unified-scanner"];
const ITEM_TO_LOCATION_TRANSITION_DELAY_MS = 600;
function isPermissionDeniedCameraError(error) {
    const normalizedError = error.trim().toLowerCase();
    return (normalizedError.includes("notallowederror") ||
        normalizedError.includes("permission denied") ||
        normalizedError.includes("permission denied by system") ||
        normalizedError.includes("user denied") ||
        normalizedError.includes("denied permission"));
}
function getCameraErrorMessage(error) {
    if (error && typeof error === "object" && "message" in error) {
        const message = String(error.message ?? "");
        if (isPermissionDeniedCameraError(message)) {
            return "Camera permission denied, please allowed to use the scanner.";
        }
        return message || "Camera access denied or unavailable.";
    }
    if (typeof error === "string") {
        if (isPermissionDeniedCameraError(error)) {
            return "Camera permission denied, please allowed to use the scanner.";
        }
        return error;
    }
    return "Camera access denied or unavailable.";
}
async function applyTorchToUnifiedRegion(enabled) {
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
    const capabilities = typeof videoTrack.getCapabilities === "function"
        ? videoTrack.getCapabilities()
        : null;
    if (!capabilities || !("torch" in capabilities) || !capabilities.torch) {
        return false;
    }
    try {
        const torchConstraint = {
            torch: enabled,
        };
        await videoTrack.applyConstraints({
            advanced: [torchConstraint],
        });
        return true;
    }
    catch {
        return false;
    }
}
function captureCurrentFrame() {
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
function isUnifiedCameraPreviewHealthy() {
    const scannerRoot = document.getElementById(unifiedScannerRegionId);
    const video = scannerRoot?.querySelector("video");
    if (!(video instanceof HTMLVideoElement)) {
        return false;
    }
    const stream = video.srcObject;
    if (!(stream instanceof MediaStream)) {
        return false;
    }
    const hasLiveTrack = stream
        .getVideoTracks()
        .some((track) => track.readyState === "live");
    return (hasLiveTrack &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0);
}
function triggerScanHapticFeedback() {
    if (typeof navigator === "undefined" || !navigator.vibrate) {
        return;
    }
    navigator.vibrate(32);
}
export function useUnifiedScannerCameraFlow() {
    const phase = useUnifiedScannerStore((state) => state.phase);
    const selectedItem = useUnifiedScannerStore((state) => state.selectedItem);
    const selectedLocation = useUnifiedScannerStore((state) => state.selectedLocation);
    const flashEnabled = useUnifiedScannerStore((state) => state.flashEnabled);
    const selectedLensId = useUnifiedScannerStore((state) => state.selectedLensId);
    const lensSelectionRevision = useUnifiedScannerStore((state) => state.lensSelectionRevision);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [cameraRestartKey, setCameraRestartKey] = useState(0);
    const [itemFrozenFrame, setItemFrozenFrame] = useState(null);
    const [itemDecodedText, setItemDecodedText] = useState(null);
    const [locationFrozenFrame, setLocationFrozenFrame] = useState(null);
    const [locationDecodedText, setLocationDecodedText] = useState(null);
    const phaseRef = useRef(phase);
    const decodePausedRef = useRef(false);
    const lastScanRef = useRef(null);
    const itemToLocationTimerRef = useRef(null);
    const previousSelectedLocationRef = useRef(selectedLocation);
    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState !== "visible")
                return;
            await new Promise((resolve) => {
                window.requestAnimationFrame(() => resolve());
            });
            if (!isUnifiedCameraPreviewHealthy()) {
                setCameraRestartKey((k) => k + 1);
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);
    const initLensesFromDevices = useCallback(async (activeDeviceId) => {
        try {
            const cameras = (await navigator.mediaDevices.enumerateDevices())
                .filter((device) => device.kind === "videoinput")
                .map((device) => ({
                id: device.deviceId,
                label: device.label,
            }));
            const availableLenses = mapCameraDevicesToLenses(cameras);
            unifiedScannerActions.setAvailableLenses(availableLenses);
            if (activeDeviceId &&
                availableLenses.some((lens) => lens.id === activeDeviceId)) {
                const currentSelectedLensId = useUnifiedScannerStore.getState().selectedLensId;
                if (currentSelectedLensId !== activeDeviceId) {
                    unifiedScannerActions.syncActiveLens(activeDeviceId);
                }
                return;
            }
            const preferredLensId = resolvePreferredLensId(cameras, useUnifiedScannerStore.getState().selectedLensId, getRememberedLensId());
            if (preferredLensId &&
                preferredLensId !== useUnifiedScannerStore.getState().selectedLensId) {
                unifiedScannerActions.syncActiveLens(preferredLensId);
            }
        }
        catch {
            unifiedScannerActions.setAvailableLenses([]);
        }
    }, []);
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
            setLocationDecodedText(selectedLocation.mode === "shop"
                ? selectedLocation.label
                : selectedLocation.location);
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
    const setDecodePaused = useCallback((paused) => {
        decodePausedRef.current = paused;
        if (paused) {
            lastScanRef.current = null;
        }
    }, []);
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
        const detach = attachDecodeSession("unified-scanner", (rawValue) => {
            if (decodePausedRef.current) {
                return;
            }
            const normalizedValue = rawValue.trim();
            if (!normalizedValue) {
                return;
            }
            const now = Date.now();
            const lastScan = lastScanRef.current;
            if (lastScan &&
                lastScan.value === normalizedValue &&
                now - lastScan.at < 1200) {
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
                    if (!store.onScanAsk &&
                        store.phase === "scanning-item" &&
                        !store.itemLookupError &&
                        (store.isLookingUpItem || !!store.selectedItem)) {
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
        }, (ready, error, activeDeviceId) => {
            setIsCameraReady(ready);
            setCameraError(error ?? null);
            if (ready) {
                void initLensesFromDevices(activeDeviceId);
            }
        }, (useUnifiedScannerStore.getState().selectedLensId ??
            getRememberedLensId() ??
            undefined), { forceDeviceId: lensSelectionRevision > 0 });
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
    }, [initLensesFromDevices, lensSelectionRevision, cameraRestartKey]);
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
        setDecodePaused,
    };
}
