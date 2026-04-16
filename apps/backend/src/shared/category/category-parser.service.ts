import { categoryDictionaryProvider } from "./category-dictionary-provider.js";

/**
 * Pure, side-effect-free category parsing engine.
 *
 * Algorithm:
 *   1. Normalize the title to lowercase.
 *   2. Iterate dictionary entries (pre-ordered longest-match-first).
 *   3. Return the canonical category of the first matching entry.
 *   4. Return null if no match is found.
 *
 * The dictionary is ordered by the provider so this service never sorts —
 * adding entries in the correct position in the dictionary is sufficient.
 */
export const categoryParserService = {
  parse(title: string): string | null {
    const normalized = title.toLowerCase().trim();
    if (!normalized) {
      return null;
    }

    for (const entry of categoryDictionaryProvider.getEntries()) {
      if (normalized.includes(entry.match)) {
        return entry.category;
      }
    }

    return null;
  },
};
