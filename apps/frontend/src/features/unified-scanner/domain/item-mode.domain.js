import { soldItemRule } from "./item-mode-rules/sold-item.rule";
const ITEM_MODE_RULES = [soldItemRule];
export function resolveLocationScannerMode(item) {
    for (const rule of ITEM_MODE_RULES) {
        const mode = rule.evaluate(item);
        if (mode !== null) {
            return mode;
        }
    }
    return "shop";
}
