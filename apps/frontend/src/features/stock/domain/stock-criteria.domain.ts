import type {
  StockOptionsDto,
  StockPropertiesDto,
} from "../types/stock.dto";

export interface CriteriaDraftProperty {
  key: string;
  selectedValues: readonly string[];
  anyValue?: boolean;
}

export interface CriteriaDraft {
  properties: readonly CriteriaDraftProperty[];
}

export function buildCriteria(draft: CriteriaDraft): StockPropertiesDto {
  const properties: StockPropertiesDto = {};

  for (const property of draft.properties) {
    if (property.anyValue) {
      properties[property.key] = null;
    } else if (property.selectedValues.length > 0) {
      properties[property.key] = [...property.selectedValues];
    }
  }

  return properties;
}

/**
 * Display names for property keys, applied everywhere a key is shown to a user.
 *
 * The wire key is what the API validates and what `StockPropertiesDto` carries;
 * it must never be what a user reads when it has a name here.
 *
 * `quantity` is the size of the set an item is sold in (a set of 6 chairs), not
 * a stock count — and it is rendered right next to the report's own quantity
 * numbers, so the raw key would read as a duplicate of them.
 */
const PROPERTY_KEY_LABELS: Readonly<Record<string, string>> = {
  quantity: "Set Of",
};

/**
 * The fallback for every key without an entry above: `wood_type` → `Wood Type`.
 *
 * Only the first character of each word is touched, so a key that already
 * carries deliberate casing is not flattened. A key that is nothing but
 * separators would humanize to an empty string, so the caller keeps the raw key
 * in that case — a blank label is worse than an ugly one.
 */
function humanizePropertyKey(key: string): string {
  return key
    .split("_")
    .filter((word) => word !== "")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

/**
 * The one place a property key becomes user-facing text.
 *
 * Display only: callers pass the wire key straight through to `buildCriteria`
 * and the API, and a label is never parsed back into one.
 */
export function propertyKeyLabel(key: string): string {
  const named = PROPERTY_KEY_LABELS[key];
  if (named !== undefined) {
    return named;
  }

  const humanized = humanizePropertyKey(key);
  return humanized === "" ? key : humanized;
}

export function displayValueFor(
  key: string,
  wireValue: string,
  options: StockOptionsDto,
): string {
  const propertyOption = options.propertyOptions.find(
    (option) => option.key === key,
  );
  const displayValue = propertyOption?.values.find(
    (value) => value.toLowerCase() === wireValue.toLowerCase(),
  );

  return displayValue ?? wireValue;
}

function comparePropertyKeys(
  left: string,
  right: string,
  keyOrder: ReadonlyMap<string, number>,
): number {
  const leftIndex = keyOrder.get(left);
  const rightIndex = keyOrder.get(right);

  if (leftIndex !== undefined || rightIndex !== undefined) {
    return (leftIndex ?? Number.POSITIVE_INFINITY) -
      (rightIndex ?? Number.POSITIVE_INFINITY);
  }

  return left.localeCompare(right);
}

export function renderCriteriaChips(
  properties: StockPropertiesDto,
  options: StockOptionsDto,
): string[] {
  const keyOrder = new Map(
    options.propertyOptions.map((option, index) => [option.key, index]),
  );

  return Object.entries(properties)
    .sort(([left], [right]) => comparePropertyKeys(left, right, keyOrder))
    .flatMap(([key, value]) => {
      if (value === null) {
        return [`${propertyKeyLabel(key).toUpperCase()} · any`];
      }

      const values = Array.isArray(value) ? value : [value];
      return values.map((wireValue) =>
        displayValueFor(key, wireValue, options),
      );
    });
}
