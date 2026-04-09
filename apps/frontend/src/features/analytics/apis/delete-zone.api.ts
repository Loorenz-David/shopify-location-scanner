import { apiClient } from "../../../core/api-client";

export async function deleteZoneApi(id: string): Promise<void> {
  const encodedId = encodeURIComponent(id);
  await apiClient.delete<void, undefined>(`/zones/${encodedId}`, undefined, {
    requiresAuth: true,
  });
}
