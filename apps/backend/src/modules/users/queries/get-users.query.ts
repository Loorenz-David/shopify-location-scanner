import { userRepository } from "../../auth/repositories/user.repository.js";
import type { UserSummaryDto } from "../contracts/users.contract.js";

export const getUsersQuery = async (shopId: string): Promise<UserSummaryDto[]> => {
  const users = await userRepository.findAllByShop(shopId);

  return users.map((user) => ({
    id: user.id,
    username: user.username,
    role: user.role,
    shopId: user.shopId,
    createdAt: user.createdAt.toISOString(),
  }));
};
