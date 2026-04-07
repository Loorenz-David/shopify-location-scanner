import type { ScannerLens } from "../types/scanner.types";

interface CameraDevice {
  id: string;
  label: string;
}

const SCANNER_PREFERRED_LENS_ID_STORAGE_KEY = "scanner.preferredCameraLensId";

function isFrontCamera(label: string): boolean {
  const normalizedLabel = label.toLowerCase();
  return (
    normalizedLabel.includes("front") ||
    normalizedLabel.includes("selfie") ||
    normalizedLabel.includes("user")
  );
}

function toRearCameraDevices(cameraDevices: CameraDevice[]): CameraDevice[] {
  return cameraDevices.filter(
    (cameraDevice) => !isFrontCamera(cameraDevice.label),
  );
}

function buildLensLabelByIndex(index: number, total: number): string {
  if (total >= 3) {
    const labels = ["0.5x", "1x", "2x"];
    return labels[index] ?? `${index + 1}x`;
  }

  if (total === 2) {
    return index === 0 ? "1x" : "2x";
  }

  return "1x";
}

export function mapCameraDevicesToLenses(
  cameraDevices: CameraDevice[],
): ScannerLens[] {
  const rearCameraDevices = toRearCameraDevices(cameraDevices);
  const sourceDevices =
    rearCameraDevices.length > 0 ? rearCameraDevices : cameraDevices;

  return sourceDevices.map((cameraDevice, index) => {
    const label = buildLensLabelByIndex(index, sourceDevices.length);

    return {
      id: cameraDevice.id,
      label,
    };
  });
}

export function getRememberedLensId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(
    SCANNER_PREFERRED_LENS_ID_STORAGE_KEY,
  );
  return value && value.length > 0 ? value : null;
}

export function rememberLensId(lensId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SCANNER_PREFERRED_LENS_ID_STORAGE_KEY, lensId);
}

export function resolvePreferredLensId(
  cameraDevices: CameraDevice[],
  selectedLensId: string | null,
  rememberedLensId: string | null,
): string | null {
  if (cameraDevices.length === 0) {
    return null;
  }

  const rearCameraDevices = toRearCameraDevices(cameraDevices);
  const sourceDevices =
    rearCameraDevices.length > 0 ? rearCameraDevices : cameraDevices;

  if (
    selectedLensId &&
    sourceDevices.some((camera) => camera.id === selectedLensId)
  ) {
    return selectedLensId;
  }

  if (
    rememberedLensId &&
    sourceDevices.some((camera) => camera.id === rememberedLensId)
  ) {
    return rememberedLensId;
  }

  if (sourceDevices.length >= 3) {
    return sourceDevices[1].id;
  }

  return sourceDevices[0].id;
}
