import { getStockStateMeta } from "../domain/stock-states.domain";
import type { StockState } from "../types/stock.types";

interface StockStateBadgeProps {
  state: StockState;
  className?: string;
}

export function StockStateBadge({ state, className = "" }: StockStateBadgeProps) {
  const meta = getStockStateMeta(state);

  return (
    <span
      data-testid="stock-state-badge"
      className={`inline-flex items-center rounded-[9px] px-2.5 py-1 text-[11px] font-semibold leading-none ${className}`}
      style={{ backgroundColor: meta.tint, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}
