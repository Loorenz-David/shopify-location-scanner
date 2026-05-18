import { apiClient } from "../../../core/api-client";
export async function deleteZoneApi(id) {
    const encodedId = encodeURIComponent(id);
    await apiClient.delete(`/zones/${encodedId}`, undefined, {
        requiresAuth: true,
    });
}
