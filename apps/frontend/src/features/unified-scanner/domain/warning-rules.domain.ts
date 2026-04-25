import { fixCheckRule } from "./warning-rules/fix-check.rule";
import { zoneMismatchRule } from "./warning-rules/zone-mismatch.rule";
import type {
  LocationWarning,
  LocationWarningRule,
  ResolvedLocation,
  UnifiedScannerItem,
} from "../types/unified-scanner.types";

const LOCATION_WARNING_RULES: LocationWarningRule[] = [
  fixCheckRule,
  zoneMismatchRule,
];

export function evaluateLocationWarnings(
  item: UnifiedScannerItem,
  location: ResolvedLocation,
): LocationWarning[] {
  return LOCATION_WARNING_RULES.filter((rule) =>
    rule.evaluate(item, location),
  )
    .map((rule) => ({
      type: rule.type,
      priority: rule.priority,
    }))
    .sort((left, right) => left.priority - right.priority);
}
