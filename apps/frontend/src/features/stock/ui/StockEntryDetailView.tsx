import { ChevronLeftIcon } from "../../../assets/icons";
import { criteriaChips } from "../domain/stock-criteria.domain";
import { countNoun } from "../domain/stock-count-mode.domain";
import { deriveEntryDetail, displayedCount } from "../domain/stock-report.domain";
import { getStockStateMeta } from "../domain/stock-states.domain";
import type { StockOptionsDto, StockReportEntryDto } from "../types/stock.dto";
import type { CompactedReportRow, StockCountMode } from "../types/stock.types";
import { StockPropertyChips } from "./StockPropertyChips";
import { StockCategoryThumbnail } from "./StockCategoryThumbnail";

interface StockEntryDetailViewProps {
  row: CompactedReportRow;
  entries: readonly StockReportEntryDto[];
  options: StockOptionsDto;
  countMode: StockCountMode;
  onBack: () => void;
}

function InfoIcon() {
  return (
    <span
      aria-hidden="true"
      className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-sky-500 text-[12px] font-bold text-white"
    >
      i
    </span>
  );
}

// Screen 04: header card (thumbnail, type, chips, state tile, total), the contributing
// per-location rows from deriveEntryDetail (MC9), and the merge-explainer note only when
// more than one location contributes. No action buttons — `Scanned items` and `Add task`
// were a mockup error (intention D4) and are removed, not deferred.
export function StockEntryDetailView({ row, entries, options, countMode, onBack }: StockEntryDetailViewProps) {
  const meta = getStockStateMeta(row.stockState);
  const total = displayedCount(row, countMode);
  const chips = criteriaChips(row.properties, options);
  const detail = deriveEntryDetail(row, entries, options);
  const locationCount = detail.entries.length;

  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-4 px-5 pb-10">
      <header className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
          onClick={onBack}
          aria-label="Back to the report"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <p className="m-0 text-[14px] font-semibold text-[var(--stock-muted)]">Report entry</p>
      </header>

      <article
        data-testid="stock-detail-header"
        className="flex flex-col gap-4 rounded-[26px] bg-[var(--stock-surface)] p-4 shadow-[var(--stock-card-shadow)]"
      >
        <div className="flex items-start gap-4">
          <StockCategoryThumbnail itemCategory={row.itemCategory} size={88} />
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
            <h1 className="m-0 text-[17px] font-bold leading-tight text-[var(--stock-heading)]">
              {row.itemCategory}
            </h1>
            <StockPropertyChips chips={chips} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div
            data-testid="stock-detail-state"
            className="flex flex-col gap-1 rounded-[18px] px-4 py-3.5"
            style={{ backgroundColor: meta.tint, color: meta.text }}
          >
            <span className="stock-mono text-[10px] uppercase tracking-[0.14em]">State</span>
            <span className="text-[16px] font-bold leading-tight">{meta.label}</span>
          </div>
          <div
            data-testid="stock-detail-total"
            className="flex flex-col gap-1 rounded-[18px] bg-[var(--stock-track)] px-4 py-3.5"
          >
            <span className="stock-mono text-[10px] uppercase tracking-[0.14em] text-[var(--stock-muted)]">
              Total
            </span>
            <span className="text-[16px] font-bold leading-tight text-[var(--stock-heading)]">
              {total} {countNoun(total, countMode)}
            </span>
          </div>
        </div>
      </article>

      <div className="flex items-center justify-between px-1">
        <p className="stock-mono m-0 text-[10px] uppercase tracking-[0.14em] text-[var(--stock-muted)]">
          Contributing locations
        </p>
        <span
          data-testid="stock-detail-count"
          className="text-[14px] font-semibold text-[var(--stock-muted)]"
        >
          {locationCount}
        </span>
      </div>

      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {detail.entries.map((item) => {
          const itemMeta = getStockStateMeta(item.stockState);
          return (
            <li
              key={item.location}
              data-testid="stock-detail-contribution"
              className="flex items-center gap-4 rounded-[24px] bg-[var(--stock-surface)] py-4 pl-4 pr-5 shadow-[var(--stock-card-shadow)]"
            >
              <span
                aria-hidden="true"
                className="block h-[38px] w-2 flex-shrink-0 rounded-[4px]"
                style={{ backgroundColor: itemMeta.solid }}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="stock-mono text-[14px] font-semibold text-[var(--stock-heading)]">
                  {item.location}
                </span>
                <span className="text-[12px] text-[var(--stock-muted)]">{item.configLabel}</span>
              </span>
              <span className="flex flex-shrink-0 flex-col items-end">
                <span
                  data-testid="stock-row-quantity"
                  className="text-[17px] font-bold leading-none text-[var(--stock-heading)]"
                >
                  {displayedCount(item, countMode)}
                </span>
                <span
                  className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em]"
                  style={{ color: itemMeta.text }}
                >
                  {itemMeta.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {detail.isMultiLocation ? (
        <div
          data-testid="stock-detail-note"
          className="flex items-start gap-3 rounded-[22px] bg-[#EEF6FC] px-4 py-4 text-[14px] leading-snug text-[var(--stock-body)]"
        >
          <InfoIcon />
          <p className="m-0">
            Same state across {locationCount === 2 ? "both" : `all ${locationCount}`} locations,
            so quantities are merged. Stock in a healthier location is never merged into
            this entry.
          </p>
        </div>
      ) : null}
    </section>
  );
}
