import { findLocationByValue } from "../../logistic-locations/domain/logistic-locations.domain";
export function resolveShopLocation(code, options) {
    const normalizedCode = code.trim().toLowerCase();
    if (!normalizedCode) {
        return null;
    }
    const matchedOption = options.find((option) => option.value.trim().toLowerCase() === normalizedCode) ??
        options.find((option) => option.label.trim().toLowerCase() === normalizedCode) ??
        null;
    if (!matchedOption) {
        return null;
    }
    return {
        mode: "shop",
        code: matchedOption.value,
        label: matchedOption.label,
    };
}
export function resolveLogisticLocation(value, locations) {
    const match = findLocationByValue(locations, value);
    if (!match) {
        return null;
    }
    return {
        mode: "logistic",
        id: match.id,
        location: match.location,
        zoneType: match.zoneType,
    };
}
export function resolveLocation(value, mode, shopOptions, logisticLocations) {
    if (!mode) {
        return null;
    }
    if (mode === "shop") {
        return resolveShopLocation(value, shopOptions);
    }
    return resolveLogisticLocation(value, logisticLocations);
}
