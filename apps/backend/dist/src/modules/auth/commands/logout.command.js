import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import { tokenService } from "../integrations/token.service.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
export const logoutCommand = async (input, userId) => {
    const tokenHash = tokenService.hashRefreshToken(input.refreshToken);
    const refreshToken = await refreshTokenRepository.findActiveByHash(tokenHash);
    if (!refreshToken || refreshToken.userId !== userId) {
        throw new UnauthorizedError("Invalid refresh token");
    }
    await refreshTokenRepository.revokeByHash(tokenHash);
};
//# sourceMappingURL=logout.command.js.map