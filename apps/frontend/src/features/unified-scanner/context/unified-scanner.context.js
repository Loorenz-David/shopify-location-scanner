import { jsx as _jsx } from "react/jsx-runtime";
import { unifiedScannerPageContext, } from "./unified-scanner-context";
export function UnifiedScannerPageProvider({ children, value, }) {
    return (_jsx(unifiedScannerPageContext.Provider, { value: value, children: children }));
}
