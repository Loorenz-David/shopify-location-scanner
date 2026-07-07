import { loadQrReaderFactory } from "./zxing-loader";
import {
  getScannerGuideRect,
  SCANNER_GUIDE_DEFAULT_ROI_PADDING_PX,
} from "./scanner-guide";

export const CAMERA_IDLE_RELEASE_MS = 90_000;

const SCAN_LOOP_DELAY_MS = 90;
const SCAN_SUCCESS_BACKOFF_MS = 650;
const MAX_DECODE_CANVAS_EDGE_PX = 960;
const VIDEO_READY_TIMEOUT_MS = 2200;
const VIDEO_REATTACH_READY_TIMEOUT_MS = 1400;
const VIDEO_REOPEN_READY_TIMEOUT_MS = 2600;
const PREWARM_PREVIEW_READY_TIMEOUT_MS = 1400;

export type CameraSessionId = string;

export function getCameraRegionId(sessionId: string): string {
  return `${sessionId}-qr-reader`;
}

type SessionPhase = "idle" | "prewarming" | "hot" | "decoding";

interface CameraSession {
  id: CameraSessionId;
  phase: SessionPhase;
  stream: MediaStream | null;
  hasRenderableVideo: boolean;
  videoElement: HTMLVideoElement | null;
  prewarmDeviceId: string | undefined;
  prewarmPreviewEnabled: boolean;
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

function makeSession(id: CameraSessionId): CameraSession {
  return {
    id,
    phase: "idle",
    stream: null,
    hasRenderableVideo: false,
    videoElement: null,
    prewarmDeviceId: undefined,
    prewarmPreviewEnabled: false,
    decodeControls: null,
    prewarmCount: 0,
    idleTimerId: null,
    startDelayTimerId: null,
  };
}

const sessions = new Map<string, CameraSession>();

function getSession(id: CameraSessionId): CameraSession {
  let session = sessions.get(id);
  if (!session) {
    session = makeSession(id);
    sessions.set(id, session);
  }
  return session;
}

function getContainerElement(id: CameraSessionId): HTMLElement | null {
  return document.getElementById(getCameraRegionId(id));
}

function getPrewarmHostId(id: CameraSessionId): string {
  return `${getCameraRegionId(id)}-prewarm-host`;
}

function getOrCreatePrewarmHostElement(id: CameraSessionId): HTMLElement {
  const hostId = getPrewarmHostId(id);
  let host = document.getElementById(hostId);
  if (!host) {
    host = document.createElement("div");
    host.id = hostId;
    document.body.appendChild(host);
  }

  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("left", "0", "important");
  host.style.setProperty("top", "0", "important");
  host.style.setProperty("width", "2px", "important");
  host.style.setProperty("height", "2px", "important");
  host.style.setProperty("overflow", "hidden", "important");
  host.style.setProperty("opacity", "0.01", "important");
  host.style.setProperty("pointer-events", "none", "important");
  host.style.setProperty("z-index", "-1", "important");
  host.style.setProperty("transform", "translateZ(0)", "important");

  return host;
}

function removePrewarmHostElement(id: CameraSessionId): void {
  document.getElementById(getPrewarmHostId(id))?.remove();
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

function ensureSessionVideoElement(
  session: CameraSession,
  container: HTMLElement,
): HTMLVideoElement {
  let video =
    session.videoElement instanceof HTMLVideoElement
      ? session.videoElement
      : container.querySelector("video");

  if (!(video instanceof HTMLVideoElement)) {
    video = document.createElement("video");
  }

  if (video.parentElement !== container) {
    container.appendChild(video);
  }

  session.videoElement = video;
  applyMobileVideoAttributes(video);
  applyCameraVideoStyles(video);

  return video;
}

function ensurePrewarmVideoElement(session: CameraSession): HTMLVideoElement {
  return ensureSessionVideoElement(
    session,
    getOrCreatePrewarmHostElement(session.id),
  );
}

function applyMobileVideoAttributes(video: HTMLVideoElement): void {
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.playsInline = true;
  video.muted = true;
  video.defaultMuted = true;
  video.autoplay = true;
}

function applyCameraVideoStyles(video: HTMLVideoElement): void {
  video.style.setProperty("width", "100%", "important");
  video.style.setProperty("height", "100%", "important");
  video.style.setProperty("object-fit", "cover", "important");
  video.style.setProperty("position", "absolute", "important");
  video.style.setProperty("inset", "0", "important");
  video.style.setProperty("z-index", "0", "important");
  video.style.setProperty("background", "#020617", "important");
  video.style.setProperty("transform", "translateZ(0)", "important");
  video.style.setProperty("will-change", "transform", "important");
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

function getStreamDeviceId(stream: MediaStream): string | null {
  const tracks = stream.getVideoTracks();
  if (tracks.length === 0) return null;
  return tracks[0].getSettings().deviceId ?? null;
}

function isStreamAlive(stream: MediaStream): boolean {
  const tracks = stream.getVideoTracks();
  return tracks.length > 0 && tracks.every((t) => t.readyState === "live");
}

function isVideoRenderable(
  video: HTMLVideoElement,
  stream: MediaStream,
): boolean {
  return (
    isStreamAlive(stream) &&
    video.srcObject === stream &&
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

function detachVideoStream(video: HTMLVideoElement): void {
  try {
    video.pause();
  } catch {
    // Some mobile browsers can throw during teardown races.
  }

  video.srcObject = null;

  try {
    video.load();
  } catch {
    // load() is best-effort when srcObject was a MediaStream.
  }
}

async function waitForPaintedVideoFrame(
  video: HTMLVideoElement,
  isCancelled: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  if (typeof video.requestVideoFrameCallback === "function") {
    return new Promise<boolean>((resolve) => {
      let settled = false;
      let callbackId: number | null = null;
      const timeoutId = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(false);
      }, timeoutMs);

      callbackId = video.requestVideoFrameCallback(() => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(!isCancelled());
      });

      if (isCancelled()) {
        settled = true;
        window.clearTimeout(timeoutId);
        if (
          callbackId !== null &&
          typeof video.cancelVideoFrameCallback === "function"
        ) {
          video.cancelVideoFrameCallback(callbackId);
        }
        resolve(false);
      }
    });
  }

  await waitForNextFrame();
  await waitForNextFrame();
  return !isCancelled();
}

async function waitForRenderableVideo(
  video: HTMLVideoElement,
  stream: MediaStream,
  isCancelled: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  const startedAt = performance.now();

  while (!isCancelled()) {
    if (isVideoRenderable(video, stream)) {
      const remainingMs = Math.max(250, timeoutMs - (performance.now() - startedAt));
      const gotPaintedFrame = await waitForPaintedVideoFrame(
        video,
        isCancelled,
        Math.min(remainingMs, 900),
      );

      if (gotPaintedFrame && isVideoRenderable(video, stream)) {
        return true;
      }
    }

    if (performance.now() - startedAt >= timeoutMs) {
      return false;
    }

    await waitForNextFrame();
  }

  return false;
}

async function prepareVideoForStream(
  video: HTMLVideoElement,
  stream: MediaStream,
  isCancelled: () => boolean,
  timeoutMs: number,
): Promise<boolean> {
  applyMobileVideoAttributes(video);
  applyCameraVideoStyles(video);

  if (video.srcObject !== stream) {
    detachVideoStream(video);
    await waitForNextFrame();
    if (isCancelled()) return false;
    video.srcObject = stream;
  }

  try {
    await video.play();
  } catch {
    // Render readiness below is the authoritative success/failure signal.
  }

  if (isCancelled()) {
    return false;
  }

  return waitForRenderableVideo(video, stream, isCancelled, timeoutMs);
}

function stopStream(
  session: CameraSession,
  options: { removeVideo?: boolean } = {},
): void {
  const removeVideo = options.removeVideo ?? true;
  const stream = session.stream;
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    session.stream = null;
    session.hasRenderableVideo = false;
  }

  const container = getContainerElement(session.id);
  const video = session.videoElement ?? container?.querySelector("video");
  if (video instanceof HTMLVideoElement && video.srcObject === stream) {
    detachVideoStream(video);
    if (removeVideo) {
      video.remove();
      if (session.videoElement === video) {
        session.videoElement = null;
      }
    }
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

function releaseOtherCameraSessions(activeId: CameraSessionId): void {
  for (const [id, session] of sessions) {
    if (id === activeId) {
      continue;
    }
    cancelIdleTimer(session);
    cancelStartDelay(session);

    try {
      session.decodeControls?.stop();
    } catch {
      // Ignore teardown races.
    }

    session.decodeControls = null;
    stopStream(session, { removeVideo: false });
    session.phase = "idle";
  }
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

async function openCameraStream(
  resolvedDeviceId: string | undefined,
): Promise<{ stream: MediaStream; resolvedDeviceId: string | undefined }> {
  try {
    return {
      stream: await navigator.mediaDevices.getUserMedia(
        buildVideoConstraints(resolvedDeviceId),
      ),
      resolvedDeviceId,
    };
  } catch (error) {
    if (!resolvedDeviceId) {
      throw error;
    }

    const fallbackDeviceId = await selectBackCamera();
    if (fallbackDeviceId && fallbackDeviceId !== resolvedDeviceId) {
      return {
        stream: await navigator.mediaDevices.getUserMedia(
          buildVideoConstraints(fallbackDeviceId),
        ),
        resolvedDeviceId: fallbackDeviceId,
      };
    }

    return {
      stream: await navigator.mediaDevices.getUserMedia(
        buildVideoConstraints(undefined),
      ),
      resolvedDeviceId: undefined,
    };
  }
}

async function attachPrewarmPreview(session: CameraSession): Promise<void> {
  if (!session.prewarmPreviewEnabled || !session.stream) {
    return;
  }

  if (!isStreamAlive(session.stream)) {
    session.hasRenderableVideo = false;
    return;
  }

  const video = ensurePrewarmVideoElement(session);
  session.hasRenderableVideo = await prepareVideoForStream(
    video,
    session.stream,
    () => session.prewarmCount === 0,
    PREWARM_PREVIEW_READY_TIMEOUT_MS,
  );
}

async function startPrewarmStream(session: CameraSession): Promise<void> {
  if (session.prewarmCount === 0) {
    session.phase = "idle";
    return;
  }

  releaseOtherCameraSessions(session.id);
  session.phase = "prewarming";

  try {
    const deviceId = session.prewarmDeviceId ?? (await selectBackCamera());
    const { stream } = await openCameraStream(deviceId);

    if (session.prewarmCount === 0) {
      stream.getTracks().forEach((track) => track.stop());
      session.phase = "idle";
      return;
    }

    session.stream = stream;
    session.hasRenderableVideo = false;

    await attachPrewarmPreview(session);

    session.phase = "hot";
    scheduleIdleRelease(session);
  } catch {
    stopStream(session, { removeVideo: false });
    session.phase = "idle";
  }
}

export function prewarmCameraSession(
  id: CameraSessionId,
  delayMs = 0,
  deviceId?: string,
  options: { attachPreview?: boolean } = {},
): () => void {
  const session = getSession(id);
  session.prewarmCount += 1;
  session.prewarmDeviceId = deviceId;
  session.prewarmPreviewEnabled =
    session.prewarmPreviewEnabled || options.attachPreview === true;

  const doStart = (): void => {
    if (session.phase === "idle") {
      void startPrewarmStream(session);
      return;
    }

    if (session.phase === "hot") {
      void attachPrewarmPreview(session);
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
    if (session.prewarmCount === 0) {
      session.prewarmDeviceId = undefined;
      session.prewarmPreviewEnabled = false;
    }
  };
}

export function attachDecodeSession(
  id: CameraSessionId,
  onDecode: (value: string) => void,
  onReady: (ready: boolean, error?: string, activeDeviceId?: string | null) => void,
  deviceId?: string,
  options: { forceDeviceId?: boolean } = {},
): () => void {
  const session = getSession(id);

  let cancelled = false;

  cancelIdleTimer(session);
  const previousPhase = session.phase;
  session.phase = "decoding";

  async function start(): Promise<void> {
    try {
      releaseOtherCameraSessions(id);

      const container = getContainerElement(id);
      if (!container || cancelled) return;

      await waitForContainerToSettle(container, () => cancelled);
      if (cancelled) return;

      // Load ZXing configured for QR-only decoding. All hint/format setup is
      // encapsulated in the factory so this file stays free of ZXing internals.
      const createReader = await loadQrReaderFactory();
      if (cancelled) return;

      const reader = createReader();

      const video = ensureSessionVideoElement(session, container);

      // ── Acquire stream ───────────────────────────────────────────────────
      const prewarmStream = session.stream;
      const streamAlive =
        prewarmStream !== null && isStreamAlive(prewarmStream);
      const prewarmDeviceId = streamAlive
        ? getStreamDeviceId(prewarmStream)
        : null;
      const canReuseStream =
        streamAlive &&
        (!options.forceDeviceId || !deviceId || prewarmDeviceId === deviceId);

      let reusingStream: boolean;
      let activeStream: MediaStream;
      let resolvedDeviceId = deviceId ?? prewarmDeviceId ?? undefined;

      if (canReuseStream && prewarmStream) {
        reusingStream = true;
        activeStream = prewarmStream;
        void optimizeVideoTrackForQr(activeStream);
      } else {
        reusingStream = false;

        if (prewarmStream) {
          // Dead stream or wrong device — release before opening a new one.
          stopStream(session);
        }

        resolvedDeviceId = deviceId ?? (await selectBackCamera());
        if (cancelled) return;

        const openedCamera = await openCameraStream(resolvedDeviceId);
        activeStream = openedCamera.stream;
        resolvedDeviceId = openedCamera.resolvedDeviceId;

        if (cancelled) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }

        session.stream = activeStream;
        void optimizeVideoTrackForQr(activeStream);
      }

      let videoReady = await prepareVideoForStream(
        video,
        activeStream,
        () => cancelled,
        VIDEO_READY_TIMEOUT_MS,
      );
      if (cancelled) return;

      if (!videoReady) {
        detachVideoStream(video);
        await waitForNextFrame();
        if (cancelled) return;

        videoReady = await prepareVideoForStream(
          video,
          activeStream,
          () => cancelled,
          VIDEO_REATTACH_READY_TIMEOUT_MS,
        );
      }
      if (cancelled) return;

      if (!videoReady) {
        activeStream.getTracks().forEach((track) => track.stop());
        if (session.stream === activeStream) {
          session.stream = null;
          session.hasRenderableVideo = false;
        }

        detachVideoStream(video);
        resolvedDeviceId = resolvedDeviceId ?? (await selectBackCamera());
        if (cancelled) return;

        const openedCamera = await openCameraStream(resolvedDeviceId);
        activeStream = openedCamera.stream;
        resolvedDeviceId = openedCamera.resolvedDeviceId;

        if (cancelled) {
          activeStream.getTracks().forEach((t) => t.stop());
          return;
        }

        reusingStream = false;
        session.stream = activeStream;
        void optimizeVideoTrackForQr(activeStream);
        videoReady = await prepareVideoForStream(
          video,
          activeStream,
          () => cancelled,
          VIDEO_REOPEN_READY_TIMEOUT_MS,
        );
      }

      if (!videoReady) {
        throw new Error("Camera preview did not render. Please reopen the scanner.");
      }

      session.hasRenderableVideo = true;
      const activeDeviceId = getStreamDeviceId(activeStream);

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
      let scanTimerId: number | null = null;

      const scheduleScanLoop = (delayMs: number): void => {
        if (scanTimerId !== null) {
          window.clearTimeout(scanTimerId);
        }

        scanTimerId = window.setTimeout(scanLoop, delayMs);
      };

      const scanLoop = (): void => {
        if (cancelled || !loopActive) return;
        scanTimerId = null;

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
                scheduleScanLoop(SCAN_SUCCESS_BACKOFF_MS);
                return;
              }
            } catch {
              // NotFoundException is the normal "nothing found" path.
            }
          }
        }

        scheduleScanLoop(SCAN_LOOP_DELAY_MS);
      };

      session.decodeControls = {
        stop: () => {
          loopActive = false;
          if (scanTimerId !== null) {
            window.clearTimeout(scanTimerId);
            scanTimerId = null;
          }
        },
      };

      onReady(true, undefined, activeDeviceId);
      scanLoop();
    } catch (error) {
      if (!cancelled) {
        stopStream(session, { removeVideo: false });
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

    try {
      session.decodeControls?.stop();
    } catch {
      // Ignore teardown races.
    }

    session.decodeControls = null;
    if (session.stream && isStreamAlive(session.stream) && session.hasRenderableVideo) {
      session.phase = "hot";
      scheduleIdleRelease(session);
    } else {
      stopStream(session);
      session.phase = "idle";
    }
  };
}

export function releaseAllCameraSessions(): void {
  for (const [id, session] of sessions) {
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
    session.prewarmDeviceId = undefined;
    session.prewarmPreviewEnabled = false;
    removePrewarmHostElement(id);
  }
}

export function suspendAllCameraSessions(): void {
  for (const [, session] of sessions) {
    cancelIdleTimer(session);
    cancelStartDelay(session);

    try {
      session.decodeControls?.stop();
    } catch {
      // Ignore teardown races.
    }

    session.decodeControls = null;
    stopStream(session, { removeVideo: false });
    session.phase = "idle";
  }
}

export function resumePrewarmedCameraSessions(): void {
  for (const [, session] of sessions) {
    if (session.prewarmCount > 0 && session.phase === "idle") {
      void startPrewarmStream(session);
    }
  }
}
