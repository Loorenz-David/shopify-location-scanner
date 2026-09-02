import { getStockStateMeta, STOCK_STATES } from "../domain/stock-states.domain";
import type { CounterTiles } from "../types/stock.types";

interface StockCounterTilesProps {
  tiles: CounterTiles;
}

// Screen 01 counter strip: Out / Low / Medium tinted by their state's meta (MC1
// position 0/1/2 — the same idiom as StockThresholdStrip), Rest neutral. The missing
// unit totals arrive from computeCounterTiles through the store; nothing is summed here.
export function StockCounterTiles({ tiles }: StockCounterTilesProps) {
  const cells = [
    { bucket: "out", label: "Out", value: tiles.out, meta: getStockStateMeta(STOCK_STATES[0]) },
    { bucket: "low", label: "Low", value: tiles.low, meta: getStockStateMeta(STOCK_STATES[1]) },
    { bucket: "medium", label: "Medium", value: tiles.medium, meta: getStockStateMeta(STOCK_STATES[2]) },
    { bucket: "rest", label: "Rest", value: tiles.rest, meta: null },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map(({ bucket, label, value, meta }) => (
        <div
          key={bucket}
          data-testid="stock-counter-tile"
          data-bucket={bucket}
          className="flex flex-col gap-0.5 rounded-[16px] px-3 py-2.5"
          style={
            meta
              ? { backgroundColor: meta.tint, color: meta.text }
              : { backgroundColor: "rgba(255,255,255,0.65)", color: "var(--stock-muted)" }
          }
        >
          <span data-testid="stock-counter-value" className="text-[17px] font-bold leading-none">
            {value}
          </span>
          <span className="stock-mono text-[10px] uppercase tracking-[0.14em]">{label}</span>
        </div>
      ))}
    </div>
  );
}
