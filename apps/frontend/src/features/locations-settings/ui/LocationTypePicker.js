import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LOGISTIC_ZONE_TYPE_LABELS, LOGISTIC_ZONE_TYPES, } from "../../logistic-locations/domain/logistic-locations.domain";
const ZONE_COLORS = {
    for_delivery: {
        border: "border-teal-400",
        bg: "bg-teal-50",
        text: "text-teal-800",
    },
    for_pickup: {
        border: "border-amber-400",
        bg: "bg-amber-50",
        text: "text-amber-800",
    },
    for_fixing: {
        border: "border-rose-400",
        bg: "bg-rose-50",
        text: "text-rose-800",
    },
};
const SHOP_COLORS = {
    border: "border-emerald-400",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
};
export function LocationTypePicker({ onSelect, isSubmitting, }) {
    return (_jsxs("div", { className: "flex flex-col gap-3 pt-2", children: [_jsx("p", { className: "text-sm font-medium text-slate-600", children: "Select location type to create:" }), _jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsx("button", { type: "button", disabled: isSubmitting, className: `rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${SHOP_COLORS.border} ${SHOP_COLORS.bg} ${SHOP_COLORS.text}`, onClick: () => onSelect({ kind: "shop" }), children: "Shop Location" }), LOGISTIC_ZONE_TYPES.map((zone) => {
                        const colors = ZONE_COLORS[zone];
                        return (_jsx("button", { type: "button", disabled: isSubmitting, className: `rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${colors.border} ${colors.bg} ${colors.text}`, onClick: () => onSelect({ kind: "logistic", zoneType: zone }), children: LOGISTIC_ZONE_TYPE_LABELS[zone] }, zone));
                    })] })] }));
}
