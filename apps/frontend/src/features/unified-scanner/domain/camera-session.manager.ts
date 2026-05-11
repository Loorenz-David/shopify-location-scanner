import { loadQrReaderFactory } from "./zxing-loader.domain";
import {
  getScannerGuideRect,
  SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
} from "./scanner-guide.domain";

export const CAMERA_IDLE_RELEASE_MS = 90_000;

const SCAN_LOOP_DELAY_MS = 90;
const SCAN_SUCCESS_BACKOFF_MS = 650;
const MAX_DECODE_CANVAS_EDGE_PX = 960;

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

interface SourceRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
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

function waitForNextFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForContainerToSettle(
  container: HTMLElement,
  isCancelled: () => boolean,
): Promise<void> {
  const startedAt = performance.now();
  let stableFrameCount = 0;

  while (!isCancelled()) {
    const rect = container.getBoundingClientRect();
    const hasSize = rect.width > 0 && rect.height > 0;
    const isInViewport =
      rect.right > 0 &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.top < window.innerHeight;
    const isHorizontallySettled = Math.abs(rect.left) <= 1;

    if (hasSize && isInViewport && isHorizontallySettled) {
      stableFrameCount += 1;
      if (stableFrameCount >= 2) {
        return;
      }
    } else {
      stableFrameCount = 0;
    }

    if (performance.now() - startedAt > 700) {
      return;
    }

    await waitForNextFrame();
  }
}

function ensureVideoElement(container: HTMLElement): HTMLVideoElement {
  let video = container.querySelector("video");
  if (!(video instanceof HTMLVideoElement)) {
    video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    video.playsInline = true;
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    container.appendChild(video);
  }

  video.style.setProperty("width", "100%", "important");
  video.style.setProperty("height", "100%", "important");
  video.style.setProperty("object-fit", "cover", "important");
  video.style.setProperty("position", "absolute", "important");
  video.style.setProperty("inset", "0", "important");
  video.style.setProperty("z-index", "0", "important");
  video.style.setProperty("background", "#020617", "important");
  video.style.setProperty("transform", "translateZ(0)", "important");
  video.style.setProperty("will-change", "transform", "important");

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
    frameRate: { ideal: 30, max: 30 },
  };

  if (resolvedDeviceId) {
    video.deviceId = { exact: resolvedDeviceId };
  } else {
    video.facingMode = "environment";
  }

  return { video, audio: false };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function optimizeVideoTrackForQr(stream: MediaStream): Promise<void> {
  const [videoTrack] = stream.getVideoTracks();
  if (!videoTrack || typeof videoTrack.applyConstraints !== "function") {
    return;
  }

  const capabilities =
    typeof videoTrack.getCapabilities === "function"
      ? (videoTrack.getCapabilities() as {
          focusMode?: string[];
        })
      : null;

  if (!capabilities?.focusMode?.includes("continuous")) {
    return;
  }

  try {
    await videoTrack.applyConstraints({
      advanced: [
        {
          focusMode: "continuous",
        } as unknown as MediaTrackConstraintSet,
      ],
    });
  } catch {
    // Continuous focus is a best-effort mobile camera hint.
  }
}

function mapCssRectToVideoSourceRect(
  video: HTMLVideoElement,
  container: HTMLElement,
  cssRect: { left: number; top: number; right: number; bottom: number },
): SourceRect | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const containerRect = container.getBoundingClientRect();

  if (vw <= 0 || vh <= 0 || containerRect.width <= 0 || containerRect.height <= 0) {
    return null;
  }

  const scale = Math.max(containerRect.width / vw, containerRect.height / vh);
  const displayedWidth = vw * scale;
  const displayedHeight = vh * scale;
  const offsetX = (displayedWidth - containerRect.width) / 2;
  const offsetY = (displayedHeight - containerRect.height) / 2;

  const sx = clamp((cssRect.left + offsetX) / scale, 0, vw);
  const sy = clamp((cssRect.top + offsetY) / scale, 0, vh);
  const right = clamp((cssRect.right + offsetX) / scale, 0, vw);
  const bottom = clamp((cssRect.bottom + offsetY) / scale, 0, vh);

  const sw = right - sx;
  const sh = bottom - sy;

  if (sw < 32 || sh < 32) {
    return null;
  }

  return { sx, sy, sw, sh };
}

function getCenteredSourceRect(video: HTMLVideoElement, ratio: number): SourceRect {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const side = Math.floor(Math.min(vw, vh) * ratio);

  return {
    sx: Math.floor((vw - side) / 2),
    sy: Math.floor((vh - side) / 2),
    sw: side,
    sh: side,
  };
}

function buildScanRegions(
  video: HTMLVideoElement,
  container: HTMLElement,
  scanCount: number,
): SourceRect[] {
  const containerRect = container.getBoundingClientRect();
  const guideRect = getScannerGuideRect({
    viewportWidth: containerRect.width,
    viewportHeight: containerRect.height,
    paddingPx: SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX + 28,
  });
  const guideSourceRect = mapCssRectToVideoSourceRect(
    video,
    container,
    guideRect,
  );

  const regions: SourceRect[] = [];
  if (guideSourceRect) {
    regions.push(guideSourceRect);
  } else {
    regions.push(getCenteredSourceRect(video, 0.72));
  }

  if (scanCount % 2 === 0) {
    regions.push(getCenteredSourceRect(video, 0.82));
  }

  if (scanCount % 4 === 0) {
    regions.push({
      sx: 0,
      sy: 0,
      sw: video.videoWidth,
      sh: video.videoHeight,
    });
  }

  return regions;
}

function drawSourceRectToCanvas(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  sourceRect: SourceRect,
): void {
  const targetScale = Math.min(
    1,
    MAX_DECODE_CANVAS_EDGE_PX / Math.max(sourceRect.sw, sourceRect.sh),
  );
  const targetWidth = Math.max(1, Math.round(sourceRect.sw * targetScale));
  const targetHeight = Math.max(1, Math.round(sourceRect.sh * targetScale));

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(
    video,
    Math.round(sourceRect.sx),
    Math.round(sourceRect.sy),
    Math.round(sourceRect.sw),
    Math.round(sourceRect.sh),
    0,
    0,
    targetWidth,
    targetHeight,
  );
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

      await waitForContainerToSettle(container, () => cancelled);
      if (cancelled) return;

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
        void optimizeVideoTrackForQr(prewarmStream);
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
        void optimizeVideoTrackForQr(stream);
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
      await waitForNextFrame();
      await waitForNextFrame();
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
      // Each iteration first scans the same area shown by the visual guide.
      // Wider regions are tried periodically so slightly off-center, moving,
      // or too-close QR codes are still caught without making every frame
      // expensive.

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      let loopActive = true;
      let scanCount = 0;

      const scanLoop = (): void => {
        if (cancelled || !loopActive) return;

        if (ctx && video.readyState >= 2 && video.videoWidth > 0) {
          scanCount += 1;
          const scanRegions = buildScanRegions(video, container, scanCount);

          for (const scanRegion of scanRegions) {
            drawSourceRectToCanvas(video, canvas, ctx, scanRegion);

            try {
              const result = reader.decodeFromCanvas(canvas);
              if (!cancelled && result) {
                onDecode(result.getText());
                // Back off after a successful read — the flow-level dedup
                // (lastScanRef) handles duplicates, but this avoids hammering
                // the decoder on a static frame.
                setTimeout(scanLoop, SCAN_SUCCESS_BACKOFF_MS);
                return;
              }
            } catch {
              // NotFoundException is the normal "nothing found" path.
            }
          }
        }

        setTimeout(scanLoop, SCAN_LOOP_DELAY_MS);
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
