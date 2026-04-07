import { useEffect } from "react";

import { settingsActions } from "../actions/settings.actions";

export function useSettingsProfileFlow(): void {
  useEffect(() => {
    void settingsActions.loadProfile();
  }, []);
}
