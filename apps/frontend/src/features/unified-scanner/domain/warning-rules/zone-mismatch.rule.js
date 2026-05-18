import { hasPlacementZoneMismatch } from "../../../logistic-locations/domain/logistic-locations.domain";
export const zoneMismatchRule = {
    type: "zone-mismatch",
    priority: 2,
    evaluate(item, location) {
        if (location.mode !== "logistic") {
            return false;
        }
        if (!item.intention) {
            return false;
        }
        return hasPlacementZoneMismatch(item.intention, location.zoneType, item.fixItem);
    },
};
