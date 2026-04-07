import { motion } from "framer-motion";

import { useScannerPageContext } from "../context/scanner-page-context";
import { ScannerItemPage } from "./ScannerItemPage";
import { ScannerLocationPage } from "./ScannerLocationPage";

export function ScannerPage() {
  const {
    scannerRegionId,
    isCameraReady,
    cameraError,
    frozenFrame,
    decodedText,
    scannerStep,
    selectedItem,
    flashEnabled,
    availableLenses,
    selectedLensId,
    canScanNext,
    onScanAsk,
    onBack,
    onToggleFlash,
    onSelectLens,
    onManualInput,
    onClearDecodedScan,
    onGoToLocationStep,
    onScanNext,
  } = useScannerPageContext();

  const activeStepIndex = scannerStep === "location" ? 1 : 0;
  const trackShiftPercent = -(activeStepIndex * 50);

  return (
    <section
      className="relative h-svh w-full overflow-hidden"
      aria-label="Scanner page"
    >
      <div
        id={scannerRegionId}
        className="absolute left-0 top-0 z-0 w-full pointer-events-none"
      />

      <div className="absolute inset-0 z-20 overflow-hidden">
        <motion.div
          className="flex h-full w-[200%]"
          animate={{ x: `${trackShiftPercent}%` }}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 34,
            mass: 0.9,
          }}
        >
          <ScannerItemPage
            frozenFrame={frozenFrame}
            decodedText={decodedText}
            hasSelectedItem={Boolean(selectedItem)}
            onScanAsk={onScanAsk}
            flashEnabled={flashEnabled}
            availableLenses={availableLenses}
            selectedLensId={selectedLensId}
            onGoToLocationStep={onGoToLocationStep}
            onBack={onBack}
            onToggleFlash={onToggleFlash}
            onSelectLens={onSelectLens}
            onManualInput={onManualInput}
            onClearDecodedScan={onClearDecodedScan}
          />

          <ScannerLocationPage
            isFrozen={Boolean(frozenFrame)}
            decodedText={scannerStep === "location" ? decodedText : null}
            flashEnabled={flashEnabled}
            availableLenses={availableLenses}
            selectedLensId={selectedLensId}
            canScanNext={canScanNext}
            onBack={onBack}
            onToggleFlash={onToggleFlash}
            onSelectLens={onSelectLens}
            onManualInput={onManualInput}
            onRetryScan={onClearDecodedScan}
            onScanNext={onScanNext}
          />
        </motion.div>
      </div>

      {!isCameraReady && !cameraError ? (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-slate-950/35 text-sm font-semibold text-slate-100">
          Opening camera...
        </div>
      ) : null}

      {cameraError ? (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-slate-950/55 p-6 text-center text-sm font-semibold text-rose-100">
          {cameraError}
        </div>
      ) : null}
    </section>
  );
}
