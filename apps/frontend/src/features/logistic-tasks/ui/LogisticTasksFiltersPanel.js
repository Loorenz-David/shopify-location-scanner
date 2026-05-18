import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";
import { countActiveLogisticTaskFilters } from "../domain/logistic-tasks-filters.domain";
import { LOGISTIC_INTENTION_LABELS, LOGISTIC_INTENTION_ORDER, } from "../domain/logistic-tasks.domain";
import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import { CloseIcon } from "../../../assets/icons";
const EVENT_TYPE_OPTIONS = [
    { value: "marked_intention", label: "Pending" },
    { value: "placed", label: "Placed" },
    { value: "fulfilled", label: "Completed" },
];
const ZONE_TYPE_OPTIONS = [
    { value: "for_delivery", label: "For Delivery" },
    { value: "for_pickup", label: "For Pickup" },
    { value: "for_fixing", label: "For Fixing" },
];
export function LogisticTasksFiltersPanel({ onClose, }) {
    const { task_page_allowed_filters } = useRoleCapabilities();
    const filters = useLogisticTasksStore((state) => state.filters);
    const activeCount = countActiveLogisticTaskFilters(filters);
    const update = (partial) => {
        const activatesFilter = Object.entries(partial).some(([key, value]) => key !== "noIntention" && value !== undefined);
        logisticTasksActions.setFilters({
            ...(activatesFilter && filters.noIntention === true
                ? { noIntention: undefined }
                : {}),
            ...partial,
        });
    };
    const toggleFilter = (key, value) => {
        update({ [key]: filters[key] === value ? undefined : value });
    };
    const toggleNoIntentionFilter = () => {
        if (filters.noIntention === true) {
            update({ noIntention: undefined });
        }
        else {
            // Selecting "No Intention" — clear all conflicting filters
            update({
                noIntention: true,
                intention: undefined,
                fixItem: undefined,
                isItemFixed: undefined,
                lastLogisticEventType: undefined,
                zoneType: undefined,
                orderId: undefined,
            });
        }
    };
    const toggleIntentionFilter = (intention) => {
        if (filters.intention === intention) {
            update({ intention: undefined });
        }
        else {
            // Selecting an intention — clear noIntention
            update({ intention, noIntention: undefined });
        }
    };
    const showIntentionSection = task_page_allowed_filters.includes("intention") ||
        task_page_allowed_filters.includes("noIntention");
    return (_jsxs("div", { className: "flex h-full flex-col bg-white", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4", children: [_jsx("h2", { className: "text-base font-bold text-slate-900", children: "Filter Tasks" }), _jsx("button", { type: "button", className: "grid h-8 w-8 place-items-center rounded-lg text-slate-600", onClick: onClose, "aria-label": "Close filters", children: _jsx(CloseIcon, { className: "h-4 w-4", "aria-hidden": "true" }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto px-5 pb-8", children: [task_page_allowed_filters.includes("fixItem") && (_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Fix Required" }), _jsx("button", { type: "button", className: `rounded-lg border px-3 py-2 text-sm font-medium ${filters.fixItem === true
                                    ? "border-rose-400 bg-rose-50 text-rose-800"
                                    : "border-slate-200 bg-white text-slate-700"}`, onClick: () => toggleFilter("fixItem", true), children: "Fix required" })] })), task_page_allowed_filters.includes("isItemFixed") && (_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 px-4 py-3", children: [_jsx("label", { htmlFor: "is-item-fixed-switch", className: "text-sm font-medium text-slate-900", children: "Is Fixed" }), _jsx("button", { id: "is-item-fixed-switch", type: "button", role: "switch", "aria-checked": filters.isItemFixed === true, className: `relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${filters.isItemFixed === true ? "bg-green-600" : "bg-slate-200"}`, onClick: () => update({
                                        isItemFixed: filters.isItemFixed === true ? false : true,
                                    }), children: _jsx("span", { className: `inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${filters.isItemFixed === true
                                            ? "translate-x-5"
                                            : "translate-x-1"}` }) })] }) })), task_page_allowed_filters.includes("lastLogisticEventType") && (_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Last Event" }), _jsx("div", { className: "flex flex-wrap gap-2", children: EVENT_TYPE_OPTIONS.map(({ value, label }) => (_jsx("button", { type: "button", className: `rounded-lg border px-3 py-2 text-sm font-medium ${filters.lastLogisticEventType === value
                                        ? "border-green-500 bg-green-50 text-green-800"
                                        : "border-slate-200 bg-white text-slate-700"}`, onClick: () => toggleFilter("lastLogisticEventType", value), children: label }, value))) })] })), task_page_allowed_filters.includes("zoneType") && (_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Zone Type" }), _jsx("div", { className: "flex flex-wrap gap-2", children: ZONE_TYPE_OPTIONS.map(({ value, label }) => (_jsx("button", { type: "button", className: `rounded-lg border px-3 py-2 text-sm font-medium ${filters.zoneType === value
                                        ? "border-teal-500 bg-teal-50 text-teal-800"
                                        : "border-slate-200 bg-white text-slate-700"}`, onClick: () => toggleFilter("zoneType", value), children: label }, value))) })] })), showIntentionSection && (_jsxs("div", { className: "mb-6", children: [_jsx("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: "Intention" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [task_page_allowed_filters.includes("noIntention") && (_jsx("button", { type: "button", className: `rounded-lg border px-3 py-2 text-sm font-medium ${filters.noIntention === true
                                            ? "border-slate-600 bg-slate-100 text-slate-900"
                                            : "border-slate-200 bg-white text-slate-700"}`, onClick: toggleNoIntentionFilter, children: "No Intention" }, "no-intention")), task_page_allowed_filters.includes("intention") &&
                                        LOGISTIC_INTENTION_ORDER.map((intention) => (_jsx("button", { type: "button", className: `rounded-lg border px-3 py-2 text-sm font-medium ${filters.intention === intention
                                                ? "border-green-500 bg-green-50 text-green-800"
                                                : "border-slate-200 bg-white text-slate-700"}`, onClick: () => toggleIntentionFilter(intention), children: LOGISTIC_INTENTION_LABELS[intention] }, intention)))] })] }))] }), _jsx("div", { className: "shrink-0 border-t border-slate-900/10 px-5 py-4", children: _jsx("button", { type: "button", className: "w-full rounded-xl border border-slate-900/15 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40", disabled: activeCount === 0, onClick: () => logisticTasksActions.resetFilters(), children: "Clear filters" }) })] }));
}
