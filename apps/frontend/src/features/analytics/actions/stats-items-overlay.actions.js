import { useStatsItemsStore } from "../stores/stats-items.store";
export const statsItemsOverlayActions = {
    open: (config) => {
        useStatsItemsStore.getState().openOverlay(config);
    },
    close: () => {
        useStatsItemsStore.getState().closeOverlay();
    },
    loadMore: () => {
        useStatsItemsStore.getState().advancePage();
    },
    retry: () => {
        const state = useStatsItemsStore.getState();
        if (!state.query)
            return;
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
    toggleIsSoldFilter: (value) => {
        const state = useStatsItemsStore.getState();
        const nextValue = state.filters.isSold === value ? null : value;
        state.setIsSoldFilter(nextValue);
    },
    setSortOrderFilter: (value) => {
        useStatsItemsStore.getState().setSortOrderFilter(value);
    },
    toggleLastSoldChannelFilter: (value) => {
        const state = useStatsItemsStore.getState();
        const nextValue = state.filters.lastSoldChannel === value ? null : value;
        state.setLastSoldChannelFilter(nextValue);
    },
};
