import { useState } from "react";

import type { ZoneOverviewItem } from "../../types/analytics.types";

type SortKey = "itemsSold" | "revenue";

interface ZoneRankingComparisonProps {
  data: ZoneOverviewItem[];
  onZoneClick?: (location: string) => void;
}

const formatRevenue = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
};

function SortArrowsIcon({ sortKey }: { sortKey: SortKey }) {
  return (
    <svg
      viewBox="0 0 14 18"
      fill="none"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      <path
        d="M7 1L3 6h8L7 1Z"
        fill={sortKey === "itemsSold" ? "#0284c7" : "#cbd5e1"}
      />
      <path
        d="M7 17l4-5H3l4 5Z"
        fill={sortKey === "revenue" ? "#059669" : "#cbd5e1"}
      />
    </svg>
  );
}

export function ZoneRankingComparison({
  data,
  onZoneClick,
}: ZoneRankingComparisonProps) {
  const [sortKey, setSortKey] = useState<SortKey>("itemsSold");

  const soldZones = data
    .filter((z) => z.itemsSold > 0 || z.revenue > 0)
    .sort((a, b) => b[sortKey] - a[sortKey]);

  if (soldZones.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-400">
        No sales data available for this period.
      </p>
    );
  }

  const maxItems = Math.max(...soldZones.map((z) => z.itemsSold));
  const maxRevenue = Math.max(...soldZones.map((z) => z.revenue));

  const byVolume = [...soldZones]
    .sort((a, b) => b.itemsSold - a.itemsSold)
    .map((z, i) => ({ location: z.location, rank: i }));
  const byRevenue = [...soldZones]
    .sort((a, b) => b.revenue - a.revenue)
    .map((z, i) => ({ location: z.location, rank: i }));

  const volumeRankMap = new Map(byVolume.map((z) => [z.location, z.rank]));
  const revenueRankMap = new Map(byRevenue.map((z) => [z.location, z.rank]));

  return (
    <div className="w-full max-h-64 overflow-y-auto">
      {/* Sticky header — same flex structure as rows so columns align perfectly */}
      <div className="sticky top-0 z-10 flex items-center gap-3 bg-white px-1 pb-1.5 border-b border-slate-100">
        <button
          type="button"
          onClick={() =>
            setSortKey((prev) => (prev === "itemsSold" ? "revenue" : "itemsSold"))
          }
          className="flex w-20 shrink-0 items-center gap-1 text-left"
          aria-label={`Sort by ${sortKey === "itemsSold" ? "revenue" : "items sold"}`}
        >
          <SortArrowsIcon sortKey={sortKey} />
          <span className="text-[10px] font-semibold text-slate-400">Sort</span>
        </button>

        <span
          className={`flex-1 text-[10px] font-semibold uppercase tracking-[0.07em] transition-colors ${
            sortKey === "itemsSold" ? "text-sky-600" : "text-slate-400"
          }`}
        >
          Items sold
        </span>

        <span
          className={`flex-1 text-[10px] font-semibold uppercase tracking-[0.07em] transition-colors ${
            sortKey === "revenue" ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          Revenue
        </span>
      </div>

      {soldZones.map((zone) => {
        const itemsPct = maxItems > 0 ? (zone.itemsSold / maxItems) * 100 : 0;
        const revPct = maxRevenue > 0 ? (zone.revenue / maxRevenue) * 100 : 0;
        const volumeRank = volumeRankMap.get(zone.location) ?? 0;
        const revenueRank = revenueRankMap.get(zone.location) ?? 0;
        const isHighValue = volumeRank - revenueRank >= 2;

        return (
          <button
            key={zone.location}
            type="button"
            onClick={() => onZoneClick?.(zone.location)}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            {/* Zone name */}
            <div className="flex w-20 shrink-0 flex-col gap-0.5">
              <span className="truncate text-xs font-semibold text-slate-800">
                {zone.location}
              </span>
              {isHighValue && (
                <span className="w-fit rounded-full bg-emerald-100 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                  High value
                </span>
              )}
            </div>

            {/* Items sold bar */}
            <div className="flex flex-1 flex-col gap-1">
              <div className="h-2 overflow-hidden rounded-full bg-sky-100">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${itemsPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-sky-600">
                {zone.itemsSold}
              </span>
            </div>

            {/* Revenue bar */}
            <div className="flex flex-1 flex-col gap-1">
              <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${revPct}%` }}
                />
              </div>
              <span className="text-[10px] font-medium text-emerald-600">
                {formatRevenue(zone.revenue)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
