import { useLogisticTasksStore } from "../stores/logistic-tasks.store";
import { useTaskCountStore } from "../stores/task-count.store";
import { itemMatchesFilters } from "../domain/logistic-tasks.domain";
import type {
  LogisticIntention,
  LogisticTaskItem,
} from "../types/logistic-tasks.types";
import type { LogisticLocationRecord } from "../../logistic-locations/types/logistic-locations.types";

export function optimisticMarkIntention(
  scanHistoryId: string,
  intention: LogisticIntention,
  fixItem: boolean,
  scheduledDate?: string,
  fixNotes?: string,
): LogisticTaskItem | null {
  const store = useLogisticTasksStore.getState();
  const item = store.items.find((i) => i.id === scanHistoryId);

  if (!item) return null;

  const updatedItem: LogisticTaskItem = {
    ...item,
    intention,
    fixItem,
    fixNotes: fixItem ? (fixNotes ?? null) : null,
    scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
    lastEventType: "marked_intention",
    logisticLocation: null,
  };

  store.upsertItem(updatedItem);

  const { filters } = store;
  if (!itemMatchesFilters(updatedItem, filters)) {
    store.removeItem(scanHistoryId);
    useTaskCountStore.getState().removeId(scanHistoryId);
  }

  return item;
}

export function optimisticMarkPlacement(
  scanHistoryId: string,
  locationRecord: LogisticLocationRecord,
): LogisticTaskItem | null {
  const store = useLogisticTasksStore.getState();
  const item = store.items.find((i) => i.id === scanHistoryId);

  if (!item) return null;

  const updatedItem: LogisticTaskItem = {
    ...item,
    lastEventType: "placed",
    logisticLocation: locationRecord.location,
    logisticZoneType: locationRecord.zoneType,
  };

  store.upsertItem(updatedItem);

  const { filters } = store;
  if (!itemMatchesFilters(updatedItem, filters)) {
    store.removeItem(scanHistoryId);
    useTaskCountStore.getState().removeId(scanHistoryId);
  }

  return item;
}
