import { STOCK_STATES } from "../domain/stock-states.domain";
import { deriveBands } from "../domain/stock-thresholds.domain";
import type { StockThresholdDto } from "../types/stock.dto";
import type { StockState } from "../types/stock.types";

interface StockThresholdStripProps {
  thresholds: readonly StockThresholdDto[];
}

// The wire carries thresholds keyed by state; deriveBands wants the three limits in
// ladder order. Lookup by MC1 position (1 = low, 2 = medium, 3 = normal), never by
// array position — the contract fixes the set, not the order.
function limitFor(thresholds: readonly StockThresholdDto[], state: StockState): number {
  const match = thresholds.find((threshold) => threshold.state === state);
  if (!match) {
    throw new Error(`Stock configuration is missing a threshold for ${state}`);
  }

  return match.thresholdQuantity;
}

export function StockThresholdStrip({ thresholds }: StockThresholdStripProps) {
  const bands = deriveBands(
    limitFor(thresholds, STOCK_STATES[1]),
    limitFor(thresholds, STOCK_STATES[2]),
    limitFor(thresholds, STOCK_STATES[3]),
  );

  return (
    <div
      className="flex h-[30px] w-full overflow-hidden rounded-[12px]"
      aria-label="Threshold bands"
    >
      {bands.map((band) => (
        <span
          key={band.state}
          data-testid="stock-threshold-band"
          className="grid flex-1 place-items-center text-[13px] font-semibold leading-none"
          style={{ backgroundColor: band.tint, color: band.text }}
        >
          {band.label}
        </span>
      ))}
    </div>
  );
}
