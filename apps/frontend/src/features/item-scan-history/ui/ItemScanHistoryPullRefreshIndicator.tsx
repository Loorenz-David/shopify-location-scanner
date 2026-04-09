import { BoldArrowIcon } from "../../../assets/icons";

interface ItemScanHistoryPullRefreshIndicatorProps {
  pullDistance: number;
  isArmed: boolean;
  isRefreshing: boolean;
}

export function ItemScanHistoryPullRefreshIndicator({
  pullDistance,
  isArmed,
  isRefreshing,
}: ItemScanHistoryPullRefreshIndicatorProps) {
  const visibleDistance = isRefreshing ? 52 : pullDistance;
  const progress = Math.max(0, Math.min(1, pullDistance / 72));
  const opacity = isRefreshing ? 1 : Math.max(0.2, progress);

  const label = isRefreshing
    ? "Refreshing history..."
    : isArmed
      ? "Release to refresh"
      : "Pull down to refresh";

  return (
    <div
      className="pointer-events-none sticky top-0 z-20 flex justify-center overflow-hidden"
      style={{ height: visibleDistance }}
      aria-hidden="true"
    >
      <div
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-900/10 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-slate-600  transition-all duration-150"
        style={{ opacity }}
      >
        {isRefreshing ? (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
        ) : (
          <BoldArrowIcon
            className={`h-3.5 w-3.5 transition-transform duration-150 ${
              isArmed ? "rotate-270" : "rotate-90"
            }`}
            aria-hidden="true"
          />
        )}
        <span>{label}</span>
      </div>
    </div>
  );
}
