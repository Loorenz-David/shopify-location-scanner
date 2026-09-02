import {
  getStockStateMeta,
  STOCK_STATES,
} from "../domain/stock-states.domain";
import { missingQuantityForEntry } from "../domain/stock-report.domain";
import type { StockReportEntryDto } from "../types/stock.dto";
import type { CompactedReportRow } from "../types/stock.types";
import { StockCategoryThumbnail } from "./StockCategoryThumbnail";
import { StockPropertyChips } from "./StockPropertyChips";

const missingTextColor = getStockStateMeta(STOCK_STATES[0]).text;

interface StockQuantityStackProps {
  current: number;
  missing: number;
  sizeClassName: string;
}

function StockQuantityStack({
  current,
  missing,
  sizeClassName,
}: StockQuantityStackProps) {
  return (
    <span className="flex flex-shrink-0 flex-col items-end">
      <span
        data-testid="stock-row-quantity"
        className={`${sizeClassName} font-bold leading-none text-[var(--stock-heading)]`}
      >
        {current}
      </span>
      <span className="stock-mono mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--stock-muted)]">
        In stock
      </span>
      <span
        data-testid="stock-row-missing"
        className={`${sizeClassName} mt-2 font-bold leading-none`}
        style={{ color: missingTextColor }}
      >
        {missing}
      </span>
      <span
        className="stock-mono mt-1 text-[10px] font-medium uppercase tracking-[0.14em]"
        style={{ color: missingTextColor }}
      >
        Missing
      </span>
    </span>
  );
}

interface StockCompactEntryRowProps {
  row: CompactedReportRow;
  chips: readonly string[];
  onPress: () => void;
}

// Screen 01 row: thumbnail, type, chips, current + missing quantities, then the
// state-tinted bar with the state label left and contributing location codes right.
export function StockCompactEntryRow({
  row,
  chips,
  onPress,
}: StockCompactEntryRowProps) {
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
        <StockCategoryThumbnail itemCategory={row.itemCategory} size={55} />
        <span className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
          <span className="text-[14px] font-bold leading-tight text-[var(--stock-heading)]">
            {row.itemCategory}
          </span>
          <StockPropertyChips chips={chips} />
        </span>
        <StockQuantityStack
          current={row.quantity}
          missing={row.unitsToNormalThreshold}
          sizeClassName="text-[18px]"
        />
      </span>
      <span
        className="flex w-full items-center justify-between gap-3 rounded-[14px] px-4 py-2.5"
        style={{ backgroundColor: meta.tint, color: meta.text }}
      >
        <span className="text-[12px] font-bold uppercase tracking-[0.12em]">
          {meta.label}
        </span>
        <span
          data-testid="stock-row-locations"
          className="stock-mono text-[12px] font-medium"
        >
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

// Screen 02 row (compact variant): solid state rail, type, chips, then current +
// missing quantities stacked at the right. The group supplies the location.
export function StockGroupedEntryRow({
  entry,
  chips,
  onPress,
}: StockGroupedEntryRowProps) {
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
        <span className="text-[14px] font-bold leading-tight text-[var(--stock-heading)]">
          {entry.itemCategory}
        </span>
        <StockPropertyChips chips={chips} />
      </span>
      <StockQuantityStack
        current={entry.quantity}
        missing={missingQuantityForEntry(entry)}
        sizeClassName="text-[17px]"
      />
    </button>
  );
}
