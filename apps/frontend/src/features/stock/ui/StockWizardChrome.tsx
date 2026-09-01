import type { ReactNode } from "react";

import { ChevronLeftIcon, CloseIcon } from "../../../assets/icons";

interface StockWizardHeaderProps {
  title: string;
  eyebrow: string;
  eyebrowTestId?: string;
  dismiss: "discard" | "back";
  dismissLabel: string;
  onDismiss: () => void;
}

// Screen 08/09 header: a 40px white circle holding × (discard) or ‹ (back), the 21/700
// title and an 11px mono uppercase eyebrow beneath it.
export function StockWizardHeader({
  title,
  eyebrow,
  eyebrowTestId,
  dismiss,
  dismissLabel,
  onDismiss,
}: StockWizardHeaderProps) {
  return (
    <header className="flex items-start gap-3">
      <button
        type="button"
        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
        onClick={onDismiss}
        aria-label={dismissLabel}
      >
        {dismiss === "discard" ? (
          <CloseIcon className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
      <div className="min-w-0 pt-0.5">
        <h1 className="m-0 text-[21px] font-bold leading-tight text-[var(--stock-heading)]">
          {title}
        </h1>
        <p
          className="stock-mono m-0 mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--stock-muted)]"
          data-testid={eyebrowTestId}
        >
          {eyebrow}
        </p>
      </div>
    </header>
  );
}

interface StockWizardProgressProps {
  step: 1 | 2;
}

// Two-segment progress bar under the header; both segments green on step 2.
export function StockWizardProgress({ step }: StockWizardProgressProps) {
  return (
    <div className="flex gap-2" aria-hidden="true">
      <span className="h-1 flex-1 rounded-full bg-[var(--stock-primary)]" />
      <span
        className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-[var(--stock-primary)]" : "bg-[var(--stock-hairline)]"}`}
      />
    </div>
  );
}

interface StockWizardSectionLabelProps {
  number: number;
  label: string;
  note?: string;
}

// Numbered green step marker + mono eyebrow (screen 08 sections 1–3).
export function StockWizardSectionLabel({ number, label, note }: StockWizardSectionLabelProps) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-[22px] w-[22px] flex-shrink-0 place-items-center rounded-full bg-[var(--stock-primary)] text-[11px] font-bold leading-none text-white">
        {number}
      </span>
      <span className="stock-mono text-[11px] uppercase tracking-[0.14em] text-[var(--stock-body)]">
        {label}
      </span>
      {note ? <span className="text-[13px] text-[var(--stock-muted)]">{note}</span> : null}
    </div>
  );
}

interface StockWizardFooterProps {
  children: ReactNode;
}

// Fixed footer above the tab bar with a fade so no card is clipped under it
// (00-global: 108px inset on single-CTA form screens).
export function StockWizardFooter({ children }: StockWizardFooterProps) {
  return (
    <>
      <div
        className="stock-pill-fade pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[184px]"
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 z-30 mx-auto flex w-full max-w-[720px] gap-3 px-5"
        style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 5.25rem)" }}
      >
        {children}
      </div>
    </>
  );
}

export const primaryCtaClassName =
  "inline-flex h-14 flex-1 items-center justify-center rounded-[28px] bg-[var(--stock-primary)] px-6 text-[16px] font-semibold text-white shadow-[var(--stock-cta-shadow)] transition active:scale-[0.98] disabled:opacity-45 disabled:shadow-none";

export const secondaryCtaClassName =
  "inline-flex h-14 items-center justify-center rounded-[28px] bg-[var(--stock-surface)] px-6 text-[16px] font-semibold text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)] transition active:scale-[0.98]";
