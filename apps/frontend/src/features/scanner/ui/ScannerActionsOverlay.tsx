import {
  BackArrowIcon,
  FlasklightIcon,
  WriteIcon,
} from "../../../assets/icons";
import type { ScannerLens } from "../types/scanner.types";

interface ScannerActionsOverlayProps {
  stepTitle: string;
  flashEnabled: boolean;
  availableLenses: ScannerLens[];
  selectedLensId: string | null;
  headerActionLabel?: string;
  onHeaderAction?: () => void;
  onBack: () => void;
  onToggleFlash: () => void;
  onSelectLens: (lensId: string) => void;
  onManualInput: () => void;
}

export function ScannerActionsOverlay({
  stepTitle,
  flashEnabled,
  availableLenses,
  selectedLensId,
  headerActionLabel,
  onHeaderAction,
  onBack,
  onToggleFlash,
  onSelectLens,
  onManualInput,
}: ScannerActionsOverlayProps) {
  const iconActionClass =
    "grid h-10 w-10 place-items-center rounded-full bg-slate-950/40 text-slate-100 ring-1 ring-white/25";

  return (
    <>
      <header
        className="absolute inset-x-0 top-0 z-30 flex items-center justify-start px-4 pb-3"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          className={iconActionClass}
          onClick={onBack}
          aria-label="Back"
        >
          <BackArrowIcon className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full bg-slate-950/40 px-4 py-2 text-sm font-semibold text-slate-100">
          {stepTitle}
        </div>

        {headerActionLabel && onHeaderAction ? (
          <button
            type="button"
            className={`${iconActionClass} absolute right-4 top-[max(1rem,env(safe-area-inset-top))]`}
            onClick={onHeaderAction}
            aria-label={headerActionLabel}
            title={headerActionLabel}
          >
            <BackArrowIcon className="h-4 w-4 rotate-180" aria-hidden="true" />
          </button>
        ) : null}
      </header>

      <footer
        className="absolute inset-x-0 bottom-0 z-30 px-4 pt-3"
        style={{
          paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="relative h-11">
          <button
            type="button"
            className={`${iconActionClass} absolute left-0 top-0 ${
              flashEnabled
                ? "!bg-sky-900 ring-2 ring-sky-300/70"
                : "bg-slate-950/40"
            }`}
            onClick={onToggleFlash}
            aria-label={flashEnabled ? "Flash on" : "Flash off"}
          >
            <FlasklightIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          {availableLenses.length > 1 ? (
            <div
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1 rounded-full bg-slate-950/55 p-1"
              role="group"
              aria-label="Camera lenses"
            >
              {availableLenses.map((lens) => (
                <button
                  key={lens.id}
                  type="button"
                  className={`min-h-8 min-w-9 rounded-full px-2 text-xs font-semibold ${
                    selectedLensId === lens.id
                      ? "bg-sky-100 text-sky-900"
                      : "text-sky-100"
                  }`}
                  onClick={() => onSelectLens(lens.id)}
                >
                  {lens.label}
                </button>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            className={`${iconActionClass} absolute right-0 top-0`}
            onClick={onManualInput}
            aria-label="Manual input"
          >
            <WriteIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </>
  );
}
