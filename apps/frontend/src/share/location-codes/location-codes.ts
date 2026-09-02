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
