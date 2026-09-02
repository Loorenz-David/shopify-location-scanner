import { ValidationError } from "../../../shared/errors/http-errors.js";

export type StockCriteria = Record<string, string[] | null>;
export type StockCriteriaInput = Record<string, string | string[] | null>;

export const tokenizePropertyValue = (stored: string): Set<string> =>
  new Set(
    stored
      .split(/[,\/&]/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => token.toLowerCase()),
  );

export const normalizeCriteria = (input: StockCriteriaInput): StockCriteria => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ValidationError("Stock criteria must be an object");
  }

  const normalized: StockCriteria = {};
  for (const key of Object.keys(input).sort()) {
    const value = input[key];
    if (value === null) {
      normalized[key] = null;
      continue;
    }

    const values = Array.isArray(value) ? value : [value];
    if (!values.every((entry): entry is string => typeof entry === "string")) {
      throw new ValidationError("Stock criteria values must be strings or null");
    }

    const canonicalValues = [...new Set(values.map((entry) => entry.trim().toLowerCase()).filter(Boolean))].sort();
    if (canonicalValues.length === 0) {
      throw new ValidationError("Stock criteria values cannot be empty");
    }
    normalized[key] = canonicalValues;
  }

  return normalized;
};

export const canonicalCriteriaString = (criteria: StockCriteria): string => {
  const canonical: StockCriteria = {};
  for (const key of Object.keys(criteria).sort()) {
    const value = criteria[key];
    if (value !== undefined) {
      canonical[key] = value;
    }
  }
  return JSON.stringify(canonical);
};

export const matchesCriteria = (
  itemProperties: Record<string, string> | null,
  criteria: StockCriteria,
): boolean => {
  const keys = Object.keys(criteria);
  if (keys.length === 0) {
    return true;
  }
  if (itemProperties === null) {
    return false;
  }

  return keys.every((key) => {
    const acceptedValues = criteria[key];
    if (acceptedValues === undefined) {
      return false;
    }
    const hasKey = Object.prototype.hasOwnProperty.call(itemProperties, key);
    if (!hasKey) {
      return false;
    }

    const itemValue = itemProperties[key];
    if (typeof itemValue !== "string") {
      return false;
    }
    const itemTokens = tokenizePropertyValue(itemValue);
    if (itemTokens.size === 0) {
      return false;
    }

    return acceptedValues === null || acceptedValues.some((value) => itemTokens.has(value));
  });
};
