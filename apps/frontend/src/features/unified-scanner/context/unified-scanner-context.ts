import { createContext, useContext } from "react";

import type { UnifiedScannerPageContextValue } from "../types/unified-scanner.types";

export const unifiedScannerPageContext =
  createContext<UnifiedScannerPageContextValue | null>(null);

export function useUnifiedScannerPageContext(): UnifiedScannerPageContextValue {
  const context = useContext(unifiedScannerPageContext);

  if (!context) {
    throw new Error(
      "useUnifiedScannerPageContext must be used within UnifiedScannerPageProvider.",
    );
  }

  return context;
}
