import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import type { AuthResponse, RefreshInput } from "../contracts/auth.contract.js";
import { tokenService } from "../integrations/token.service.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";

export const refreshAccessTokenCommand = async (
  input: RefreshInput,
): Promise<AuthResponse> => {
  const tokenHash = tokenService.hashRefreshToken(input.refreshToken);
  const token = await refreshTokenRepository.findActiveByHash(tokenHash);

  if (!token) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const user = await userRepository.findById(token.userId);
  if (!user) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const accessToken = tokenService.createAccessToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    shopId: user.shopId,
    tokenVersion: user.tokenVersion,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      shopId: user.shopId,
    },
    tokens: {
      accessToken,
      refreshToken: input.refreshToken,
    },
  };
};
