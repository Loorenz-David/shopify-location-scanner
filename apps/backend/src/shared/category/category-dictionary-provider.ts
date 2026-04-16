import { CATEGORY_DICTIONARY } from "./category-dictionary.js";

export type CategoryDictionaryEntry = {
  readonly match: string;
  readonly category: string;
};

/**
 * Provides the ordered category dictionary to the parser.
 * Decoupled from the static data source so the provider can later
 * load from a file, database, or remote config without touching consumers.
 */
export const categoryDictionaryProvider = {
  getEntries(): ReadonlyArray<CategoryDictionaryEntry> {
    return CATEGORY_DICTIONARY;
  },
};
