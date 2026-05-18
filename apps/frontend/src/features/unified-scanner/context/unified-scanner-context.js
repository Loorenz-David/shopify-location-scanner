import { createContext, useContext } from "react";
export const unifiedScannerPageContext = createContext(null);
export function useUnifiedScannerPageContext() {
    const context = useContext(unifiedScannerPageContext);
    if (!context) {
        throw new Error("useUnifiedScannerPageContext must be used within UnifiedScannerPageProvider.");
    }
    return context;
}
