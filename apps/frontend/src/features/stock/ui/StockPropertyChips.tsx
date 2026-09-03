import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { chipOverflow } from "../domain/stock-chip-overflow.domain";
import type { ChipOverflow } from "../domain/stock-chip-overflow.domain";
import type { CriteriaChip } from "../domain/stock-criteria.domain";

interface StockPropertyChipsProps {
  chips: readonly CriteriaChip[];
  // Report rows cap the wrap here and stand the rest behind a "3+" pill, so a definition
  // with many properties cannot grow its card without bound. The wizard, the location card
  // and the entry detail leave it unset and show every chip — the detail is one tap from a
  // truncated row, so nothing is out of reach.
  maxRows?: number;
}

const chipClassName =
  "inline-flex flex-col items-start gap-[3px] rounded-[10px] bg-[var(--stock-chip-bg)] px-2.5 py-1.5";

function chipsSignature(chips: readonly CriteriaChip[]): string {
  return chips.map((chip) => `${chip.key}:${chip.values.join(",")}`).join("|");
}

// Key over value, the way the quantity bar and the detail tiles already stack their
// eyebrow over a number: on a phone the label costs no extra width (a chip is as wide
// as its longest line) and a bare `4` or `None` stops reading as a stock count.
export function StockPropertyChips({ chips, maxRows }: StockPropertyChipsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  // null means "not measured yet", which is also the state every render begins in: the
  // measuring pass has to lay out every chip before it can say which ones fit.
  const [overflow, setOverflow] = useState<ChipOverflow | null>(null);
  const signature = `${maxRows}|${chipsSignature(chips)}`;
  const [measuredSignature, setMeasuredSignature] = useState(signature);

  // A different set of chips has to be measured from the full list again. Adjusting the
  // state during the render that brought the new chips in, rather than from an effect,
  // keeps the mount from throwing away the measurement its own layout effect just took.
  if (measuredSignature !== signature) {
    setMeasuredSignature(signature);
    setOverflow(null);
  }

  // So does a container that changed width. Truncating changes its height, not its width,
  // so guarding on width keeps the observer from chasing its own effect.
  useEffect(() => {
    const container = containerRef.current;
    // The house guard for jsdom, which implements no ResizeObserver.
    if (maxRows === undefined || container === null || typeof ResizeObserver === "undefined") {
      return;
    }

    let lastWidth = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (container.clientWidth === lastWidth) {
        return;
      }
      lastWidth = container.clientWidth;
      setOverflow(null);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [maxRows]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const pill = pillRef.current;
    if (maxRows === undefined || overflow !== null || container === null || pill === null) {
      return;
    }

    const boxes = [...container.children]
      .filter((child): child is HTMLElement => child instanceof HTMLElement && child !== pill)
      .map((chip) => ({ top: chip.offsetTop, right: chip.offsetLeft + chip.offsetWidth }));

    setOverflow(
      chipOverflow(boxes, {
        maxRows,
        containerWidth: container.clientWidth,
        pillWidth: pill.offsetWidth,
        gap: Number.parseFloat(getComputedStyle(container).columnGap) || 0,
      }),
    );
  });

  if (chips.length === 0) {
    return (
      <div className="flex flex-wrap gap-1.5">
        <em className="inline-flex items-center rounded-[10px] bg-[var(--stock-chip-bg)] px-2.5 py-1.5 text-[11px] font-semibold italic leading-none text-[var(--stock-faint)]">
          any property
        </em>
      </div>
    );
  }

  const isMeasuring = maxRows !== undefined && overflow === null;
  const visibleChips = overflow === null ? chips : chips.slice(0, overflow.visibleCount);
  // While measuring, the pill is laid out at its widest possible label so the count it
  // ends up with can only need less room than was reserved for it.
  const hiddenCount = overflow?.hiddenCount ?? chips.length;
  const showsPill = isMeasuring || (overflow?.hiddenCount ?? 0) > 0;

  return (
    <div ref={containerRef} className="flex flex-wrap gap-1.5">
      {visibleChips.map((chip, index) => (
        <span
          key={`${chip.key}-${index}`}
          data-testid="stock-property-chip"
          data-property-key={chip.key}
          className={chipClassName}
        >
          <span className="stock-mono text-[8px] font-medium uppercase leading-none tracking-[0.12em] text-[var(--stock-muted)]">
            {chip.label}
          </span>
          <span
            data-testid="stock-property-chip-value"
            className={`text-[11px] font-semibold leading-none ${
              chip.isWildcard
                ? "italic text-[var(--stock-faint)]"
                : "text-[var(--stock-body)]"
            }`}
          >
            {chip.values.join(", ")}
          </span>
        </span>
      ))}
      {/* The pill sits last, so keeping it in the flow while measuring cannot move a chip. */}
      {showsPill ? (
        <span
          ref={pillRef}
          data-testid="stock-property-chip-overflow"
          aria-label={`${hiddenCount} more ${hiddenCount === 1 ? "property" : "properties"}`}
          className={`inline-flex items-center self-stretch rounded-[10px] bg-[var(--stock-chip-bg)] px-2.5 text-[11px] font-semibold leading-none text-[var(--stock-muted)] ${
            isMeasuring ? "invisible" : ""
          }`}
        >
          {hiddenCount}+
        </span>
      ) : null}
    </div>
  );
}
