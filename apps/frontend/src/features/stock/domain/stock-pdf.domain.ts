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
  StockFilterState,
  StockState,
} from "../types/stock.types";

export interface StockPdfExportQuery extends StockFilterState {
  includeSummaryCounts: boolean;
  showContributingLocations: boolean;
  propertyKeyOrder?: readonly string[];
}

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
  count: number;
}

export interface StockPdfSettings {
  states: string[];
  grouping: "Compacted across locations" | "Grouped by location";
  locations: string[];
  source: string;
}

export interface StockPdfModel {
  sections: StockPdfSection[];
  summaryCounts?: StockPdfSummaryCount[];
  settings: StockPdfSettings;
  entryCount: number;
  showContributingLocations: boolean;
  groupByLocation: boolean;
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
    unitsToNormalThreshold: missingQuantityForEntry(entry),
  }];
}

function toPdfRow(entry: StockReportEntryDto): StockPdfRow {
  return {
    mergeKey: entry.mergeKey,
    itemCategory: entry.itemCategory,
    properties: entry.properties,
    quantity: entry.quantity,
    unitsToNormalThreshold: missingQuantityForEntry(entry),
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

  const compareRows = makeCompactRowComparator(query.propertyKeyOrder ?? []);
  for (const state of STOCK_STATES) {
    result.get(state)!.sort(compareRows);
  }

  return result;
}

function summaryCounts(
  sections: readonly StockPdfSection[],
): StockPdfSummaryCount[] {
  const counts = new Map(
    sections.map((section) => [section.state, section.rows.length]),
  );

  return STOCK_STATES.map((state) => ({
    state,
    label: getStockStateMeta(state).label,
    count: counts.get(state) ?? 0,
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
  };

  if (query.includeSummaryCounts) {
    model.summaryCounts = summaryCounts(sections);
  }

  return model;
}

export function pdfFilename(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `beyo-stock-${date.getFullYear()}-${month}-${day}.pdf`;
}
