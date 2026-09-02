import { useState } from "react";
import type { ReactNode } from "react";

import { getStockStateMeta, STOCK_STATES } from "../domain/stock-states.domain";
import {
  commitThreshold,
  deriveBands,
  stateForRow,
  THRESHOLD_ROWS,
  thresholdDraftFrom,
  thresholdDtosFrom,
} from "../domain/stock-thresholds.domain";
import type { ThresholdRow } from "../domain/stock-thresholds.domain";
import type { StockThresholdDto } from "../types/stock.dto";
import type { StockState, ThresholdDraft } from "../types/stock.types";

interface StockThresholdLadderProps {
  thresholds: readonly StockThresholdDto[];
  onChange: (thresholds: StockThresholdDto[]) => void;
}

interface DerivedRowProps {
  state: StockState;
  subtitle: string;
  value: string;
}

function DerivedRow({ state, subtitle, value }: DerivedRowProps) {
  const meta = getStockStateMeta(state);

  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-bold leading-tight text-[var(--stock-heading)]">
            {meta.label}
          </span>
          <span className="stock-mono rounded-[7px] bg-[var(--stock-chip-bg)] px-2 py-1 text-[10px] uppercase leading-none tracking-[0.14em] text-[var(--stock-muted)]">
            derived
          </span>
        </span>
        <span className="text-[12px] text-[var(--stock-body)]">{subtitle}</span>
      </div>
      <span
        className="stock-mono flex-shrink-0 text-[14px] font-medium"
        style={{ color: meta.text }}
      >
        {value}
      </span>
    </div>
  );
}

interface EditableRowProps {
  state: StockState;
  row: ThresholdRow;
  draft: ThresholdDraft;
  onCommit: (row: ThresholdRow, value: number | string) => void;
}

function EditableRow({ state, row, draft, onCommit }: EditableRowProps) {
  const meta = getStockStateMeta(state);
  const value = draft[row];
  // While the field is focused the user's text is shown as typed; it is committed on
  // blur / Enter through commitThreshold, which clamps, turns the row off on 0 or an
  // empty field, or reverts junk.
  const [typed, setTyped] = useState<string | null>(null);
  // "−" is disabled when stepping down changes nothing: the row is already off, or it
  // holds the only remaining threshold at its floor.
  const isStepDownInert =
    value === null ||
    commitThreshold(draft, row, value - 1)[row] === value;
  const rowName = row.charAt(0).toUpperCase() + row.slice(1);

  const commitTyped = () => {
    if (typed !== null) {
      onCommit(row, typed);
      setTyped(null);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className="text-[14px] font-bold leading-tight"
          style={{ color: meta.text }}
        >
          {meta.label}
        </span>
        <span className="text-[12px] text-[var(--stock-body)]">
          {value === null ? "off" : `up to ${value}`}
        </span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1 rounded-[18px] bg-[var(--stock-track)] p-1">
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-[15px] bg-[var(--stock-surface)] text-[18px] font-medium leading-none text-[var(--stock-heading)] shadow-[0_4px_10px_rgba(31,60,52,0.08)] disabled:opacity-40 disabled:shadow-none"
          aria-label={`Decrease ${row}`}
          disabled={isStepDownInert}
          onClick={() => {
            if (value !== null) {
              onCommit(row, value - 1);
            }
          }}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          className="stock-mono w-[52px] bg-transparent text-center text-[15px] font-medium text-[var(--stock-heading)] outline-none"
          aria-label={`${rowName} limit`}
          placeholder="off"
          value={typed ?? (value === null ? "" : String(value))}
          onFocus={() => setTyped(value === null ? "" : String(value))}
          onChange={(event) => setTyped(event.target.value)}
          onBlur={commitTyped}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          className="grid h-11 w-11 place-items-center rounded-[15px] bg-[var(--stock-surface)] text-[18px] font-medium leading-none text-[var(--stock-heading)] shadow-[0_4px_10px_rgba(31,60,52,0.08)]"
          aria-label={`Increase ${row}`}
          onClick={() => onCommit(row, value === null ? 1 : value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

// Screen 09's ladder card: highest state on top, an 8px colour rail down the left,
// derived Extra / Out of stock rows with no input, three editable rows bound to
// commitThreshold. A row showing "off" has no threshold; 0 or a cleared field turns a
// row off (the last configured row stays). The rail cells share the grid rows, so
// each colour block is exactly as tall as its row.
export function StockThresholdLadder({
  thresholds,
  onChange,
}: StockThresholdLadderProps) {
  const draft = thresholdDraftFrom(thresholds);
  const bands = deriveBands(draft);
  const extraBand = bands.at(-1)!;
  const outBand = bands[0]!;

  const commit = (row: ThresholdRow, value: number | string) => {
    onChange(thresholdDtosFrom(commitThreshold(draft, row, value)));
  };

  const editableRows = [...THRESHOLD_ROWS]
    .reverse()
    .map((row) => ({
      key: row,
      state: stateForRow(row),
      content: (
        <EditableRow
          state={stateForRow(row)}
          row={row}
          draft={draft}
          onCommit={commit}
        />
      ),
    }));

  const rows: { key: string; state: StockState; content: ReactNode }[] = [
    {
      key: "extra",
      state: STOCK_STATES[4],
      content: (
        <DerivedRow
          state={STOCK_STATES[4]}
          subtitle={`${extraBand.minQuantity} and above`}
          value={extraBand.label}
        />
      ),
    },
    ...editableRows,
    {
      key: "out",
      state: STOCK_STATES[0],
      content: (
        <DerivedRow
          state={STOCK_STATES[0]}
          subtitle="nothing on the shelf"
          value={outBand.label}
        />
      ),
    },
  ];

  return (
    <div className="stock-card-surface grid grid-cols-[8px_1fr] overflow-hidden rounded-[24px] ">
      {rows.map(({ key, state, content }, index) => (
        <div
          key={key}
          className="contents"
          data-testid="stock-ladder-row"
          data-row={key}
        >
          <div
            aria-hidden="true"
            style={{ backgroundColor: getStockStateMeta(state).solid }}
          />
          <div
            className={`mx-5 py-3 ${index < rows.length - 1 ? "border-b border-[var(--stock-hairline)]" : ""}`}
          >
            {content}
          </div>
        </div>
      ))}
    </div>
  );
}
