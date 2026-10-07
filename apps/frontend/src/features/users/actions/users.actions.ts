import type { CreateUserRequestDto } from "../types/users.dto";
import {
  changeUserRoleController,
  createUserController,
  loadUsersController,
} from "../controllers/users.controller";
import type { UserRole } from "../types/users.types";

export const usersActions = {
  createUser(payload: CreateUserRequestDto): Promise<void> {
    return createUserController(payload);
  },

  loadUsers(): Promise<void> {
    return loadUsersController();
  },

  changeUserRole(targetUserId: string, role: UserRole): Promise<void> {
    return changeUserRoleController(targetUserId, role);
  },
};
