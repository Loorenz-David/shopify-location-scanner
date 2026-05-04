import { apiClient } from "../../../core/api-client";

interface MarkHistoryItemCompletionInput {
  scanHistoryId: string;
}

export async function markHistoryItemCompletedApi(
  input: MarkHistoryItemCompletionInput,
): Promise<void> {
  await apiClient.post<void, MarkHistoryItemCompletionInput>(
    "/logistic/items/mark-as-completed",
    input,
    { requiresAuth: true },
  );
}

export async function markHistoryItemUncompletedApi(
  input: MarkHistoryItemCompletionInput,
): Promise<void> {
  await apiClient.post<void, MarkHistoryItemCompletionInput>(
    "/logistic/items/mark-as-uncompleted",
    input,
    { requiresAuth: true },
  );
}
