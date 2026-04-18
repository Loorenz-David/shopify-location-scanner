import { useEffect } from "react";

import { fetchStatsItemsController } from "../controllers/stats-items.controller";
import {
  selectStatsItemsCurrentPage,
  selectStatsItemsIsLoading,
  selectStatsItemsIsOpen,
  selectStatsItemsQuery,
  selectStatsItemsRequestId,
  useStatsItemsStore,
} from "../stores/stats-items.store";

export function useStatsItemsFlow() {
  const isOpen = useStatsItemsStore(selectStatsItemsIsOpen);
  const query = useStatsItemsStore(selectStatsItemsQuery);
  const currentPage = useStatsItemsStore(selectStatsItemsCurrentPage);
  const isLoading = useStatsItemsStore(selectStatsItemsIsLoading);
  const requestId = useStatsItemsStore(selectStatsItemsRequestId);

  useEffect(() => {
    if (!isOpen || !query || isLoading) return;

    const capturedRequestId = requestId;

    useStatsItemsStore.getState().setLoading(true);

    fetchStatsItemsController(query, currentPage).then((result) => {
      if (result.ok) {
        useStatsItemsStore
          .getState()
          .appendPage(
            result.items,
            result.total,
            result.page,
            capturedRequestId,
          );
      } else {
        // Only write error if this request is still the current one
        const current = useStatsItemsStore.getState().requestId;
        if (current === capturedRequestId) {
          useStatsItemsStore.getState().setError(result.message);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentPage, requestId]);
}
