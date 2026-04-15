import {
  changeUserRoleController,
  loadUsersController,
} from "../controllers/users.controller";
import type { UserRole } from "../types/users.types";

export const usersActions = {
  loadUsers(): Promise<void> {
    return loadUsersController();
  },

  changeUserRole(targetUserId: string, role: UserRole): Promise<void> {
    return changeUserRoleController(targetUserId, role);
  },
};
