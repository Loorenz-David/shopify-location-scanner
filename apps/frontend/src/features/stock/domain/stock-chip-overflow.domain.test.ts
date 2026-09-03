import { describe, expect, it } from "vitest";

import { chipOverflow } from "./stock-chip-overflow.domain";
import type { ChipBox } from "./stock-chip-overflow.domain";

// A container 220 wide holding two 100-wide chips per row, 6 apart: a row's second chip
// ends at 206, leaving 14 — room for neither the gap nor the pill.
const OPTIONS = { maxRows: 2, containerWidth: 220, pillWidth: 40, gap: 6 };

function boxesOnRows(rows: readonly number[][]): ChipBox[] {
  return rows.flatMap((widths, row) => {
    let left = 0;
    return widths.map((width) => {
      const box = { top: row * 30, right: left + width };
      left = box.right + OPTIONS.gap;
      return box;
    });
  });
}

describe("chip overflow", () => {
  it("leaves a list that fits within the cap alone", () => {
    expect(chipOverflow(boxesOnRows([[100, 100]]), OPTIONS)).toEqual({
      visibleCount: 2,
      hiddenCount: 0,
    });
    // Exactly at the cap, with no room to spare on the second row: still no pill.
    expect(chipOverflow(boxesOnRows([[100, 100], [100, 100]]), OPTIONS)).toEqual({
      visibleCount: 4,
      hiddenCount: 0,
    });
    expect(chipOverflow([], OPTIONS)).toEqual({ visibleCount: 0, hiddenCount: 0 });
  });

  it("keeps the rows within the cap and counts the rest behind the pill", () => {
    // The second row ends at 60 + 6 + 40 = 106 ≤ 220, so both its chips stay.
    const boxes = boxesOnRows([[100, 100], [60], [100]]);

    expect(chipOverflow(boxes, OPTIONS)).toEqual({ visibleCount: 3, hiddenCount: 1 });
  });

  it("gives up trailing chips on the last kept row until the pill fits", () => {
    // Row 2 is full (its second chip ends at 206), so the pill needs that chip's place.
    const boxes = boxesOnRows([[100, 100], [100, 100], [100]]);

    expect(chipOverflow(boxes, OPTIONS)).toEqual({ visibleCount: 3, hiddenCount: 2 });
  });

  it("empties the last kept row rather than spilling into a third", () => {
    // A single wide chip on row 2 leaves no room beside it, so the pill takes the row.
    const boxes = boxesOnRows([[100, 100], [210], [100]]);
    const result = chipOverflow(boxes, OPTIONS);

    expect(result).toEqual({ visibleCount: 2, hiddenCount: 2 });
    // The pill never displaces a chip on an earlier row, however little room is left.
    expect(
      chipOverflow(boxesOnRows([[210], [210], [100]]), OPTIONS),
    ).toEqual({ visibleCount: 1, hiddenCount: 2 });
  });

  it("caps at whatever number of rows it is given", () => {
    const boxes = boxesOnRows([[60], [60], [60], [60]]);

    expect(chipOverflow(boxes, { ...OPTIONS, maxRows: 1 })).toEqual({
      visibleCount: 1,
      hiddenCount: 3,
    });
    expect(chipOverflow(boxes, { ...OPTIONS, maxRows: 3 })).toEqual({
      visibleCount: 3,
      hiddenCount: 1,
    });
  });
});
