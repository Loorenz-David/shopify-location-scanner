import { STOCK_STATES } from "../domain/stock-states.domain";
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

export interface CompactedReportRow {
  mergeKey: string;
  itemCategory: string;
  properties: StockPropertiesDto;
  quantity: number;
  stockState: StockState;
  locations: string;
  contributions: ReportContribution[];
}

export interface ReportContribution {
  location: string;
  quantity: number;
}

export interface ReportLocationGroup {
  location: string;
  entries: StockReportEntryDto[];
}

export interface ReportEntryDetailItem {
  location: string;
  quantity: number;
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

export interface WizardDraft {
  location: string;
  itemCategory: string;
  properties: StockPropertiesDto;
  thresholds: StockThresholdDto[];
}

export interface ThresholdDraft {
  low: number;
  medium: number;
  normal: number;
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
