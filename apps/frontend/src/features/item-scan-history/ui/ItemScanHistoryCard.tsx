import { BoldArrowIcon } from "../../../assets/icons";
import type { ItemScanHistoryItem } from "../types/item-scan-history.types";
import { ItemScanHistoryTimeline } from "./ItemScanHistoryTimeline";

interface ItemScanHistoryCardProps {
  item: ItemScanHistoryItem;
  isExpanded: boolean;
  onToggle: () => void;
}

export function ItemScanHistoryCard({
  item,
  isExpanded,
  onToggle,
}: ItemScanHistoryCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-md">
      <button
        type="button"
        className="grid w-full grid-cols-[64px_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left"
        onClick={onToggle}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-16 w-16 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
            No image
          </div>
        )}

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
          <div className="min-w-0 self-center">
            <p className="m-0 truncate text-sm font-bold text-slate-900">
              {item.skuLabel}
            </p>
            <p className="m-0 mt-1 truncate text-xs text-slate-600">
              Updated {item.lastModifiedLabel}
            </p>
          </div>

          <span
            className={`mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-transform ${
              isExpanded ? "rotate-90" : "rotate-0"
            }`}
            aria-hidden="true"
          >
            <BoldArrowIcon className="h-4 w-4" />
          </span>

          <div className="col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl bg-emerald-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Latest
            </p>
            <p className="m-0 truncate text-sm font-semibold text-slate-900">
              {item.latestLocationLabel}
            </p>
          </div>
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-slate-900/10 px-4 py-4">
          {item.events.length > 0 ? (
            <ItemScanHistoryTimeline events={item.events} />
          ) : (
            <p className="m-0 text-sm text-slate-600">
              No event history is available for this item yet.
            </p>
          )}
        </div>
      ) : null}
    </article>
  );
}
