import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import { passwordHasher } from "../integrations/password-hasher.js";
import { tokenService } from "../integrations/token.service.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
export const loginCommand = async (input) => {
    const user = await userRepository.findByUsername(input.username);
    if (!user) {
        throw new UnauthorizedError("Invalid username or password");
    }
    const isValidPassword = await passwordHasher.verify(input.password, user.passwordHash);
    if (!isValidPassword) {
        throw new UnauthorizedError("Invalid username or password");
    }
    const accessToken = tokenService.createAccessToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        shopId: user.shopId,
        tokenVersion: user.tokenVersion,
    });
    const refreshToken = tokenService.createRefreshToken();
    const refreshTokenHash = tokenService.hashRefreshToken(refreshToken);
    await refreshTokenRepository.create({
        userId: user.id,
        tokenHash: refreshTokenHash,
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
            refreshToken,
        },
    };
};
//# sourceMappingURL=login.command.js.map