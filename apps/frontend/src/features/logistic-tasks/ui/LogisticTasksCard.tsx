import { useContext } from "react";

import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  LOGISTIC_INTENTION_LABELS,
  formatScheduledDate,
} from "../domain/logistic-tasks.domain";
import { LogisticTasksPageContext } from "../context/logistic-tasks-page-context";
import type { LogisticTaskCardAction } from "../../role-context/types/role-context.types";
import type { LogisticTaskItem } from "../types/logistic-tasks.types";

interface LogisticTasksCardProps {
  item: LogisticTaskItem;
  cardAction: LogisticTaskCardAction;
}

export function LogisticTasksCard({
  item,
  cardAction,
}: LogisticTasksCardProps) {
  const ctx = useContext(LogisticTasksPageContext);

  const handleAction = () => {
    if (cardAction === "markItemIntention" || !item.intention) {
      ctx?.openMarkIntention(item.id);
    } else if (item.fixItem === true && item.isItemFixed === false) {
      ctx?.openFixItemDetail(item.id);
    } else {
      logisticTasksActions.openPlacementScanner(item);
    }
  };

  return (
    <article
      className="cursor-pointer rounded-xl border border-slate-900/10 bg-white shadow-[0_10px_22px_rgba(15,23,42,0.06)] active:bg-slate-50"
      onClick={handleAction}
    >
      <div className="flex items-center gap-3 p-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-14 w-14 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="h-14 w-14 shrink-0 rounded-lg bg-slate-100" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-slate-900">
                {item.sku ?? item.itemTitle}
              </p>
              {item.intention && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {LOGISTIC_INTENTION_LABELS[item.intention]}
                </span>
              )}
            </div>
            {item.logisticLocation && (
              <p className="shrink-0 text-xs font-bold text-slate-900">
                {item.logisticLocation}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500">{item.itemCategory ?? item.itemType}</p>

          {item.scheduledDate && (
            <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {formatScheduledDate(item.scheduledDate)}
            </p>
          )}

          {item.fixItem && (
            <span className="mt-0.5 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
              Fix required
            </span>
          )}
        </div>

      </div>
    </article>
  );
}
