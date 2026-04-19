import { useRef } from "react";

import { statsItemsOverlayActions } from "../../actions/stats-items-overlay.actions";
import { useStatsItemsFlow } from "../../flows/use-stats-items.flow";
import {
  selectStatsItemsControls,
  selectStatsItemsError,
  selectStatsItemsFilters,
  selectStatsItemsIsLoading,
  selectStatsItemsIsOpen,
  selectStatsItemsList,
  selectStatsItemsTitle,
  useStatsItemsStore,
} from "../../stores/stats-items.store";
import { SlidingOverlayContainer } from "../../../home/ui/SlidingOverlayContainer";
import { useSlidingOverlayReady } from "../../../home/ui/sliding-overlay-ready.context";
import { StatsItemsList } from "./StatsItemsList";

export function StatsItemsOverlay() {
  useStatsItemsFlow();

  const isOpen = useStatsItemsStore(selectStatsItemsIsOpen);
  const title = useStatsItemsStore(selectStatsItemsTitle);

  return (
    <SlidingOverlayContainer
      isOpen={isOpen}
      title={title}
      zIndexClassName="z-70"
    >
      <OverlayBody title={title} />
    </SlidingOverlayContainer>
  );
}

// Rendered inside SlidingOverlayContainer so useSlidingOverlayReady() reads
// the correct context value (the provider is inside the container).
function OverlayBody({ title }: { title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isReady = useSlidingOverlayReady();

  const isLoading = useStatsItemsStore(selectStatsItemsIsLoading);
  const items = useStatsItemsStore(selectStatsItemsList);
  const error = useStatsItemsStore(selectStatsItemsError);
  const controls = useStatsItemsStore(selectStatsItemsControls);
  const filters = useStatsItemsStore(selectStatsItemsFilters);

  const isEmpty = !isLoading && !error && items.length === 0;
  const showStatusFilter = controls.showStatusFilter;
  const showSortToggle = controls.showSortToggle;
  const showTimeToSellSort = controls.showTimeToSellSort;
  const showSalesChannelFilters = controls.salesChannelOptions.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between border-b border-slate-900/10 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-base font-bold text-slate-900">{title}</h2>
          {showSortToggle ? (
            <button
              type="button"
              className="mt-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors"
              onClick={() =>
                statsItemsOverlayActions.setSortOrderFilter(
                  filters.sortOrder === "oldest" ? "newest" : "oldest",
                )
              }
            >
              Sort by{" "}
              {filters.sortOrder === "oldest" ? "oldest" : "newest"}
            </button>
          ) : null}
          {showTimeToSellSort ? (
            <button
              type="button"
              className="mt-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition-colors"
              onClick={() =>
                statsItemsOverlayActions.setSortOrderFilter(
                  filters.sortOrder === "oldest" ? "newest" : "oldest",
                )
              }
            >
              {filters.sortOrder === "oldest"
                ? "Fastest sold first"
                : "Slowest sold first"}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-slate-900/10 bg-white text-slate-500"
          onClick={statsItemsOverlayActions.close}
          aria-label="Close"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {showStatusFilter || showSalesChannelFilters ? (
        <div className="border-b border-slate-900/10 px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {showStatusFilter ? (
              <>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    filters.isSold === true
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  onClick={() =>
                    statsItemsOverlayActions.toggleIsSoldFilter(true)
                  }
                >
                  Sold
                </button>
                <button
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                    filters.isSold === false
                      ? "border-slate-700 bg-slate-700 text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  onClick={() =>
                    statsItemsOverlayActions.toggleIsSoldFilter(false)
                  }
                >
                  Not sold
                </button>
              </>
            ) : null}

            {showSalesChannelFilters ? (
              <>
                {controls.salesChannelOptions.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      filters.lastSoldChannel === channel
                        ? "border-indigo-500 bg-indigo-500 text-white"
                        : "border-slate-200 bg-white text-slate-600"
                    }`}
                    onClick={() =>
                      statsItemsOverlayActions.toggleLastSoldChannelFilter(
                        channel,
                      )
                    }
                  >
                    {channel === "physical" ? "Physical" : "Webshop"}
                  </button>
                ))}
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!isReady || (isLoading && items.length === 0) ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm font-medium text-slate-500">Loading…</p>
          </div>
        ) : isEmpty ? (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm font-medium text-slate-500">
              No items found for this selection.
            </p>
          </div>
        ) : (
          <StatsItemsList scrollRef={scrollRef} />
        )}

        {error && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm font-medium text-rose-600">{error}</p>
            <button
              type="button"
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700"
              onClick={statsItemsOverlayActions.retry}
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
