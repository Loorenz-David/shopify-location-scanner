import type { ScannerLens } from "../types/scanner.types";
import { ScannerActionsOverlay } from "./ScannerActionsOverlay";
import { DecodedTextPanel } from "./DecodedTextPanel";
import { ScannerGuideOverlay } from "./ScannerGuideOverlay";

interface ScannerLocationPageProps {
  isFrozen: boolean;
  decodedText: string | null;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  canScanNext: boolean;
  onBack: () => void;
  onToggleFlash: () => void;
  onSelectLens: (lensId: string) => void;
  onManualInput: () => void;
  onRetryScan: () => void;
  onScanNext: () => void;
}

export function ScannerLocationPage({
  isFrozen,
  decodedText,
  flashEnabled,
  availableLenses,
  selectedLensId,
  canScanNext,
  onBack,
  onToggleFlash,
  onSelectLens,
  onManualInput,
  onRetryScan,
  onScanNext,
}: ScannerLocationPageProps) {
  return (
    <section
      className="relative h-full w-1/2 shrink-0 basis-1/2"
      aria-label="Location scanner page"
    >
      <ScannerGuideOverlay isFrozen={isFrozen} />

      {decodedText ? (
        <DecodedTextPanel
          value={decodedText}
          onClear={onRetryScan}
          secondaryActionLabel={canScanNext ? "Next scan" : undefined}
          onSecondaryAction={canScanNext ? onScanNext : undefined}
        />
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
