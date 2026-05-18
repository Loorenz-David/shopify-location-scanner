import { apiClient } from "../../../core/api-client";
export async function appEnterApi() {
    await apiClient.post("/auth/app-enter");
}
export async function appLeaveApi() {
    await apiClient.post("/auth/app-leave");
}
