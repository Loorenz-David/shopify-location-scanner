import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { CAMERA_REGION_IDS } from "../domain/camera-session.manager";
import { UnifiedItemScanPage } from "./UnifiedItemScanPage";
import { UnifiedItemManualInputPanel } from "./UnifiedItemManualInputPanel";
import { UnifiedLocationManualInputPanel } from "./UnifiedLocationManualInputPanel";
import { UnifiedLocationScanPage } from "./UnifiedLocationScanPage";

export function UnifiedScannerPage() {
  const {
    scannerStep,
    selectedItem,
    isCameraReady,
    cameraError,
  } = useUnifiedScannerPageContext();
  const [manualInputMode, setManualInputMode] = useState<
    "item" | "location" | null
  >(null);
  const [showPreviewStarting, setShowPreviewStarting] = useState(false);
  const previewMessageDelayMs =
    scannerStep === "location" && selectedItem ? 1500 : 500;

  useEffect(() => {
    if (isCameraReady || cameraError) {
      setShowPreviewStarting(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShowPreviewStarting(true);
    }, previewMessageDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cameraError, isCameraReady, previewMessageDelayMs]);

  return (
    <section
      className="relative h-svh w-full overflow-hidden"
      aria-label="Unified scanner"
    >
      <div
        id={CAMERA_REGION_IDS["unified-scanner"]}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      <div className="absolute inset-0 z-20 overflow-hidden">
        <motion.div
          className="flex h-full w-[200%]"
          initial={{ x: scannerStep === "location" ? "-50%" : "0%" }}
          animate={{ x: scannerStep === "location" ? "-50%" : "0%" }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 34,
            mass: 0.9,
          }}
        >
          <UnifiedItemScanPage onManualInput={() => setManualInputMode("item")} />
          <UnifiedLocationScanPage
            onManualInput={() => setManualInputMode("location")}
          />
        </motion.div>
      </div>

      {showPreviewStarting ? (
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-[21] -translate-y-1/2">
          <div className="mx-auto max-w-sm rounded-2xl bg-slate-950/85 px-5 py-4 text-center text-sm font-semibold text-slate-100 shadow-xl ring-1 ring-white/10">
            Starting preview...
          </div>
        </div>
      ) : null}

      {cameraError ? (
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-[21] -translate-y-1/2 text-center text-sm font-semibold text-rose-100">
          {cameraError}
        </div>
      ) : null}

      <AnimatePresence>
        {manualInputMode === "item" ? (
          <UnifiedItemManualInputPanel
            onClose={() => setManualInputMode(null)}
            onSelect={(item) => {
              setManualInputMode(null);
              unifiedScannerActions.applyItem(item, {
                transition: "immediate",
              });
            }}
          />
        ) : null}

        {manualInputMode === "location" ? (
          <UnifiedLocationManualInputPanel
            onClose={() => setManualInputMode(null)}
            onSelectValue={(value) => {
              setManualInputMode(null);
              unifiedScannerActions.applyLocationByValue(value);
            }}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
