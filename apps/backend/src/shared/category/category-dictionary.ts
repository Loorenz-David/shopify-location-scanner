import type { ItemCategory } from "./item-categories.js";

/**
 * Title-parsing dictionary: maps lowercase title substrings to a canonical
 * category. Used only as a fallback for products whose Shopify `productType`
 * is unset or unrecognised — productType is the authoritative source.
 *
 * Rules:
 *   - Keys are lowercase substrings that appear in product titles.
 *   - Values are members of ITEM_CATEGORIES; the type enforces this.
 *   - Multiple keys may map to the same category (synonyms / plurals).
 *   - Entries are ordered longest-key-first so the parser can short-circuit on
 *     the first match without re-sorting at runtime (e.g. "corner cabinet"
 *     must precede "cabinet", "easy chair" must precede "chair").
 *   - Excluded: generic terms and empty-condition collections ("sale",
 *     "all products", "chair sales").
 *
 * To extend: add a new entry here; the parser and resolver pick it up
 * automatically.
 */
export const CATEGORY_DICTIONARY: ReadonlyArray<{
  readonly match: string;
  readonly category: ItemCategory;
}> = [
  // Multi-word — evaluated before single-word to ensure longest-match wins.
  // Within this section, longer matches come first so more-specific rules
  // shadow shorter catch-all rules.
  { match: "conference table", category: "Dining Tables" },
  { match: "chest of drawers", category: "Chest of Drawers" },
  { match: "chest of drawer",  category: "Chest of Drawers" }, // singular form
  { match: "serving trolley",  category: "Serving Trolleys" },
  { match: "corner cabinet",   category: "Storage Cabinets" },
  { match: "nest of tables",   category: "Nest Of Tables" },
  { match: "bedside table",    category: "Bedside Tables" },
  { match: "writing desk",     category: "Writing Desks" },
  { match: "sewing table",     category: "Side Tables" },
  { match: "dining chair",     category: "Dining Chairs" },
  { match: "dining table",     category: "Dining Tables" },
  { match: "coffee table",     category: "Coffee Tables" },
  { match: "plant stand",      category: "Hall Tables" },
  { match: "round table",      category: "Dining Tables" },
  { match: "bar cabinet",      category: "Bar Cabinets" },
  { match: "small table",      category: "Side Tables" },
  { match: "easy chair",       category: "Armchairs" }, // before the "chair" catch-all
  { match: "hall table",       category: "Hall Tables" },
  { match: "of drawers",       category: "Chest of Drawers" }, // "chest of 4 drawers" etc.
  { match: "side table",       category: "Side Tables" },
  { match: "secretaries",      category: "Secretary Cabinets" }, // stem differs from "secretary"
  { match: "secretary",        category: "Secretary Cabinets" },
  // Single-word
  { match: "armchairs",   category: "Armchairs" },
  { match: "armchair",    category: "Armchairs" },
  { match: "highboard",   category: "Highboards" },
  { match: "sideboard",   category: "Sideboards" },
  { match: "bookshelves", category: "Bookshelves" }, // stem differs from "bookshelf"
  { match: "bookshelf",   category: "Bookshelves" },
  { match: "shelving",    category: "Shelving Units" },
  { match: "wardrobe",    category: "Storage Cabinets" },
  { match: "trolley",     category: "Serving Trolleys" }, // fallback after "serving trolley"
  { match: "cabinet",     category: "Storage Cabinets" }, // catch-all after specific cabinet types
  { match: "chairs",      category: "Dining Chairs" },
  { match: "chair",       category: "Dining Chairs" },
  { match: "carpet",      category: "Carpets" },
  { match: "mirror",      category: "Mirrors" },
  { match: "poster",      category: "Posters" },
  { match: "bench",       category: "Seating Benches" },
  { match: "stool",       category: "Stools" },
  { match: "sofa",        category: "Sofas" },
  { match: "lamp",        category: "Lamps" },
];
