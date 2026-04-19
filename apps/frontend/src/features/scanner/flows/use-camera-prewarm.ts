/**
 * use-camera-prewarm.ts
 *
 * Page-level hook that starts the camera stream (without decoding) as soon as
 * a page mounts, so the camera is already hot when the user opens the scanner.
 *
 * Usage:
 *   // In the page-level flow hook (e.g. useItemScanHistoryFlow):
 *   useCameraPrewarm("main-scanner");
 *
 *   // In the logistic tasks page flow:
 *   useCameraPrewarm("logistic-placement");
 *
 * The stream stays alive for CAMERA_IDLE_RELEASE_MS after the last consumer
 * unmounts without an active decode session (see camera-session.manager.ts).
 */

import { useEffect } from "react";

import {
  CAMERA_IDLE_RELEASE_MS,
  prewarmCameraSession,
} from "../domain/camera-session.manager";
import type { CameraSessionId } from "../domain/camera-session.manager";

export { CAMERA_IDLE_RELEASE_MS };

/**
 * Prewarms the named camera session on mount and releases on unmount.
 * `delayMs` (default 0) defers the first getUserMedia call — useful when
 * the page container is inside a CSS-transform animation.
 */
export function useCameraPrewarm(
  sessionId: CameraSessionId,
  delayMs = 0,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cleanup = prewarmCameraSession(sessionId, delayMs);
    return cleanup;
  }, [sessionId, delayMs, enabled]);
}
