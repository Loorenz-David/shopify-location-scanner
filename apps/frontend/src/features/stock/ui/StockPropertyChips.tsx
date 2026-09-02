import type { CriteriaChip } from "../domain/stock-criteria.domain";

interface StockPropertyChipsProps {
  chips: readonly CriteriaChip[];
}

const chipClassName =
  "inline-flex flex-col items-start gap-[3px] rounded-[10px] bg-[var(--stock-chip-bg)] px-2.5 py-1.5";

// Key over value, the way the quantity bar and the detail tiles already stack their
// eyebrow over a number: on a phone the label costs no extra width (a chip is as wide
// as its longest line) and a bare `4` or `None` stops reading as a stock count.
export function StockPropertyChips({ chips }: StockPropertyChipsProps) {
  if (chips.length === 0) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <em className="inline-flex items-center rounded-[10px] bg-[var(--stock-chip-bg)] px-2.5 py-1.5 text-[11px] font-semibold italic leading-none text-[var(--stock-faint)]">
          any property
        </em>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, index) => (
        <span
          key={`${chip.key}-${index}`}
          data-testid="stock-property-chip"
          data-property-key={chip.key}
          className={chipClassName}
        >
          <span className="stock-mono text-[8px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--stock-muted)]">
            {chip.label}
          </span>
          <span
            data-testid="stock-property-chip-value"
            className={`text-[11px] font-semibold leading-none ${
              chip.isWildcard
                ? "italic text-[var(--stock-faint)]"
                : "text-[var(--stock-body)]"
            }`}
          >
            {chip.values.join(", ")}
          </span>
        </span>
      ))}
    </div>
  );
}
