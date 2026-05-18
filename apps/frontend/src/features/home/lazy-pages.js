import { jsx as _jsx } from "react/jsx-runtime";
import { Component, lazy, Suspense, useMemo, useState, } from "react";
import { FeatureLoadState } from "./ui/FeatureLoadState";
class FeatureErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    reset = () => {
        this.setState({ hasError: false });
    };
    render() {
        if (this.state.hasError) {
            return this.props.fallback(this.reset);
        }
        return this.props.children;
    }
}
function createLazyFeaturePage({ load, loadingTitle, loadingDescription, errorTitle, errorDescription, variant, }) {
    function LazyFeaturePage() {
        const [attempt, setAttempt] = useState(0);
        const LazyComponent = useMemo(() => lazy(load), [attempt]);
        return (_jsx(FeatureErrorBoundary, { fallback: (resetError) => (_jsx(FeatureLoadState, { title: errorTitle, description: errorDescription, variant: variant, action: _jsx("button", { type: "button", onClick: () => {
                        resetError();
                        setAttempt((current) => current + 1);
                    }, className: "rounded-full border border-sky-500/30 bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600", children: "Retry" }) })), children: _jsx(Suspense, { fallback: _jsx(FeatureLoadState, { title: loadingTitle, description: loadingDescription, variant: variant }), children: _jsx(LazyComponent, {}) }) }));
    }
    return LazyFeaturePage;
}
export const LazyAnalyticsPage = createLazyFeaturePage({
    load: () => import("../analytics/pages/AnalyticsPage").then((module) => ({
        default: module.AnalyticsPage,
    })),
    loadingTitle: "Stats",
    loadingDescription: "Loading analytics, charts, and map view...",
    errorTitle: "Stats unavailable",
    errorDescription: "Analytics did not load. Retry to fetch the feature chunk.",
    variant: "full-overlay",
});
export const LazyStoreMapSettingsPage = createLazyFeaturePage({
    load: () => import("../analytics/ui/StoreMapSettingsPage").then((module) => ({
        default: module.StoreMapSettingsPage,
    })),
    loadingTitle: "Store Map",
    loadingDescription: "Loading the store map editor...",
    errorTitle: "Store map unavailable",
    errorDescription: "The store map page did not load. Retry to open it again.",
    variant: "full-overlay",
});
export const LazyShopifySettingsPage = createLazyFeaturePage({
    load: () => import("../shopify/ui/ShopifySettingsPage").then((module) => ({
        default: module.ShopifySettingsPage,
    })),
    loadingTitle: "Shopify integration",
    loadingDescription: "Loading Shopify settings...",
    errorTitle: "Shopify settings unavailable",
    errorDescription: "The Shopify settings page did not load. Retry to continue.",
    variant: "full-overlay",
});
export const LazyLocationsSettingsPage = createLazyFeaturePage({
    load: () => import("../locations-settings/ui/LocationsSettingsPage").then((module) => ({
        default: module.LocationsSettingsPage,
    })),
    loadingTitle: "Locations",
    loadingDescription: "Loading location settings...",
    errorTitle: "Locations unavailable",
    errorDescription: "The locations page did not load. Retry to continue.",
    variant: "full-overlay",
});
export const LazyUsersSettingsPage = createLazyFeaturePage({
    load: () => import("../users/ui/UsersSettingsPage").then((module) => ({
        default: module.UsersSettingsPage,
    })),
    loadingTitle: "Users",
    loadingDescription: "Loading user settings...",
    errorTitle: "Users unavailable",
    errorDescription: "The users page did not load. Retry to continue.",
    variant: "full-overlay",
});
export const LazyScannerLogisticPlacementPage = createLazyFeaturePage({
    load: () => import("../scanner/ui/ScannerLogisticPlacementPage").then((module) => ({
        default: module.ScannerLogisticPlacementPage,
    })),
    loadingTitle: "Logistic Placement",
    loadingDescription: "Loading placement scanner...",
    errorTitle: "Placement scanner unavailable",
    errorDescription: "The placement scanner did not load. Retry to reopen it.",
    variant: "full-overlay",
});
