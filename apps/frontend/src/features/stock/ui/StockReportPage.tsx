import { useEffect, useState } from "react";

import { ChevronLeftIcon, FilterIcon } from "../../../assets/icons";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { stockActions } from "../actions/stock.actions";
import { renderCriteriaChips } from "../domain/stock-criteria.domain";
import { compactEntries } from "../domain/stock-report.domain";
import {
  countByStateBucket,
  getStockStateMeta,
  STOCK_STATES,
} from "../domain/stock-states.domain";
import { useStockReportFlow } from "../flows/use-stock-report.flow";
import {
  selectStockNavigationCurrentView,
  useStockNavigationStore,
} from "../stores/stock-navigation.store";
import {
  selectStockReportCounterTiles,
  selectStockReportEntries,
  selectStockReportErrorMessage,
  selectStockReportFilter,
  selectStockReportIsLoading,
  selectStockReportOptions,
  selectStockReportView,
  useStockReportStore,
} from "../stores/stock-report.store";
import type { StockOptionsDto, StockReportEntryDto } from "../types/stock.dto";
import type { CompactedReportRow, ReportLocationGroup } from "../types/stock.types";
import { StockCounterTiles } from "./StockCounterTiles";
import { StockEntryDetailView } from "./StockEntryDetailView";
import { StockFilterSheet } from "./StockFilterSheet";
import { StockFloatingPill } from "./StockFloatingPill";
import { StockCompactEntryRow, StockGroupedEntryRow } from "./StockReportEntryRows";

// The controller loads the GET 4.1 vocabulary beside the report (plan 4 C9); until it
// lands, chips fall back to the wire value rather than waiting.
const EMPTY_OPTIONS: StockOptionsDto = { itemCategories: [], propertyOptions: [] };

function pluralize(count: number, noun: string, plural = `${noun}s`): string {
  return `${count} ${count === 1 ? noun : plural}`;
}

interface StockReportGroupProps {
  group: ReportLocationGroup;
  options: StockOptionsDto;
  onOpenEntry: (entry: StockReportEntryDto) => void;
}

// Screen 02 group: code, hairline, `n to fix` badge tinted by the group's worst state.
// Entries arrive from buildReportView already in MC3 order (worst first), so the first
// entry carries the worst state; the three problem buckets come from countByStateBucket,
// the one place that knows which states are problems.
function StockReportGroup({ group, options, onOpenEntry }: StockReportGroupProps) {
  const buckets = countByStateBucket(group.entries.map((entry) => entry.stockState));
  const toFix = buckets.out + buckets.low + buckets.medium;
  const worstMeta = getStockStateMeta(group.entries[0]!.stockState);

  return (
    <section
      data-testid="stock-report-group"
      data-location={group.location}
      className="flex flex-col gap-3"
    >
      <header className="flex items-center gap-3 px-1">
        <h2 className="stock-mono m-0 text-[19px] font-bold text-[var(--stock-heading)]">
          {group.location}
        </h2>
        <span className="h-px flex-1 bg-[var(--stock-dashed)]" aria-hidden="true" />
        <span
          data-testid="stock-group-badge"
          className="rounded-[10px] px-2.5 py-1 text-[13px] font-bold"
          style={{ backgroundColor: worstMeta.tint, color: worstMeta.text }}
        >
          {toFix} to fix
        </span>
      </header>
      {group.entries.map((entry) => (
        <StockGroupedEntryRow
          key={`${entry.mergeKey}|${entry.stockState}|${entry.location}`}
          entry={entry}
          chips={renderCriteriaChips(entry.properties, options)}
          onPress={() => onOpenEntry(entry)}
        />
      ))}
    </section>
  );
}

interface StockReportRootViewProps {
  isFilterOpen: boolean;
  onOpenRow: (row: CompactedReportRow) => void;
}

function StockReportRootView({ isFilterOpen, onOpenRow }: StockReportRootViewProps) {
  useStockReportFlow();
  const entries = useStockReportStore(selectStockReportEntries);
  const storeOptions = useStockReportStore(selectStockReportOptions);
  const appliedFilter = useStockReportStore(selectStockReportFilter);
  const view = useStockReportStore(selectStockReportView);
  const counterTiles = useStockReportStore(selectStockReportCounterTiles);
  const isLoading = useStockReportStore(selectStockReportIsLoading);
  const errorMessage = useStockReportStore(selectStockReportErrorMessage);

  const options = storeOptions ?? EMPTY_OPTIONS;
  const keyOrder = options.propertyOptions.map((option) => option.key);
  const isGrouped = "groups" in view;
  const isInitialLoad = isLoading && entries.length === 0;
  const isStateFilterActive = appliedFilter.states.size !== STOCK_STATES.length;
  // Chip vocabulary for the sheet: every location the payload mentions, in payload order.
  const locations = [...new Set(entries.map((entry) => entry.location))];

  const scopeLabel = appliedFilter.locations.size === 0
    ? "All locations"
    : [...appliedFilter.locations].join(" · ");
  const subtitle = isGrouped
    ? `${pluralize(view.groups.length, "location")} · by severity`
    : `${scopeLabel} · ${pluralize(view.rows.length, "entry", "entries")}`;

  const setGrouping = (groupByLocation: boolean) => {
    if (groupByLocation !== appliedFilter.groupByLocation) {
      stockActions.setReportFilter({ ...appliedFilter, groupByLocation });
    }
  };

  const openEntry = (entry: StockReportEntryDto) => {
    // On screen 02 compaction is off, so the tapped entry is its own single-location
    // row (MC4 invariant c) and the detail shows that location alone.
    onOpenRow(compactEntries([entry])[0]!);
  };

  const isEmptyReport = !isInitialLoad && entries.length === 0;
  const isEmptyResult = !isInitialLoad && entries.length > 0 &&
    (isGrouped ? view.groups.length === 0 : view.rows.length === 0);

  const segmentClassName = (isActive: boolean) =>
    `h-11 flex-1 rounded-[16px] text-[15px] font-semibold transition ${
      isActive ? "bg-[var(--stock-primary)] text-white" : "text-[var(--stock-muted)]"
    }`;

  return (
    <section className="stock-area-font mx-auto flex w-full max-w-[720px] flex-col gap-3 px-5 pb-10">
      <header className="flex items-start gap-3">
        <button
          type="button"
          className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--stock-surface)] text-[var(--stock-heading)] shadow-[var(--stock-card-shadow)]"
          onClick={() => homeShellActions.selectNavigationPage("settings")}
          aria-label="Back to settings"
        >
          <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 pt-0.5">
          <h1 className="m-0 text-[21px] font-bold leading-tight text-[var(--stock-heading)]">
            Stock report
          </h1>
          <p
            data-testid="stock-report-scope"
            className="m-0 mt-0.5 text-[15px] text-[var(--stock-body)]"
          >
            {subtitle}
          </p>
        </div>
      </header>

      <div className="flex items-stretch gap-2">
        <div className="flex flex-1 gap-1 rounded-[20px] bg-[var(--stock-surface)] p-1 shadow-[var(--stock-card-shadow)]">
          <button
            type="button"
            aria-pressed={!isGrouped}
            className={segmentClassName(!isGrouped)}
            onClick={() => setGrouping(false)}
          >
            Compact
          </button>
          <button
            type="button"
            aria-pressed={isGrouped}
            className={segmentClassName(isGrouped)}
            onClick={() => setGrouping(true)}
          >
            By location
          </button>
        </div>
        <button
          type="button"
          aria-label="Filters"
          className="inline-flex h-[52px] min-w-[64px] items-center justify-center gap-1.5 rounded-[20px] border border-sky-200 bg-[var(--stock-surface)] px-3 text-sky-500 shadow-[var(--stock-card-shadow)]"
          onClick={() => stockActions.pushView("report-filter-sheet")}
        >
          {isStateFilterActive ? (
            <span data-testid="stock-filter-badge" className="text-[17px] font-bold">
              {appliedFilter.states.size}
            </span>
          ) : null}
          <FilterIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      <StockCounterTiles tiles={counterTiles} />

      {errorMessage ? (
        <div className="rounded-[16px] border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-1 flex flex-col gap-3 pb-[184px]">
        {isInitialLoad ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            <div className="h-[150px] animate-pulse rounded-[24px] bg-white/70" />
            <div className="h-[150px] animate-pulse rounded-[24px] bg-white/70" />
          </div>
        ) : null}

        {isEmptyReport ? (
          <div className="rounded-[24px] bg-[var(--stock-surface)] px-5 py-6 shadow-[var(--stock-card-shadow)]">
            <p className="m-0 text-[17px] font-bold text-[var(--stock-heading)]">
              Nothing to report yet
            </p>
            <p className="m-0 mt-1 text-[15px] leading-snug text-[var(--stock-body)]">
              The report lists stock instances configured under Stock locations. Configure
              one and it appears here.
            </p>
          </div>
        ) : null}

        {isEmptyResult ? (
          <div className="rounded-[24px] border-2 border-dashed border-[var(--stock-dashed)] px-5 py-6 text-center text-[15px] text-[var(--stock-muted)]">
            No entries match these filters.
          </div>
        ) : null}

        {isGrouped
          ? view.groups.map((group) => (
              <StockReportGroup
                key={group.location}
                group={group}
                options={options}
                onOpenEntry={openEntry}
              />
            ))
          : view.rows.map((row) => (
              <StockCompactEntryRow
                key={`${row.mergeKey}|${row.stockState}`}
                row={row}
                chips={renderCriteriaChips(row.properties, options)}
                onPress={() => onOpenRow(row)}
              />
            ))}
      </div>

      {/* Structurally held: enabled when P9 lands. The pill opens screen 05's Generate
          sheet, which P9 builds; until then it is shipped disabled, not wired. */}
      <StockFloatingPill label="Generate PDF" onPress={() => undefined} disabled />

      {isFilterOpen ? (
        <StockFilterSheet
          entries={entries}
          keyOrder={keyOrder}
          locations={locations}
          appliedFilter={appliedFilter}
          onApply={(filter) => {
            stockActions.setReportFilter(filter);
            stockActions.popView();
          }}
          onClose={() => stockActions.popView()}
        />
      ) : null}
    </section>
  );
}

export function StockReportPage() {
  const currentView = useStockNavigationStore(selectStockNavigationCurrentView);
  const entries = useStockReportStore(selectStockReportEntries);
  const storeOptions = useStockReportStore(selectStockReportOptions);
  const [selectedRow, setSelectedRow] = useState<CompactedReportRow | null>(null);

  // Entering from Settings always lands on the report, whatever view an earlier visit left behind.
  useEffect(() => {
    stockActions.resetNavigation("report");
  }, []);

  const openRow = (row: CompactedReportRow) => {
    setSelectedRow(row);
    stockActions.pushView("report-entry-detail");
  };

  if (currentView === "report-entry-detail" && selectedRow !== null) {
    return (
      <StockEntryDetailView
        row={selectedRow}
        entries={entries}
        options={storeOptions ?? EMPTY_OPTIONS}
        onBack={() => stockActions.popView()}
      />
    );
  }

  return (
    <StockReportRootView
      isFilterOpen={currentView === "report-filter-sheet"}
      onOpenRow={openRow}
    />
  );
}
