import { fixCheckRule } from "./warning-rules/fix-check.rule";
import { zoneMismatchRule } from "./warning-rules/zone-mismatch.rule";
const LOCATION_WARNING_RULES = [
    fixCheckRule,
    zoneMismatchRule,
];
export function evaluateLocationWarnings(item, location) {
    return LOCATION_WARNING_RULES.filter((rule) => rule.evaluate(item, location))
        .map((rule) => ({
        type: rule.type,
        priority: rule.priority,
    }))
        .sort((left, right) => left.priority - right.priority);
}
