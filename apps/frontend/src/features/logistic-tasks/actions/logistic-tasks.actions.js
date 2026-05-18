import { homeShellActions } from "../../home/actions/home-shell.actions";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { useScannerLogisticPlacementStore } from "../../scanner/stores/scanner-logistic-placement.store";
import { resolveLocationScannerMode } from "../../unified-scanner/domain/item-mode.domain";
import { useUnifiedScannerStore } from "../../unified-scanner/stores/unified-scanner.store";
import { markIntentionApi } from "../api/mark-intention.api";
import { markItemFixedApi } from "../api/mark-item-fixed.api";
import { markPlacementApi } from "../api/mark-placement.api";
import { updateFixNotesApi } from "../api/update-fix-notes.api";
import { markHistoryItemCompletedApi, markHistoryItemUncompletedApi, } from "../../item-scan-history/api/mark-history-item-completion.api";
import { loadLogisticTasksController, loadMoreLogisticTasksController, refreshLogisticTasksByIdsController, } from "../controllers/logistic-tasks.controller";
import { optimisticMarkIntention, optimisticMarkPlacement, } from "../controllers/logistic-tasks-optimistic.controller";
import { selectLogisticTasksFiltersRequestKey, useLogisticTasksStore, } from "../stores/logistic-tasks.store";
import { useTaskCountStore } from "../stores/task-count.store";
export const logisticTasksActions = {
    async loadTasks(filters) {
        await loadLogisticTasksController(filters);
    },
    async loadMoreTasks() {
        await loadMoreLogisticTasksController();
    },
    setFilters(partial) {
        useLogisticTasksStore.getState().setFilters(partial);
    },
    setQuery(q) {
        useLogisticTasksStore.getState().setQuery(q);
    },
    setActiveIntentionTab(tab) {
        useLogisticTasksStore.getState().setActiveIntentionTab(tab);
    },
    openFilters() {
        homeShellActions.openOverlayPage("logistic-tasks-filters", "Filter tasks");
    },
    openMarkIntentionOverlay(scanHistoryId) {
        logisticTasksActions.openItemOptions(scanHistoryId);
    },
    openItemOptions(scanHistoryId) {
        homeShellActions.openOverlayPage(`logistic-tasks-options:${scanHistoryId}`, "Task Settings");
    },
    async markIntention(scanHistoryId, intention, fixItem, scheduledDate, fixNotes) {
        const prev = optimisticMarkIntention(scanHistoryId, intention, fixItem, scheduledDate, fixNotes);
        homeShellActions.closeOverlayPage();
        try {
            await markIntentionApi({
                scanHistoryId,
                intention,
                fixItem,
                fixNotes,
                scheduledDate,
            });
        }
        catch {
            if (prev) {
                useLogisticTasksStore.getState().upsertItem(prev);
            }
            useLogisticTasksStore
                .getState()
                .finishWithError("Unable to mark intention. Please try again.");
        }
    },
    openPlacementScanner(item) {
        const prefilledItem = {
            id: item.id,
            idType: "sku",
            itemId: item.sku ?? item.productId,
            sku: item.sku ?? "",
            imageUrl: item.imageUrl ?? undefined,
            imageUrls: item.imageUrls ?? item.imageUrl ?? undefined,
            title: item.itemTitle,
            quantity: item.quantity,
            itemCategory: item.itemCategory,
            properties: item.properties,
            currentPosition: item.location ?? undefined,
            isSold: true,
            intention: item.intention,
            fixItem: item.fixItem,
            isItemFixed: item.isItemFixed,
        };
        const store = useUnifiedScannerStore.getState();
        store.setPrefilledItem(prefilledItem);
        // Pre-seed so the scanner's first render is already in the correct phase
        store.setSelectedItem(prefilledItem);
        store.setLocationMode(resolveLocationScannerMode(prefilledItem));
        store.setPhase("scanning-location");
        homeShellActions.openFullFeaturePage("unified-scanner");
    },
    openFixItemDetail(scanHistoryId) {
        homeShellActions.openOverlayPage(`logistic-tasks-fix-item-detail:${scanHistoryId}`, "Fix Details");
    },
    async updateFixNotes(scanHistoryId, fixNotes) {
        const existing = useLogisticTasksStore
            .getState()
            .items.find((i) => i.id === scanHistoryId);
        if (existing) {
            useLogisticTasksStore.getState().upsertItem({ ...existing, fixNotes });
        }
        try {
            await updateFixNotesApi({ scanHistoryId, fixNotes });
        }
        catch {
            if (existing) {
                useLogisticTasksStore.getState().upsertItem(existing);
            }
            useLogisticTasksStore
                .getState()
                .finishWithError("Unable to update fix note. Please try again.");
        }
    },
    closePlacementScanner() {
        useScannerLogisticPlacementStore.getState().reset();
        homeShellActions.closeFullFeaturePage();
    },
    async markPlacement(scanHistoryId, locationId) {
        const locations = useLogisticLocationsStore.getState().locations;
        const locationRecord = locations.find((l) => l.id === locationId) ?? null;
        const prev = locationRecord
            ? optimisticMarkPlacement(scanHistoryId, locationRecord)
            : null;
        try {
            await markPlacementApi({ scanHistoryId, logisticLocationId: locationId });
        }
        catch {
            if (prev) {
                useLogisticTasksStore.getState().upsertItem(prev);
            }
        }
    },
    dismissBatchNotification() {
        useLogisticTasksStore.getState().setBatchNotification(null);
    },
    async markItemFixed(scanHistoryId) {
        const existing = useLogisticTasksStore
            .getState()
            .items.find((i) => i.id === scanHistoryId);
        if (existing) {
            useLogisticTasksStore
                .getState()
                .upsertItem({ ...existing, isItemFixed: true });
        }
        useTaskCountStore.getState().removeId(scanHistoryId);
        try {
            await markItemFixedApi({ scanHistoryId });
        }
        catch {
            if (existing) {
                useLogisticTasksStore.getState().upsertItem(existing);
            }
            useLogisticTasksStore
                .getState()
                .finishWithError("Unable to mark item as fixed. Please try again.");
        }
    },
    async markTaskCompletion(scanHistoryId, completed) {
        const existing = useLogisticTasksStore
            .getState()
            .items.find((i) => i.id === scanHistoryId);
        if (existing) {
            const optimisticEventType = completed
                ? "fulfilled"
                : existing.logisticLocation
                    ? "placed"
                    : existing.intention
                        ? "marked_intention"
                        : null;
            useLogisticTasksStore
                .getState()
                .upsertItem({ ...existing, lastEventType: optimisticEventType });
        }
        try {
            if (completed) {
                await markHistoryItemCompletedApi({ scanHistoryId });
            }
            else {
                await markHistoryItemUncompletedApi({ scanHistoryId });
            }
        }
        catch {
            if (existing) {
                useLogisticTasksStore.getState().upsertItem(existing);
            }
            useLogisticTasksStore
                .getState()
                .finishWithError(`Unable to mark task as ${completed ? "completed" : "uncompleted"}. Please try again.`);
        }
    },
    async confirmPendingPlacement() {
        const { scanHistoryId, pendingPlacementMatch, requiresZoneMismatchConfirm, } = useScannerLogisticPlacementStore.getState();
        // If a zone mismatch check is still pending, pivot to that popup now
        if (requiresZoneMismatchConfirm && pendingPlacementMatch) {
            useScannerLogisticPlacementStore
                .getState()
                .setRequiresZoneMismatchConfirm(false);
            homeShellActions.popupFeaturePage("placement-zone-mismatch");
            return;
        }
        homeShellActions.closePopupPage();
        useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(null);
        if (!scanHistoryId || !pendingPlacementMatch)
            return;
        const locations = useLogisticLocationsStore.getState().locations;
        const locationRecord = locations.find((l) => l.id === pendingPlacementMatch.id) ?? null;
        const prev = locationRecord
            ? optimisticMarkPlacement(scanHistoryId, locationRecord)
            : null;
        useScannerLogisticPlacementStore
            .getState()
            .setConfirmedLocation(pendingPlacementMatch.id, pendingPlacementMatch.location);
        try {
            await markPlacementApi({
                scanHistoryId,
                logisticLocationId: pendingPlacementMatch.id,
            });
        }
        catch {
            if (prev) {
                useLogisticTasksStore.getState().upsertItem(prev);
            }
            useScannerLogisticPlacementStore
                .getState()
                .setConfirmedLocation(null, null);
        }
    },
    cancelPendingPlacement() {
        homeShellActions.closePopupPage();
        useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(null);
        useScannerLogisticPlacementStore
            .getState()
            .setRequiresZoneMismatchConfirm(false);
    },
    async refreshByIds(ids) {
        const { filters } = useLogisticTasksStore.getState();
        await refreshLogisticTasksByIdsController(ids, filters);
    },
    resetFilters() {
        useLogisticTasksStore.getState().setFilters({});
    },
};
// Expose the request key selector for flows
export { selectLogisticTasksFiltersRequestKey };
