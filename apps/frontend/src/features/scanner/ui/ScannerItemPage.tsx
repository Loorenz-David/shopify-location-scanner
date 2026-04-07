import type { ScannerFrozenFrame, ScannerLens } from "../types/scanner.types";
import { DecodedTextPanel } from "./DecodedTextPanel";
import { ScannerActionsOverlay } from "./ScannerActionsOverlay";
import { FrozenFrameCanvas } from "./FrozenFrameCanvas";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

interface ScannerItemPageProps {
  frozenFrame: ScannerFrozenFrame | null;
  decodedText: string | null;
  hasSelectedItem: boolean;
  onScanAsk: boolean;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  onGoToLocationStep: () => void;
  onBack: () => void;
  onToggleFlash: () => void;
  onSelectLens: (lensId: string) => void;
  onManualInput: () => void;
  onClearDecodedScan: () => void;
}

export function ScannerItemPage({
  frozenFrame,
  decodedText,
  hasSelectedItem,
  onScanAsk,
  flashEnabled,
  availableLenses,
  selectedLensId,
  onGoToLocationStep,
  onBack,
  onToggleFlash,
  onSelectLens,
  onManualInput,
  onClearDecodedScan,
}: ScannerItemPageProps) {
  return (
    <section
      className="relative h-full w-1/2 shrink-0 basis-1/2"
      aria-label="Item scanner page"
    >
      {frozenFrame ? (
        <FrozenFrameCanvas
          dataUrl={frozenFrame.dataUrl}
          width={frozenFrame.width}
          height={frozenFrame.height}
        />
      ) : null}

      <ScannerGuideOverlay isFrozen={Boolean(frozenFrame)} />

      {decodedText ? (
        <DecodedTextPanel
          value={decodedText}
          onClear={onClearDecodedScan}
          secondaryActionLabel={
            onScanAsk && hasSelectedItem ? "Scan location" : undefined
          }
          onSecondaryAction={
            onScanAsk && hasSelectedItem ? onGoToLocationStep : undefined
          }
        />
      ) : null}

      <ScannerActionsOverlay
        stepTitle="Scan Item"
        flashEnabled={flashEnabled}
        availableLenses={availableLenses}
        selectedLensId={selectedLensId}
        headerActionLabel={hasSelectedItem ? "Go to location" : undefined}
        onHeaderAction={hasSelectedItem ? onGoToLocationStep : undefined}
        onBack={onBack}
        onToggleFlash={onToggleFlash}
        onSelectLens={onSelectLens}
        onManualInput={onManualInput}
      />
    </section>
  );
}
