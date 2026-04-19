import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  selectLogisticTasksHasMore,
  selectLogisticTasksIsLoadingMore,
  useLogisticTasksStore,
} from "../stores/logistic-tasks.store";
import type { LogisticTaskCardAction } from "../../role-context/types/role-context.types";
import { LogisticTasksCard } from "./LogisticTasksCard";
import type { LogisticOrderGroup } from "../types/logistic-tasks.types";

interface LogisticTasksListProps {
  groups: LogisticOrderGroup[];
  cardAction: LogisticTaskCardAction;
}

export function LogisticTasksList({
  groups,
  cardAction,
}: LogisticTasksListProps) {
  const hasMore = useLogisticTasksStore(selectLogisticTasksHasMore);
  const isLoadingMore = useLogisticTasksStore(selectLogisticTasksIsLoadingMore);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 px-5 pt-4 pb-8">
      {groups.map((group, index) => (
        <div key={group.orderId ?? `no-order-${index}`}>
          {index > 0 && <div className="h-4" />}

          {group.orderId && (
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Order #{group.items[0]?.orderNumber ?? group.orderId}
            </p>
          )}

          <div className="flex flex-col gap-3">
            {group.items.map((item) => (
              <LogisticTasksCard
                key={item.id}
                item={item}
                cardAction={cardAction}
              />
            ))}
          </div>
        </div>
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-2">
          <button
            onClick={() => void logisticTasksActions.loadMoreTasks()}
            disabled={isLoadingMore}
            className="rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50 disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Show more"}
          </button>
        </div>
      )}
    </div>
  );
}
