import { getStockStateMeta } from "../domain/stock-states.domain";
import type { StockReportEntryDto } from "../types/stock.dto";
import type { CompactedReportRow } from "../types/stock.types";
import { StockPropertyChips } from "./StockPropertyChips";

function unitLabel(quantity: number): string {
  return quantity === 1 ? "unit" : "units";
}

// The report endpoints return no image data; the striped square stands in for the
// thumbnail (context/design-language.md §3.3 — placeholder-only).
export function StockThumbnailPlaceholder({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="block flex-shrink-0 rounded-[18px]"
      style={{
        width: size,
        height: size,
        backgroundImage:
          "repeating-linear-gradient(135deg, #E6ECE8 0 10px, #F3F6F4 10px 20px)",
      }}
    />
  );
}

interface StockCompactEntryRowProps {
  row: CompactedReportRow;
  chips: readonly string[];
  onPress: () => void;
}

// Screen 01 row: thumbnail, type, chips, quantity + unit, then the state-tinted bar
// with the state label left and the contributing location codes right.
export function StockCompactEntryRow({ row, chips, onPress }: StockCompactEntryRowProps) {
  const meta = getStockStateMeta(row.stockState);

  return (
    <button
      type="button"
      data-testid="stock-report-row"
      data-row-key={`${row.mergeKey}|${row.stockState}`}
      className="flex w-full flex-col gap-3 rounded-[24px] bg-[var(--stock-surface)] p-4 text-left shadow-[var(--stock-card-shadow)]"
      onClick={onPress}
    >
      <span className="flex w-full items-start gap-4">
        <StockThumbnailPlaceholder size={76} />
        <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <span className="text-[19px] font-bold leading-tight text-[var(--stock-heading)]">
            {row.itemCategory}
          </span>
          <StockPropertyChips chips={chips} />
        </span>
        <span className="flex flex-shrink-0 flex-col items-end pt-1">
          <span
            data-testid="stock-row-quantity"
            className="text-[28px] font-bold leading-none text-[var(--stock-heading)]"
          >
            {row.quantity}
          </span>
          <span className="stock-mono mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--stock-muted)]">
            {unitLabel(row.quantity)}
          </span>
        </span>
      </span>
      <span
        className="flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-2.5"
        style={{ backgroundColor: meta.tint, color: meta.text }}
      >
        <span className="text-[13px] font-bold uppercase tracking-[0.12em]">{meta.label}</span>
        <span data-testid="stock-row-locations" className="stock-mono text-[13px] font-medium">
          {row.locations}
        </span>
      </span>
    </button>
  );
}

interface StockGroupedEntryRowProps {
  entry: StockReportEntryDto;
  chips: readonly string[];
  onPress: () => void;
}

// Screen 02 row (compact variant): solid state rail, type, chips, then the quantity
// with the state label beneath, right-aligned. The group supplies the location.
export function StockGroupedEntryRow({ entry, chips, onPress }: StockGroupedEntryRowProps) {
  const meta = getStockStateMeta(entry.stockState);

  return (
    <button
      type="button"
      data-testid="stock-report-entry"
      data-entry-key={`${entry.mergeKey}|${entry.stockState}|${entry.location}`}
      className="flex w-full items-center gap-4 rounded-[24px] bg-[var(--stock-surface)] py-4 pl-4 pr-5 text-left shadow-[var(--stock-card-shadow)]"
      onClick={onPress}
    >
      <span
        aria-hidden="true"
        className="block h-[38px] w-2 flex-shrink-0 rounded-[4px]"
        style={{ backgroundColor: meta.solid }}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="text-[17px] font-bold leading-tight text-[var(--stock-heading)]">
          {entry.itemCategory}
        </span>
        <StockPropertyChips chips={chips} />
      </span>
      <span className="flex flex-shrink-0 flex-col items-end">
        <span
          data-testid="stock-row-quantity"
          className="text-[26px] font-bold leading-none text-[var(--stock-heading)]"
        >
          {entry.quantity}
        </span>
        <span
          className="mt-1 text-[11px] font-bold uppercase tracking-[0.1em]"
          style={{ color: meta.text }}
        >
          {meta.label}
        </span>
      </span>
    </button>
  );
}
