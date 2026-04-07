import {
  SettingsPageContext,
  type SettingsPageContextValue,
} from "./settings-page-context";

interface SettingsPageProviderProps {
  value: SettingsPageContextValue;
  children: React.ReactNode;
}

export function SettingsPageProvider({
  value,
  children,
}: SettingsPageProviderProps) {
  return (
    <SettingsPageContext.Provider value={value}>
      {children}
    </SettingsPageContext.Provider>
  );
}
