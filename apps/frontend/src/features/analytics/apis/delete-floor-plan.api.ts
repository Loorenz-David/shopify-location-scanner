import { apiClient } from "../../../core/api-client";

// No UI in Phase 1 — wired up in a future floor management screen.
export async function deleteFloorPlanApi(id: string): Promise<void> {
  await apiClient.delete(`/floor-plans/${id}`, { requiresAuth: true });
}
