import { STOCK_STATES } from "../domain/stock-states.domain";
import type { CriteriaChip } from "../domain/stock-criteria.domain";
import type {
  LocationStockDto,
  StockPropertiesDto,
  StockReportEntryDto,
  StockThresholdDto,
} from "./stock.dto";

export type StockState = (typeof STOCK_STATES)[number];

export interface StockStateMeta {
  label: string;
  text: string;
  tint: string;
  solid: string;
}

// Which number the report shows as "in stock": allocated items (the basis of
// every threshold) or their unit sum. Per-device, default items (P7 D5).
export type StockCountMode = "instances" | "units";

export interface CompactedReportRow {
  mergeKey: string;
  itemCategory: string;
  properties: StockPropertiesDto;
  quantity: number;
  instanceCount: number;
  unitsToRestockTarget: number;
  stockState: StockState;
  locations: string;
  contributions: ReportContribution[];
}

export interface ReportContribution {
  location: string;
  quantity: number;
  instanceCount: number;
  unitsToRestockTarget: number;
}

export interface ReportLocationGroup {
  location: string;
  entries: StockReportEntryDto[];
}

export interface ReportEntryDetailItem {
  location: string;
  quantity: number;
  instanceCount: number;
  stockState: StockState;
  configLabel: string;
}

export interface ReportEntryDetail {
  entries: ReportEntryDetailItem[];
  isMultiLocation: boolean;
}

export type ReportView =
  | { rows: CompactedReportRow[] }
  | { groups: ReportLocationGroup[] };

export interface CounterTiles {
  out: number;
  low: number;
  medium: number;
  rest: number;
}

export interface StockFilterState {
  states: Set<StockState>;
  locations: Set<string>;
  groupByLocation: boolean;
}

export interface StockOperationError {
  message: string;
  conflicting?: {
    category: string;
    properties: CriteriaChip[];
  };
}

export interface WizardDraft {
  location: string;
  itemCategory: string;
  properties: StockPropertiesDto;
  thresholds: StockThresholdDto[];
}

export interface ThresholdDraft {
  low: number | null;
  medium: number | null;
  high: number | null;
}

export type StockInternalView =
  | "report"
  | "report-entry-detail"
  | "report-filter-sheet"
  | "report-pdf-sheet"
  | "locations-root"
  | "location-detail"
  | "wizard-step1"
  | "wizard-step2";

export type StockDefinition = LocationStockDto;
