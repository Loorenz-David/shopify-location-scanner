import { markHistoryItemCompletedApi, markHistoryItemUncompletedApi, } from "../api/mark-history-item-completion.api";
import { loadItemScanHistoryController, loadMoreItemScanHistoryController, refreshItemScanHistoryItemController, } from "../controllers/item-scan-history.controller";
import { commitOptimisticLocationUpdateController, rollbackOptimisticCompletionUpdateController, rollbackOptimisticLocationUpdateController, startOptimisticCompletionUpdateController, startOptimisticLocationUpdateController, } from "../controllers/item-scan-history-optimistic.controller";
import { useItemScanHistoryStore } from "../stores/item-scan-history.store";
import { resolveLocationScannerMode } from "../../unified-scanner/domain/item-mode.domain";
import { useUnifiedScannerStore } from "../../unified-scanner/stores/unified-scanner.store";
import { homeShellActions } from "../../home/actions/home-shell.actions";
export const itemScanHistoryActions = {
    async loadHistory() {
        const state = useItemScanHistoryStore.getState();
        await loadItemScanHistoryController(state.query, state.filters);
    },
    async loadMoreHistory() {
        await loadMoreItemScanHistoryController();
    },
    async refreshHistoryItem(productId) {
        await refreshItemScanHistoryItemController(productId);
    },
    setQuery(query) {
        useItemScanHistoryStore.getState().setQuery(query);
    },
    setFilters(filters) {
        useItemScanHistoryStore.getState().setFilters(filters);
    },
    resetFilters() {
        useItemScanHistoryStore.getState().resetFilters();
    },
    openFilters() {
        homeShellActions.openOverlayPage("item-scan-history-filters", "History Filters");
    },
    openItemOptions(itemId) {
        homeShellActions.openOverlayPage(`item-scan-history-options:${itemId}`, "Item Options");
    },
    closeFilters() {
        homeShellActions.closeOverlayPage();
    },
    toggleExpandedItem(itemId) {
        useItemScanHistoryStore.getState().toggleExpandedItem(itemId);
    },
    async retryLoad() {
        await itemScanHistoryActions.loadHistory();
    },
    beginOptimisticLocationUpdate(item, locationCode) {
        return startOptimisticLocationUpdateController({
            item,
            locationCode,
        });
    },
    commitOptimisticLocationUpdate(token, response) {
        commitOptimisticLocationUpdateController(token, response);
    },
    rollbackOptimisticLocationUpdate(token) {
        rollbackOptimisticLocationUpdateController(token);
    },
    openPlacementScanner(item) {
        const itemId = item.itemType === "sku"
            ? item.skuLabel
            : item.itemType === "barcode"
                ? (item.barcodeLabel ?? item.productId)
                : item.productId;
        const prefilledItem = {
            id: item.id,
            idType: item.itemType,
            itemId,
            sku: item.skuLabel,
            imageUrl: item.imageUrl ?? undefined,
            imageUrls: item.imageUrls ?? item.imageUrl ?? undefined,
            title: item.title,
            quantity: item.quantity,
            itemCategory: item.categoryLabel,
            properties: item.properties,
            currentPosition: item.latestLocationLabel,
            isSold: item.isSold,
            intention: null,
            fixItem: false,
            isItemFixed: false,
        };
        const store = useUnifiedScannerStore.getState();
        store.setPrefilledItem(prefilledItem);
        store.setSelectedItem(prefilledItem);
        store.setLocationMode(resolveLocationScannerMode(prefilledItem));
        store.setPhase("scanning-location");
        homeShellActions.openFullFeaturePage("unified-scanner");
    },
    async markCompletion(item, completed) {
        const token = startOptimisticCompletionUpdateController(item.id, completed);
        try {
            if (completed) {
                await markHistoryItemCompletedApi({ scanHistoryId: item.id });
            }
            else {
                await markHistoryItemUncompletedApi({ scanHistoryId: item.id });
            }
        }
        catch {
            rollbackOptimisticCompletionUpdateController(token);
        }
    },
    reset() {
        useItemScanHistoryStore.getState().reset();
    },
};
