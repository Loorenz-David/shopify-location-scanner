import { apiClient } from "../../../core/api-client";
export async function getCategoriesOverviewApi(from, to) {
    const response = await apiClient.get(`/stats/categories?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { requiresAuth: true });
    return response.data;
}
