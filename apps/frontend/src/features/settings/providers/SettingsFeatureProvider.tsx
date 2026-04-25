import { useState } from "react";

import { settingsActions } from "../actions/settings.actions";
import {
  selectBootstrapLastSyncedAt,
  useBootstrapStore,
} from "../../bootstrap/stores/bootstrap.store";
import { unifiedScannerActions } from "../../unified-scanner/actions/unified-scanner.actions";
import { useUnifiedScannerStore } from "../../unified-scanner/stores/unified-scanner.store";
import { SettingsPageProvider } from "../context/settings-page.context";
import type { SettingsPageContextValue } from "../context/settings-page-context";
import { useSettingsProfileFlow } from "../flows/use-settings-profile.flow";
import {
  selectSettingsProfile,
  selectSettingsProfileError,
  selectSettingsProfileLoading,
  useSettingsStore,
} from "../stores/settings.store";

interface SettingsFeatureProviderProps {
  onLogout: () => void;
  children: React.ReactNode;
}

export function SettingsFeatureProvider({
  onLogout,
  children,
}: SettingsFeatureProviderProps) {
  useSettingsProfileFlow();
  const [isLogoutPending, setIsLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const profile = useSettingsStore(selectSettingsProfile);
  const isProfileLoading = useSettingsStore(selectSettingsProfileLoading);
  const profileError = useSettingsStore(selectSettingsProfileError);
  const scannerOnScanAsk = useUnifiedScannerStore((state) => state.onScanAsk);
  const bootstrapLastSyncedAt = useBootstrapStore(selectBootstrapLastSyncedAt);

  const handleLogout = async () => {
    setIsLogoutPending(true);
    setLogoutError(null);

    try {
      await settingsActions.logout();
      onLogout();
    } catch {
      setLogoutError("Unable to log out right now. Please try again.");
    } finally {
      setIsLogoutPending(false);
    }
  };

  const contextValue: SettingsPageContextValue = {
    profile,
    isProfileLoading,
    profileError,
    bootstrapLastSyncedAt,
    scannerOnScanAsk,
    isLogoutPending,
    logoutError,
    openOption: settingsActions.openOption,
    setScannerOnScanAsk: unifiedScannerActions.setOnScanAsk,
    logout: handleLogout,
  };

  return (
    <SettingsPageProvider value={contextValue}>{children}</SettingsPageProvider>
  );
}
