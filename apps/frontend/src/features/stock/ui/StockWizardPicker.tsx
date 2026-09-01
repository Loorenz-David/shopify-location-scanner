import {
  primaryCtaClassName,
  StockWizardFooter,
  StockWizardHeader,
} from "./StockWizardChrome";

export interface StockWizardPickerOption {
  id: string;
  label: string;
  isSelected: boolean;
  isWildcard?: boolean;
}

interface StockWizardPickerProps {
  title: string;
  eyebrow: string;
  options: readonly StockWizardPickerOption[];
  emptyMessage: string;
  onSelect: (id: string) => void;
  onBack: () => void;
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

// A pushed list picker over the step-1 form: item type (single), property definition
// (single, filtered by category), property values (multi + "Any value", D9). The list
// is one white card with hairlines; a chosen row shows a green check.
export function StockWizardPicker({
  title,
  eyebrow,
  options,
  emptyMessage,
  onSelect,
  onBack,
  cta,
}: StockWizardPickerProps) {
  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-4 px-5 pb-28">
      <StockWizardHeader
        title={title}
        eyebrow={eyebrow}
        dismiss="back"
        dismissLabel="Back to the form"
        onDismiss={onBack}
      />

      {options.length === 0 ? (
        <div className="rounded-[24px] border-2 border-dashed border-[var(--stock-dashed)] px-5 py-6 text-center text-[15px] text-[var(--stock-muted)]">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col rounded-[24px] bg-[var(--stock-surface)] px-5 shadow-[var(--stock-card-shadow)]">
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              data-testid="stock-picker-option"
              aria-pressed={option.isSelected}
              className={`flex min-h-[52px] items-center justify-between gap-3 py-3 text-left ${
                index < options.length - 1 ? "border-b border-[var(--stock-hairline)]" : ""
              }`}
              onClick={() => onSelect(option.id)}
            >
              <span
                className={`min-w-0 text-[15px] font-medium leading-tight ${
                  option.isWildcard ? "italic" : ""
                } ${option.isSelected ? "text-[var(--stock-primary)]" : "text-[var(--stock-heading)]"}`}
              >
                {option.label}
              </span>
              <span
                className={`flex-shrink-0 text-[var(--stock-primary)] ${option.isSelected ? "" : "invisible"}`}
              >
                <CheckMark />
              </span>
            </button>
          ))}
        </div>
      )}

      {cta ? (
        <StockWizardFooter>
          <button
            type="button"
            className={primaryCtaClassName}
            disabled={cta.isDisabled}
            onClick={cta.onPress}
          >
            {cta.label}
          </button>
        </StockWizardFooter>
      ) : null}
    </section>
  );
}
