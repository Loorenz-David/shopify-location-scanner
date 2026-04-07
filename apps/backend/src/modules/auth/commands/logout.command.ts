import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import type { LogoutInput } from "../contracts/auth.contract.js";
import { tokenService } from "../integrations/token.service.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";

export const logoutCommand = async (
  input: LogoutInput,
  userId: string,
): Promise<void> => {
  const tokenHash = tokenService.hashRefreshToken(input.refreshToken);
  const refreshToken = await refreshTokenRepository.findActiveByHash(tokenHash);

  if (!refreshToken || refreshToken.userId !== userId) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  await refreshTokenRepository.revokeByHash(tokenHash);
};
