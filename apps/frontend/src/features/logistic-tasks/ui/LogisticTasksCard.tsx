import { useContext } from "react";

import { logisticTasksActions } from "../actions/logistic-tasks.actions";
import {
  LOGISTIC_INTENTION_LABELS,
  formatScheduledDate,
} from "../domain/logistic-tasks.domain";
import { LogisticTasksPageContext } from "../context/logistic-tasks-page-context";
import type { LogisticTaskCardAction } from "../../role-context/types/role-context.types";
import type { LogisticTaskItem } from "../types/logistic-tasks.types";
import { ItemImagePreviewButton } from "../../item-scan-history/ui/ItemImagePreviewButton";
import { ItemQuantityPill } from "../../item-scan-history/ui/ItemQuantityPill";

interface LogisticTasksCardProps {
  item: LogisticTaskItem;
  cardAction: LogisticTaskCardAction;
}

export function LogisticTasksCard({
  item,
  cardAction,
}: LogisticTasksCardProps) {
  const ctx = useContext(LogisticTasksPageContext);
  const latestLocationLabel =
    item.logisticLocation ?? item.location ?? "No scans yet";

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
      className="relative cursor-pointer overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-md active:bg-slate-50"
      onClick={handleAction}
    >
      <div className="grid w-full grid-cols-[64px_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left">
        <ItemImagePreviewButton
          imageUrls={item.imageUrls ?? item.imageUrl}
          title={item.itemTitle}
          imageAlt={item.itemTitle}
          buttonClassName="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 transition-opacity hover:opacity-80 active:opacity-70"
          placeholderClassName="flex items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500"
          placeholderLabel="No image"
          overlay={
            <ItemQuantityPill
              quantity={item.quantity}
              itemCategory={item.itemCategory}
              className="absolute bottom-1 right-1 border-slate-950/20 bg-slate-950/80 px-2 py-1 text-white shadow-sm backdrop-blur"
            />
          }
        />

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
          <div className="min-w-0 self-center">
            <div className="flex min-w-0 items-center gap-2">
              <p className="m-0 truncate text-sm font-bold text-slate-900">
                {item.sku ?? item.itemTitle}
              </p>
            </div>
            <p className="m-0 mt-1 min-h-4 truncate text-xs text-slate-600">
              {item.scheduledDate ? formatScheduledDate(item.scheduledDate) : " "}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            {item.intention ? (
              <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {LOGISTIC_INTENTION_LABELS[item.intention]}
              </span>
            ) : null}
          </div>

          <div className="col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl bg-emerald-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Latest
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="m-0 truncate text-sm font-semibold text-slate-900">
                {latestLocationLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
