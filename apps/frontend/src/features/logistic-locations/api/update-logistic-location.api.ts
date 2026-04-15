import { apiClient } from "../../../core/api-client";
import type {
  UpdateLogisticLocationRequestDto,
  UpdateLogisticLocationResponseDto,
} from "../types/logistic-locations.dto";

export async function updateLogisticLocationApi(
  id: string,
  dto: UpdateLogisticLocationRequestDto,
): Promise<UpdateLogisticLocationResponseDto> {
  return apiClient.patch<
    UpdateLogisticLocationResponseDto,
    UpdateLogisticLocationRequestDto
  >(`/logistic/update-location/${id}`, dto, { requiresAuth: true });
}
