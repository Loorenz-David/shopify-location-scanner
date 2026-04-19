import { apiClient } from "../../../core/api-client";

export async function appEnterApi(): Promise<void> {
  await apiClient.post<{ ok: boolean }>("/auth/app-enter");
}

export async function appLeaveApi(): Promise<void> {
  await apiClient.post<{ ok: boolean }>("/auth/app-leave");
}
