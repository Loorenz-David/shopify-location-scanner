// A location code is a letter block, a bay number, and optionally one or more `:level`
// segments — "H1", "LC13", "H1:1", "H1:2". Both location pickers group on this rule (the
// scanner's manual panel and the stock wizard's), so it lives in one place: while each
// carried its own `letters + digits` regex, every levelled code fell out of its block and
// was offered loose beside the letter cards.
const LOCATION_CODE = /^([A-Za-z]+)(\d+(?::\d+)*)$/;

export interface LocationCodeParts {
  // The block, uppercased: "H".
  letter: string;
  // Everything after the block, levels included: "1", "1:1". Not always a number.
  suffix: string;
}

export function splitLocationCode(code: string): LocationCodeParts | null {
  const match = code.trim().match(LOCATION_CODE);
  return match ? { letter: match[1]!.toUpperCase(), suffix: match[2]! } : null;
}

// The block a code belongs to, or null for a name that carries no block ("ZF").
export function locationBlockOf(code: string): string | null {
  return splitLocationCode(code)?.letter ?? null;
}

// A definition's location may be a prefix pattern rather than one code: "LC%"
// catches every code that starts with LC (LC10, LC9, LC1:2). The trailing `%`
// is the whole grammar — the backend rejects it anywhere else — so recognising
// one is a suffix test, and the block it stands for is what comes before it.
export const LOCATION_PATTERN_SUFFIX = "%";

export function isLocationPattern(code: string): boolean {
  return code.trim().endsWith(LOCATION_PATTERN_SUFFIX);
}

// The pattern that catches a whole letter block: "LC" -> "LC%".
export function patternForBlock(letter: string): string {
  return `${letter}${LOCATION_PATTERN_SUFFIX}`;
}

// The block a pattern stands for, or null when the code is not a pattern.
export function blockOfPattern(code: string): string | null {
  const trimmed = code.trim();
  return isLocationPattern(trimmed)
    ? trimmed.slice(0, -LOCATION_PATTERN_SUFFIX.length)
    : null;
}

/**
 * What the user reads. A concrete code shows as itself; a pattern shows as its
 * block and what it means, because "LC%" is our storage grammar and not
 * something anyone was asked to learn.
 */
export function formatLocationLabel(code: string): string {
  const block = blockOfPattern(code);
  return block === null ? code : `${block} \u00b7 all`;
}
