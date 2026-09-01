/**
 * `ScanHistory.properties` is one flat bag of strings fed by two sources:
 * Shopify product metafields and the Beyo Vintage purchase API. Shopify wins
 * any key collision. These caps apply to the merged result.
 */

export type ItemProperties = Record<string, string>;

export const MAX_PROPERTY_VALUE_LENGTH = 500;
export const MAX_PROPERTY_KEYS = 100;

/** Truncates long values and drops anything past the key cap, deterministically
 * (sorted by key) so the same keys survive on every sync. */
export const capProperties = (properties: ItemProperties): ItemProperties => {
  const keys = Object.keys(properties);
  if (
    keys.length <= MAX_PROPERTY_KEYS &&
    keys.every(
      (key) => (properties[key]?.length ?? 0) <= MAX_PROPERTY_VALUE_LENGTH,
    )
  ) {
    return properties;
  }

  const capped: ItemProperties = {};
  for (const key of keys.sort()) {
    if (Object.keys(capped).length >= MAX_PROPERTY_KEYS) {
      break;
    }

    const value = properties[key];
    if (value === undefined) {
      continue;
    }

    capped[key] = value.slice(0, MAX_PROPERTY_VALUE_LENGTH);
  }

  return capped;
};
