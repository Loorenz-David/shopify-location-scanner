# Camera Session System

Centralised lifecycle manager for all camera streams in the app.
Rather than letting each scanner surface call `getUserMedia` on demand,
the camera is prewarmed in the background as soon as the user's page mounts.
By the time they open the scanner, the stream is ready and the camera opens instantly.

---

## File Map

| File                                                                                                                         | Role                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [`domain/camera-session.manager.ts`](./domain/camera-session.manager.ts)                                                     | Singleton state machine — owns all stream acquisition and teardown                                      |
| [`flows/use-camera-prewarm.ts`](./flows/use-camera-prewarm.ts)                                                               | Page-level hook — calls `prewarmCameraSession` on mount                                                 |
| [`flows/use-logistic-placement-scanner.flow.ts`](./flows/use-logistic-placement-scanner.flow.ts)                             | Logistic scanner — calls `attachDecodeSession` / `detachDecodeSession`                                  |
| [`flows/use-scanner-zxing.flow.ts`](./flows/use-scanner-zxing.flow.ts)                                                       | Main scanner — manages its own ZXing decode loop (bypasses `attachDecodeSession` for ROI guard support) |
| [`../../item-scan-history/flows/use-item-scan-history.flow.ts`](../../item-scan-history/flows/use-item-scan-history.flow.ts) | Calls `useCameraPrewarm("main-scanner")`                                                                |
| [`../../logistic-tasks/flows/use-logistic-tasks.flow.ts`](../../logistic-tasks/flows/use-logistic-tasks.flow.ts)             | Calls `useCameraPrewarm("logistic-placement")`                                                          |

---

## Named Sessions

There are exactly two sessions, identified by `CameraSessionId`:

| ID                     | Container DOM ID               | Prewarm caller           | Decoder                                  |
| ---------------------- | ------------------------------ | ------------------------ | ---------------------------------------- |
| `"main-scanner"`       | `scanner-qr-reader`            | `useItemScanHistoryFlow` | `use-scanner-zxing.flow.ts`              |
| `"logistic-placement"` | `logistic-placement-qr-reader` | `useLogisticTasksFlow`   | `use-logistic-placement-scanner.flow.ts` |

---

## State Machine

Each session has four phases:

```
idle ──prewarmCameraSession()──► prewarming ──getUserMedia resolves──► hot
 ▲                                                                       │
 └──────────────── idle timer fires (CAMERA_IDLE_RELEASE_MS) ───────────┘

hot ──attachDecodeSession()──► decoding
decoding ──cleanup()──► hot ──idle timer fires──► idle
```

### Phase descriptions

- **`idle`** — No stream. Camera hardware off. Initial state and state after idle release.
- **`prewarming`** — `getUserMedia` in flight. Camera light may appear on device.
- **`hot`** — Stream live, no ZXing decode loop. Zero CPU. Idle timer is running.
- **`decoding`** — Full ZXing decode loop active. Scanner page is on-screen.

---

## Public API

### `prewarmCameraSession(id, delayMs?): () => void`

Called by page-level flows on mount. Increments `prewarmCount` and starts the
stream if not already running. Returns a cleanup function for `useEffect`.

**Important:** Does NOT cancel the idle timer on mount. The idle timer governs
stream lifetime independently of prewarm consumers. Cancelling it on re-mount
(React StrictMode double-invoke) was the root cause of the camera never releasing.

### `attachDecodeSession(id, onDecode, onReady, deviceId?): () => void`

Called by scanner flows when the scanner page opens. Cancels the idle timer,
sets `phase = "decoding"`, and starts the ZXing decode loop.

- If a warm stream exists (`phase = "hot"`): uses `decodeFromVideoElement` so
  ZXing attaches to the existing stream without a new `getUserMedia` call.
  `stop()` kills only the decode loop — the stream stays managed by the manager.
- If no warm stream: falls back to `decodeFromVideoDevice` (cold start) and
  caches the acquired stream into `session.stream`.

Returns a cleanup function. On cleanup: stops decode, sets `phase = "hot"`,
schedules idle release.

### `prewarmCameraSession` cleanup

Decrements `prewarmCount`. Does **not** schedule idle release — the idle timer
is self-managing from the moment the stream goes hot.

### `releaseAllCameraSessions()`

Immediately stops all sessions. Call on logout or full app teardown.

---

## Idle Release

The idle timer (`CAMERA_IDLE_RELEASE_MS`, default `10_000` ms) is started in
two places:

1. Immediately after `phase → hot` in `startPrewarmStream` — so the camera
   shuts down even if the user never opens the scanner.
2. After a decode session ends — so the camera shuts down after the scanner
   is closed.

The timer guard checks `phase === "hot"` only. It fires regardless of how many
prewarm consumers are still mounted.

To change the timeout, edit the constant at the top of
[`domain/camera-session.manager.ts`](./domain/camera-session.manager.ts):

```ts
export const CAMERA_IDLE_RELEASE_MS = 10_000; // ms
```

---

## Main Scanner Exception

`use-scanner-zxing.flow.ts` does **not** use `attachDecodeSession`. It calls
`reader.decodeFromVideoDevice` directly because it needs raw `resultPoints`
from the ZXing result object for the ROI (region-of-interest) guard — the
simplified `onDecode(string)` API in `attachDecodeSession` discards that data.

This means the main scanner acquisitions its own stream via ZXing. `stopStream`
accounts for this: it only clears `video.srcObject` when
`video.srcObject === session.stream`, so it never interferes with a ZXing-owned
video element.

---

## Key Bugs Fixed (for context)

| Bug                               | Root Cause                                                                                                              | Fix                                                                                                                        |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Camera never turned off           | `prewarmCameraSession` called `cancelIdleTimer` on every re-mount; timer guarded by `prewarmCount === 0`                | Idle timer starts on `hot`, not on unmount; guard is `phase === "hot"`; `prewarmCameraSession` no longer touches the timer |
| Orphaned prewarm stream           | `decodeFromVideoDevice` calls `getUserMedia` internally, overwriting `video.srcObject` and orphaning the prewarm stream | Use `decodeFromVideoElement` when stream is warm                                                                           |
| `stopStream` clearing wrong video | `video.srcObject = null` ran unconditionally                                                                            | Guard: only clear if `video.srcObject === session.stream`                                                                  |
