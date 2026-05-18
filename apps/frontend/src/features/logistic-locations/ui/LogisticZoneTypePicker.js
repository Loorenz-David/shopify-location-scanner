import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { LOGISTIC_ZONE_TYPE_LABELS, LOGISTIC_ZONE_TYPES, } from "../domain/logistic-locations.domain";
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
export function LogisticZoneTypePicker({ selectedZoneType, onSelect, onCreate, isSubmitting, }) {
    return (_jsxs("div", { className: "flex flex-col gap-3 pt-2", children: [_jsx("p", { className: "text-sm font-medium text-slate-600", children: "Select zone type to add this location:" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: LOGISTIC_ZONE_TYPES.map((zone) => {
                    const colors = ZONE_COLORS[zone];
                    const isSelected = selectedZoneType === zone;
                    return (_jsx("button", { type: "button", disabled: isSubmitting, className: `rounded-xl border-2 px-3 py-4 text-center text-sm font-semibold transition-colors disabled:opacity-50 ${isSelected
                            ? `${colors.border} ${colors.bg} ${colors.text}`
                            : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300"}`, onClick: () => {
                            onSelect(zone);
                            onCreate(zone);
                        }, children: LOGISTIC_ZONE_TYPE_LABELS[zone] }, zone));
                }) })] }));
}
