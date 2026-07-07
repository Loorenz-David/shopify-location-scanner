# Scanner Core Extraction Plan

## Goal

Extract the pure QR-scanning engine from `src/features/unified-scanner/` into a
standalone folder at `apps/frontend/scanner-core/`. The result is a
framework-agnostic React + TypeScript package that any app can copy and wire up
with its own `onDecode` callback. No Shopify, no store, no API calls.

---

## Output folder structure

```
apps/frontend/scanner-core/
├── types.ts                        ← portable types only (ScannerLens, ScannerFrozenFrame)
├── domain/
│   ├── zxing-loader.ts             ← ZXing dynamic import + QrReader factory
│   ├── camera-session.manager.ts   ← camera lifecycle, prewarm, decode loop (generalized)
│   ├── scanner-guide.ts            ← guide-box geometry (pure math)
│   └── scanner-camera-lens.ts      ← back-camera selection + localStorage preference
├── flows/
│   ├── use-camera-prewarm.ts       ← React hook: prewarm a session
│   ├── use-camera-app-lifecycle.ts ← React hook: suspend/resume on visibility change
│   └── use-qr-scanner.ts           ← NEW thin hook: attaches decode session, exposes
│                                      isCameraReady / cameraError / restart
├── ui/
│   ├── ScannerGuideOverlay.tsx     ← corner-frame overlay (framer-motion)
│   └── FrozenFrameCanvas.tsx       ← frozen-frame img display
└── index.ts                        ← barrel: re-exports everything public
```

---

## Step 1 — Create `scanner-core/types.ts`

Copy only the two types that are used inside the scanner engine itself.
Do **not** import from `unified-scanner.types` — define them inline.

```ts
// scanner-core/types.ts

export interface ScannerLens {
  id: string;
  label: string;
}

export interface ScannerFrozenFrame {
  dataUrl: string;
  width: number;
  height: number;
}
```

---

## Step 2 — Create `scanner-core/domain/zxing-loader.ts`

**Source:** `src/features/unified-scanner/domain/zxing-loader.domain.ts`

Copy the file verbatim. No changes needed — it has zero app dependencies.

---

## Step 3 — Create `scanner-core/domain/scanner-guide.ts`

**Source:** `src/features/unified-scanner/domain/scanner-guide.domain.ts`

Copy the file verbatim. No changes needed — it is pure math with no imports.

---

## Step 4 — Create `scanner-core/domain/scanner-camera-lens.ts`

**Source:** `src/features/unified-scanner/domain/scanner-camera-lens.domain.ts`

Two changes required:

1. Replace the import of `ScannerLens` from the app types file with an import
   from the local `../types` module:

   ```ts
   // REMOVE this line:
   import type { ScannerLens } from "../types/unified-scanner.types";

   // ADD this line:
   import type { ScannerLens } from "../types";
   ```

2. Everything else copies verbatim.

---

## Step 5 — Create `scanner-core/domain/camera-session.manager.ts`

**Source:** `src/features/unified-scanner/domain/camera-session.manager.ts`

This file needs the most changes. The hardcoded session IDs must be made
generic so any app can define its own session name(s).

### 5a — Make `CameraSessionId` a plain `string` type

```ts
// REMOVE:
export type CameraSessionId = "logistic-placement" | "unified-scanner";

// ADD:
export type CameraSessionId = string;
```

### 5b — Replace the static `CAMERA_REGION_IDS` export with a pure function

The old code exported a fixed Record that was keyed on the two hardcoded IDs.
Replace it with a deterministic function that works for any session name:

```ts
// REMOVE:
export const CAMERA_REGION_IDS: Record<CameraSessionId, string> = {
  "logistic-placement": "logistic-placement-qr-reader",
  "unified-scanner": "unified-scanner-qr-reader",
};

// ADD:
export function getCameraRegionId(sessionId: string): string {
  return `${sessionId}-qr-reader`;
}
```

Update the two internal usages of `CAMERA_REGION_IDS`:

```ts
// CHANGE getContainerElement from:
function getContainerElement(id: CameraSessionId): HTMLElement | null {
  return document.getElementById(CAMERA_REGION_IDS[id]);
}

// TO:
function getContainerElement(id: CameraSessionId): HTMLElement | null {
  return document.getElementById(getCameraRegionId(id));
}
```

```ts
// CHANGE getPrewarmHostId from:
function getPrewarmHostId(id: CameraSessionId): string {
  return `${CAMERA_REGION_IDS[id]}-prewarm-host`;
}

// TO:
function getPrewarmHostId(id: CameraSessionId): string {
  return `${getCameraRegionId(id)}-prewarm-host`;
}
```

### 5c — Replace the static session registry with a dynamic one

The old code had a fixed `sessions` object and `SESSION_IDS` array keyed on
the two hardcoded IDs. Replace with a `Map` that creates sessions on demand:

```ts
// REMOVE these two declarations entirely:
const SESSION_IDS: CameraSessionId[] = ["logistic-placement", "unified-scanner"];
const sessions: Record<CameraSessionId, CameraSession> = {
  "logistic-placement": makeSession("logistic-placement"),
  "unified-scanner": makeSession("unified-scanner"),
};

// ADD:
const sessions = new Map<string, CameraSession>();

function getSession(id: CameraSessionId): CameraSession {
  let session = sessions.get(id);
  if (!session) {
    session = makeSession(id);
    sessions.set(id, session);
  }
  return session;
}
```

### 5d — Update all direct `sessions[id]` accesses to use `getSession(id)`

There are multiple places in the file that do `const session = sessions[id]`.
Replace every one of them with `const session = getSession(id)`.

Specifically these functions:
- `prewarmCameraSession` — `const session = sessions[id];` → `const session = getSession(id);`
- `attachDecodeSession` — `const session = sessions[id];` → `const session = getSession(id);`

### 5e — Update loop functions to iterate over the live Map

Three functions iterate over all sessions:
`releaseOtherCameraSessions`, `releaseAllCameraSessions`,
`suspendAllCameraSessions`, `resumePrewarmedCameraSessions`.

Replace every `for (const id of SESSION_IDS)` loop with
`for (const [id, session] of sessions)` and remove the inner
`const session = sessions[id]` lookup since the session is already destructured.

Example for `releaseAllCameraSessions`:

```ts
// BEFORE:
export function releaseAllCameraSessions(): void {
  for (const id of SESSION_IDS) {
    const session = sessions[id];
    // ...
  }
}

// AFTER:
export function releaseAllCameraSessions(): void {
  for (const [, session] of sessions) {
    // ...
  }
}
```

Apply the same pattern to `suspendAllCameraSessions` and
`resumePrewarmedCameraSessions`.

For `releaseOtherCameraSessions(activeId)` the loop needs the `id` to skip it:

```ts
// BEFORE:
function releaseOtherCameraSessions(activeId: CameraSessionId): void {
  for (const id of SESSION_IDS) {
    if (id === activeId) continue;
    const session = sessions[id];
    // ...
  }
}

// AFTER:
function releaseOtherCameraSessions(activeId: CameraSessionId): void {
  for (const [id, session] of sessions) {
    if (id === activeId) continue;
    // ...
  }
}
```

### 5f — No other changes

Everything else in the file (scan loop, prewarm logic, stream management, ZXing
integration) copies verbatim.

---

## Step 6 — Create `scanner-core/flows/use-camera-prewarm.ts`

**Source:** `src/features/unified-scanner/flows/use-camera-prewarm.ts`

One change: update the import path.

```ts
// CHANGE:
import { CAMERA_IDLE_RELEASE_MS, prewarmCameraSession } from "../domain/camera-session.manager";
import type { CameraSessionId } from "../domain/camera-session.manager";

// TO (same, just verify relative path is correct from flows/ to domain/):
import { CAMERA_IDLE_RELEASE_MS, prewarmCameraSession } from "../domain/camera-session.manager";
import type { CameraSessionId } from "../domain/camera-session.manager";
```

Path is already correct for the new folder structure. Copy verbatim.

---

## Step 7 — Create `scanner-core/flows/use-camera-app-lifecycle.ts`

**Source:** `src/features/unified-scanner/flows/use-camera-app-lifecycle.flow.ts`

One change: update the import path.

```ts
// CHANGE:
import { resumePrewarmedCameraSessions, suspendAllCameraSessions } from "../domain/camera-session.manager";

// TO (same relative path, verify it resolves to scanner-core/domain/):
import { resumePrewarmedCameraSessions, suspendAllCameraSessions } from "../domain/camera-session.manager";
```

Path is already correct. Copy verbatim.

---

## Step 8 — Create `scanner-core/flows/use-qr-scanner.ts` (NEW FILE)

This is the thin integration hook that replaces `use-unified-scanner-camera.flow.ts`
in the app. It is generic — it fires `onDecode(value)` and nothing else.
The consumer provides the callback and mounts a `<div id="{sessionId}-qr-reader">`.

```ts
// scanner-core/flows/use-qr-scanner.ts

import { useCallback, useEffect, useRef, useState } from "react";

import { attachDecodeSession } from "../domain/camera-session.manager";
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
    const regionId = `${sessionId}-qr-reader`;
    const root = document.getElementById(regionId);
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

      const preferred = resolvePreferredLensId(cameras, activeDeviceId ?? null, getRememberedLensId());
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
        if (last && last.value === value && now - last.at < dedupeWindowMs) return;
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
  }, [sessionId, selectedLensId, lensSelectionRevision, dedupeWindowMs, initLenses, restartKey]);

  return { isCameraReady, cameraError, availableLenses, activeLensId, captureFrame, restart };
}
```

---

## Step 9 — Create `scanner-core/ui/ScannerGuideOverlay.tsx`

**Source:** `src/features/unified-scanner/ui/ScannerGuideOverlay.tsx`

One change: update the import path.

```ts
// CHANGE:
import { ... } from "../domain/scanner-guide.domain";

// TO:
import { ... } from "../domain/scanner-guide";
```

Everything else copies verbatim. `framer-motion` is a peer dependency.

---

## Step 10 — Create `scanner-core/ui/FrozenFrameCanvas.tsx`

**Source:** `src/features/unified-scanner/ui/FrozenFrameCanvas.tsx`

Copy verbatim. No imports, no changes needed.

---

## Step 11 — Create `scanner-core/index.ts`

Barrel export for everything the consuming app needs:

```ts
// scanner-core/index.ts

// Types
export type { ScannerLens, ScannerFrozenFrame } from "./types";

// Domain
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

// Flows / hooks
export { useCameraPrewarm, CAMERA_IDLE_RELEASE_MS as PREWARM_IDLE_RELEASE_MS } from "./flows/use-camera-prewarm";
export { useCameraAppLifecycleFlow } from "./flows/use-camera-app-lifecycle";
export { useQrScanner } from "./flows/use-qr-scanner";
export type { UseQrScannerOptions, UseQrScannerResult } from "./flows/use-qr-scanner";

// UI
export { ScannerGuideOverlay } from "./ui/ScannerGuideOverlay";
export { FrozenFrameCanvas } from "./ui/FrozenFrameCanvas";
```

---

## Step 12 — Verify no app imports leak in

After creating all files, grep the `scanner-core/` folder for any import
that references paths outside of `scanner-core/` itself:

```bash
grep -r "from \"\.\." apps/frontend/scanner-core/
```

The only allowed external imports are npm packages:
- `react`
- `framer-motion`
- `@zxing/browser`
- `@zxing/library`

If any path escapes `scanner-core/`, fix it.

---

## How to use in the new app

1. Copy the `scanner-core/` folder into the new app's `src/`.
2. Install peer dependencies: `@zxing/browser @zxing/library framer-motion`.
3. Mount a container div with the id matching the session:
   ```tsx
   // sessionId = "delivery-scanner"  →  id must be "delivery-scanner-qr-reader"
   <div id="delivery-scanner-qr-reader" style={{ position: "relative", width: "100%", height: "100%" }}>
     <ScannerGuideOverlay isFrozen={isFrozen} />
   </div>
   ```
4. Wire the hook:
   ```tsx
   const { isCameraReady, cameraError, captureFrame } = useQrScanner({
     sessionId: "delivery-scanner",
     onDecode: (value) => {
       // your app's business logic here
     },
   });
   ```
5. Optionally add lifecycle handling at the app root:
   ```tsx
   useCameraAppLifecycleFlow(); // suspends camera on tab hide, resumes on show
   ```

---

## Files that do NOT get extracted (stay in this app only)

| File | Reason |
|---|---|
| `flows/use-unified-scanner-camera.flow.ts` | Calls Shopify item/location controllers |
| `actions/unified-scanner.actions.ts` | Shopify store actions |
| `stores/unified-scanner.store.ts` | Shopify store state |
| `context/unified-scanner.context.tsx` | Shopify context |
| `controllers/*.ts` | Shopify API calls |
| `api/*.ts` | Shopify API calls |
| `domain/item-mode.domain.ts` | Shopify business rules |
| `domain/warning-rules.domain.ts` | Shopify business rules |
| `domain/resolve-location.domain.ts` | Shopify business rules |
| `domain/scanner-settings.domain.ts` | Shopify app settings |
| `types/unified-scanner.types.ts` | Shopify-specific types |
| All `ui/Unified*.tsx` pages | Shopify-specific pages |
