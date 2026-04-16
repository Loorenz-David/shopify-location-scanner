/**
 * Static category dictionary derived from Shopify smart collection TITLE CONTAINS rules.
 * Maps one or more title substrings (key) → canonical snake_case category (value).
 *
 * Rules:
 *   - Keys are lowercase substrings that appear in product titles.
 *   - Values are canonical, snake_case, singular category identifiers.
 *   - Multiple keys may map to the same canonical (synonyms / plurals).
 *   - Entries are ordered longest-key-first so the parser can short-circuit on
 *     the first match without needing to re-sort at runtime.
 *   - Excluded: generic terms ("chairs"), empty-condition collections ("sale",
 *     "all products", "chair sales").
 *
 * To extend: add a new entry here; the parser and resolver pick it up automatically.
 */
export const CATEGORY_DICTIONARY: ReadonlyArray<{
  readonly match: string;
  readonly category: string;
}> = [
  // Multi-word — evaluated before single-word to ensure longest-match wins
  { match: "chest of drawers", category: "chest_of_drawers" },
  { match: "nest of tables", category: "nest_of_tables" },
  { match: "writing desk", category: "writing_desk" },
  { match: "bar cabinet", category: "bar_cabinet" },
  { match: "bedside table", category: "bedside_table" },
  { match: "dining chair", category: "dining_chair" },
  { match: "dining table", category: "dining_table" },
  { match: "coffee table", category: "coffee_table" },
  { match: "hall table", category: "hall_table" },
  { match: "small table", category: "small_side_table" },
  { match: "side table", category: "side_table" },
  { match: "secretary", category: "secretary_cabinet" },
  // Single-word
  { match: "armchairs", category: "armchair" },
  { match: "armchair", category: "armchair" },
  { match: "highboard", category: "highboard" },
  { match: "sideboard", category: "sideboard" },
  { match: "bookshelf", category: "bookshelf" },
  { match: "highboard", category: "highboard" },
  { match: "mirror", category: "mirror" },
  { match: "poster", category: "poster" },
  { match: "stool", category: "stool" },
  { match: "sofa", category: "sofa" },
  { match: "lamp", category: "lamp" },
];
