import { apiClient } from "../../../core/api-client";
import type { LogisticIntention, LogisticEventType } from "../types/logistic-tasks.types";

export interface TaskClearPreview {
  asOf: string;
  count: number;
  byIntention: Partial<Record<LogisticIntention, number>>;
}

export interface TaskClearBatch {
  id: string;
  actorName: string;
  createdAt: string;
  note: string | null;
  clearedCount: number;
  remainingCount: number;
}

export interface ClearedTaskItem {
  id: string;
  sku: string | null;
  title: string;
  orderNumber: number | null;
  intention: LogisticIntention | null;
  currentStatus: LogisticEventType | null;
  canRestore: boolean;
}

export const getTaskClearPreviewApi = () =>
  apiClient.get<TaskClearPreview>("/logistic/task-clears/preview", { requiresAuth: true });

export const clearPendingTasksApi = (input: { asOf: string; expectedCount: number; note?: string }) =>
  apiClient.post<{ batchId: string | null; clearedCount: number }, typeof input>(
    "/logistic/task-clears", input, { requiresAuth: true },
  );

export const getTaskClearBatchesApi = (cursor?: string) =>
  apiClient.get<{ batches: TaskClearBatch[]; nextCursor: string | null }>(
    `/logistic/task-clears${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { requiresAuth: true },
  );

export const getTaskClearBatchItemsApi = (batchId: string, cursor?: string) =>
  apiClient.get<{
    batch: TaskClearBatch;
    items: ClearedTaskItem[];
    nextCursor: string | null;
  }>(
    `/logistic/task-clears/${encodeURIComponent(batchId)}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { requiresAuth: true },
  );

export const restoreTaskClearBatchApi = (batchId: string) =>
  apiClient.post<{ restoredCount: number; skippedCount: number }, Record<string, never>>(
    `/logistic/task-clears/${encodeURIComponent(batchId)}/restore`, {}, { requiresAuth: true },
  );

export const restoreTaskClearItemApi = (batchId: string, scanHistoryId: string) =>
  apiClient.post<{ restoredCount: number; skippedCount: number }, Record<string, never>>(
    `/logistic/task-clears/${encodeURIComponent(batchId)}/items/${encodeURIComponent(scanHistoryId)}/restore`,
    {}, { requiresAuth: true },
  );
