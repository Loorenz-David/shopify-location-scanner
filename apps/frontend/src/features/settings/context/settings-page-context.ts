import { createContext, useContext } from "react";

import type { AuthUserDto } from "../../auth/types/auth.dto";
import type { SettingsOptionPageId } from "../types/settings.types";

export interface SettingsPageContextValue {
  profile: AuthUserDto | null;
  isProfileLoading: boolean;
  profileError: string | null;
  bootstrapLastSyncedAt: string | null;
  scannerOnScanAsk: boolean;
  isLogoutPending: boolean;
  logoutError: string | null;
  openOption: (pageId: SettingsOptionPageId) => void;
  setScannerOnScanAsk: (value: boolean) => void;
  logout: () => Promise<void>;
}

export const SettingsPageContext =
  createContext<SettingsPageContextValue | null>(null);

export function useSettingsPageContext(): SettingsPageContextValue {
  const contextValue = useContext(SettingsPageContext);
  if (!contextValue) {
    throw new Error(
      "useSettingsPageContext must be used within SettingsPageProvider",
    );
  }

  return contextValue;
}
