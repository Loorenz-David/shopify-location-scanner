import { apiClient } from "../../../core/api-client";
export async function getCategoryByLocationApi(category, from, to) {
    const encodedCategory = encodeURIComponent(category);
    const response = await apiClient.get(`/stats/categories/${encodedCategory}/locations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
