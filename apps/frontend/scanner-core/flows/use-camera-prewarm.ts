import { useEffect } from "react";

import {
  CAMERA_IDLE_RELEASE_MS,
  prewarmCameraSession,
} from "../domain/camera-session.manager";
import type { CameraSessionId } from "../domain/camera-session.manager";

export { CAMERA_IDLE_RELEASE_MS };

export function useCameraPrewarm(
  sessionId: CameraSessionId,
  delayMs = 0,
  enabled = true,
  deviceId?: string,
  options: { attachPreview?: boolean } = {},
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cleanup = prewarmCameraSession(sessionId, delayMs, deviceId, options);
    return cleanup;
  }, [sessionId, delayMs, enabled, deviceId, options.attachPreview]);
}
