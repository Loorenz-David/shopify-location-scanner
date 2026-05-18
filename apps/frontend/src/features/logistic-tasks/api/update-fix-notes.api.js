import { apiClient } from "../../../core/api-client";
export async function updateFixNotesApi(input) {
    await apiClient.patch(`/logistic/fix-notes/${input.scanHistoryId}`, { fixNotes: input.fixNotes }, { requiresAuth: true });
}
