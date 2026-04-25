import { useUnifiedScannerPageContext } from "../context/unified-scanner-context";
import { DecodedTextPanel } from "./DecodedTextPanel";
import { FrozenFrameCanvas } from "./FrozenFrameCanvas";
import { ScannerActionsOverlay } from "./ScannerActionsOverlay";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

interface UnifiedItemScanPageProps {
  onManualInput: () => void;
}

export function UnifiedItemScanPage({
  onManualInput,
}: UnifiedItemScanPageProps) {
  const {
    itemFrozenFrame,
    itemDecodedText,
    phase,
    selectedItem,
    onScanAsk,
    isLookingUpItem,
    itemLookupError,
    flashEnabled,
    availableLenses,
    selectedLensId,
    onBack,
    onToggleFlash,
    onSelectLens,
    onClearItemScan,
    onGoToLocationStep,
    onDismissItemError,
  } = useUnifiedScannerPageContext();

  return (
    <section
      className="relative h-full w-1/2 shrink-0 basis-1/2"
      aria-label="Unified item scanner"
    >
      {itemFrozenFrame ? (
        <FrozenFrameCanvas
          dataUrl={itemFrozenFrame.dataUrl}
          width={itemFrozenFrame.width}
          height={itemFrozenFrame.height}
        />
      ) : null}

      <ScannerGuideOverlay isFrozen={Boolean(itemFrozenFrame)} />

      {itemDecodedText ? (
        <DecodedTextPanel
          value={itemDecodedText}
          onClear={selectedItem ? undefined : onClearItemScan}
          secondaryActionLabel={
            onScanAsk && phase === "item-confirmed" && selectedItem
              ? "Continue"
              : undefined
          }
          onSecondaryAction={
            onScanAsk && phase === "item-confirmed" && selectedItem
              ? onGoToLocationStep
              : undefined
          }
        />
      ) : null}

      {isLookingUpItem ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-slate-950/55 text-sm font-semibold text-slate-100">
          Looking up item...
        </div>
      ) : null}

      {itemLookupError ? (
        <div
          className="absolute left-4 right-4 z-30 rounded-xl bg-rose-700/90 px-4 py-3 text-sm text-white shadow"
          style={{
            bottom: "max(6rem, calc(env(safe-area-inset-bottom) + 5rem))",
          }}
        >
          <p className="m-0">{itemLookupError}</p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-rose-100 underline"
            onClick={onDismissItemError}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <ScannerActionsOverlay
        stepTitle="Scan Item"
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
