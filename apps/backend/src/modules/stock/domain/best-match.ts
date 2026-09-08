import {
  locationSpecificity,
  matchesLocation,
  parseLocationPattern,
  type LocationSpecificity,
} from "./location-pattern.js";
import {
  WOOD_GROUP_KEY,
  WOOD_TYPE_KEY,
  woodGroupOfToken,
} from "../../../shared/item-properties/wood-groups.js";
import {
  matchesCriteria,
  orderedPropertyTokens,
  type StockCriteria,
} from "./property-criteria.js";

export type SpecificityScore = readonly [weight: number, valuedKeys: number, acceptedValues: number];

export type StockMatchCandidate = {
  id: string;
  createdAt: Date;
  // The definition's stored location: one code ("LC10") or a prefix ("LC%").
  location: string;
  criteria: StockCriteria;
};

// The item side of a match: where it is, and what it is. Both are filters — a
// candidate has to pass its location pattern and its property criteria.
export type StockMatchItem = {
  location: string;
  properties: Record<string, string> | null;
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

/**
 * Adds the derived `wood_group` key to an item's properties.
 *
 * The value is the group of the item's FIRST `wood_type` token and nothing
 * else, so "Teak, Beech" is Teak: it matches a Teak group and not a Light one.
 * Because the derived value is a single token, `matchesCriteria`'s existing
 * "OR within a key" rule already gives first-token semantics with no change to
 * it, while `wood_type` itself keeps matching on ANY of the item's tokens.
 *
 * Applied once inside `resolveBestMatch`, which is the only caller of
 * `matchesCriteria` — so the incremental scan path and the absolute
 * reconciliation path cannot disagree about what an item's group is.
 *
 * A `wood_group` already present on the item is overwritten rather than
 * trusted: the key is excluded at ingestion, and a derived value is the only
 * definition of it the matcher recognises.
 */
export const deriveItemProperties = (
  properties: Record<string, string> | null,
): Record<string, string> | null => {
  if (properties === null) {
    return null;
  }

  const woodType = properties[WOOD_TYPE_KEY];
  if (typeof woodType !== "string") {
    return properties;
  }

  const [firstToken] = orderedPropertyTokens(woodType);
  if (firstToken === undefined) {
    return properties;
  }

  const group = woodGroupOfToken(firstToken);
  if (group === null) {
    // A wood in no group matches no group criterion, rather than falling into
    // some catch-all one.
    return properties;
  }

  return { ...properties, [WOOD_GROUP_KEY]: group };
};

/** A named wood is narrower than a group, and a group is narrower than "any
 * wood at all". The two keys are mutually exclusive, so at most one is read. */
export type WoodSpecificity = 0 | 1 | 2 | 3;

export const woodSpecificity = (criteria: StockCriteria): WoodSpecificity => {
  const woodType = criteria[WOOD_TYPE_KEY];
  if (woodType !== undefined) {
    return woodType === null ? 1 : 3;
  }

  const woodGroup = criteria[WOOD_GROUP_KEY];
  if (woodGroup !== undefined) {
    return woodGroup === null ? 1 : 2;
  }

  return 0;
};

const candidateLocationSpecificity = (
  candidate: StockMatchCandidate,
): LocationSpecificity => locationSpecificity(parseLocationPattern(candidate.location));

// Three tiers, read in order: location, then wood, then everything else.
//
// A concrete shelf ("LC10") always beats a block rule ("LC%"), and a named wood
// always beats a wood group, in both cases no matter how many other properties
// the broader definition pins down. Both are deliberate: a definition that
// names the exact thing is the one the user meant, and a broad rule is a net
// underneath it.
//
// Where neither a location pattern nor a wood group is in play, every candidate
// ties on the first three rungs and the ladder is exactly what it always was.
const candidateOutranks = (candidate: StockMatchCandidate, incumbent: StockMatchCandidate): boolean => {
  const candidateLocation = candidateLocationSpecificity(candidate);
  const incumbentLocation = candidateLocationSpecificity(incumbent);

  if (candidateLocation[0] !== incumbentLocation[0]) {
    return candidateLocation[0] > incumbentLocation[0];
  }
  if (candidateLocation[1] !== incumbentLocation[1]) {
    return candidateLocation[1] > incumbentLocation[1];
  }

  const candidateWood = woodSpecificity(candidate.criteria);
  const incumbentWood = woodSpecificity(incumbent.criteria);
  if (candidateWood !== incumbentWood) {
    return candidateWood > incumbentWood;
  }

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
  item: StockMatchItem,
): StockMatchCandidate | null => {
  // Derived once for the whole candidate list, not per candidate.
  const properties = deriveItemProperties(item.properties);
  let winner: StockMatchCandidate | null = null;

  for (const candidate of candidates) {
    if (!matchesLocation(parseLocationPattern(candidate.location), item.location)) {
      continue;
    }
    if (!matchesCriteria(properties, candidate.criteria)) {
      continue;
    }
    if (winner === null || candidateOutranks(candidate, winner)) {
      winner = candidate;
    }
  }

  return winner;
};
