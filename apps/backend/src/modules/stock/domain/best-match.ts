import { matchesCriteria, type StockCriteria } from "./property-criteria.js";

export type SpecificityScore = readonly [weight: number, valuedKeys: number, acceptedValues: number];

export type StockMatchCandidate = {
  id: string;
  createdAt: Date;
  criteria: StockCriteria;
};

export const specificityScore = (criteria: StockCriteria): SpecificityScore => {
  let weight = 0;
  let valuedKeys = 0;
  let acceptedValues = 0;

  for (const values of Object.values(criteria)) {
    if (values === null) {
      weight += 1;
    } else {
      weight += 2;
      valuedKeys += 1;
      acceptedValues += values.length;
    }
  }

  return [weight, valuedKeys, acceptedValues];
};

const candidateOutranks = (candidate: StockMatchCandidate, incumbent: StockMatchCandidate): boolean => {
  const candidateScore = specificityScore(candidate.criteria);
  const incumbentScore = specificityScore(incumbent.criteria);

  if (candidateScore[0] !== incumbentScore[0]) {
    return candidateScore[0] > incumbentScore[0];
  }
  if (candidateScore[1] !== incumbentScore[1]) {
    return candidateScore[1] > incumbentScore[1];
  }
  if (candidateScore[2] !== incumbentScore[2]) {
    return candidateScore[2] < incumbentScore[2];
  }
  if (candidate.createdAt.getTime() !== incumbent.createdAt.getTime()) {
    return candidate.createdAt.getTime() < incumbent.createdAt.getTime();
  }
  return candidate.id < incumbent.id;
};

export const resolveBestMatch = (
  candidates: readonly StockMatchCandidate[],
  itemProperties: Record<string, string> | null,
): StockMatchCandidate | null => {
  let winner: StockMatchCandidate | null = null;

  for (const candidate of candidates) {
    if (!matchesCriteria(itemProperties, candidate.criteria)) {
      continue;
    }
    if (winner === null || candidateOutranks(candidate, winner)) {
      winner = candidate;
    }
  }

  return winner;
};
