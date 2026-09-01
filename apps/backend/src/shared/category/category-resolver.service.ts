import { logger } from "../logging/logger.js";
import { categoryParserService } from "./category-parser.service.js";
import {
  matchItemCategory,
  UNKNOWN_ITEM_CATEGORY,
  type ItemCategory,
} from "./item-categories.js";

/**
 * Orchestrates category resolution with a strict priority pipeline:
 *
 *   1. Shopify productType — authoritative, matched against the closed
 *      vocabulary (tolerant of casing and singular/plural variants)
 *   2. CategoryParserService — title-based classification from the dictionary
 *   3. "unknown" — deterministic fallback, never null
 *
 * A productType that is set but outside the vocabulary is logged and falls
 * through to title parsing: with a closed vocabulary an unrecognised type is a
 * data-quality signal, not a new category to invent.
 *
 * This service contains no parsing logic; it only wires the pipeline.
 */
export const categoryResolverService = {
  resolve(
    productType: string | null | undefined,
    title: string,
  ): ItemCategory | typeof UNKNOWN_ITEM_CATEGORY {
    const trimmedProductType = productType?.trim();

    if (trimmedProductType) {
      const matched = matchItemCategory(trimmedProductType);
      if (matched) {
        return matched;
      }

      logger.warn("Shopify productType is outside the category vocabulary", {
        productType: trimmedProductType,
        title,
      });
    }

    const parsed = categoryParserService.parse(title);
    if (parsed) {
      return parsed;
    }

    return UNKNOWN_ITEM_CATEGORY;
  },
};
