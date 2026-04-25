import type { ReactNode } from "react";

import {
  unifiedScannerPageContext,
} from "./unified-scanner-context";
import type { UnifiedScannerPageContextValue } from "../types/unified-scanner.types";

interface UnifiedScannerPageProviderProps {
  children: ReactNode;
  value: UnifiedScannerPageContextValue;
}

export function UnifiedScannerPageProvider({
  children,
  value,
}: UnifiedScannerPageProviderProps) {
  return (
    <unifiedScannerPageContext.Provider value={value}>
      {children}
    </unifiedScannerPageContext.Provider>
  );
}
