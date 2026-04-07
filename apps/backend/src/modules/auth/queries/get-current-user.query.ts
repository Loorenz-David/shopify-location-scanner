import { UnauthorizedError } from "../../../shared/errors/http-errors.js";
import type { AuthUserDto } from "../contracts/auth.contract.js";
import { userRepository } from "../repositories/user.repository.js";

export const getCurrentUserQuery = async (
  userId: string,
): Promise<AuthUserDto> => {
  const user = await userRepository.findById(userId);
  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    shopId: user.shopId,
  };
};
