import { ConflictError, ValidationError, } from "../../../shared/errors/http-errors.js";
import { passwordHasher } from "../integrations/password-hasher.js";
import { tokenService } from "../integrations/token.service.js";
import { refreshTokenRepository } from "../repositories/refresh-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { shopRepository } from "../../shopify/repositories/shop.repository.js";
import { env } from "../../../config/env.js";
export const registerCommand = async (input) => {
    const existing = await userRepository.findByUsername(input.username);
    if (existing) {
        throw new ConflictError("Username already exists");
    }
    let role = "worker";
    if (input.key !== undefined) {
        if (!env.ADMIN_KEY || input.key !== env.ADMIN_KEY) {
            throw new ValidationError("Key fail");
        }
        role = "admin";
    }
    const linkedShop = await shopRepository.findAnyLinkedShop();
    const passwordHash = await passwordHasher.hash(input.password);
    const user = await userRepository.create({
        username: input.username,
        passwordHash,
        role,
        shopId: linkedShop?.id ?? null,
    });
    const accessToken = tokenService.createAccessToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        shopId: user.shopId,
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
//# sourceMappingURL=register.command.js.map