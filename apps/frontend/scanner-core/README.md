# Scanner Core

`scanner-core/` is a portable React + TypeScript QR scanner package extracted
from the app's unified scanner feature.

It contains only camera/scanning concerns:

- camera session lifecycle
- QR decode loop using ZXing
- optional session prewarming
- tab/app visibility suspend-resume handling
- rear-camera lens selection helpers
- guide overlay and frozen-frame UI helpers

It does not contain any app business logic. There are no Shopify stores,
controllers, API calls, or scanner-specific workflows in this folder.

## What This Package Expects

The package is source code, not a published npm package. The intended usage is:

1. Copy `scanner-core/` into another app's `src/` tree.
2. Install peer dependencies:
   - `react`
   - `framer-motion`
   - `@zxing/browser`
   - `@zxing/library`
3. Render a container element whose `id` matches the scanner `sessionId`.
4. Use `useQrScanner()` to attach the camera and decode loop.
5. Provide your own `onDecode(value)` business logic.

## Mental Model

There are three layers:

- `domain/`
  Pure scanner engine pieces and browser/camera integration.
- `flows/`
  React hooks that wire the engine into a component tree.
- `ui/`
  Optional visual helpers for the scanner viewport.

The main hook is `useQrScanner()`. It attaches a decode session to a DOM
container, exposes camera state, and calls your `onDecode` callback whenever a
QR code is read.

## Folder Layout

```text
scanner-core/
├── types.ts
├── domain/
│   ├── zxing-loader.ts
│   ├── camera-session.manager.ts
│   ├── scanner-guide.ts
│   └── scanner-camera-lens.ts
├── flows/
│   ├── use-camera-prewarm.ts
│   ├── use-camera-app-lifecycle.ts
│   └── use-qr-scanner.ts
├── ui/
│   ├── ScannerGuideOverlay.tsx
│   └── FrozenFrameCanvas.tsx
└── index.ts
```

## Quick Start

```tsx
import { useState } from "react";

import {
  getCameraRegionId,
  ScannerGuideOverlay,
  useCameraAppLifecycleFlow,
  useQrScanner,
} from "./scanner-core";

export function DeliveryScannerPage() {
  const sessionId = "delivery-scanner";
  const [lastValue, setLastValue] = useState<string | null>(null);
  const [isFrozen, setIsFrozen] = useState(false);

  useCameraAppLifecycleFlow();

  const { isCameraReady, cameraError, captureFrame, restart } = useQrScanner({
    sessionId,
    onDecode: (value) => {
      setLastValue(value);
      setIsFrozen(true);

      const frame = captureFrame();
      void frame;

      // Put your app-specific logic here.
      // Example:
      // validate barcode
      // fetch item/location
      // show success/error UI
      // optionally restart()
    },
  });

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-3xl bg-slate-950">
      <div
        id={getCameraRegionId(sessionId)}
        className="absolute inset-0"
      />

      <ScannerGuideOverlay isFrozen={isFrozen} />

      {!isCameraReady && !cameraError ? <div>Starting camera...</div> : null}
      {cameraError ? <div>{cameraError}</div> : null}
      {lastValue ? <div>Last scan: {lastValue}</div> : null}

      <button
        type="button"
        onClick={() => {
          setIsFrozen(false);
          restart();
        }}
      >
        Scan again
      </button>
    </div>
  );
}
```

## Required DOM Contract

`useQrScanner()` does not render its own host element. It looks up a DOM node by
session ID:

```ts
getCameraRegionId("delivery-scanner");
// => "delivery-scanner-qr-reader"
```

That means your UI must render a matching container:

```tsx
<div id="delivery-scanner-qr-reader" className="relative h-full w-full" />
```

Important details:

- The container must exist when `useQrScanner()` runs.
- The container should have a real size. A zero-height container will not
  render a usable camera preview.
- The hook appends and manages a `<video>` element inside that container.

## Public API

Everything intended for consumers is re-exported from `index.ts`.

### `useQrScanner(options)`

Primary integration hook.

```ts
useQrScanner({
  sessionId: string,
  onDecode: (value: string) => void,
  selectedLensId?: string | null,
  lensSelectionRevision?: number,
  dedupeWindowMs?: number,
})
```

Returns:

- `isCameraReady`
  `true` once the camera preview is actually rendering.
- `cameraError`
  Human-readable camera startup error, or `null`.
- `availableLenses`
  Rear-camera options derived from `enumerateDevices()`.
- `activeLensId`
  Device ID the session appears to be using.
- `captureFrame()`
  Captures the currently rendered video frame into a `ScannerFrozenFrame`.
- `restart()`
  Forces the hook to detach and reattach the camera/decode session.

Behavior:

- trims decoded text before dispatching it
- deduplicates identical consecutive scans inside `dedupeWindowMs`
- triggers `navigator.vibrate(32)` when supported
- converts common permission-denied errors into a cleaner message

### `useCameraPrewarm(sessionId, delayMs, enabled, deviceId, options)`

Pre-opens a camera session before the decode UI is fully active. This reduces
perceived startup latency when the user is likely to open the scanner soon.

Use it when:

- a scanner page is about to slide in
- a modal scanner is likely to open next
- you want a hidden preview stream kept warm briefly

Notes:

- prewarmed sessions are released after `CAMERA_IDLE_RELEASE_MS` when idle
- only one active camera session is kept alive at a time
- `options.attachPreview: true` mounts a tiny hidden preview host in the DOM

### `useCameraAppLifecycleFlow()`

Suspends camera sessions when the app/tab is hidden and resumes prewarmed
sessions when it becomes visible again.

Mount this once near the app root if your app can background while a scanner is
open or warming.

### `ScannerGuideOverlay`

Pure visual overlay for the guide box. It does not control the camera. The
decode loop uses the same guide geometry internally when prioritizing scan
regions.

### `FrozenFrameCanvas`

Displays a captured frame returned by `captureFrame()`. Use it when your UX
freezes the image briefly after a successful scan.

### Lens Helpers

`scanner-camera-lens.ts` exports:

- `mapCameraDevicesToLenses()`
- `resolvePreferredLensId()`
- `getRememberedLensId()`
- `rememberLensId()`

These are useful if your app exposes a lens picker.

## How Scanning Works Internally

High-level flow:

1. `useQrScanner()` calls `attachDecodeSession()`.
2. `attachDecodeSession()` finds the host container for the session ID.
3. The session manager opens or reuses a camera stream.
4. A managed `<video>` element is attached to the container.
5. ZXing is loaded lazily through `zxing-loader.ts`.
6. A throttled decode loop samples the guide region first, then wider fallback
   regions.
7. When QR text is decoded, your `onDecode(value)` callback fires.

Important internal decisions:

- Camera resolution targets roughly 1280x720 for speed/accuracy balance.
- The loop is manually throttled instead of using ZXing's continuous decoder.
- The guide region is scanned first to keep work focused on the visible target.
- Wider scan regions are attempted periodically to recover from off-center
  codes.
- Only one decode/prewarm session stays active at a time across all session
  IDs.

## Session Model

Sessions are keyed by arbitrary strings:

```ts
const sessionId = "delivery-scanner";
```

The engine creates session state lazily the first time that session ID is used.

This lets multiple apps or multiple scanner entry points use distinct names
without changing the package internals.

Use different session IDs when:

- two scanner surfaces are logically separate
- you need separate DOM hosts
- you want isolated restart/prewarm behavior

Do not try to mount two active decode sessions at the same time. The manager is
designed to release other sessions when a new one becomes active.

## Lens Selection

The lens helper intentionally biases toward back cameras:

- front/selfie/user cameras are filtered out when possible
- logical iOS multi-camera entries like "dual" or "triple" are filtered out
- raw Android Camera2 entries are filtered out
- if multiple rear lenses remain, labels are normalized to `0.5x`, `1x`, `2x`,
  and so on

Selection priority is:

1. explicit `selectedLensId`
2. remembered lens from `localStorage`
3. default rear lens

When 3 or more rear cameras are available, the default is the second one,
usually the standard `1x` lens rather than the ultrawide lens.

If your UI lets the user switch lenses, a common pattern is:

1. store the chosen lens ID in your app state
2. call `rememberLensId(lensId)`
3. increment `lensSelectionRevision`

Incrementing `lensSelectionRevision` forces `useQrScanner()` to reopen the
camera even when the selected lens ID string is otherwise unchanged from the
hook's perspective.

## Prewarm And Visibility Behavior

Prewarming exists to reduce cold-start delay, especially on mobile browsers.

Key points:

- `prewarmCameraSession()` can open a stream before decode starts
- the decode hook reuses that stream when possible
- `useCameraAppLifecycleFlow()` suspends streams on hide/background
- prewarmed sessions are resumed on visibility restore
- idle hot sessions are released after `CAMERA_IDLE_RELEASE_MS`

If your app has routed transitions or overlay animations, prewarm during the
lead-in transition rather than waiting until the scanner page is fully mounted.

## Frozen Frame Pattern

Many scanner flows want to freeze the current frame after a successful scan so
the user sees what was captured while the app validates the decoded value.

Pattern:

1. call `captureFrame()` inside `onDecode`
2. store the returned frame in component state
3. render `FrozenFrameCanvas`
4. hide it again when you restart scanning

Example:

```tsx
const [frozenFrame, setFrozenFrame] = useState<ScannerFrozenFrame | null>(null);

const { captureFrame, restart } = useQrScanner({
  sessionId: "delivery-scanner",
  onDecode: (value) => {
    setFrozenFrame(captureFrame());
    void value;
  },
});

return (
  <div className="relative h-full w-full">
    <div id={getCameraRegionId("delivery-scanner")} className="absolute inset-0" />
    {frozenFrame ? <FrozenFrameCanvas {...frozenFrame} /> : null}
  </div>
);
```

## Styling Expectations

The package does not impose a layout system, but a few assumptions matter:

- the scanner host container should usually be `position: relative`
- the managed video is absolutely positioned to fill the host
- `ScannerGuideOverlay` is also absolutely positioned and expects to sit on top
  of the camera region
- `FrozenFrameCanvas` assumes the same full-bleed layout as the video

## Limitations And Assumptions

- Browser-only. This package uses DOM, media devices, and `localStorage`.
- React-only at the hook layer. The domain code is framework-agnostic, but the
  exported flows are React hooks.
- QR-only. ZXing is configured for QR decoding, not arbitrary barcode formats.
- Single active session. The manager intentionally tears down other sessions
  when a new one starts.
- Mobile-first tuning. Resolution, autofocus timing, and preview behavior are
  optimized for phone cameras.

## Troubleshooting

### Camera permission denied

`cameraError` will contain a normalized permission message. The app should
provide a retry path and, if needed, browser-specific instructions.

### Scanner shows nothing

Check:

- the host `div` exists
- the host `div` has a non-zero height
- the app is running over HTTPS or localhost
- camera permissions were actually granted

### Repeated scans fire too often

Increase `dedupeWindowMs` in `useQrScanner()`.

### User changed camera lens but the preview did not switch

Update `selectedLensId` and increment `lensSelectionRevision`.

### The scanner is slow to start after opening a page

Prewarm the session before the scanner page fully enters:

```tsx
useCameraPrewarm("delivery-scanner", 0, true);
```

## Recommended Integration Pattern

For most apps:

1. Mount `useCameraAppLifecycleFlow()` once near the app root.
2. Use one dedicated `sessionId` per scanner surface.
3. Render the scanner host with `id={getCameraRegionId(sessionId)}`.
4. Use `useQrScanner()` for decode handling.
5. Keep business logic outside this package.
6. If you expose lens switching, persist lens choices with
   `rememberLensId()`.

## For Future Maintainers

If you change this package, preserve these invariants unless you have a strong
reason not to:

- `scanner-core/` must not import app-specific modules
- `index.ts` should remain the only consumer-facing entry point
- session IDs must remain generic strings
- `useQrScanner()` should stay business-logic-free
- QR decode tuning should be validated on real mobile hardware before changing
  aggressively
