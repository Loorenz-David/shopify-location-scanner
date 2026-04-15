import { apiClient } from "../../../core/api-client";
import type {
  CreateLogisticLocationRequestDto,
  CreateLogisticLocationResponseDto,
} from "../types/logistic-locations.dto";

export async function createLogisticLocationApi(
  dto: CreateLogisticLocationRequestDto,
): Promise<CreateLogisticLocationResponseDto> {
  return apiClient.put<
    CreateLogisticLocationResponseDto,
    CreateLogisticLocationRequestDto
  >("/logistic/add-location", dto, { requiresAuth: true });
}
