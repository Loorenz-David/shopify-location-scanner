import { useEffect, useState } from "react";
import { BoldArrowIcon, QRcodeIcon } from "../../../assets/icons";
import {
  formatSecondsToHumanDuration,
  formatTimeInStock,
} from "../domain/item-scan-history.domain";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";
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
  const soldChannelBadge = item.lastSoldChannel
    ? CHANNEL_BADGE[item.lastSoldChannel]
    : null;
  const isCompleted = Boolean(item.logisticsCompletedAt);
  const { can_mark_scan_history_completion } = useRoleCapabilities();

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-slate-900/10 bg-white/85 shadow-[0_18px_45px_rgba(15,23,42,0.1)] backdrop-blur-md">
      <div
        className="grid w-full grid-cols-[64px_minmax(0,1fr)] items-start gap-3 px-4 py-3 text-left"
        onClick={onToggle}
      >
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            width={64}
            height={64}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-16 w-16 shrink-0 rounded-2xl bg-slate-100 object-cover"
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
              {item.isSold && item.timeToSellSeconds !== null
                ? `Sold in ${formatSecondsToHumanDuration(item.timeToSellSeconds)}`
                : `In stock ${formatTimeInStock(item.createdAt)}`}
            </p>
          </div>

          <div className="mt-1 flex items-center gap-1.5">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200"
              aria-label="Open placement scanner"
              onClick={(e) => {
                e.stopPropagation();
                itemScanHistoryActions.openPlacementScanner(item);
              }}
            >
              <QRcodeIcon className="h-4 w-4" />
            </button>
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-transform ${
                isExpanded ? "rotate-90" : "rotate-0"
              }`}
              aria-hidden="true"
            >
              <BoldArrowIcon className="h-4 w-4" />
            </span>
          </div>

          <div className="col-span-2 grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 rounded-2xl bg-emerald-50 px-3 py-2">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Latest
            </p>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="m-0 truncate text-sm font-semibold text-slate-900">
                {item.latestLocationLabel}
              </p>
              {item.isSold && soldChannelBadge ? (
                <span
                  className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${soldChannelBadge.color}`}
                >
                  {soldChannelBadge.label}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="border-t border-slate-900/10 px-4 py-4">
          {item.timelineEvents.length > 0 ? (
            <ItemScanHistoryTimeline events={item.timelineEvents} />
          ) : (
            <p className="m-0 text-sm text-slate-600">
              No event history is available for this item yet.
            </p>
          )}

          {can_mark_scan_history_completion ? (
            <div className="mt-4 flex justify-center">
              <ConfirmActionButton
                label={isCompleted ? "Mark as uncompleted" : "Mark as completed"}
                confirmLabel={isCompleted ? "Tap again to uncomplete" : "Tap again to complete"}
                tone={isCompleted ? "neutral" : "success"}
                onConfirm={() =>
                  itemScanHistoryActions.markCompletion(item, !isCompleted)
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

interface ConfirmActionButtonProps {
  label: string;
  confirmLabel: string;
  tone: "success" | "neutral";
  onConfirm: () => Promise<void>;
}

const CONFIRM_TIMEOUT_MS = 1800;

function ConfirmActionButton({
  label,
  confirmLabel,
  tone,
  onConfirm,
}: ConfirmActionButtonProps) {
  const [isArmed, setIsArmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isArmed) return;

    const timeoutId = window.setTimeout(() => {
      setIsArmed(false);
    }, CONFIRM_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isArmed]);

  const toneClasses =
    tone === "success"
      ? {
          idle: "border-emerald-200 bg-white text-emerald-700",
          fill: "bg-emerald-600",
          filledText: "text-white",
        }
      : {
          idle: "border-slate-300 bg-white text-slate-700",
          fill: "bg-slate-700",
          filledText: "text-white",
        };
  const displayLabel = isSubmitting ? "Updating..." : isArmed ? confirmLabel : label;
  const fillWidth = isArmed || isSubmitting ? "100%" : "0%";

  const handleClick = () => {
    if (isSubmitting) return;

    if (!isArmed) {
      setIsArmed(true);
      return;
    }

    setIsSubmitting(true);
    setIsArmed(false);
    void onConfirm().finally(() => {
      setIsSubmitting(false);
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isSubmitting}
      className={`relative h-11 min-w-[210px] overflow-hidden rounded-full border px-5 text-sm font-semibold transition disabled:opacity-60 ${toneClasses.idle}`}
    >
      <span
        className={`absolute inset-y-0 left-0 transition-[width] ease-linear ${toneClasses.fill}`}
        style={{
          width: fillWidth,
          transitionDuration: isArmed ? `${CONFIRM_TIMEOUT_MS}ms` : "180ms",
        }}
        aria-hidden="true"
      />
      <span className="relative z-10">{displayLabel}</span>
      <span
        className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center overflow-hidden whitespace-nowrap ${toneClasses.filledText}`}
        style={{
          clipPath: `inset(0 calc(100% - ${fillWidth}) 0 0)`,
          transition: isArmed
            ? `clip-path ${CONFIRM_TIMEOUT_MS}ms linear`
            : "clip-path 180ms ease",
        }}
        aria-hidden="true"
      >
        {displayLabel}
      </span>
    </button>
  );
}

const CHANNEL_BADGE: Record<
  NonNullable<ItemScanHistoryItem["lastSoldChannel"]>,
  { label: string; color: string }
> = {
  physical: { label: "POS", color: "bg-green-100 text-green-700" },
  webshop: { label: "Webshop", color: "bg-indigo-100 text-indigo-700" },
  imported: { label: "Imported", color: "bg-amber-100 text-amber-700" },
  unknown: { label: "?", color: "bg-slate-100 text-slate-500" },
};
