interface StockPropertyChipsProps {
  chips: readonly string[];
}

const chipClassName =
  "inline-flex items-center rounded-[9px] bg-[var(--stock-chip-bg)] px-2.5 py-1.5 text-[11px] font-semibold leading-none";

export function StockPropertyChips({ chips }: StockPropertyChipsProps) {
  if (chips.length === 0) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <em className={`${chipClassName} italic text-[var(--stock-faint)]`}>
          any property
        </em>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip, index) => (
        <span
          key={`${chip}-${index}`}
          data-testid="stock-property-chip"
          className={`${chipClassName} text-[var(--stock-body)]`}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}
