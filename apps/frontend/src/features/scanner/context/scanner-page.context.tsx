import type { ReactNode } from "react";

import {
  scannerPageContext,
  type ScannerPageContextValue,
} from "./scanner-page-context";

interface ScannerPageProviderProps {
  children: ReactNode;
  value: ScannerPageContextValue;
}

export function ScannerPageProvider({
  children,
  value,
}: ScannerPageProviderProps) {
  return (
    <scannerPageContext.Provider value={value}>
      {children}
    </scannerPageContext.Provider>
  );
}
