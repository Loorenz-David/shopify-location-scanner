import {
  buildReportView,
  makeCompactRowComparator,
  missingQuantityForEntry,
} from "./stock-report.domain";
import {
  getStockStateMeta,
  STOCK_STATES,
} from "./stock-states.domain";
import type { StockReportEntryDto } from "../types/stock.dto";
import type {
  CompactedReportRow,
  ReportContribution,
  StockCountMode,
  StockFilterState,
  StockState,
} from "../types/stock.types";

export interface StockPdfExportQuery extends StockFilterState {
  includeSummaryCounts: boolean;
  showContributingLocations: boolean;
  // Seeded from the report's mode when the sheet opens; editable there without
  // touching the report (P7 task 14).
  countMode: StockCountMode;
  propertyKeyOrder?: readonly string[];
}

export const STOCK_PDF_COUNT_LABELS: Record<StockCountMode, string> = {
  instances: "Items",
  units: "Units",
};

export type StockPdfRow = CompactedReportRow;

export interface StockPdfSection {
  state: StockState;
  label: string;
  isProduceFirst: boolean;
  rows: StockPdfRow[];
}

export interface StockPdfSummaryCount {
  state: StockState;
  label: string;
  missingQuantity: number;
}

export interface StockPdfSettings {
  states: string[];
  grouping: "Compacted across locations" | "Grouped by location";
  locations: string[];
  count: "Items" | "Units";
  source: string;
}

export interface StockPdfModel {
  sections: StockPdfSection[];
  summaryCounts?: StockPdfSummaryCount[];
  settings: StockPdfSettings;
  entryCount: number;
  showContributingLocations: boolean;
  groupByLocation: boolean;
  countMode: StockCountMode;
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0) ?? 0);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0) ?? 0);
  const length = Math.min(leftPoints.length, rightPoints.length);

  for (let index = 0; index < length; index += 1) {
    if (leftPoints[index] !== rightPoints[index]) {
      return leftPoints[index] - rightPoints[index];
    }
  }

  return leftPoints.length - rightPoints.length;
}

function contributionForEntry(entry: StockReportEntryDto): ReportContribution[] {
  return [{
    location: entry.location,
    quantity: entry.quantity,
    instanceCount: entry.instanceCount,
    unitsToRestockTarget: missingQuantityForEntry(entry),
  }];
}

function toPdfRow(entry: StockReportEntryDto): StockPdfRow {
  return {
    mergeKey: entry.mergeKey,
    itemCategory: entry.itemCategory,
    properties: entry.properties,
    quantity: entry.quantity,
    instanceCount: entry.instanceCount,
    unitsToRestockTarget: missingQuantityForEntry(entry),
    stockState: entry.stockState,
    locations: entry.location,
    contributions: contributionForEntry(entry),
  };
}

function rowsByState(
  entries: readonly StockReportEntryDto[],
  query: StockPdfExportQuery,
): Map<StockState, StockPdfRow[]> {
  const view = buildReportView(
    entries,
    query,
    query.propertyKeyOrder ?? [],
    query.countMode,
  );
  const result = new Map<StockState, StockPdfRow[]>(
    STOCK_STATES.map((state) => [state, []]),
  );

  if ("rows" in view) {
    for (const row of view.rows) {
      result.get(row.stockState)!.push(row);
    }
  } else {
    for (const group of view.groups) {
      for (const entry of group.entries) {
        result.get(entry.stockState)!.push(toPdfRow(entry));
      }
    }
  }

  const compareRows = makeCompactRowComparator(query.propertyKeyOrder ?? [], query.countMode);
  for (const state of STOCK_STATES) {
    result.get(state)!.sort(compareRows);
  }

  return result;
}

function summaryCounts(
  sections: readonly StockPdfSection[],
  selectedStates: ReadonlySet<StockState>,
): StockPdfSummaryCount[] {
  const counts = new Map(
    sections.map((section) => [
      section.state,
      section.rows.reduce(
        (total, row) => total + row.unitsToRestockTarget,
        0,
      ),
    ]),
  );

  return STOCK_STATES
    .filter((state) => selectedStates.has(state))
    .map((state) => ({
      state,
      label: getStockStateMeta(state).label,
      missingQuantity: counts.get(state) ?? 0,
    }));
}

function settingsFor(
  query: StockPdfExportQuery,
  entryCount: number,
): StockPdfSettings {
  const states = STOCK_STATES
    .filter((state) => query.states.has(state))
    .map((state) => getStockStateMeta(state).label);
  const locations = query.locations.size === 0
    ? ["All locations"]
    : [...query.locations].toSorted(compareCodePoints);

  return {
    states,
    grouping: query.groupByLocation
      ? "Grouped by location"
      : "Compacted across locations",
    locations,
    count: query.countMode === "units" ? "Units" : "Items",
    source: `Source: ${entryCount} ${entryCount === 1 ? "entry" : "entries"}`,
  };
}

export function buildPdfModel(
  entries: readonly StockReportEntryDto[],
  query: StockPdfExportQuery,
): StockPdfModel {
  const groupedRows = rowsByState(entries, query);
  const sections: StockPdfSection[] = [];
  let hasProducedFirst = false;

  for (const state of STOCK_STATES) {
    if (!query.states.has(state)) {
      continue;
    }

    const rows = groupedRows.get(state)!;
    if (rows.length === 0) {
      continue;
    }

    sections.push({
      state,
      label: getStockStateMeta(state).label,
      isProduceFirst: !hasProducedFirst,
      rows,
    });
    hasProducedFirst = true;
  }

  const entryCount = sections.reduce(
    (count, section) => count + section.rows.length,
    0,
  );
  const model: StockPdfModel = {
    sections,
    settings: settingsFor(query, entryCount),
    entryCount,
    showContributingLocations: query.showContributingLocations,
    groupByLocation: query.groupByLocation,
    countMode: query.countMode,
  };

  if (query.includeSummaryCounts) {
    model.summaryCounts = summaryCounts(sections, query.states);
  }

  return model;
}

export function pdfFilename(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `beyo-stock-${date.getFullYear()}-${month}-${day}.pdf`;
}
