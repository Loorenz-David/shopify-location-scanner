import { useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import {
  useItemScanHistoryFlow,
  useItemScanHistoryLoadingVisibilityFlow,
  useItemScanHistoryPullRefreshFlow,
} from "../flows/use-item-scan-history.flow";
import {
  selectItemScanHistoryActiveFilterCount,
  selectItemScanHistoryErrorMessage,
  selectItemScanHistoryExpandedItemIds,
  selectItemScanHistoryHasLoaded,
  selectItemScanHistoryIsLoading,
  selectItemScanHistoryVisibleItems,
  selectItemScanHistoryQuery,
  useItemScanHistoryStore,
} from "../stores/item-scan-history.store";
import { ItemScanHistoryHeader } from "./ItemScanHistoryHeader";
import { ItemScanHistoryLoadingCards } from "./ItemScanHistoryLoadingCards";
import { ItemScanHistoryList } from "./ItemScanHistoryList";
import { ItemScanHistoryPullRefreshIndicator } from "./ItemScanHistoryPullRefreshIndicator";

export function ItemScanHistoryPage() {
  useItemScanHistoryFlow();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const query = useItemScanHistoryStore(selectItemScanHistoryQuery);
  const items = useItemScanHistoryStore(useShallow(selectItemScanHistoryVisibleItems));
  const activeFilterCount = useItemScanHistoryStore(
    selectItemScanHistoryActiveFilterCount,
  );
  const isLoading = useItemScanHistoryStore(selectItemScanHistoryIsLoading);
  const errorMessage = useItemScanHistoryStore(
    selectItemScanHistoryErrorMessage,
  );
  const hasLoaded = useItemScanHistoryStore(selectItemScanHistoryHasLoaded);
  const isLoadingVisible = useItemScanHistoryLoadingVisibilityFlow(
    isLoading,
    hasLoaded,
  );
  const expandedItemIds = useItemScanHistoryStore(
    selectItemScanHistoryExpandedItemIds,
  );
  const pullRefresh = useItemScanHistoryPullRefreshFlow({
    scrollContainerRef,
  });

  return (
    <section className="mx-auto flex h-[calc(100svh-7.5rem)] min-h-0 w-full max-w-[720px] flex-col gap-5">
      <div className="px-5 max-[640px]:px-4">
        <ItemScanHistoryHeader
          query={query}
          activeFilterCount={activeFilterCount}
          onChangeQuery={itemScanHistoryActions.setQuery}
          onOpenFilters={itemScanHistoryActions.openFilters}
        />
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-1 px-5 max-[640px]:px-4"
      >
        <ItemScanHistoryPullRefreshIndicator
          pullDistance={pullRefresh.pullDistance}
          isArmed={pullRefresh.isArmed}
          isRefreshing={false}
        />

        <div
          className="transition-transform duration-150"
          style={{
            transform: `translateY(${pullRefresh.pullDistance}px)`,
          }}
        >
          {isLoadingVisible && !hasLoaded || pullRefresh.isPullLoadingVisible ? (
            <ItemScanHistoryLoadingCards />
          ) : null}

          {!pullRefresh.isPullLoadingVisible && !isLoading && hasLoaded && items.length === 0 ? (
            <div className="rounded-[28px] border border-slate-900/10 bg-white/75 px-5 py-6 text-center shadow-[0_16px_36px_rgba(15,23,42,0.08)] ">
              <p className="m-0 text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">
                No results
              </p>
              <p className="m-0 mt-2 text-base text-slate-700">
                {errorMessage
                  ? "Unable to load item scan history right now. Refresh the page to try again."
                  : "No scan history matched the current search. Refresh the page to try again."}
              </p>
            </div>
          ) : null}

          {!pullRefresh.isPullLoadingVisible && items.length > 0 ? (
            <div className="flex flex-col gap-3 ">
              {isLoadingVisible ? (
                <p className="m-0 text-sm font-medium text-slate-500">
                  Refreshing history...
                </p>
              ) : null}
              <ItemScanHistoryList
                items={items}
                expandedItemIds={expandedItemIds}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
