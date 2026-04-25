import { soldItemRule } from "./item-mode-rules/sold-item.rule";
import type {
  ItemModeRule,
  LocationScannerMode,
  UnifiedScannerItem,
} from "../types/unified-scanner.types";

const ITEM_MODE_RULES: ItemModeRule[] = [soldItemRule];

export function resolveLocationScannerMode(
  item: UnifiedScannerItem,
): LocationScannerMode {
  for (const rule of ITEM_MODE_RULES) {
    const mode = rule.evaluate(item);
    if (mode !== null) {
      return mode;
    }
  }

  return "shop";
}
