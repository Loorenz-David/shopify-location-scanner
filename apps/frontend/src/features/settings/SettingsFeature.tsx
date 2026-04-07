import { SettingsFeatureProvider } from "./providers/SettingsFeatureProvider";
import { SettingsPage } from "./ui/SettingsPage";

interface SettingsFeatureProps {
  onLogout: () => void;
}

export function SettingsFeature({ onLogout }: SettingsFeatureProps) {
  return (
    <SettingsFeatureProvider onLogout={onLogout}>
      <SettingsPage />
    </SettingsFeatureProvider>
  );
}
