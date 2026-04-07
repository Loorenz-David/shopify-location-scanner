import { apiClient } from "../../../core/api-client";
import type { BootstrapResponseDto } from "../types/bootstrap.dto";

export async function getBootstrapApi(): Promise<BootstrapResponseDto> {
  return apiClient.get<BootstrapResponseDto>("/bootstrap", {
    requiresAuth: true,
  });
}
