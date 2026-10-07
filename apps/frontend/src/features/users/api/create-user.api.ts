import { apiClient } from "../../../core/api-client";
import type {
  CreateUserRequestDto,
  CreateUserResponseDto,
} from "../types/users.dto";

export function createUserApi(
  payload: CreateUserRequestDto,
): Promise<CreateUserResponseDto> {
  return apiClient.post<CreateUserResponseDto>("/users", payload, {
    requiresAuth: true,
  });
}
