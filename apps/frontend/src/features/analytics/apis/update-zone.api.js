import { apiClient } from "../../../core/api-client";
export async function updateZoneApi(id, payload) {
    const encodedId = encodeURIComponent(id);
    await apiClient.patch(`/zones/${encodedId}`, payload, {
        requiresAuth: true,
    });
}
