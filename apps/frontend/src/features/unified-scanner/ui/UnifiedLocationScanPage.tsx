import { RetryIcon } from "../../../assets/icons";
import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { DecodedTextPanel } from "./DecodedTextPanel";
import { FrozenFrameCanvas } from "./FrozenFrameCanvas";
import { ScannerActionsOverlay } from "./ScannerActionsOverlay";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

interface UnifiedLocationScanPageProps {
  onManualInput: () => void;
}

export function UnifiedLocationScanPage({
  onManualInput,
}: UnifiedLocationScanPageProps) {
  const {
    locationFrozenFrame,
    locationDecodedText,
    locationMode,
    selectedItem,
    itemDecodedText,
    isLookingUpItem,
    canScanNext,
    flashEnabled,
    availableLenses,
    selectedLensId,
    lastPlacementError,
    locationWarningBanner,
    onBack,
    onToggleFlash,
    onSelectLens,
    onClearLocationScan,
    onScanNext,
    onDismissLocationWarning,
    onDismissPlacementError,
    onClearItemScan,
  } = useUnifiedScannerPageContext();

  return (
    <section
      className="relative h-full w-1/2 shrink-0 basis-1/2"
      aria-label="Unified location scanner"
    >
      {locationFrozenFrame ? (
        <FrozenFrameCanvas
          dataUrl={locationFrozenFrame.dataUrl}
          width={locationFrozenFrame.width}
          height={locationFrozenFrame.height}
        />
      ) : null}

      <ScannerGuideOverlay isFrozen={Boolean(locationFrozenFrame)} />

      {selectedItem || isLookingUpItem ? (
        <div
          className="absolute left-1/2 z-30 w-[min(88vw,440px)] -translate-x-1/2"
          style={{
            bottom: "max(10.5rem, calc(env(safe-area-inset-bottom) + 9rem))",
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-slate-950/60 px-3 py-2 text-slate-100 ring-1 ring-white/15 backdrop-blur-sm">
              {selectedItem?.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-xl bg-slate-800 object-cover"
                />
              ) : isLookingUpItem ? (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-800/90">
                  <span
                    className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent"
                    aria-hidden="true"
                  />
                </div>
              ) : null}

              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-sm font-semibold">
                  {selectedItem?.title ??
                    selectedItem?.sku ??
                    itemDecodedText ??
                    "Looking up item..."}
                </p>
                <p className="m-0 truncate text-xs text-slate-300">
                  {selectedItem?.sku ?? (isLookingUpItem ? "Searching..." : "")}
                  {selectedItem?.currentPosition
                    ? ` • ${selectedItem.currentPosition}`
                    : ""}
                </p>
              </div>

              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-slate-100 ring-1 ring-white/15 transition active:bg-white/20"
                onClick={onClearItemScan}
                aria-label="Scan a different item"
                title="Scan a different item"
              >
                <RetryIcon className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="min-h-12">
              {locationMode === "shop" && canScanNext ? (
                <button
                  type="button"
                  className="w-full rounded-lg bg-sky-500/90 px-3 py-3 text-md font-bold text-sky-50"
                  onClick={onScanNext}
                >
                  Next scan
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {locationDecodedText ? (
        <DecodedTextPanel
          value={locationDecodedText}
          onClear={onClearLocationScan}
        />
      ) : null}

      {locationWarningBanner ? (
        <div
          className="absolute left-4 right-4 z-30 rounded-xl bg-amber-500/95 px-4 py-3 text-sm text-slate-950 shadow"
          style={{
            bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 5rem))",
          }}
        >
          <p className="m-0 font-medium">{locationWarningBanner}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold underline"
            onClick={onDismissLocationWarning}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {lastPlacementError ? (
        <div
          className="absolute left-4 right-4 z-30 rounded-xl bg-rose-700/90 px-4 py-3 text-sm text-white shadow"
          style={{
            top: "max(5rem, calc(env(safe-area-inset-top) + 4rem))",
          }}
        >
          <p className="m-0">{lastPlacementError}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-rose-100 underline"
            onClick={onDismissPlacementError}
          >
            Retry
          </button>
        </div>
      ) : null}

      <ScannerActionsOverlay
        stepTitle="Scan Location"
        flashEnabled={flashEnabled}
        availableLenses={availableLenses}
        selectedLensId={selectedLensId}
        onBack={onBack}
        onToggleFlash={onToggleFlash}
        onSelectLens={onSelectLens}
        onManualInput={onManualInput}
      />
    </section>
  );
}
