import { resolveBestMatch, type StockMatchCandidate } from "./best-match.js";

export type AllocationItem = {
  quantity: number;
  properties: Record<string, string> | null;
};

// Both numbers a definition carries. `quantity` is the sum of the allocated
// items' quantities; `instanceCount` is how many items were allocated, each
// counting 1 whatever its quantity (P7 owner decision D2).
export type AllocationTotals = {
  quantity: number;
  instanceCount: number;
};

export const emptyAllocationTotals = (): AllocationTotals => ({
  quantity: 0,
  instanceCount: 0,
});

// The one allocation loop: every candidate starts at 0/0, every item goes to
// its best match (or nowhere). The reconciliation service and the rebuild
// script both call this so the two can never disagree on either number.
export const allocateGroup = (
  candidates: readonly StockMatchCandidate[],
  items: readonly AllocationItem[],
): Map<string, AllocationTotals> => {
  const totals = new Map<string, AllocationTotals>(
    candidates.map((candidate) => [candidate.id, emptyAllocationTotals()]),
  );

  for (const item of items) {
    const winner = resolveBestMatch(candidates, item.properties);
    if (!winner) {
      continue;
    }

    const current = totals.get(winner.id) ?? emptyAllocationTotals();
    totals.set(winner.id, {
      quantity: current.quantity + item.quantity,
      instanceCount: current.instanceCount + 1,
    });
  }

  return totals;
};
