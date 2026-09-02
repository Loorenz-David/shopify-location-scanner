import { useState } from "react";
import { createPortal } from "react-dom";

import { countPendingRows } from "../domain/stock-report.domain";
import { getStockStateMeta, STOCK_STATES } from "../domain/stock-states.domain";
import { createDefaultStockFilter } from "../stores/stock-report.store";
import type { StockReportEntryDto } from "../types/stock.dto";
import type { StockFilterState, StockState } from "../types/stock.types";

interface StockFilterSheetProps {
  entries: readonly StockReportEntryDto[];
  keyOrder: readonly string[];
  locations: readonly string[];
  appliedFilter: StockFilterState;
  onApply: (filter: StockFilterState) => void;
  onClose: () => void;
}

function cloneFilter(filter: StockFilterState): StockFilterState {
  return {
    states: new Set(filter.states),
    locations: new Set(filter.locations),
    groupByLocation: filter.groupByLocation,
  };
}

function CheckMark() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none">
      <path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const eyebrowClassName =
  "stock-mono m-0 text-[11px] uppercase tracking-[0.14em] text-[var(--stock-muted)]";

// Screen 03: bottom sheet over the dimmed report. It edits a pending copy of the filter;
// every count on it comes from countPendingRows over the pending selection (MC5, D12),
// and Apply hands the copy to the report controller in one call.
export function StockFilterSheet({
  entries,
  keyOrder,
  locations,
  appliedFilter,
  onApply,
  onClose,
}: StockFilterSheetProps) {
  const [pending, setPending] = useState<StockFilterState>(() => cloneFilter(appliedFilter));

  const pendingCount = countPendingRows(entries, pending, keyOrder);
  const countForState = (state: StockState): number =>
    countPendingRows(
      entries,
      { states: new Set([state]), locations: pending.locations, groupByLocation: pending.groupByLocation },
      keyOrder,
    );

  const toggleState = (state: StockState) => {
    setPending((current) => {
      const next = cloneFilter(current);
      if (next.states.has(state)) {
        next.states.delete(state);
      } else {
        next.states.add(state);
      }
      return next;
    });
  };

  // MC5 models locations as a set (empty = All): chips toggle, `All` clears.
  const toggleLocation = (location: string | null) => {
    setPending((current) => {
      const next = cloneFilter(current);
      if (location === null) {
        next.locations.clear();
      } else if (next.locations.has(location)) {
        next.locations.delete(location);
      } else {
        next.locations.add(location);
      }
      return next;
    });
  };

  const isAllLocations = pending.locations.size === 0;

  // Portaled to the body so no ancestor stacking context (the stock page root, the
  // shell) can lift the tab bar or the floating pill above the sheet (design 03 hides both).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filters"
      className="stock-area-font fixed inset-0 z-50 flex flex-col justify-end"
    >
      <button
        type="button"
        aria-label="Close filters"
        className="absolute inset-0 cursor-default"
        style={{ backgroundColor: "rgba(22,38,32,0.42)" }}
        onClick={onClose}
      />

      <section className="relative mx-auto flex max-h-[92svh] w-full max-w-[720px] flex-col rounded-t-[34px] bg-[var(--stock-surface)] shadow-[0_-20px_50px_rgba(20,40,32,0.2)]">
        <div className="flex justify-center pb-2 pt-3" aria-hidden="true">
          <span className="h-1.5 w-12 rounded-full bg-[var(--stock-hairline)]" />
        </div>

        <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-2">
          <header className="flex items-center justify-between">
            <h2 className="m-0 text-[24px] font-bold text-[var(--stock-heading)]">Filters</h2>
            <button
              type="button"
              className="text-[16px] font-semibold text-[var(--stock-primary)]"
              onClick={() => setPending(createDefaultStockFilter())}
            >
              Reset
            </button>
          </header>

          <div className="flex flex-col gap-2.5">
            <p className={eyebrowClassName}>Stock state</p>
            {STOCK_STATES.map((state) => {
              const meta = getStockStateMeta(state);
              const isSelected = pending.states.has(state);
              return (
                <label
                  key={state}
                  className={`flex cursor-pointer items-center gap-3 rounded-[16px] border-[1.5px] px-4 py-3 ${
                    isSelected
                      ? "border-[var(--stock-primary)] bg-[#F0F8F4]"
                      : "border-[#E4EAE7] bg-[var(--stock-surface)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={isSelected}
                    onChange={() => toggleState(state)}
                    aria-label={meta.label}
                  />
                  <span
                    aria-hidden="true"
                    className={`grid h-6 w-6 flex-shrink-0 place-items-center rounded-[7px] border-[1.5px] ${
                      isSelected
                        ? "border-[var(--stock-primary)] bg-[var(--stock-primary)] text-white"
                        : "border-[#C9D3CE] bg-white text-transparent"
                    }`}
                  >
                    <CheckMark />
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: meta.solid }}
                  />
                  <span className="flex-1 text-[17px] font-semibold text-[var(--stock-heading)]">
                    {meta.label}
                  </span>
                  <span className="text-[15px] font-semibold text-[var(--stock-muted)]">
                    {countForState(state)}
                  </span>
                </label>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            <p className={eyebrowClassName}>Locations</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={isAllLocations}
                className={`stock-mono rounded-[16px] px-5 py-3 text-[15px] font-medium ${
                  isAllLocations
                    ? "bg-[var(--stock-primary)] text-white"
                    : "bg-[var(--stock-chip-bg)] text-[var(--stock-body)]"
                }`}
                onClick={() => toggleLocation(null)}
              >
                All
              </button>
              {locations.map((location) => {
                const isSelected = pending.locations.has(location);
                return (
                  <button
                    key={location}
                    type="button"
                    aria-pressed={isSelected}
                    className={`stock-mono rounded-[16px] px-5 py-3 text-[15px] font-medium ${
                      isSelected
                        ? "bg-[var(--stock-primary)] text-white"
                        : "bg-[var(--stock-chip-bg)] text-[var(--stock-body)]"
                    }`}
                    onClick={() => toggleLocation(location)}
                  >
                    {location}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--stock-track)] px-4 py-3.5">
            <div>
              <p className="m-0 text-[17px] font-semibold text-[var(--stock-heading)]">
                Group by location
              </p>
              <p className="m-0 mt-0.5 text-[13px] text-[var(--stock-muted)]">
                Disables cross-location merge
              </p>
            </div>
            <label className="inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={pending.groupByLocation}
                onChange={(event) => {
                  const groupByLocation = event.currentTarget.checked;
                  setPending((current) => ({ ...cloneFilter(current), groupByLocation }));
                }}
                aria-label="Group by location"
              />
              <span
                className={`relative h-8 w-[60px] rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--stock-primary)] ${
                  pending.groupByLocation ? "bg-[var(--stock-primary)]" : "bg-[#C9D3CE]"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-all ${
                    pending.groupByLocation ? "left-[32px]" : "left-1"
                  }`}
                />
              </span>
            </label>
          </div>

          <button
            type="button"
            className="inline-flex h-14 w-full items-center justify-center rounded-[28px] bg-[var(--stock-primary)] text-[17px] font-semibold text-white shadow-[var(--stock-cta-shadow)] transition active:scale-[0.98]"
            onClick={() => onApply(pending)}
          >
            Show {pendingCount} {pendingCount === 1 ? "entry" : "entries"}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
