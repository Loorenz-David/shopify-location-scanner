import {
  getStockStateMeta,
  STOCK_STATES,
} from "./stock-states.domain";
import type { StockState } from "../types/stock.types";
import type { ThresholdDraft } from "../types/stock.types";
import type { StockThresholdDto } from "../types/stock.dto";

export type ThresholdRow = keyof ThresholdDraft;

// Ladder order, lowest band first. A null value means the state is not
// configured; at least one threshold must stay configured.
export const THRESHOLD_ROWS: readonly ThresholdRow[] = ["low", "medium", "high"];

const STATE_BY_ROW: Record<ThresholdRow, StockState> = {
  low: STOCK_STATES[1],
  medium: STOCK_STATES[2],
  high: STOCK_STATES[3],
};

export function stateForRow(row: ThresholdRow): StockState {
  return STATE_BY_ROW[row];
}

export interface StockThresholdBand {
  state: StockState;
  label: string;
  tint: string;
  text: string;
  minQuantity: number;
  maxQuantity: number | null;
}

// The wire carries only configured thresholds keyed by state; the draft keys
// them by ladder row with null for "not configured". Same adapter shape in
// both directions for the ladder and the read-only strip.
export function thresholdDraftFrom(
  thresholds: readonly StockThresholdDto[],
): ThresholdDraft {
  const limitFor = (state: StockState): number | null =>
    thresholds.find((threshold) => threshold.state === state)
      ?.thresholdQuantity ?? null;

  return {
    low: limitFor(STATE_BY_ROW.low),
    medium: limitFor(STATE_BY_ROW.medium),
    high: limitFor(STATE_BY_ROW.high),
  };
}

export function thresholdDtosFrom(draft: ThresholdDraft): StockThresholdDto[] {
  return THRESHOLD_ROWS.flatMap((row) => {
    const limit = draft[row];
    return limit === null
      ? []
      : [{ state: STATE_BY_ROW[row], thresholdQuantity: limit }];
  });
}

function configuredRows(draft: ThresholdDraft): ThresholdRow[] {
  return THRESHOLD_ROWS.filter((row) => draft[row] !== null);
}

export function countConfiguredThresholds(draft: ThresholdDraft): number {
  return configuredRows(draft).length;
}

// A committed value is clamped so every configured row below keeps one unit
// of room (low ≥ 1, and so on up the ladder).
function floorFor(draft: ThresholdDraft, row: ThresholdRow): number {
  const rowsBelow = THRESHOLD_ROWS.slice(0, THRESHOLD_ROWS.indexOf(row));
  return 1 + rowsBelow.filter((below) => draft[below] !== null).length;
}

function parseThresholdValue(value: number | string): number | null {
  if (typeof value === "number") {
    return Number.isInteger(value) ? value : null;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    // Clearing the field means "turn this threshold off".
    return 0;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && Number.isInteger(parsed) ? parsed : null;
}

export function commitThreshold(
  draft: ThresholdDraft,
  row: ThresholdRow,
  value: number | string,
): ThresholdDraft {
  const parsed = parseThresholdValue(value);
  if (parsed === null) {
    return { ...draft };
  }

  // 0 (or a cleared field) deletes the threshold; the last one must stay.
  if (parsed <= 0) {
    if (draft[row] === null || countConfiguredThresholds(draft) <= 1) {
      return { ...draft };
    }
    return { ...draft, [row]: null };
  }

  const index = THRESHOLD_ROWS.indexOf(row);
  const rowsBelow = THRESHOLD_ROWS.slice(0, index);
  const rowsAbove = THRESHOLD_ROWS.slice(index + 1);
  const next: ThresholdDraft = { ...draft };
  const previous = draft[row];

  const pushAboveUp = (from: number): void => {
    let highest = from;
    for (const above of rowsAbove) {
      const current = next[above];
      if (current === null) {
        continue;
      }
      if (current <= highest) {
        next[above] = highest + 1;
      }
      highest = next[above] as number;
    }
  };

  if (previous === null) {
    // Enabling a row: keep configured neighbours where they are and slot the
    // value in strictly above everything configured below it.
    const highestBelow = rowsBelow.reduce(
      (highest, below) => Math.max(highest, next[below] ?? 0),
      0,
    );
    const enabled = Math.max(parsed, highestBelow + 1);
    next[row] = enabled;
    pushAboveUp(enabled);
    return next;
  }

  const committed = Math.max(floorFor(draft, row), parsed);
  next[row] = committed;

  if (committed > previous) {
    pushAboveUp(committed);
  } else if (committed < previous) {
    let ceiling = committed;
    for (const below of [...rowsBelow].reverse()) {
      const current = next[below];
      if (current === null) {
        continue;
      }
      if (current >= ceiling) {
        next[below] = ceiling - 1;
      }
      ceiling = next[below] as number;
    }
  }

  return next;
}

function rangeLabel(minQuantity: number, maxQuantity: number): string {
  return minQuantity === maxQuantity
    ? String(minQuantity)
    : `${minQuantity}–${maxQuantity}`;
}

function bandFor(
  state: StockState,
  minQuantity: number,
  maxQuantity: number | null,
): StockThresholdBand {
  const meta = getStockStateMeta(state);

  return {
    state,
    label:
      maxQuantity === null
        ? `${minQuantity}+`
        : rangeLabel(minQuantity, maxQuantity),
    tint: meta.tint,
    text: meta.text,
    minQuantity,
    maxQuantity,
  };
}

// Out of stock and the configured states in ladder order, capped by the
// "extra" band above the highest configured threshold. Unconfigured states
// simply have no band.
export function deriveBands(draft: ThresholdDraft): StockThresholdBand[] {
  const bands: StockThresholdBand[] = [bandFor(STOCK_STATES[0], 0, 0)];
  let previousLimit = 0;

  for (const row of THRESHOLD_ROWS) {
    const limit = draft[row];
    if (limit === null) {
      continue;
    }
    bands.push(bandFor(STATE_BY_ROW[row], previousLimit + 1, limit));
    previousLimit = limit;
  }

  bands.push(bandFor(STOCK_STATES[4], previousLimit + 1, null));
  return bands;
}
