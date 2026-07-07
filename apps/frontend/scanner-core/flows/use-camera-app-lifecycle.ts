import { useEffect } from "react";

import {
  resumePrewarmedCameraSessions,
  suspendAllCameraSessions,
} from "../domain/camera-session.manager";

export function useCameraAppLifecycleFlow(): void {
  useEffect(() => {
    const suspendCamera = () => {
      suspendAllCameraSessions();
    };

    const resumeCamera = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      window.setTimeout(() => {
        resumePrewarmedCameraSessions();
      }, 250);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        suspendCamera();
        return;
      }

      resumeCamera();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", suspendCamera);
    window.addEventListener("pageshow", resumeCamera);
    document.addEventListener("freeze", suspendCamera);
    document.addEventListener("resume", resumeCamera);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", suspendCamera);
      window.removeEventListener("pageshow", resumeCamera);
      document.removeEventListener("freeze", suspendCamera);
      document.removeEventListener("resume", resumeCamera);
    };
  }, []);
}
