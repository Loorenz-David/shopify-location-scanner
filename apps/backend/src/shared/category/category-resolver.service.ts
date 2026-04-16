import { categoryParserService } from "./category-parser.service.js";

/**
 * Orchestrates category resolution with a strict priority pipeline:
 *
 *   1. Shopify metafield  — source of truth (set by batch migration or admin)
 *   2. CategoryParserService — title-based classification from the dictionary
 *   3. "unknown"  — deterministic fallback, never null
 *
 * This service contains no parsing logic; it only wires the pipeline.
 */
export const categoryResolverService = {
  resolve(metafieldValue: string | null | undefined, title: string): string {
    const trimmed = metafieldValue?.trim();
    if (trimmed) {
      return trimmed;
    }

    const parsed = categoryParserService.parse(title);
    if (parsed) {
      return parsed;
    }

    return "unknown";
  },
};
