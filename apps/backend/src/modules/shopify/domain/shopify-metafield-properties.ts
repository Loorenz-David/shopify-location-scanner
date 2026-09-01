import { env } from "../../../config/env.js";
import {
  MAX_PROPERTY_KEYS,
  MAX_PROPERTY_VALUE_LENGTH,
} from "../../../shared/item-properties/item-properties.js";
import { logger } from "../../../shared/logging/logger.js";

/**
 * Which Shopify product metafields become `ScanHistory.properties`, and how
 * their values are projected into the flat `Record<string, string>` bag.
 *
 * The bag is REPLACED wholesale on every write (see
 * `resolvePropertiesForUpdate` in scan-history.repository.ts), so whatever this
 * module returns is the complete truth for the Shopify half of an item's
 * properties. A metafield cleared in Shopify disappears here on the next sync.
 */

export type ShopifyMetafieldNode = {
  namespace: string;
  key: string;
  type: string;
  value: string | null;
};

/**
 * Metafields that already have a dedicated column on the record. Single source
 * of truth: it supplies the GraphQL variables for the aliased selections AND
 * the derived exclusion set below, so re-pointing a column at a different
 * metafield automatically stops that metafield from also landing in the bag.
 */
export const PROMOTED_METAFIELDS = {
  location: {
    namespace: env.SHOPIFY_METAFIELD_NAMESPACE,
    key: env.SHOPIFY_METAFIELD_KEY,
  },
  itemHeight: { namespace: "custom", key: "totalheight" },
  itemWidth: { namespace: "custom", key: "totalwidth" },
  itemDepth: { namespace: "custom", key: "totaldepth" },
  quantity: { namespace: "custom", key: "quantity" },
} as const;

/** Only metafields in these namespaces are considered. Everything else — other
 * apps' storage (judgeme, booster_apps_seo, mm-google-shopping, …), Shopify's
 * own taxonomy, SEO fields — is ignored. */
export const PROPERTY_METAFIELD_NAMESPACES: ReadonlySet<string> = new Set([
  "custom",
]);

/** Derived from PROMOTED_METAFIELDS — never hand-edited. */
const COLUMN_BACKED_KEYS: ReadonlySet<string> = new Set(
  Object.values(PROMOTED_METAFIELDS).map((metafield) => metafield.key),
);

/** Hand-maintained: keys we simply don't want in the bag. Exact keys only, no
 * pattern matching, so nothing is ever excluded by accident. */
export const EXCLUDED_PROPERTY_METAFIELD_KEYS: ReadonlySet<string> = new Set([
  "location", // the merchant's building; confusable with latestLocation
  "height_dimension", // structured duplicate of totalheight
  "width_dimension", // structured duplicate of totalwidth
  "depth_dimension", // structured duplicate of totaldepth
  "damage_details", // not wanted in the bag
  "link", // external auction URL, not an item attribute
  "reserved", // not wanted in the bag
]);

const METAFIELD_SELECTION_PAGE_SIZE = 100;

const DIMENSION_UNIT_ABBREVIATIONS: Record<string, string> = {
  CENTIMETERS: "cm",
  MILLIMETERS: "mm",
  METERS: "m",
  INCHES: "in",
  FEET: "ft",
  YARDS: "yd",
  KILOGRAMS: "kg",
  GRAMS: "g",
  POUNDS: "lb",
  OUNCES: "oz",
  LITERS: "l",
  MILLILITERS: "ml",
};

const isReferenceType = (type: string): boolean => type.endsWith("_reference");

const isMeasurementType = (type: string): boolean =>
  type === "dimension" || type === "weight" || type === "volume";

/**
 * Shopify returns every metafield value as a string, but not every string is
 * usable as-is: measurements arrive as `{"value":74.0,"unit":"CENTIMETERS"}`,
 * lists as JSON arrays, references as gids.
 *
 * Returns `null` when the metafield should not be stored at all.
 */
export const projectMetafieldValue = (
  type: string,
  rawValue: string,
): string | null => {
  // gids carry no meaning downstream, and rich text is a JSON document blob.
  if (isReferenceType(type) || type === "rich_text_field") {
    return null;
  }

  // Lists arrive as a JSON array and are flattened to a comma-separated string,
  // so every property value is a plain string regardless of source. The
  // purchase API sends its own multi-values the same way ("Teak,Walnut"), which
  // keeps `LIKE %value%` search working uniformly across both sources.
  if (type.startsWith("list.")) {
    try {
      const decoded: unknown = JSON.parse(rawValue);
      if (Array.isArray(decoded)) {
        return decoded
          .filter((member) => member !== null && member !== undefined)
          .map((member) => String(member).trim())
          .filter((member) => member !== "")
          .join(", ");
      }

      logger.warn("Shopify list metafield did not decode to an array", {
        type,
        rawValue: rawValue.slice(0, 120),
      });
    } catch {
      logger.warn("Shopify list metafield is not valid JSON", {
        type,
        rawValue: rawValue.slice(0, 120),
      });
    }

    return rawValue;
  }

  if (isMeasurementType(type)) {
    try {
      const decoded: unknown = JSON.parse(rawValue);
      if (
        decoded &&
        typeof decoded === "object" &&
        !Array.isArray(decoded) &&
        "value" in decoded &&
        typeof decoded.value === "number" &&
        Number.isFinite(decoded.value)
      ) {
        const rawUnit =
          "unit" in decoded && typeof decoded.unit === "string"
            ? decoded.unit
            : "";
        const unit =
          DIMENSION_UNIT_ABBREVIATIONS[rawUnit] ?? rawUnit.toLowerCase();
        // JSON.parse already normalises 74.0 to 74; 74.5 stays 74.5.
        const amount = String(decoded.value);

        return unit ? `${amount} ${unit}` : amount;
      }
    } catch {
      // fall through to the raw value
    }

    return rawValue;
  }

  return rawValue;
};

/** The GraphQL selection that fetches every metafield on a product. */
export const buildAllMetafieldsSelection = (): string =>
  `metafields(first: ${METAFIELD_SELECTION_PAGE_SIZE}) {
            nodes {
              namespace
              key
              type
              value
            }
          }`;

/**
 * Projects the raw metafield connection into the properties bag.
 *
 * Returns the COMPLETE set for the Shopify half — an empty object means "this
 * product has no property metafields", which is authoritative and will clear
 * whatever was stored. "Not fetched" is expressed by the caller passing no
 * nodes at all (see `metafieldProperties: null` on the snapshot).
 */
export const extractMetafieldProperties = (
  nodes: readonly ShopifyMetafieldNode[],
): Record<string, string> => {
  const properties: Record<string, string> = {};

  // Deterministic order so the key cap, when it bites, always drops the same
  // keys rather than whatever Shopify happened to return last.
  const sortedNodes = [...nodes].sort(
    (left, right) =>
      left.namespace.localeCompare(right.namespace) ||
      left.key.localeCompare(right.key),
  );

  for (const node of sortedNodes) {
    if (!PROPERTY_METAFIELD_NAMESPACES.has(node.namespace)) {
      continue;
    }

    const key = node.key.trim();
    if (!key || COLUMN_BACKED_KEYS.has(key) || EXCLUDED_PROPERTY_METAFIELD_KEYS.has(key)) {
      continue;
    }

    const rawValue = node.value?.trim();
    if (!rawValue) {
      continue;
    }

    const projected = projectMetafieldValue(node.type, rawValue);
    if (!projected) {
      continue;
    }

    if (Object.keys(properties).length >= MAX_PROPERTY_KEYS) {
      logger.warn("Shopify metafield property cap reached; dropping the rest", {
        cap: MAX_PROPERTY_KEYS,
        droppedKey: key,
      });
      break;
    }

    properties[key] = projected.slice(0, MAX_PROPERTY_VALUE_LENGTH);
  }

  return properties;
};
