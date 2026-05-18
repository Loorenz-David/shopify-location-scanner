import { jsxs as _jsxs } from "react/jsx-runtime";
export function ItemQuantityPill({ quantity, itemCategory, categoryMatch = "chair", labelPrefix = "+", className = "", }) {
    if (!itemCategory?.toLowerCase().includes(categoryMatch.toLowerCase())) {
        return null;
    }
    const normalizedQuantity = typeof quantity === "number" && Number.isFinite(quantity) && quantity > 0
        ? Math.floor(quantity)
        : 1;
    return (_jsxs("span", { className: `inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold leading-none text-slate-600 ${className}`, "aria-label": `Quantity ${normalizedQuantity}`, children: [labelPrefix, normalizedQuantity] }));
}
export function resolveItemQuantityPillProps({ quantity, itemCategory, properties, }) {
    const extensionQuantity = resolveExtensionQuantity(properties);
    if (itemCategory?.toLowerCase().includes("table") === true &&
        extensionQuantity !== null) {
        return {
            quantity: extensionQuantity,
            itemCategory,
            categoryMatch: "table",
            labelPrefix: "ext ",
        };
    }
    return {
        quantity,
        itemCategory,
    };
}
function resolveExtensionQuantity(properties) {
    const rawValue = properties?.extension_quantity;
    if (typeof rawValue !== "string" && typeof rawValue !== "number") {
        return null;
    }
    const extensionQuantity = Number(rawValue);
    if (!Number.isFinite(extensionQuantity) || extensionQuantity <= 0) {
        return null;
    }
    return extensionQuantity;
}
