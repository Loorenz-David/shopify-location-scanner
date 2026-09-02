import type { StockCriteria } from "./property-criteria.js";

const sameKeySet = (left: StockCriteria, right: StockCriteria): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return leftKeys.length === rightKeys.length && leftKeys.every((key) => Object.prototype.hasOwnProperty.call(right, key));
};

const valuesIntersect = (left: string[] | null, right: string[] | null): boolean => {
  if (left === null || right === null) {
    return true;
  }
  return left.some((value) => right.includes(value));
};

export const findConflict = (
  candidate: StockCriteria,
  siblings: readonly { id: string; criteria: StockCriteria }[],
): { conflictingId: string } | null => {
  for (const sibling of siblings) {
    if (!sameKeySet(candidate, sibling.criteria)) {
      continue;
    }
    const conflictsOnEveryKey = Object.keys(candidate).every((key) => {
      const candidateValues = candidate[key];
      const siblingValues = sibling.criteria[key];
      return candidateValues !== undefined && siblingValues !== undefined && valuesIntersect(candidateValues, siblingValues);
    });
    if (conflictsOnEveryKey) {
      return { conflictingId: sibling.id };
    }
  }

  return null;
};
