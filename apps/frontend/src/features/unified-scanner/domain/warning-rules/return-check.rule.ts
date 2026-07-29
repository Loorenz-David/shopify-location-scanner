import type { LocationWarningRule } from "../../types/unified-scanner.types";

export const returnCheckRule: LocationWarningRule = {
  type: "return-check",
  priority: 3,
  evaluate(item, location) {
    return location.mode === "shop" && item.isSold;
  },
};
