import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
export function LogisticTasksBatchNotificationBanner({ message, }) {
    return (_jsxs("div", { className: "mx-5 mt-2 flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-2", children: [_jsx("p", { className: "text-sm font-semibold text-amber-800", children: message }), _jsx("button", { type: "button", className: "ml-3 shrink-0 text-amber-700", onClick: logisticTasksActions.dismissBatchNotification, "aria-label": "Dismiss notification", children: "\u00D7" })] }));
}
