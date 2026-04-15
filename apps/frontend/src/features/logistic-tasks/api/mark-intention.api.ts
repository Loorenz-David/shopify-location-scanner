import { apiClient } from "../../../core/api-client";
import type {
  MarkIntentionRequestDto,
  MarkIntentionResponseDto,
} from "../types/logistic-tasks.dto";

export async function markIntentionApi(
  dto: MarkIntentionRequestDto,
): Promise<MarkIntentionResponseDto> {
  return apiClient.post<MarkIntentionResponseDto, MarkIntentionRequestDto>(
    "/logistic/intentions",
    dto,
    { requiresAuth: true },
  );
}
