// The report endpoints carry no image data (context/design-language.md §3.3), so a
// thumbnail is keyed off the item category label itself. Several categories share an
// illustration on purpose — an armchair stands in for easy chairs, a cabinet for
// wardrobes and porcelain. A category missing from this map is not an error: the row
// keeps the striped placeholder, so a vocabulary that grows past this list still renders.
const CATEGORY_IMAGE_URLS: Readonly<Record<string, string>> = {
  "Dining Chairs":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/dining_chair%201.webp",
  "Easy Chairs":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/armchair.webp",
  Armchairs:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/armchair.webp",
  Sofas:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/sofa%201.webp",
  Stools:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/stool%201.webp",
  "Seating Benches":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/bench%201.webp",
  "Dining Tables":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/dining_table.webp",
  "Bedside Tables":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/bed_side_table.webp",
  "Coffee Tables":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/coffee_table.webp",
  "Side Tables":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/sofa_table.webp",
  "Hall Tables":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/coffee_table.webp",
  "Writing Desks":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/writing_desk%201.webp",
  "Nest Of Tables":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/nest_of_tables.webp",
  Sideboards:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/sideboard.webp",
  Highboards:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/highboard.webp",
  Bookshelves:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/bookshelf.webp",
  "Shelving Units":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/shelving_system.webp",
  "Chest of Drawers":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/chest_of_drawer.webp",
  "Secretary Cabinets":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/secretary_table.webp",
  "Bar Cabinets":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/bar_cabinet.webp",
  Wardrobes:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/cabinet.webp",
  "Storage Cabinets":
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/cabinet.webp",
  Posters:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/poster.webp",
  Mirrors:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/mirror.webp",
  Porcelain:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/cabinet.webp",
  Carpets:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/poster.webp",
  Lamps:
    "https://test-bootstrap-local.s3.eu-north-1.amazonaws.com/images/ws_workspace_test/item_categories/lamp.webp",
};

// Casing and spacing are not stable across the wire, the options vocabulary and this
// list — `Chest of Drawers` and `Nest Of Tables` disagree inside the source list alone —
// so every lookup goes through the same normalized key.
function normalizeCategory(itemCategory: string): string {
  return itemCategory.trim().toLowerCase().replace(/\s+/g, " ");
}

const IMAGE_BY_NORMALIZED_CATEGORY = new Map(
  Object.entries(CATEGORY_IMAGE_URLS).map(([category, url]) => [
    normalizeCategory(category),
    url,
  ]),
);

export function getCategoryImageUrl(itemCategory: string): string | null {
  return IMAGE_BY_NORMALIZED_CATEGORY.get(normalizeCategory(itemCategory)) ?? null;
}
