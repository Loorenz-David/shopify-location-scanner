import { itemScanHistoryActions } from "../actions/item-scan-history.actions";
import { useItemScanHistoryFlow } from "../flows/use-item-scan-history.flow";
import {
  selectItemScanHistoryErrorMessage,
  selectItemScanHistoryExpandedItemIds,
  selectItemScanHistoryHasLoaded,
  selectItemScanHistoryIsLoading,
  selectItemScanHistoryItems,
  selectItemScanHistoryQuery,
  useItemScanHistoryStore,
} from "../stores/item-scan-history.store";
import { ItemScanHistoryHeader } from "./ItemScanHistoryHeader";
import { ItemScanHistoryList } from "./ItemScanHistoryList";

export function ItemScanHistoryPage() {
  useItemScanHistoryFlow();

  const query = useItemScanHistoryStore(selectItemScanHistoryQuery);
  const items = useItemScanHistoryStore(selectItemScanHistoryItems);
  const isLoading = useItemScanHistoryStore(selectItemScanHistoryIsLoading);
  const errorMessage = useItemScanHistoryStore(
    selectItemScanHistoryErrorMessage,
  );
  const hasLoaded = useItemScanHistoryStore(selectItemScanHistoryHasLoaded);
  const expandedItemIds = useItemScanHistoryStore(
    selectItemScanHistoryExpandedItemIds,
  );

  return (
    <section className="mx-auto flex h-[calc(100svh-7.5rem)] min-h-0 w-full max-w-[720px] flex-col gap-5">
      <ItemScanHistoryHeader
        query={query}
        onChangeQuery={itemScanHistoryActions.setQuery}
      />

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-1">
        {isLoading && !hasLoaded ? (
          <div className="flex flex-col gap-4">
            <div className="h-28 animate-pulse rounded-[28px] bg-white/70" />
            <div className="h-28 animate-pulse rounded-[28px] bg-white/60" />
            <div className="h-28 animate-pulse rounded-[28px] bg-white/50" />
          </div>
        ) : null}

        {!isLoading && hasLoaded && items.length === 0 ? (
          <div className="rounded-[28px] border border-slate-900/10 bg-white/75 px-5 py-6 text-center shadow-[0_16px_36px_rgba(15,23,42,0.08)]">
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

        {items.length > 0 ? (
          <div className="flex flex-col gap-3">
            {isLoading ? (
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
    </section>
  );
}
