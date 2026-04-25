import { loadBrowserMultiFormatReader } from "./zxing-loader.domain";

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
    const constraints: MediaStreamConstraints = {
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "environment" },
      audio: false,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);

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
      if (!container || cancelled) {
        return;
      }

      const BrowserMultiFormatReader = await loadBrowserMultiFormatReader();
      const reader = new BrowserMultiFormatReader();
      const video = ensureVideoElement(container);

      let controls: { stop: () => void };

      if (session.stream) {
        video.srcObject = session.stream;
        if (cancelled) {
          return;
        }

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
            if (cancelled || !result) {
              return;
            }
            onDecode(result.getText());
          },
        );
      } else {
        const resolvedDeviceId = deviceId ?? (await selectBackCamera());
        if (cancelled) {
          return;
        }

        controls = await reader.decodeFromVideoDevice(
          resolvedDeviceId,
          video,
          (result: { getText(): string } | null | undefined) => {
            if (cancelled || !result) {
              return;
            }
            onDecode(result.getText());
          },
        );

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
