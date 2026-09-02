import { ChevronLeftIcon, CloseIcon } from "../../../assets/icons";
import { SlidingOverlayContainer } from "../../home/ui/SlidingOverlayContainer";
import { primaryCtaClassName } from "./StockWizardChrome";

export interface StockSelectSheetOption {
  id: string;
  label: string;
  isSelected: boolean;
  isWildcard?: boolean;
  // Grid layout only: the small count under a card, and the name a screen reader hears
  // when the visible label is an abbreviation (a location's number without its letter).
  caption?: string;
  accessibleLabel?: string;
}

interface StockSelectSheetProps {
  isOpen: boolean;
  title: string;
  eyebrow: string;
  options: readonly StockSelectSheetOption[];
  emptyMessage: string;
  // Location codes and property keys are set in the mono face on every other stock screen.
  monoLabels?: boolean;
  // Short codes read as a grid of cards (the scanner's manual location panel); anything
  // with a sentence-length label stays a list.
  layout?: "list" | "grid";
  onSelect: (id: string) => void;
  onClose: () => void;
  // A step reached from a list inside the sheet (a property's values) goes back to it
  // rather than closing; without it the header shows the × dismiss.
  onBack?: () => void;
  backLabel?: string;
  // Multi-select steps commit on the CTA instead of on the tap.
  cta?: { label: string; isDisabled: boolean; onPress: () => void };
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true" fill="none">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The wizard's option list, in the app's bottom sheet (the house pattern behind InfoSheet
// and the analytics date picker): SlidingOverlayContainer supplies the slide, the dimmed
// backdrop, the dialog role and the iOS scroll lock; the panel below is the shared
// rounded-top surface. One instance stays mounted across a drill-down (property → its
// values) so the sheet swaps content in place instead of re-animating.
export function StockSelectSheet({
  isOpen,
  title,
  eyebrow,
  options,
  emptyMessage,
  monoLabels = false,
  layout = "list",
  onSelect,
  onClose,
  onBack,
  backLabel = "Back",
  cta,
}: StockSelectSheetProps) {
  const safeAreaPadding = "max(1.5rem, env(safe-area-inset-bottom))";

  return (
    <SlidingOverlayContainer isOpen={isOpen} title={title}>
      <div className="stock-area-font flex h-full flex-col">
        {/* The exposed page above the panel closes the sheet, as it does on every other sheet. */}
        <button
          type="button"
          aria-label={`Close ${title}`}
          className="flex-1 cursor-default"
          onClick={onClose}
        />

        <section className="mx-auto flex max-h-[82svh] w-full max-w-[720px] flex-col rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
          <header className="flex flex-shrink-0 items-center gap-3 border-b border-slate-900/10 px-5 py-3">
            <button
              type="button"
              className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full border border-slate-900/10 bg-white text-[var(--stock-body)]"
              onClick={onBack ?? onClose}
              aria-label={onBack ? backLabel : `Close ${title}`}
            >
              {onBack ? (
                <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
              ) : (
                <CloseIcon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <div className="min-w-0">
              <p className="stock-mono m-0 text-[10px] uppercase tracking-[0.14em] text-[var(--stock-muted)]">
                {eyebrow}
              </p>
              <h2 className="m-0 mt-0.5 truncate text-[15px] font-bold leading-tight text-[var(--stock-heading)]">
                {title}
              </h2>
            </div>
          </header>

          <div
            className={`overflow-y-auto px-5 ${layout === "grid" ? "grid grid-cols-4 gap-2 pt-4" : "flex flex-col"}`}
            style={cta ? undefined : { paddingBottom: safeAreaPadding }}
          >
            {options.length === 0 ? (
              <p className="col-span-4 m-0 py-6 text-center text-[14px] text-[var(--stock-muted)]">
                {emptyMessage}
              </p>
            ) : layout === "grid" ? (
              options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid="stock-sheet-option"
                  aria-pressed={option.isSelected}
                  aria-label={option.accessibleLabel}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-[18px] border text-center ${
                    option.isSelected
                      ? "border-[var(--stock-primary)] bg-[#F0F8F4] text-[var(--stock-primary)]"
                      : "border-slate-900/10 bg-white text-[var(--stock-heading)]"
                  }`}
                  onClick={() => onSelect(option.id)}
                >
                  <span
                    className={`leading-none ${monoLabels ? "stock-mono" : ""} text-[16px] font-bold`}
                  >
                    {option.label}
                  </span>
                  {option.caption === undefined ? null : (
                    <span
                      aria-hidden="true"
                      className="text-[10px] leading-none text-[var(--stock-muted)]"
                    >
                      {option.caption}
                    </span>
                  )}
                </button>
              ))
            ) : (
              options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  data-testid="stock-sheet-option"
                  aria-pressed={option.isSelected}
                  className={`flex min-h-[56px] items-center justify-between gap-3 py-3 text-left ${
                    index < options.length - 1
                      ? "border-b border-[var(--stock-hairline)]"
                      : ""
                  }`}
                  onClick={() => onSelect(option.id)}
                >
                  <span
                    className={`min-w-0 leading-tight ${monoLabels ? "stock-mono text-[15px] font-medium" : "text-[14px] font-medium"} ${
                      option.isWildcard ? "italic" : ""
                    } ${
                      option.isSelected
                        ? "text-[var(--stock-primary)]"
                        : "text-[var(--stock-heading)]"
                    }`}
                  >
                    {option.label}
                  </span>
                  <span
                    className={`flex-shrink-0 text-[var(--stock-primary)] ${option.isSelected ? "" : "invisible"}`}
                  >
                    <CheckMark />
                  </span>
                </button>
              ))
            )}
          </div>

          {cta ? (
            <div
              className="flex flex-shrink-0 border-t border-slate-900/10 px-5 pt-3"
              style={{ paddingBottom: safeAreaPadding }}
            >
              <button
                type="button"
                className={primaryCtaClassName}
                disabled={cta.isDisabled}
                onClick={cta.onPress}
              >
                {cta.label}
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </SlidingOverlayContainer>
  );
}
