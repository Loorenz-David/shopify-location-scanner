const NARROW_NO_LOCALE = "nb-NO";

const intlFull = new Intl.NumberFormat(NARROW_NO_LOCALE, {
  maximumFractionDigits: 0,
});

/**
 * Formats a numeric value as a friendly kr amount.
 * Uses narrow non-breaking spaces as thousands separators (Norwegian locale).
 *
 * Examples:
 *   formatKr(1000)    → "1 000 kr"
 *   formatKr(12500)   → "12 500 kr"
 *   formatKr(1200000) → "1 200 000 kr"
 */
export function formatKr(value: number): string {
  return `${intlFull.format(Math.round(value))} kr`;
}

/**
 * Compact version for chart axes where space is limited.
 *   formatKrCompact(1200)   → "1,2k kr"
 *   formatKrCompact(1200000) → "1,2M kr"
 */
export function formatKrCompact(value: number): string {
  if (value >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M kr`;
  if (value >= 1_000)
    return `${(value / 1_000).toFixed(1).replace(".", ",")}k kr`;
  return `${Math.round(value)} kr`;
}
