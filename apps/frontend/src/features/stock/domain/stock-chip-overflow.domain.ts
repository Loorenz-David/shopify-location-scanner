// How many chips of a wrapped row survive a cap of `maxRows`, and how many are left for
// the "3+" pill to stand for. The answer depends on the laid-out geometry rather than on a
// guessed chip count: a criteria chip is as wide as its longest line, so two rows hold two
// chips or six depending on what the user configured. Positions come from the DOM and the
// arithmetic lives here, where it can be exercised without a layout engine.
export interface ChipBox {
  // The chip's offset top inside the wrapping container. Chips on one flex line share it.
  top: number;
  // The chip's right edge (offset left + width), i.e. where the next chip could start.
  right: number;
}

export interface ChipOverflowOptions {
  maxRows: number;
  containerWidth: number;
  // The pill as it will be laid out, and the column gap that would sit before it.
  pillWidth: number;
  gap: number;
}

export interface ChipOverflow {
  visibleCount: number;
  hiddenCount: number;
}

export function chipOverflow(
  boxes: readonly ChipBox[],
  { maxRows, containerWidth, pillWidth, gap }: ChipOverflowOptions,
): ChipOverflow {
  const rowTops = [...new Set(boxes.map((box) => box.top))];
  if (rowTops.length <= maxRows) {
    return { visibleCount: boxes.length, hiddenCount: 0 };
  }

  const lastTop = rowTops[maxRows - 1]!;
  let visibleCount = boxes.filter((box) => box.top <= lastTop).length;

  // The pill goes after the last kept chip, so it takes the place of the trailing chips on
  // the last kept row until there is room for it. Dropping a trailing chip never moves the
  // ones before it, which is why one pass over the original measurements is enough.
  while (
    visibleCount > 0 &&
    boxes[visibleCount - 1]!.top === lastTop &&
    boxes[visibleCount - 1]!.right + gap + pillWidth > containerWidth
  ) {
    visibleCount -= 1;
  }

  // Emptying the last row entirely leaves the pill to wrap onto it alone, still within the
  // cap; that is the floor, so the loop above stops at the row boundary.
  return { visibleCount, hiddenCount: boxes.length - visibleCount };
}
