import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BottomNav } from "./BottomNav";
import { FullFeatureOverlayContainer } from "./FullFeatureOverlayContainer";
import { PageOutlet } from "./PageOutlet";
import { PopupContainer } from "./PopupContainer";
import { SlidingOverlayContainer } from "./SlidingOverlayContainer";
export function HomeLayout({ activePageTitle, ActivePageComponent, activeFullFeatureTitle, ActiveFullFeatureComponent, isFullFeatureOpen, navItems, isOverlayOpen, overlayTitle, overlayContent, isPopupOpen, popupContent, onClosePopup, onSelectPage, }) {
    return (_jsxs("main", { className: "relative min-h-svh bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)]", children: [_jsx(PageOutlet, { activePageTitle: activePageTitle, ActivePageComponent: ActivePageComponent }), _jsx(BottomNav, { items: navItems, onSelectPage: onSelectPage }), _jsx(SlidingOverlayContainer, { isOpen: isOverlayOpen, title: overlayTitle, children: overlayContent }), _jsx(FullFeatureOverlayContainer, { isOpen: isFullFeatureOpen, title: activeFullFeatureTitle, ActiveFeatureComponent: ActiveFullFeatureComponent }), _jsx(PopupContainer, { isOpen: isPopupOpen, onClose: onClosePopup, children: popupContent })] }));
}
