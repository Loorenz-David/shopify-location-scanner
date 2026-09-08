import { ValidationError } from "../../../shared/errors/http-errors.js";

/**
 * A definition's `location` is either one concrete code ("LC10") or a prefix
 * pattern ("LC%") that catches every code starting with it — LC10, LC9, LC1:2.
 *
 * The `%` is ours, not SQL's: matching is a `startsWith` on the stripped prefix,
 * never a `LIKE` carrying user input, so `_` stays a literal character and no
 * pattern the user types can widen itself into something they did not ask for.
 */
export type LocationPattern =
  | { kind: "exact"; value: string }
  | { kind: "prefix"; prefix: string };

export const LOCATION_PATTERN_SUFFIX = "%";

/**
 * Both forms of location specificity in one comparable tuple: whether the
 * pattern is exact, then how much of a code it pins down. `resolveBestMatch`
 * reads this ahead of the property score, so a concrete shelf always wins over
 * a block rule however detailed that block rule's properties are.
 */
export type LocationSpecificity = readonly [exact: 0 | 1, length: number];

export const parseLocationPattern = (stored: string): LocationPattern => {
  const trimmed = stored.trim();
  if (trimmed === "") {
    throw new ValidationError("Location cannot be empty");
  }

  const suffixIndex = trimmed.indexOf(LOCATION_PATTERN_SUFFIX);
  if (suffixIndex === -1) {
    return { kind: "exact", value: trimmed };
  }

  // One trailing `%`, and something in front of it. A bare "%" would catch every
  // location in the shop from a picker that never offered that choice, and a `%`
  // in the middle reads as a wildcard the matcher does not implement.
  if (suffixIndex !== trimmed.length - 1) {
    throw new ValidationError(
      "A location pattern may only use '%' as its last character",
    );
  }

  const prefix = trimmed.slice(0, suffixIndex);
  if (prefix === "") {
    throw new ValidationError("A location pattern needs a prefix before '%'");
  }

  return { kind: "prefix", prefix };
};

export const isLocationPattern = (stored: string): boolean =>
  parseLocationPattern(stored).kind === "prefix";

export const matchesLocation = (
  pattern: LocationPattern,
  itemLocation: string,
): boolean =>
  pattern.kind === "exact"
    ? pattern.value === itemLocation
    : itemLocation.startsWith(pattern.prefix);

/**
 * The letter block a concrete code belongs to: "LC10" and "LC2:1" are both LC.
 *
 * Returns null when the code has no block/number split to make — an already
 * stored pattern, or a code that is nothing but letters. That second case
 * matters: turning "STORE" into "STORE%" would silently widen it to catch
 * "STOREROOM", so a caller converting codes to patterns must skip it rather
 * than guess.
 */
export const locationBlock = (stored: string): string | null => {
  const trimmed = stored.trim();
  if (trimmed.includes(LOCATION_PATTERN_SUFFIX)) {
    return null;
  }

  const match = /^([A-Za-z]+)[0-9].*$/.exec(trimmed);
  return match?.[1] ?? null;
};

export const locationSpecificity = (
  pattern: LocationPattern,
): LocationSpecificity =>
  pattern.kind === "exact"
    ? [1, pattern.value.length]
    : [0, pattern.prefix.length];
