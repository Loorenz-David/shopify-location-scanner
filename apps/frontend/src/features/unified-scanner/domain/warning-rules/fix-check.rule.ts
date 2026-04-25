import type { LocationWarningRule } from "../../types/unified-scanner.types";

export const fixCheckRule: LocationWarningRule = {
  type: "fix-check",
  priority: 1,
  evaluate(item, location) {
    if (location.mode !== "logistic") {
      return false;
    }

    return item.fixItem && !item.isItemFixed && location.zoneType !== "for_fixing";
  },
};
