import { PlusIcon } from "../../../assets/icons";

interface StockFloatingPillProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

// Floating action pill above the tab bar (design 00-global): the list underneath
// reserves 184px and fades out so no card is clipped mid-text under the pill.
export function StockFloatingPill({ label, onPress, disabled = false }: StockFloatingPillProps) {
  return (
    <>
      <div
        className="stock-pill-fade pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[184px]"
        aria-hidden="true"
      />
      <button
        type="button"
        className="fixed left-1/2 z-30 inline-flex h-[52px] -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-[26px] bg-[var(--stock-primary)] px-6 text-[15px] font-semibold text-white shadow-[var(--stock-cta-shadow)] transition active:scale-[0.98] disabled:opacity-60"
        style={{ bottom: "calc(max(1rem, env(safe-area-inset-bottom)) + 5.25rem)" }}
        onClick={onPress}
        disabled={disabled}
      >
        <PlusIcon className="h-5 w-5" aria-hidden="true" />
        <span>{label}</span>
      </button>
    </>
  );
}
