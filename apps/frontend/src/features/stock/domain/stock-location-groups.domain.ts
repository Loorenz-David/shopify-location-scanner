import { splitLocationCode } from "../../../share/location-codes";

// The picker offers the letter block first and the codes inside it — the same two-step
// shape as the scanner's manual location panel, off the same parsing rule. A code that
// carries no block ("ZF") is not dropped: it comes back in `unstructured` and is offered
// whole on the first step.
export interface LocationLetterGroup {
  letter: string;
  locations: string[];
}

export interface GroupedLocations {
  groups: LocationLetterGroup[];
  unstructured: string[];
}

export function groupLocationsByLetter(
  locations: readonly string[],
): GroupedLocations {
  const byLetter = new Map<string, string[]>();
  const unstructured: string[] = [];

  for (const location of locations) {
    const split = splitLocationCode(location);
    if (split === null) {
      unstructured.push(location);
      continue;
    }
    const bucket = byLetter.get(split.letter) ?? [];
    bucket.push(location);
    byLetter.set(split.letter, bucket);
  }

  const groups = [...byLetter.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, group]) => ({
      letter,
      // Numeric collation, so 2 sorts before 10 rather than after it, and a bay's levels
      // (H1, H1:1, H1:2) stay together and in order ahead of the next bay.
      locations: group.sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    }));

  return { groups, unstructured };
}
