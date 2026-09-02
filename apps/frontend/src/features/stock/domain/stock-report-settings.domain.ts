import type { StockCountMode } from "../types/stock.types";

export interface StockReportSettings {
  countMode: StockCountMode;
}

// Per-device preference (P7 owner decision D5): which number the report and the
// PDF show as "in stock". Thresholds are item-based whatever the mode, so the
// missing figure never changes basis; only the current figure and its label do.
const STOCK_REPORT_SETTINGS_STORAGE_KEY = "stock-report-settings";

export const DEFAULT_STOCK_COUNT_MODE: StockCountMode = "instances";

const defaultStockReportSettings: StockReportSettings = {
  countMode: DEFAULT_STOCK_COUNT_MODE,
};

function isCountMode(value: unknown): value is StockCountMode {
  return value === "instances" || value === "units";
}

function getLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readStockReportSettings(): StockReportSettings {
  const storage = getLocalStorage();
  if (!storage) {
    return defaultStockReportSettings;
  }

  let rawValue: string | null;
  try {
    rawValue = storage.getItem(STOCK_REPORT_SETTINGS_STORAGE_KEY);
  } catch {
    return defaultStockReportSettings;
  }
  if (!rawValue) {
    return defaultStockReportSettings;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StockReportSettings> | null;
    return {
      countMode: isCountMode(parsed?.countMode)
        ? parsed.countMode
        : defaultStockReportSettings.countMode,
    };
  } catch {
    return defaultStockReportSettings;
  }
}

export function saveStockCountMode(countMode: StockCountMode): void {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  const next: StockReportSettings = { ...readStockReportSettings(), countMode };
  try {
    storage.setItem(STOCK_REPORT_SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the in-memory mode still applies for this visit.
  }
}
