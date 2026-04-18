import type { StatsItemsOverlayConfig } from "../types/stats-items.types";
import { useStatsItemsStore } from "../stores/stats-items.store";

export const statsItemsOverlayActions = {
  open: (config: StatsItemsOverlayConfig): void => {
    useStatsItemsStore.getState().openOverlay(config);
  },

  close: (): void => {
    useStatsItemsStore.getState().closeOverlay();
  },

  loadMore: (): void => {
    useStatsItemsStore.getState().advancePage();
  },

  retry: (): void => {
    const state = useStatsItemsStore.getState();
    if (!state.query) return;
    useStatsItemsStore.setState({ error: null, isLoading: false });
    // Reset to page 1 and re-trigger via requestId bump
    useStatsItemsStore.setState((s) => ({
      items: [],
      total: 0,
      currentPage: 1,
      hasMore: false,
      requestId: s.requestId + 1,
    }));
  },

  toggleIsSoldFilter: (value: boolean): void => {
    const state = useStatsItemsStore.getState();
    const nextValue = state.filters.isSold === value ? null : value;
    state.setIsSoldFilter(nextValue);
  },

  setSortOrderFilter: (value: "newest" | "oldest"): void => {
    useStatsItemsStore.getState().setSortOrderFilter(value);
  },

  toggleLastSoldChannelFilter: (
    value: "physical" | "webshop" | "imported" | "unknown",
  ): void => {
    const state = useStatsItemsStore.getState();
    const nextValue = state.filters.lastSoldChannel === value ? null : value;
    state.setLastSoldChannelFilter(nextValue);
  },
};
