import { getCurrentUserApi } from "../../auth/api/get-current-user.api";
import type { AuthUserDto } from "../../auth/types/auth.dto";

export async function getSettingsProfileApi(): Promise<AuthUserDto> {
  const response = await getCurrentUserApi();
  return response.user;
}
