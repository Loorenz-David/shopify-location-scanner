import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import { selectLogisticTasksHasMore, selectLogisticTasksIsLoadingMore, useLogisticTasksStore, } from "../stores/logistic-tasks.store";
import { LogisticTasksCard } from "./LogisticTasksCard";
export function LogisticTasksList({ groups, cardAction, }) {
    const hasMore = useLogisticTasksStore(selectLogisticTasksHasMore);
    const isLoadingMore = useLogisticTasksStore(selectLogisticTasksIsLoadingMore);
    if (groups.length === 0)
        return null;
    return (_jsxs("div", { className: "flex flex-col gap-4 px-5 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-12", children: [groups.map((group, index) => (_jsxs("div", { children: [index > 0 && _jsx("div", { className: "h-4" }), group.orderId && (_jsxs("p", { className: "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500", children: ["Order #", group.items[0]?.orderNumber ?? group.orderId] })), _jsx("div", { className: "flex flex-col gap-3", children: group.items.map((item) => (_jsx(LogisticTasksCard, { item: item, cardAction: cardAction }, item.id))) })] }, group.orderId ?? `no-order-${index}`))), hasMore && (_jsx("div", { className: "flex justify-center pt-2 pb-2", children: _jsx("button", { onClick: () => void logisticTasksActions.loadMoreTasks(), disabled: isLoadingMore, className: "rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50 disabled:opacity-50", children: isLoadingMore ? "Loading…" : "Show more" }) }))] }));
}
