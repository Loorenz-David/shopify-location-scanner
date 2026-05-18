import { jsx as _jsx } from "react/jsx-runtime";
export function PageOutlet({ activePageTitle, ActivePageComponent, }) {
    return (_jsx("section", { className: "min-h-svh box-border  pb-36 pt-9  max-[640px]:pb-32 max-[640px]:pt-6", "aria-label": activePageTitle, children: _jsx(ActivePageComponent, {}) }));
}
