import { homeShellActions } from "../../home/actions/home-shell.actions";
import { useLogisticLocationsStore } from "../../logistic-locations/stores/logistic-locations.store";
import { useScannerLogisticPlacementStore } from "../../scanner/stores/scanner-logistic-placement.store";
import { markIntentionApi } from "../api/mark-intention.api";
import { markItemFixedApi } from "../api/mark-item-fixed.api";
import { markPlacementApi } from "../api/mark-placement.api";
import { updateFixNotesApi } from "../api/update-fix-notes.api";
import {
  loadLogisticTasksController,
  refreshLogisticTasksByIdsController,
} from "../controllers/logistic-tasks.controller";
import {
  optimisticMarkIntention,
  optimisticMarkPlacement,
} from "../controllers/logistic-tasks-optimistic.controller";
import {
  selectLogisticTasksFiltersRequestKey,
  useLogisticTasksStore,
} from "../stores/logistic-tasks.store";
import type {
  LogisticIntention,
  LogisticTaskFilters,
} from "../types/logistic-tasks.types";

export const logisticTasksActions = {
  async loadTasks(filters: LogisticTaskFilters): Promise<void> {
    await loadLogisticTasksController(filters);
  },

  setFilters(partial: Partial<LogisticTaskFilters>): void {
    useLogisticTasksStore.getState().setFilters(partial);
  },

  setQuery(q: string): void {
    useLogisticTasksStore.getState().setQuery(q);
  },

  setActiveIntentionTab(tab: LogisticIntention | null): void {
    useLogisticTasksStore.getState().setActiveIntentionTab(tab);
  },

  openFilters(): void {
    homeShellActions.openOverlayPage("logistic-tasks-filters", "Filter tasks");
  },

  openMarkIntentionOverlay(scanHistoryId: string): void {
    homeShellActions.openOverlayPage(
      `logistic-tasks-mark-intention:${scanHistoryId}`,
      "Set Intention",
    );
  },

  async markIntention(
    scanHistoryId: string,
    intention: LogisticIntention,
    fixItem: boolean,
    scheduledDate?: string,
    fixNotes?: string,
  ): Promise<void> {
    const prev = optimisticMarkIntention(
      scanHistoryId,
      intention,
      fixItem,
      scheduledDate,
      fixNotes,
    );
    homeShellActions.closeOverlayPage();

    try {
      await markIntentionApi({
        scanHistoryId,
        intention,
        fixItem,
        fixNotes,
        scheduledDate,
      });
    } catch {
      if (prev) {
        useLogisticTasksStore.getState().upsertItem(prev);
      }
      useLogisticTasksStore
        .getState()
        .finishWithError("Unable to mark intention. Please try again.");
    }
  },

  openPlacementScanner(scanHistoryId: string): void {
    useScannerLogisticPlacementStore.getState().setScanHistoryId(scanHistoryId);
    homeShellActions.openFullFeaturePage("scanner-logistic-placement");
  },

  openFixItemDetail(scanHistoryId: string): void {
    homeShellActions.openOverlayPage(
      `logistic-tasks-fix-item-detail:${scanHistoryId}`,
      "Fix Details",
    );
  },

  async updateFixNotes(
    scanHistoryId: string,
    fixNotes: string | null,
  ): Promise<void> {
    const existing = useLogisticTasksStore
      .getState()
      .items.find((i) => i.id === scanHistoryId);
    if (existing) {
      useLogisticTasksStore.getState().upsertItem({ ...existing, fixNotes });
    }

    try {
      await updateFixNotesApi({ scanHistoryId, fixNotes });
    } catch {
      if (existing) {
        useLogisticTasksStore.getState().upsertItem(existing);
      }
      useLogisticTasksStore
        .getState()
        .finishWithError("Unable to update fix note. Please try again.");
    }
  },

  closePlacementScanner(): void {
    useScannerLogisticPlacementStore.getState().reset();
    homeShellActions.closeFullFeaturePage();
  },

  async markPlacement(
    scanHistoryId: string,
    locationId: string,
  ): Promise<void> {
    const locations = useLogisticLocationsStore.getState().locations;
    const locationRecord = locations.find((l) => l.id === locationId) ?? null;
    const prev = locationRecord
      ? optimisticMarkPlacement(scanHistoryId, locationRecord)
      : null;

    try {
      await markPlacementApi({ scanHistoryId, logisticLocationId: locationId });
    } catch {
      if (prev) {
        useLogisticTasksStore.getState().upsertItem(prev);
      }
    }
  },

  dismissBatchNotification(): void {
    useLogisticTasksStore.getState().setBatchNotification(null);
  },

  async markItemFixed(scanHistoryId: string): Promise<void> {
    const existing = useLogisticTasksStore
      .getState()
      .items.find((i) => i.id === scanHistoryId);
    if (existing) {
      useLogisticTasksStore
        .getState()
        .upsertItem({ ...existing, isItemFixed: true });
    }

    try {
      await markItemFixedApi({ scanHistoryId });
    } catch {
      if (existing) {
        useLogisticTasksStore.getState().upsertItem(existing);
      }
      useLogisticTasksStore
        .getState()
        .finishWithError("Unable to mark item as fixed. Please try again.");
    }
  },

  async confirmPendingPlacement(): Promise<void> {
    const {
      scanHistoryId,
      pendingPlacementMatch,
      requiresZoneMismatchConfirm,
    } = useScannerLogisticPlacementStore.getState();

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

    if (!scanHistoryId || !pendingPlacementMatch) return;

    const locations = useLogisticLocationsStore.getState().locations;
    const locationRecord =
      locations.find((l) => l.id === pendingPlacementMatch.id) ?? null;
    const prev = locationRecord
      ? optimisticMarkPlacement(scanHistoryId, locationRecord)
      : null;

    useScannerLogisticPlacementStore
      .getState()
      .setConfirmedLocation(
        pendingPlacementMatch.id,
        pendingPlacementMatch.location,
      );

    try {
      await markPlacementApi({
        scanHistoryId,
        logisticLocationId: pendingPlacementMatch.id,
      });
    } catch {
      if (prev) {
        useLogisticTasksStore.getState().upsertItem(prev);
      }
      useScannerLogisticPlacementStore
        .getState()
        .setConfirmedLocation(null, null);
    }
  },

  cancelPendingPlacement(): void {
    homeShellActions.closePopupPage();
    useScannerLogisticPlacementStore.getState().setPendingPlacementMatch(null);
    useScannerLogisticPlacementStore
      .getState()
      .setRequiresZoneMismatchConfirm(false);
  },

  async refreshByIds(ids: string[]): Promise<void> {
    const { filters } = useLogisticTasksStore.getState();
    await refreshLogisticTasksByIdsController(ids, filters);
  },

  resetFilters(): void {
    useLogisticTasksStore.getState().setFilters({});
  },
};

// Expose the request key selector for flows
export { selectLogisticTasksFiltersRequestKey };
