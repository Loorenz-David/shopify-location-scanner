import type { ItemCategory } from "../category/item-categories.js";

export const ITEM_PROPERTY_OPTIONS = [
  {
    key: "wood_type",
    values: ["Beech", "Birch", "Cherry", "Elm", "Mahogany", "Oak", "Santos Rosewood", "Teak", "Walnut"],
    categories: "universal",
  },
  {
    key: "years",
    values: ["1950-1960s", "1960-1970s", "1970-1980s", "1980-1990s", "Early 20th century furniture"],
    categories: "universal",
  },
  {
    key: "weight_definition",
    values: ["1-20 kg", "21-40 kg", "41-60 kg", "61+ kg"],
    categories: "universal",
  },
  {
    key: "country",
    values: ["Denmark", "Sweden", "Germany", "United Kingdom", "Italy", "Netherland"],
    categories: "universal",
  },
  {
    key: "shape",
    values: ["Oval", "Rectangular", "Round", "Square"],
    categories: ["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"],
  },
  {
    key: "extension_type",
    values: ["Inside Extension", "Outside Extension"],
    categories: ["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"],
  },
  {
    key: "extension_quantity",
    values: ["1", "2", "3", "4"],
    categories: ["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"],
  },
  {
    key: "upholstery",
    values: ["Up", "Down"],
    categories: ["Dining Chairs", "Easy Chairs", "Armchairs"],
  },
] as const;

export const getPropertyOptionsForCategory = (itemCategory: ItemCategory) =>
  ITEM_PROPERTY_OPTIONS.filter(
    (option) => option.categories === "universal" || (option.categories as readonly ItemCategory[]).includes(itemCategory),
  );
