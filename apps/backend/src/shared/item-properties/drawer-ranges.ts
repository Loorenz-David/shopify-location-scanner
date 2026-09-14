/**
 * Drawer-count ranges: how a stock definition selects by number of drawers.
 *
 * `drawers_range` is a DERIVED key, the same mechanism as `wood_group`. No item
 * stores it: the matcher computes it from the item's `drawers_qty` (a bare
 * count sent by the purchase API) — see `deriveItemProperties` in
 * best-match.ts. A definition selects the range; the raw count is never an
 * option, so there is no `drawers_qty` / `drawers_range` pair to reconcile.
 *
 * A count in no range — `0`, a blank, anything that is not a whole number —
 * gets no `drawers_range` at all and so matches no drawers criterion, wildcard
 * included. That is the safe default: an item with a missing or nonsensical
 * count is left uncounted rather than dropped into a range it may not belong
 * to (the same rule as a wood in no group).
 *
 * This table is the only place the ranges live — editing it moves the wizard's
 * options and the matcher together, with no migration and no backfill. Counts
 * follow on the next reconcile, which any definition create/update/delete
 * triggers (or rebuild-location-stock.ts).
 */
type DrawerRange = {
  name: string;
  min: number;
  // null: no upper bound.
  max: number | null;
};

export const DRAWER_RANGES: readonly DrawerRange[] = [
  { name: "1-2", min: 1, max: 2 },
  { name: "3-5", min: 3, max: 5 },
  { name: "6+", min: 6, max: null },
];

/** The item property the ranges are derived FROM. */
export const DRAWERS_QTY_KEY = "drawers_qty";
/** The derived property the ranges are selected AS. */
export const DRAWERS_RANGE_KEY = "drawers_range";

export const DRAWER_RANGE_NAMES: readonly string[] = DRAWER_RANGES.map(
  (range) => range.name,
);

/**
 * Checked once at load. Each throw is a configuration error that would
 * otherwise fail silently at match time: a name carrying a separator is
 * re-split by the tokenizer into pieces that match nothing, and overlapping or
 * unordered ranges would put one count in two ranges.
 */
(() => {
  let previousMax: number | null = 0;

  for (const range of DRAWER_RANGES) {
    if (/[,\/]/.test(range.name)) {
      throw new Error(
        `Drawer range name '${range.name}' cannot contain ',' or '/': the property tokenizer splits on both`,
      );
    }

    if (previousMax === null || range.min <= previousMax) {
      throw new Error(
        `Drawer range '${range.name}' overlaps the one before it; ranges must be ordered and disjoint`,
      );
    }

    if (range.max !== null && range.max < range.min) {
      throw new Error(`Drawer range '${range.name}' ends before it starts`);
    }

    previousMax = range.max;
  }
})();

/**
 * The range a stored `drawers_qty` value falls in, or `null` when it falls in
 * none. Only a whole, non-negative number is read as a count.
 */
export const drawerRangeOf = (stored: string): string | null => {
  const trimmed = stored.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const count = Number(trimmed);
  const range = DRAWER_RANGES.find(
    (candidate) =>
      count >= candidate.min &&
      (candidate.max === null || count <= candidate.max),
  );
  return range?.name ?? null;
};
