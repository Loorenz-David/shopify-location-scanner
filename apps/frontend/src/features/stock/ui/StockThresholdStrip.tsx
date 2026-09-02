import {
  deriveBands,
  thresholdDraftFrom,
} from "../domain/stock-thresholds.domain";
import type { StockThresholdDto } from "../types/stock.dto";

interface StockThresholdStripProps {
  thresholds: readonly StockThresholdDto[];
}

// The wire carries only the configured thresholds keyed by state; the strip
// previews one band per configured state. Out of stock and extra are fixed
// business rules the user never sets, so they stay off this preview.
export function StockThresholdStrip({ thresholds }: StockThresholdStripProps) {
  const bands = deriveBands(thresholdDraftFrom(thresholds), {
    includeFixedBands: false,
  });

  return (
    <div
      className="flex h-[30px] w-full overflow-hidden rounded-[12px]"
      aria-label="Threshold bands"
    >
      {bands.map((band) => (
        <span
          key={band.state}
          data-testid="stock-threshold-band"
          className="grid flex-1 place-items-center text-[12px] font-semibold leading-none"
          style={{ backgroundColor: band.tint, color: band.text }}
        >
          {band.label}
        </span>
      ))}
    </div>
  );
}
