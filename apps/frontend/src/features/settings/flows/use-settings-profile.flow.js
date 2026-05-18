import { useEffect } from "react";
import { settingsActions } from "../actions/settings.actions";
export function useSettingsProfileFlow() {
    useEffect(() => {
        void settingsActions.loadProfile();
    }, []);
}
