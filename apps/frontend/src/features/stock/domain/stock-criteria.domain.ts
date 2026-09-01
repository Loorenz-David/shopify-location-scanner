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
        return [`${key.toUpperCase()} · any`];
      }

      const values = Array.isArray(value) ? value : [value];
      return values.map((wireValue) =>
        displayValueFor(key, wireValue, options),
      );
    });
}
