import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { BackArrowIcon } from "../../../assets/icons";
import { shopifySettingsActions } from "../actions/shopify-settings.actions";
import { formatShopConnectedAt } from "../domain/shopify-settings.domain";
import { useShopifySettingsFlow } from "../flows/use-shopify-settings.flow";
import { useShopifySettingsStore } from "../stores/shopify-settings.store";
export function ShopifySettingsPage() {
    useShopifySettingsFlow();
    const [storeInput, setStoreInput] = useState("");
    const shop = useShopifySettingsStore((state) => state.shop);
    const isLoading = useShopifySettingsStore((state) => state.isLoading);
    const isSubmitting = useShopifySettingsStore((state) => state.isSubmitting);
    const handleUnlink = async () => {
        const confirmed = window.confirm("Unlink this Shopify store from the workspace?");
        if (!confirmed) {
            return;
        }
        await shopifySettingsActions.unlinkShop();
    };
    const handleStartConnect = async (event) => {
        event.preventDefault();
        await shopifySettingsActions.startInstall(storeInput);
    };
    return (_jsxs("section", { className: "mx-auto flex min-h-svh w-full max-w-[720px] flex-col gap-4 bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 pb-10 pt-6 text-slate-900", children: [_jsx("header", { className: "flex items-center", children: _jsx("button", { type: "button", className: "grid h-9 w-9 place-items-center ", onClick: shopifySettingsActions.backToSettings, "aria-label": "Back to settings", children: _jsx(BackArrowIcon, { className: "h-4 w-4 text-green-700", "aria-hidden": "true" }) }) }), isLoading ? (_jsx("div", { className: "h-40 animate-pulse rounded-2xl border border-slate-900/10 bg-white/70" })) : shop ? (_jsxs("article", { className: "rounded-2xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_12px_30px_0_rgba(15,23,42,0.08)]", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsx("p", { className: "m-0 text-sm font-medium text-slate-600", children: "Linked store" }), _jsx("span", { className: "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700", children: "Connected" })] }), _jsx("p", { className: "m-0 mt-3 text-lg font-bold text-slate-900", children: shop.shopDomain }), _jsxs("p", { className: "m-0 mt-1 text-sm text-slate-600", children: ["Connected at ", formatShopConnectedAt(shop.createdAt)] })] }), _jsx("button", { type: "button", className: "mt-6 h-11 w-full rounded-xl bg-rose-500 px-4 text-sm font-bold text-rose-50 disabled:cursor-not-allowed disabled:opacity-70", onClick: handleUnlink, disabled: isSubmitting, children: isSubmitting ? "Unlinking..." : "Unlink" })] })) : (_jsxs("form", { className: "rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]", onSubmit: handleStartConnect, children: [_jsxs("label", { className: "flex flex-col gap-1 text-sm font-semibold text-slate-800", children: ["Shopify domain", _jsx("input", { className: "app-searchbar-surface app-searchbar-input h-11 rounded-xl px-3", value: storeInput, onChange: (event) => setStoreInput(event.target.value), placeholder: "example-store or example-store.myshopify.com", required: true })] }), _jsx("button", { type: "submit", className: "mt-4 h-11 w-full rounded-xl bg-emerald-500 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70", disabled: isSubmitting, children: isSubmitting ? "Starting..." : "Connect Shopify" })] }))] }));
}
