import { jsx as _jsx } from "react/jsx-runtime";
import { SettingsPageContext, } from "./settings-page-context";
export function SettingsPageProvider({ value, children, }) {
    return (_jsx(SettingsPageContext.Provider, { value: value, children: children }));
}
