import { apiClient } from "../../../core/api-client";
import type { MarkPlacementRequestDto } from "../types/logistic-tasks.dto";

export async function markPlacementApi(
  dto: MarkPlacementRequestDto,
): Promise<void> {
  await apiClient.post<void, MarkPlacementRequestDto>(
    "/logistic/placements",
    dto,
    { requiresAuth: true },
  );
}
