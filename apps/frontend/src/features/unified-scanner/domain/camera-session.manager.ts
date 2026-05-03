import { loadQrReaderFactory } from "./zxing-loader.domain";

export const CAMERA_IDLE_RELEASE_MS = 90_000;

export type CameraSessionId = "logistic-placement" | "unified-scanner";

export const CAMERA_REGION_IDS: Record<CameraSessionId, string> = {
  "logistic-placement": "logistic-placement-qr-reader",
  "unified-scanner": "unified-scanner-qr-reader",
};

type SessionPhase = "idle" | "prewarming" | "hot" | "decoding";

interface CameraSession {
  id: CameraSessionId;
  phase: SessionPhase;
  stream: MediaStream | null;
  decodeControls: { stop: () => void } | null;
  prewarmCount: number;
  idleTimerId: number | null;
  startDelayTimerId: number | null;
}

const SESSION_IDS: CameraSessionId[] = ["logistic-placement", "unified-scanner"];

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
  "logistic-placement": makeSession("logistic-placement"),
  "unified-scanner": makeSession("unified-scanner"),
};

function getContainerElement(id: CameraSessionId): HTMLElement | null {
  return document.getElementById(CAMERA_REGION_IDS[id]);
}

function ensureVideoElement(container: HTMLElement): HTMLVideoElement {
  let video = container.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
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

// Shared resolution constraints: 720p is the sweet-spot for QR decoding speed.
// Higher resolutions slow down ZXing; lower ones reduce detection accuracy.
function buildVideoConstraints(
  resolvedDeviceId: string | undefined,
): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
  };

  if (resolvedDeviceId) {
    video.deviceId = { exact: resolvedDeviceId };
  } else {
    video.facingMode = "environment";
  }

  return { video, audio: false };
}

function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  return new Promise<void>((resolve) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }

    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("canplay", finish);
      video.removeEventListener("loadeddata", finish);
      resolve();
    };

    video.addEventListener("canplay", finish);
    video.addEventListener("loadeddata", finish);
    // Safety valve — if events never fire (e.g. some iOS edge cases).
    setTimeout(finish, 3000);
  });
}

function getStreamDeviceId(stream: MediaStream): string | null {
  const tracks = stream.getVideoTracks();
  if (tracks.length === 0) return null;
  return tracks[0].getSettings().deviceId ?? null;
}

function isStreamAlive(stream: MediaStream): boolean {
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks.every((t) => t.readyState === "live");
}

function stopStream(session: CameraSession): void {
  const stream = session.stream;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    session.stream = null;
  }

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

async function selectBackCamera(): Promise<string | undefined> {
  try {
    const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
      (device: MediaDeviceInfo) => device.kind === "videoinput",
    );
    const backCamera =
      devices.find((device: MediaDeviceInfo) =>
        /back|rear|environment/i.test(device.label),
      ) ?? devices[0];
    return backCamera?.deviceId;
  } catch {
    return undefined;
  }
}

async function startPrewarmStream(session: CameraSession): Promise<void> {
  session.phase = "prewarming";

  try {
    const deviceId = await selectBackCamera();
    const stream = await navigator.mediaDevices.getUserMedia(
      buildVideoConstraints(deviceId),
    );

    if (session.prewarmCount === 0) {
      stream.getTracks().forEach((track) => track.stop());
      session.phase = "idle";
      return;
    }

    session.stream = stream;
    session.phase = "hot";
    scheduleIdleRelease(session);
  } catch {
    session.phase = "idle";
  }
}

export function prewarmCameraSession(
  id: CameraSessionId,
  delayMs = 0,
): () => void {
  const session = sessions[id];
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
  };
}

export function attachDecodeSession(
  id: CameraSessionId,
  onDecode: (value: string) => void,
  onReady: (ready: boolean, error?: string) => void,
  deviceId?: string,
): () => void {
  const session = sessions[id];

  let cancelled = false;

  cancelIdleTimer(session);
  const previousPhase = session.phase;
  session.phase = "decoding";

  async function start(): Promise<void> {
    try {
      const container = getContainerElement(id);
      if (!container || cancelled) return;

      // Load ZXing configured for QR-only decoding. All hint/format setup is
      // encapsulated in the factory so this file stays free of ZXing internals.
      const createReader = await loadQrReaderFactory();
      if (cancelled) return;

      const reader = createReader();

      const video = ensureVideoElement(container);

      // ── Acquire stream ───────────────────────────────────────────────────
      const prewarmStream = session.stream;
      const streamAlive =
        prewarmStream !== null && isStreamAlive(prewarmStream);
      const prewarmDeviceId = streamAlive
        ? getStreamDeviceId(prewarmStream)
        : null;
      const canReuseStream =
        streamAlive && (!deviceId || prewarmDeviceId === deviceId);

      let reusingStream: boolean;

      if (canReuseStream && prewarmStream) {
        reusingStream = true;
        video.srcObject = prewarmStream;
      } else {
        reusingStream = false;

        if (prewarmStream) {
          // Dead stream or wrong device — release before opening a new one.
          stopStream(session);
        }

        const resolvedDeviceId = deviceId ?? (await selectBackCamera());
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia(
          buildVideoConstraints(resolvedDeviceId),
        );

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        session.stream = stream;
        video.srcObject = stream;
      }

      // Explicit play() for iOS Safari (belt-and-suspenders with autoplay attr).
      try {
        await video.play();
      } catch {
        // play() rejection is non-fatal; autoplay attribute handles it.
      }
      if (cancelled) return;

      // Wait until the video has an actual frame before attempting any decode.
      await waitForVideoReady(video);
      if (cancelled) return;

      // Brief autofocus stabilisation delay.
      // Fresh streams need slightly longer than reused ones.
      await new Promise<void>((r) => setTimeout(r, reusingStream ? 100 : 150));
      if (cancelled) return;

      // ── Throttled QR decode loop ─────────────────────────────────────────
      // Rather than ZXing's built-in continuous loop, we drive a manual
      // setTimeout cycle. This keeps CPU load bounded and avoids decode
      // pile-up on slow devices.
      //
      // Each iteration crops the centre 60 % of the frame to a canvas and
      // passes it to decodeFromCanvas (synchronous). Cropping reduces pixel
      // count and eliminates background noise near the edges.

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      let loopActive = true;

      const scanLoop = (): void => {
        if (cancelled || !loopActive) return;

        if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          const side = Math.floor(Math.min(vw, vh) * 0.6);
          const sx = Math.floor((vw - side) / 2);
          const sy = Math.floor((vh - side) / 2);

          canvas.width = side;
          canvas.height = side;
          ctx.drawImage(video, sx, sy, side, side, 0, 0, side, side);

          try {
            const result = reader.decodeFromCanvas(canvas);
            if (!cancelled && result) {
              onDecode(result.getText());
              // Back off after a successful read — the flow-level dedup
              // (lastScanRef) handles duplicates, but this avoids hammering
              // the decoder on a static frame.
              setTimeout(scanLoop, 800);
              return;
            }
          } catch {
            // NotFoundException is the normal "nothing found" path — ignore.
          }
        }

        setTimeout(scanLoop, 120);
      };

      session.decodeControls = {
        stop: () => {
          loopActive = false;
        },
      };

      onReady(true);
      scanLoop();
    } catch (error) {
      if (!cancelled) {
        const message =
          error instanceof Error
            ? error.message
            : "Camera access denied or unavailable.";
        onReady(false, message);
        session.phase = previousPhase;
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
    scheduleIdleRelease(session);
  };
}

export function releaseAllCameraSessions(): void {
  for (const id of SESSION_IDS) {
    const session = sessions[id];
    cancelIdleTimer(session);
    cancelStartDelay(session);

    try {
      session.decodeControls?.stop();
    } catch {
      // Ignore teardown races.
    }

    session.decodeControls = null;
    stopStream(session);
    session.phase = "idle";
    session.prewarmCount = 0;
  }
}
