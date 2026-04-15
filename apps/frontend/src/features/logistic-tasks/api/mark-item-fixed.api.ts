import { apiClient } from "../../../core/api-client";

export async function markItemFixedApi(input: {
  scanHistoryId: string;
}): Promise<void> {
  await apiClient.post<void, { scanHistoryId: string }>(
    "/logistic/item-is-fix",
    { scanHistoryId: input.scanHistoryId },
    { requiresAuth: true },
  );
}
