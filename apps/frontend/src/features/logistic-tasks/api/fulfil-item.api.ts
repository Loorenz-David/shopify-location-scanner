import { apiClient } from "../../../core/api-client";
import type { FulfilItemRequestDto } from "../types/logistic-tasks.dto";

export async function fulfilItemApi(dto: FulfilItemRequestDto): Promise<void> {
  await apiClient.post<void, FulfilItemRequestDto>("/logistic/fulfil", dto, {
    requiresAuth: true,
  });
}
