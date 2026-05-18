import { jsx as _jsx } from "react/jsx-runtime";
import { UnifiedScannerProvider } from "./providers/UnifiedScannerProvider";
import { UnifiedScannerPage } from "./ui/UnifiedScannerPage";
export function UnifiedScannerFeature() {
    return (_jsx(UnifiedScannerProvider, { children: _jsx(UnifiedScannerPage, {}) }));
}
