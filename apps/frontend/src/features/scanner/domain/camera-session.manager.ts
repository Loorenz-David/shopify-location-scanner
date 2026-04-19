/**
 * camera-session.manager.ts
 *
 * Centralised, singleton camera lifecycle for all scanner surfaces.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │  STATE MACHINE PER SESSION                                       │
 * │                                                                  │
 * │  idle ──prewarm()──► prewarming ──streamReady()──► hot           │
 * │   ▲                      │                         │             │
 * │   │                      │ no consumers            │ no consumers │
 * │   └──idle timer──────────┘─────────────────────────┘             │
 * │                                                                  │
 * │  hot ──attachDecoder()──► decoding                               │
 * │  decoding ──detachDecoder()──► hot                               │
 * └──────────────────────────────────────────────────────────────────┘
 *
 *  PREWARM  – stream is live, no ZXing decode loop (zero CPU).
 *  DECODING – full ZXing decode loop running (scanner page open).
 *
 * Callers:
 *  - Feature-page flows (e.g. LogisticTasksPage, ItemScanHistoryPage) call
 *    `prewarmSession` on mount → camera warms up before the user taps scan.
 *  - Scanner flows call `attachDecodeSession` when the scanner page opens and
 *    `detachDecodeSession` when it closes.
 *  - Nobody calls anything else; all teardown is internal.
 */

import { loadBrowserMultiFormatReader } from "./zxing-loader.domain";

// ─── Tunables ────────────────────────────────────────────────────────────────

/**
 * How long (ms) to keep the camera stream alive after the last prewarm
 * consumer unmounts and no decode session is active.
 * Applies independently to each session.
 */
export const CAMERA_IDLE_RELEASE_MS = 90_000; // 10 sec

// ─── Types ───────────────────────────────────────────────────────────────────

export type CameraSessionId = "main-scanner" | "logistic-placement";

/** The container element ID in the DOM for each session. */
export const CAMERA_REGION_IDS: Record<CameraSessionId, string> = {
  "main-scanner": "scanner-qr-reader",
  "logistic-placement": "logistic-placement-qr-reader",
};

type SessionPhase = "idle" | "prewarming" | "hot" | "decoding";

interface CameraSession {
  id: CameraSessionId;
  phase: SessionPhase;
  stream: MediaStream | null;
  /** ZXing controls object (only present while decoding). */
  decodeControls: { stop: () => void } | null;
  /** Number of active prewarm consumers (page-level hooks). */
  prewarmCount: number;
  /** setTimeout ID for the idle-release timer. */
  idleTimerId: number | null;
  /** setTimeout ID for the camera start delay after animation. */
  startDelayTimerId: number | null;
}

// ─── Session registry ────────────────────────────────────────────────────────

const SESSION_IDS: CameraSessionId[] = ["main-scanner", "logistic-placement"];

function makeSession(id: CameraSessionId): CameraSession {
  return {
    id,
    phase: "idle",
    stream: null,
    decodeControls: null,
    prewarmCount: 0,
    idleTimerId: null,
    startDelayTimerId: null,
  };
}

const sessions: Record<CameraSessionId, CameraSession> = {
  "main-scanner": makeSession("main-scanner"),
  "logistic-placement": makeSession("logistic-placement"),
};

// ─── Internals ───────────────────────────────────────────────────────────────

function getContainerElement(id: CameraSessionId): HTMLElement | null {
  return document.getElementById(CAMERA_REGION_IDS[id]);
}

function ensureVideoElement(container: HTMLElement): HTMLVideoElement {
  let video = container.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.autoplay = true;
    container.appendChild(video);
  }

  video.style.setProperty("width", "100%", "important");
  video.style.setProperty("height", "100%", "important");
  video.style.setProperty("object-fit", "cover", "important");
  video.style.setProperty("position", "absolute", "important");
  video.style.setProperty("inset", "0", "important");
  video.style.setProperty("transform", "translateZ(0)", "important");

  return video;
}

function stopStream(session: CameraSession): void {
  const stream = session.stream;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    session.stream = null;
  }

  // Only touch the video element if it is showing OUR stream.
  // The main scanner bypasses attachDecodeSession and manages its own ZXing
  // stream — we must not clear a video element that belongs to it.
  const container = getContainerElement(session.id);
  const video = container?.querySelector("video");
  if (video instanceof HTMLVideoElement && video.srcObject === stream) {
    video.srcObject = null;
    video.remove();
  }
}

function cancelIdleTimer(session: CameraSession): void {
  if (session.idleTimerId !== null) {
    window.clearTimeout(session.idleTimerId);
    session.idleTimerId = null;
  }
}

function cancelStartDelay(session: CameraSession): void {
  if (session.startDelayTimerId !== null) {
    window.clearTimeout(session.startDelayTimerId);
    session.startDelayTimerId = null;
  }
}

/**
 * Schedules stream teardown after CAMERA_IDLE_RELEASE_MS.
 * Fires whenever the stream is hot but no decode session is active.
 * prewarmCount is intentionally NOT checked — the idle timer governs
 * the stream lifetime independently of how many page-level consumers exist.
 */
function scheduleIdleRelease(session: CameraSession): void {
  cancelIdleTimer(session);
  session.idleTimerId = window.setTimeout(() => {
    session.idleTimerId = null;
    if (session.phase === "hot") {
      stopStream(session);
      session.phase = "idle";
    }
  }, CAMERA_IDLE_RELEASE_MS);
}

/**
 * Selects the best available back-facing camera deviceId.
 * Falls back to the first available device.
 */
async function selectBackCamera(): Promise<string | undefined> {
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d: MediaDeviceInfo) => d.kind === "videoinput",
    );
    const back =
      devices.find((d: MediaDeviceInfo) =>
        /back|rear|environment/i.test(d.label),
      ) ?? devices[0];
    return back?.deviceId;
  } catch {
    return undefined;
  }
}

/**
 * Starts a bare getUserMedia stream and stores it on the session.
 * Does NOT require a DOM container — the video element is attached later
 * by attachDecodeSession when the scanner page is actually on-screen.
 * No ZXing decode loop — pure prewarm (zero CPU).
 */
async function startPrewarmStream(session: CameraSession): Promise<void> {
  session.phase = "prewarming";

  try {
    const deviceId = await selectBackCamera();
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "environment" },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

    // Bail if all consumers disappeared while we were awaiting.
    if (session.prewarmCount === 0) {
      stream.getTracks().forEach((t) => t.stop());
      session.phase = "idle";
      return;
    }

    session.stream = stream;
    session.phase = "hot";
    // Start the idle countdown immediately. The timer fires after
    // CAMERA_IDLE_RELEASE_MS unless a decode session cancels it.
    // This ensures the camera releases even while the page stays mounted.
    scheduleIdleRelease(session);
  } catch {
    session.phase = "idle";
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Called by a page-level flow when the page mounts.
 * Starts the camera stream after `delayMs` (default 0) if not already warm.
 * The delay lets you match a slide-in animation so ZXing/getUserMedia begins
 * after the container is on-screen.
 *
 * Returns a cleanup function — call it in useEffect's return.
 */
export function prewarmCameraSession(
  id: CameraSessionId,
  delayMs = 0,
): () => void {
  const session = sessions[id];

  // Do NOT cancel the idle timer here. The idle timer manages the stream
  // lifetime independently — cancelling it on re-mount (e.g. React StrictMode
  // double-invoke) would prevent it from ever firing.
  session.prewarmCount += 1;

  const doStart = (): void => {
    if (session.phase === "idle") {
      void startPrewarmStream(session);
    }
  };

  if (delayMs > 0) {
    cancelStartDelay(session);
    session.startDelayTimerId = window.setTimeout(doStart, delayMs);
  } else {
    doStart();
  }

  return () => {
    session.prewarmCount = Math.max(0, session.prewarmCount - 1);
    // No scheduleIdleRelease here — the idle timer is started when the stream
    // goes hot and restarted after each decode session. It fires on its own.
  };
}

/**
 * Attaches a ZXing decode loop to the warm stream.
 * Called by the scanner flow when the scanner page opens.
 *
 * `onReady(isCameraReady)` is called when the camera is ready (true) or fails.
 * `onDecode(value)` is called for each decoded barcode.
 *
 * Returns a cleanup function — call it in useEffect's return.
 */
export function attachDecodeSession(
  id: CameraSessionId,
  onDecode: (value: string) => void,
  onReady: (ready: boolean, error?: string) => void,
  deviceId?: string,
): () => void {
  const session = sessions[id];

  let cancelled = false;

  cancelIdleTimer(session);
  // Mark decoding immediately so the idle timer won't fire between phases.
  const prevPhase = session.phase;
  session.phase = "decoding";

  async function start(): Promise<void> {
    try {
      const container = getContainerElement(id);
      if (!container || cancelled) return;
      const BrowserMultiFormatReader = await loadBrowserMultiFormatReader();
      const reader = new BrowserMultiFormatReader();

      const video = ensureVideoElement(container);

      let controls: { stop: () => void };

      if (session.stream) {
        // Prewarm stream is already hot.
        // Use decodeFromVideoElement so ZXing attaches a decode loop to the
        // existing stream without calling getUserMedia again.
        // decodeFromVideoElement's stop() only kills the decode loop — it does
        // NOT stop stream tracks — so the stream stays managed by us and is
        // correctly released by stopStream() when the idle timer fires.
        // (Using decodeFromVideoDevice here would let ZXing call getUserMedia,
        // replacing video.srcObject with a new stream and orphaning the prewarm
        // stream — its tracks would never be stopped, keeping the camera on.)
        video.srcObject = session.stream;
        if (cancelled) return;

        // BrowserMultiFormatReader inherits decodeFromVideoElement from
        // BrowserCodeReader at runtime; the extends chain is not visible to
        // TypeScript because BrowserCodeReader is not re-exported by @zxing/browser.
        type ReaderWithElement = {
          decodeFromVideoElement(
            source: HTMLVideoElement,
            callbackFn: (
              result: { getText(): string } | null | undefined,
            ) => void,
          ): Promise<{ stop(): void }>;
        };
        controls = await (
          reader as unknown as ReaderWithElement
        ).decodeFromVideoElement(
          video,
          (result: { getText(): string } | null | undefined) => {
            if (cancelled || !result) return;
            onDecode(result.getText());
          },
        );
      } else {
        // No warm stream — let ZXing acquire one via getUserMedia.
        const resolvedDeviceId = deviceId ?? (await selectBackCamera());
        if (cancelled) return;

        controls = await reader.decodeFromVideoDevice(
          resolvedDeviceId,
          video,
          (result: { getText(): string } | null | undefined) => {
            if (cancelled || !result) return;
            onDecode(result.getText());
          },
        );

        // Cache ZXing's acquired stream so the idle-release timer can stop it.
        if (!cancelled) {
          const srcObject = video.srcObject;
          if (srcObject instanceof MediaStream) {
            session.stream = srcObject;
          }
        }
      }

      if (cancelled) {
        controls.stop();
        return;
      }

      session.decodeControls = controls;
      onReady(true);
    } catch (err) {
      if (!cancelled) {
        const msg =
          err instanceof Error
            ? err.message
            : "Camera access denied or unavailable.";
        onReady(false, msg);
        session.phase = prevPhase;
      }
    }
  }

  void start();

  return () => {
    cancelled = true;
    session.phase = "hot";

    try {
      session.decodeControls?.stop();
    } catch {
      // Ignore teardown races.
    }
    session.decodeControls = null;

    // Always schedule idle release after a decode session ends.
    // The stream should turn off after CAMERA_IDLE_RELEASE_MS regardless
    // of whether the page is still mounted (prewarmCount is irrelevant here).
    scheduleIdleRelease(session);
  };
}

/**
 * Immediately stops all sessions and releases all resources.
 * Useful for logout / app teardown.
 */
export function releaseAllCameraSessions(): void {
  for (const id of SESSION_IDS) {
    const session = sessions[id];
    cancelIdleTimer(session);
    cancelStartDelay(session);
    try {
      session.decodeControls?.stop();
    } catch {
      // ignore
    }
    session.decodeControls = null;
    stopStream(session);
    session.phase = "idle";
    session.prewarmCount = 0;
  }
}
