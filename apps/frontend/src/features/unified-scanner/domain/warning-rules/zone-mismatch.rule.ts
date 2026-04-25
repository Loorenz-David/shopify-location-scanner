import { hasPlacementZoneMismatch } from "../../../logistic-locations/domain/logistic-locations.domain";
import type { LocationWarningRule } from "../../types/unified-scanner.types";

export const zoneMismatchRule: LocationWarningRule = {
  type: "zone-mismatch",
  priority: 2,
  evaluate(item, location) {
    if (location.mode !== "logistic") {
      return false;
    }

    if (!item.intention) {
      return false;
    }

    return hasPlacementZoneMismatch(
      item.intention,
      location.zoneType,
      item.fixItem,
    );
  },
};
