import { NotFoundError, ForbiddenError } from "../../../shared/errors/http-errors.js";
import { userRepository } from "../../auth/repositories/user.repository.js";
import { refreshTokenRepository } from "../../auth/repositories/refresh-token.repository.js";
import { broadcastToUser } from "../../ws/ws-broadcaster.js";
import type { ChangeUserRoleInput, UserSummaryDto } from "../contracts/users.contract.js";

export const changeUserRoleCommand = async (input: {
  requestingUserId: string;
  shopId: string;
  payload: ChangeUserRoleInput;
}): Promise<UserSummaryDto> => {
  if (input.requestingUserId === input.payload.targetUserId) {
    throw new ForbiddenError("Cannot change your own role");
  }

  const target = await userRepository.findById(input.payload.targetUserId);

  if (!target || target.shopId !== input.shopId) {
    throw new NotFoundError("User not found");
  }

  const updated = await userRepository.updateRole(
    target.id,
    input.payload.role,
  );

  await refreshTokenRepository.revokeAllByUserId(target.id);

  broadcastToUser(input.shopId, target.id, { type: "session_invalidated" });

  return {
    id: updated.id,
    username: updated.username,
    role: updated.role,
    shopId: updated.shopId,
    createdAt: updated.createdAt.toISOString(),
  };
};
