import { useState } from "react";

import { getStockStateMeta } from "../domain/stock-states.domain";
import {
  commitThreshold,
  countConfiguredThresholds,
  stateForRow,
  THRESHOLD_ROWS,
  thresholdDraftFrom,
  thresholdDtosFrom,
} from "../domain/stock-thresholds.domain";
import type { ThresholdRow } from "../domain/stock-thresholds.domain";
import type { StockThresholdDto } from "../types/stock.dto";
import type { ThresholdDraft } from "../types/stock.types";

interface StockThresholdLadderProps {
  thresholds: readonly StockThresholdDto[];
  onChange: (thresholds: StockThresholdDto[]) => void;
}

interface EditableRowProps {
  row: ThresholdRow;
  draft: ThresholdDraft;
  onCommit: (row: ThresholdRow, value: number | string) => void;
}

const stepperButtonClassName =
  "grid h-11 w-11 place-items-center rounded-[15px] bg-[var(--stock-surface)] text-[18px] font-medium leading-none text-[var(--stock-heading)] shadow-[0_4px_10px_rgba(31,60,52,0.08)] disabled:opacity-40 disabled:shadow-none";

function EditableRow({ row, draft, onCommit }: EditableRowProps) {
  const meta = getStockStateMeta(stateForRow(row));
  const value = draft[row];
  const isRemoved = value === null;
  // While the field is focused the user's text is shown as typed; it is committed on
  // blur / Enter through commitThreshold, which clamps or reverts junk.
  const [typed, setTyped] = useState<string | null>(null);
  // "−" is disabled when stepping down changes nothing: the row already sits at its floor.
  const isStepDownInert =
    value === null || commitThreshold(draft, row, value - 1)[row] !== value - 1;
  // The last remaining threshold cannot be removed.
  const isLastConfigured = !isRemoved && countConfiguredThresholds(draft) <= 1;
  const rowName = row.charAt(0).toUpperCase() + row.slice(1);

  const commitTyped = () => {
    if (typed !== null) {
      onCommit(row, typed);
      setTyped(null);
    }
  };

  return (
    <div
      className={`flex items-center justify-between gap-3 py-3 ${isRemoved ? "opacity-40" : ""}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className="text-[14px] font-bold leading-tight"
          style={{ color: isRemoved ? "var(--stock-muted)" : meta.text }}
        >
          {meta.label}
        </span>
        <span className="text-[12px] text-[var(--stock-body)]">
          {isRemoved ? "removed" : `up to ${value}`}
        </span>
      </div>
      {isRemoved ? (
        <button
          type="button"
          className="flex-shrink-0 rounded-[15px] bg-[var(--stock-track)] px-4 py-3 text-[13px] font-semibold text-[var(--stock-heading)]"
          aria-label={`Add ${row} threshold`}
          onClick={() => onCommit(row, 1)}
        >
          Add
        </button>
      ) : (
        <div className="flex flex-shrink-0 items-center gap-1">
          <div className="flex items-center gap-1 rounded-[18px] bg-[var(--stock-track)] p-1">
            <button
              type="button"
              className={stepperButtonClassName}
              aria-label={`Decrease ${row}`}
              disabled={isStepDownInert}
              onClick={() => onCommit(row, value - 1)}
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              className="stock-mono w-[52px] bg-transparent text-center text-[15px] font-medium text-[var(--stock-heading)] outline-none"
              aria-label={`${rowName} limit`}
              value={typed ?? String(value)}
              onFocus={() => setTyped(String(value))}
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
              className={stepperButtonClassName}
              aria-label={`Increase ${row}`}
              onClick={() => onCommit(row, value + 1)}
            >
              +
            </button>
          </div>
          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-[15px] text-[18px] leading-none text-[var(--stock-muted)] disabled:opacity-40"
            aria-label={`Remove ${row} threshold`}
            disabled={isLastConfigured}
            onClick={() => onCommit(row, 0)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Screen 09's ladder card: the three configurable states, highest on top, with an 8px
// colour rail down the left. Out of stock and Extra are fixed business rules (0, and
// above the highest threshold) so they are not shown while editing. Each row's "×"
// removes that threshold — the row fades and offers "Add" to bring it back — and the
// last configured row cannot be removed. The rail cells share the grid rows, so each
// colour block is exactly as tall as its row.
export function StockThresholdLadder({
  thresholds,
  onChange,
}: StockThresholdLadderProps) {
  const draft = thresholdDraftFrom(thresholds);

  const commit = (row: ThresholdRow, value: number | string) => {
    onChange(thresholdDtosFrom(commitThreshold(draft, row, value)));
  };

  const rows = [...THRESHOLD_ROWS].reverse();

  return (
    <div className="stock-card-surface grid grid-cols-[8px_1fr] overflow-hidden rounded-[24px] ">
      {rows.map((row, index) => (
        <div
          key={row}
          className="contents"
          data-testid="stock-ladder-row"
          data-row={row}
        >
          <div
            aria-hidden="true"
            style={{
              backgroundColor: getStockStateMeta(stateForRow(row)).solid,
              opacity: draft[row] === null ? 0.25 : 1,
            }}
          />
          <div
            className={`mx-5 py-3 ${index < rows.length - 1 ? "border-b border-[var(--stock-hairline)]" : ""}`}
          >
            <EditableRow row={row} draft={draft} onCommit={commit} />
          </div>
        </div>
      ))}
    </div>
  );
}
