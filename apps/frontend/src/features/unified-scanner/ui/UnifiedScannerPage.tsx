import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import { unifiedScannerActions } from "../actions/unified-scanner.actions";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { CAMERA_REGION_IDS } from "../domain/camera-session.manager";
import { UnifiedItemScanPage } from "./UnifiedItemScanPage";
import { UnifiedItemManualInputPanel } from "./UnifiedItemManualInputPanel";
import { UnifiedLocationManualInputPanel } from "./UnifiedLocationManualInputPanel";
import { UnifiedLocationScanPage } from "./UnifiedLocationScanPage";
import { UnifiedLogisticSuccessState } from "./UnifiedLogisticSuccessState";

export function UnifiedScannerPage() {
  const {
    scannerStep,
    phase,
    locationMode,
    selectedLocation,
    isCameraReady,
    cameraError,
    onClearLocationScan,
  } = useUnifiedScannerPageContext();
  const [manualInputMode, setManualInputMode] = useState<
    "item" | "location" | null
  >(null);

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

      {!isCameraReady && !cameraError ? (
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-[21] -translate-y-1/2">
          <div className="mx-auto max-w-sm rounded-2xl bg-slate-950/85 px-5 py-4 text-center text-sm font-semibold text-slate-100 shadow-xl ring-1 ring-white/10">
            Opening camera...
          </div>
        </div>
      ) : null}

      {cameraError ? (
        <div className="pointer-events-none absolute inset-x-4 top-1/2 z-[21] -translate-y-1/2 text-center text-sm font-semibold text-rose-100">
          {cameraError}
        </div>
      ) : null}

      <AnimatePresence>
        {phase === "placed" &&
        locationMode === "logistic" &&
        selectedLocation?.mode === "logistic" ? (
          <UnifiedLogisticSuccessState
            locationLabel={selectedLocation.location}
            onChangeLocation={onClearLocationScan}
            onDone={unifiedScannerActions.closeScanner}
          />
        ) : null}
      </AnimatePresence>

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
