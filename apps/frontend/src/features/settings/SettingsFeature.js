import { jsx as _jsx } from "react/jsx-runtime";
import { SettingsFeatureProvider } from "./providers/SettingsFeatureProvider";
import { SettingsPage } from "./ui/SettingsPage";
export function SettingsFeature({ onLogout }) {
    return (_jsx(SettingsFeatureProvider, { onLogout: onLogout, children: _jsx(SettingsPage, {}) }));
}
