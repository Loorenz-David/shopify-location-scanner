import { createContext, useContext } from "react";
export const SettingsPageContext = createContext(null);
export function useSettingsPageContext() {
    const contextValue = useContext(SettingsPageContext);
    if (!contextValue) {
        throw new Error("useSettingsPageContext must be used within SettingsPageProvider");
    }
    return contextValue;
}
