import type { ItemModeRule } from "../../types/unified-scanner.types";

export const soldItemRule: ItemModeRule = {
  evaluate: (item) => (item.isSold ? "logistic" : null),
};
