import type { ScannerLens } from "../types";

interface CameraDevice {
  id: string;
  label: string;
}

const SCANNER_PREFERRED_LENS_ID_STORAGE_KEY = "scanner.preferredCameraLensId";

function isFrontCamera(label: string): boolean {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("front") ||
    normalized.includes("selfie") ||
    normalized.includes("user")
  );
}

// iOS exposes logical multi-lens cameras ("Back Dual Camera", "Back Triple Camera")
// alongside the individual physical lenses. Keep only the physical lenses so the user
// picks a specific focal length instead of a system-managed combo.
function isLogicalMultiLensCamera(label: string): boolean {
  const normalized = label.toLowerCase();
  return (
    normalized.includes("dual") ||
    normalized.includes("triple") ||
    normalized.includes("quad")
  );
}

// Android Camera2 API exposes raw sensor entries like "camera2 0, facing back".
// These may be depth sensors or IR cameras not intended for user selection.
function isRawSystemCamera(label: string): boolean {
  return /^camera2\s+\d+/i.test(label.trim());
}

function deduplicateByLabel(devices: CameraDevice[]): CameraDevice[] {
  const seen = new Set<string>();
  return devices.filter((device) => {
    const key = device.label.toLowerCase().trim();
    if (!key) return true; // no label yet (pre-permission) — keep all
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toRearCameraDevices(cameraDevices: CameraDevice[]): CameraDevice[] {
  const rearDevices = cameraDevices.filter(
    (device) => !isFrontCamera(device.label),
  );

  const hasLabels = rearDevices.some((d) => d.label.length > 0);
  if (!hasLabels) {
    // Pre-permission: labels are empty, cannot filter meaningfully.
    return rearDevices;
  }

  const filtered = deduplicateByLabel(
    rearDevices.filter(
      (device) =>
        !isLogicalMultiLensCamera(device.label) &&
        !isRawSystemCamera(device.label),
    ),
  );

  return filtered.length > 0 ? filtered : deduplicateByLabel(rearDevices);
}

function buildLensLabelByIndex(index: number, total: number): string {
  if (total >= 3) {
    const labels = ["0.5x", "1x", "2x", "3x", "5x", "10x"];
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

  return sourceDevices.map((cameraDevice, index) => ({
    id: cameraDevice.id,
    label: buildLensLabelByIndex(index, sourceDevices.length),
  }));
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
