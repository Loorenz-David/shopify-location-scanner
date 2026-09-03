import { getStockStateMeta, STOCK_STATES } from "../domain/stock-states.domain";
import { stockCountLabels } from "../domain/stock-count-mode.domain";
import { displayedCount, missingQuantityForEntry } from "../domain/stock-report.domain";
import type { CriteriaChip } from "../domain/stock-criteria.domain";
import type { StockReportEntryDto, StockStateDto } from "../types/stock.dto";
import type { CompactedReportRow, StockCountMode } from "../types/stock.types";
import { StockCategoryThumbnail } from "./StockCategoryThumbnail";
import { StockPropertyChips } from "./StockPropertyChips";

const missingMeta = getStockStateMeta(STOCK_STATES[0]);

// A definition can carry many properties, and a row that grows a chip stack for each one
// reads as a wall rather than a list. Two rows of chips, then a "3+" pill; the entry
// detail behind the row shows the full set.
const REPORT_ROW_CHIP_ROWS = 2;

interface StockQuantityBarProps {
  current: number;
  missing: number;
  countMode: StockCountMode;
}

// The current cell follows the count mode; the missing cell is always items,
// because thresholds are item-based (P7 D3) — its label says so in units mode.
function StockQuantityBar({ current, missing, countMode }: StockQuantityBarProps) {
  const labels = stockCountLabels(countMode);
  return (
    <span className="grid w-full grid-cols-2 overflow-hidden rounded-[18px] bg-[var(--stock-track)]">
      <span className="flex min-w-0 flex-col gap-1 px-5 py-3">
        <span
          data-testid="stock-row-quantity-label"
          className="stock-mono text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--stock-muted)]"
        >
          {labels.current}
        </span>
        <span
          data-testid="stock-row-quantity"
          className="text-md font-bold leading-none text-[var(--stock-heading)]"
        >
          {current}
        </span>
      </span>
      <span
        className="flex min-w-0 flex-col gap-1 border-l border-white/80 px-5 py-3"
        style={{ backgroundColor: missingMeta.tint, color: missingMeta.text }}
      >
        <span
          data-testid="stock-row-missing-label"
          className="stock-mono text-[10px] font-medium uppercase tracking-[0.14em]"
        >
          {labels.missing}
        </span>
        <span
          data-testid="stock-row-missing"
          className="text-md font-bold leading-none"
        >
          +{missing}
        </span>
      </span>
    </span>
  );
}

interface StockEntryStatusProps {
  state: StockStateDto;
  location: string;
}

function StockEntryStatus({ state, location }: StockEntryStatusProps) {
  const meta = getStockStateMeta(state);
  const label = state === STOCK_STATES[0] ? "Out" : meta.label;

  return (
    <span className="flex flex-shrink-0 flex-col items-end gap-1 pt-1">
      <span
        data-testid="stock-row-state"
        className="text-[11px] font-bold uppercase tracking-[0.12em]"
        style={{ color: meta.text }}
      >
        {label}
      </span>
      <span
        data-testid="stock-row-locations"
        className="stock-mono text-[11px] font-medium text-[var(--stock-muted)]"
      >
        {location}
      </span>
    </span>
  );
}

interface StockCompactEntryRowProps {
  row: CompactedReportRow;
  chips: readonly CriteriaChip[];
  countMode: StockCountMode;
  onPress: () => void;
}

// Screen 01 row: thumbnail, type and chips with short state/location metadata at the
// upper right; current and missing quantities share the split bar below.
export function StockCompactEntryRow({
  row,
  chips,
  countMode,
  onPress,
}: StockCompactEntryRowProps) {
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
          <StockPropertyChips chips={chips} maxRows={REPORT_ROW_CHIP_ROWS} />
        </span>
        <StockEntryStatus state={row.stockState} location={row.locations} />
      </span>
      <StockQuantityBar
        current={displayedCount(row, countMode)}
        missing={row.unitsToRestockTarget}
        countMode={countMode}
      />
    </button>
  );
}

interface StockGroupedEntryRowProps {
  entry: StockReportEntryDto;
  chips: readonly CriteriaChip[];
  countMode: StockCountMode;
  onPress: () => void;
}

// Screen 02 row: solid state rail, type and chips with short state/location metadata
// at the upper right; current and missing quantities share the split bar below.
export function StockGroupedEntryRow({
  entry,
  chips,
  countMode,
  onPress,
}: StockGroupedEntryRowProps) {
  const meta = getStockStateMeta(entry.stockState);

  return (
    <button
      type="button"
      data-testid="stock-report-entry"
      data-entry-key={`${entry.mergeKey}|${entry.stockState}|${entry.location}`}
      className="flex w-full flex-col gap-3 rounded-[24px] bg-[var(--stock-surface)] p-4 text-left shadow-[var(--stock-card-shadow)]"
      onClick={onPress}
    >
      <span className="flex w-full items-start gap-4">
        <span
          aria-hidden="true"
          className="block h-[38px] w-2 flex-shrink-0 rounded-[4px]"
          style={{ backgroundColor: meta.solid }}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="text-[14px] font-bold leading-tight text-[var(--stock-heading)]">
            {entry.itemCategory}
          </span>
          <StockPropertyChips chips={chips} maxRows={REPORT_ROW_CHIP_ROWS} />
        </span>
        <StockEntryStatus state={entry.stockState} location={entry.location} />
      </span>
      <StockQuantityBar
        current={displayedCount(entry, countMode)}
        missing={missingQuantityForEntry(entry)}
        countMode={countMode}
      />
    </button>
  );
}
