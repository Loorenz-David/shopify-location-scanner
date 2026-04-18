import { useState } from "react";

import { formatKr } from "../../domain/format-currency.domain";
import type {
  StatsItem,
  StatsItemCardMode,
} from "../../types/stats-items.types";

function formatPrice(price: string | null): string | null {
  if (!price) return null;
  const n = parseFloat(price);
  return isNaN(n) ? null : formatKr(n);
}

const CHANNEL_LABELS: Record<string, string> = {
  physical: "Physical",
  webshop: "Webshop",
  imported: "Imported",
  unknown: "Unknown",
};

const CHANNEL_COLORS: Record<string, string> = {
  physical: "border-emerald-200 bg-emerald-50 text-emerald-700",
  webshop: "border-indigo-200 bg-indigo-50 text-indigo-700",
  imported: "border-amber-200 bg-amber-50 text-amber-700",
  unknown: "border-slate-200 bg-slate-100 text-slate-600",
};

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return "—";
  const days = Math.floor(seconds / 86400);
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDimension(value: number | null, unit = "cm"): string {
  if (value === null) return "—";
  return `${value} ${unit}`;
}

function formatTimeInStock(createdAt: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  const days = Math.floor(seconds / 86400);
  if (days >= 365)
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}mo`;
  if (days >= 30) return `${Math.floor(days / 30)}mo ${days % 30}d`;
  if (days > 0) return `${days}d`;
  const hours = Math.floor(seconds / 3600);
  if (hours > 0) return `${hours}h`;
  return `${Math.floor(seconds / 60)}m`;
}

interface StatsItemCardProps {
  item: StatsItem;
  cardMode: StatsItemCardMode;
  focusDimension?: "height" | "width" | "depth" | "volume" | null;
}

export function StatsItemCard({
  item,
  cardMode,
  focusDimension = null,
}: StatsItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-3 text-left"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
      >
        {/* Image */}
        {item.itemImageUrl ? (
          <img
            src={item.itemImageUrl}
            alt=""
            width={56}
            height={56}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="h-14 w-14 shrink-0 rounded-2xl bg-slate-100 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
            No image
          </div>
        )}

        {/* Compact content */}
        <div className="min-w-0 flex-1">
          <CompactContent
            item={item}
            cardMode={cardMode}
            focusDimension={focusDimension}
          />
        </div>

        {/* Expand chevron */}
        <svg
          className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isExpanded ? (
        <div className="border-t border-slate-900/8 bg-slate-50/60 px-3 py-3">
          <ExpandedContent item={item} cardMode={cardMode} />
        </div>
      ) : null}
    </div>
  );
}

function CompactContent({
  item,
  cardMode,
  focusDimension,
}: {
  item: StatsItem;
  cardMode: StatsItemCardMode;
  focusDimension: "height" | "width" | "depth" | "volume" | null;
}) {
  switch (cardMode) {
    case "sold-default":
      return (
        <>
          <p className="m-0 truncate text-sm font-semibold text-slate-900">
            {item.itemTitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.lastKnownPrice ? (
              <span className="text-xs font-medium text-slate-700">
                {formatPrice(item.lastKnownPrice) ?? ""}
              </span>
            ) : null}
            {item.quantity > 1 ? (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                ×{item.quantity}
              </span>
            ) : null}
            {item.intention ? (
              <span className="truncate text-xs text-slate-500">
                {item.intention}
              </span>
            ) : null}
          </div>
          {(item.lastSoldChannel || item.timeToSellSeconds !== null) ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {item.lastSoldChannel ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    CHANNEL_COLORS[item.lastSoldChannel] ?? CHANNEL_COLORS.unknown
                  }`}
                >
                  {CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel}
                </span>
              ) : null}
              {item.timeToSellSeconds !== null ? (
                <span className="text-xs text-slate-500">
                  Sold in {formatSeconds(item.timeToSellSeconds)}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      );

    case "avg-sell-time":
      return (
        <>
          <p className="m-0 truncate text-sm font-semibold text-slate-900">
            {item.itemTitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.lastKnownPrice ? (
              <span className="text-xs font-medium text-slate-700">
                {formatPrice(item.lastKnownPrice) ?? ""}
              </span>
            ) : null}
            {item.intention ? (
              <span className="truncate text-xs text-slate-400">
                {item.intention}
              </span>
            ) : null}
          </div>
          {(item.lastSoldChannel || item.timeToSellSeconds !== null) ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              {item.lastSoldChannel ? (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    CHANNEL_COLORS[item.lastSoldChannel] ?? CHANNEL_COLORS.unknown
                  }`}
                >
                  {CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel}
                </span>
              ) : null}
              {item.timeToSellSeconds !== null ? (
                <span className="text-xs text-slate-500">
                  Sold in {formatSeconds(item.timeToSellSeconds)}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      );

    case "received":
      return (
        <>
          <p className="m-0 truncate text-sm font-semibold text-slate-900">
            {item.itemTitle}
          </p>
          <p className="m-0 mt-1 text-xs text-slate-500">
            Received {formatDate(item.createdAt)}
          </p>
        </>
      );

    case "with-channel":
      return (
        <>
          <p className="m-0 truncate text-sm font-semibold text-slate-900">
            {item.itemTitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.lastKnownPrice ? (
              <span className="text-xs font-medium text-slate-700">
                {formatPrice(item.lastKnownPrice) ?? ""}
              </span>
            ) : null}
            {item.lastSoldChannel ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  CHANNEL_COLORS[item.lastSoldChannel] ?? CHANNEL_COLORS.unknown
                }`}
              >
                {CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel}
              </span>
            ) : null}
            {item.quantity > 1 ? (
              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                ×{item.quantity}
              </span>
            ) : null}
            {item.intention ? (
              <span className="truncate text-xs text-slate-400">
                {item.intention}
              </span>
            ) : null}
          </div>
          {item.timeToSellSeconds !== null ? (
            <p className="m-0 mt-0.5 text-xs text-slate-500">
              Sold in {formatSeconds(item.timeToSellSeconds)}
            </p>
          ) : null}
        </>
      );

    case "dimensions":
      return (
        <>
          <p className="m-0 truncate text-sm font-semibold text-slate-900">
            {item.itemTitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600">
              <span className={focusDimension === "height" ? "font-bold text-slate-900" : ""}>
                {formatDimension(item.itemHeight)}
              </span>{" "}
              ×{" "}
              <span className={focusDimension === "width" ? "font-bold text-slate-900" : ""}>
                {formatDimension(item.itemWidth)}
              </span>{" "}
              ×{" "}
              <span className={focusDimension === "depth" ? "font-bold text-slate-900" : ""}>
                {formatDimension(item.itemDepth)}
              </span>
            </span>
            {item.volume !== null ? (
              <span
                className={`text-xs ${
                  focusDimension === "volume"
                    ? "font-bold text-slate-900"
                    : "text-slate-600"
                }`}
              >
                Vol {item.volume}
              </span>
            ) : null}
            {item.lastKnownPrice ? (
              <span className="text-xs font-medium text-slate-700">
                {formatPrice(item.lastKnownPrice) ?? ""}
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            {item.isSold && item.lastSoldChannel ? (
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                  CHANNEL_COLORS[item.lastSoldChannel] ?? CHANNEL_COLORS.unknown
                }`}
              >
                {CHANNEL_LABELS[item.lastSoldChannel] ?? item.lastSoldChannel}
              </span>
            ) : null}
            {item.isSold && item.timeToSellSeconds !== null ? (
              <span className="text-xs text-slate-500">
                Sold in {formatSeconds(item.timeToSellSeconds)}
              </span>
            ) : null}
            {!item.isSold ? (
              <span className="text-xs text-slate-500">
                In stock {formatTimeInStock(item.createdAt)}
              </span>
            ) : null}
          </div>
        </>
      );

    case "zone-standard":
      return (
        <>
          <p className="m-0 truncate text-sm font-semibold text-slate-900">
            {item.itemTitle}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.lastKnownPrice ? (
              <span className="text-xs font-medium text-slate-700">
                {formatPrice(item.lastKnownPrice) ?? ""}
              </span>
            ) : null}
            {item.isSold && item.timeToSellSeconds !== null ? (
              <span className="text-xs text-slate-500">
                Sold in {formatSeconds(item.timeToSellSeconds)}
              </span>
            ) : null}
            {!item.isSold ? (
              <span className="text-xs text-slate-500">
                In stock {formatTimeInStock(item.createdAt)}
              </span>
            ) : null}
          </div>
          {item.quantity > 1 ? (
            <p className="m-0 mt-0.5 text-xs text-slate-500">
              Qty {item.quantity}
            </p>
          ) : null}
        </>
      );
  }
}

function ExpandedContent({
  item,
  cardMode,
}: {
  item: StatsItem;
  cardMode: StatsItemCardMode;
}) {
  const rows: Array<{ label: string; value: string }> = [];

  // Fields always shown in expanded unless already in compact
  if (cardMode !== "received") {
    rows.push({ label: "Received", value: formatDate(item.createdAt) });
  }
  if (
    cardMode !== "avg-sell-time" &&
    cardMode !== "zone-standard" &&
    item.timeToSellSeconds !== null
  ) {
    rows.push({
      label: "Sell time",
      value: formatSeconds(item.timeToSellSeconds),
    });
  }
  if (cardMode === "received" || cardMode === "avg-sell-time") {
    if (item.lastKnownPrice) {
      rows.push({
        label: "Price",
        value: formatPrice(item.lastKnownPrice) ?? "",
      });
    }
  }
  if (cardMode !== "dimensions") {
    if (
      item.itemHeight !== null ||
      item.itemWidth !== null ||
      item.itemDepth !== null
    ) {
      rows.push({
        label: "H × W × D",
        value: `${formatDimension(item.itemHeight)} × ${formatDimension(item.itemWidth)} × ${formatDimension(item.itemDepth)}`,
      });
    }
  } else {
    // dimensions mode: show remaining fields
    if (item.timeToSellSeconds !== null) {
      rows.push({
        label: "Sell time",
        value: formatSeconds(item.timeToSellSeconds),
      });
    }
    rows.push({ label: "Received", value: formatDate(item.createdAt) });
  }
  if (item.itemCategory) {
    rows.push({ label: "Category", value: item.itemCategory });
  }
  if (item.fixItem !== null) {
    rows.push({ label: "Needs fixing", value: item.fixItem ? "Yes" : "No" });
  }
  if (cardMode === "received" && item.intention) {
    rows.push({ label: "Intention", value: item.intention });
  }
  if (item.latestLocation) {
    rows.push({ label: "Location", value: item.latestLocation });
  }
  if (item.username) {
    rows.push({ label: "Scanned by", value: item.username });
  }

  if (rows.length === 0) return null;

  return (
    <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-2">
      {rows.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
            {label}
          </dt>
          <dd className="m-0 text-xs font-medium text-slate-700">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
