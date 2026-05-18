export function resolveItemScanHistoryDateRangePreset(from, to, now = new Date()) {
    const trimmedFrom = from.trim();
    const trimmedTo = to.trim();
    if (!trimmedFrom || !trimmedTo) {
        return "none";
    }
    const presets = [
        "today",
        "yesterday",
        "last_7_days",
        "last_1_month",
    ];
    for (const preset of presets) {
        const range = toDateRangeForPreset(preset, now);
        if (range.from === trimmedFrom && range.to === trimmedTo) {
            return preset;
        }
    }
    return "custom";
}
export function toDateRangeForPreset(preset, now = new Date()) {
    const today = atLocalDateBoundary(now);
    if (preset === "today") {
        const date = toInputDateString(today);
        return { from: date, to: date };
    }
    if (preset === "yesterday") {
        const yesterday = addDays(today, -1);
        const date = toInputDateString(yesterday);
        return { from: date, to: date };
    }
    if (preset === "last_7_days") {
        return {
            from: toInputDateString(addDays(today, -6)),
            to: toInputDateString(today),
        };
    }
    return {
        from: toInputDateString(addDays(today, -29)),
        to: toInputDateString(today),
    };
}
function atLocalDateBoundary(value) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
function addDays(value, days) {
    const copy = new Date(value);
    copy.setDate(copy.getDate() + days);
    return copy;
}
function toInputDateString(value) {
    const year = String(value.getFullYear());
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
