import { useEffect, useRef, useState } from "react";

import {
  attachDecodeSession,
  CAMERA_REGION_IDS,
} from "../../unified-scanner/domain/camera-session.manager";

export const LOGISTIC_PLACEMENT_REGION_ID =
  CAMERA_REGION_IDS["logistic-placement"];

export function useLogisticPlacementScannerFlow(
  onDecode: (value: string) => void,
): { isCameraReady: boolean; cameraError: string | null } {
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const onDecodeRef = useRef(onDecode);
  const isPausedRef = useRef(false);

  // Keep the decode callback ref current on every render.
  useEffect(() => {
    onDecodeRef.current = onDecode;
  });

  // Attach the ZXing decode loop when the scanner page opens.
  // The camera stream is already warm (started by the logistic tasks page
  // prewarm), so ZXing can attach immediately — no startup delay needed.
  useEffect(() => {
    isPausedRef.current = false;

    const detach = attachDecodeSession(
      "logistic-placement",
      (value) => {
        if (isPausedRef.current) return;
        isPausedRef.current = true;
        onDecodeRef.current(value);
        // Brief pause to prevent duplicate decodes from the same barcode.
        window.setTimeout(() => {
          isPausedRef.current = false;
        }, 1500);
      },
      (ready, error) => {
        setIsCameraReady(ready);
        setCameraError(error ?? null);
      },
    );

    return () => {
      detach();
      setIsCameraReady(false);
      setCameraError(null);
      isPausedRef.current = false;
    };
  }, []);

  return { isCameraReady, cameraError };
}
