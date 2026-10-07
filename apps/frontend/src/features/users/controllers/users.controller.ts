import { createUserApi } from "../api/create-user.api";
import type { CreateUserRequestDto } from "../types/users.dto";
import { changeUserRoleApi } from "../api/change-user-role.api";
import { getUsersApi } from "../api/get-users.api";
import { normalizeUser, normalizeUsers } from "../domain/users.domain";
import { useUsersStore } from "../stores/users.store";
import type { UserRole } from "../types/users.types";

export async function loadUsersController(): Promise<void> {
  const { isLoading, hydrateAndFinish, finishWithError } =
    useUsersStore.getState();

  if (isLoading) return;

  useUsersStore.setState({ isLoading: true, errorMessage: null });

  try {
    const response = await getUsersApi();
    const users = normalizeUsers(response.users);
    hydrateAndFinish(users);
  } catch {
    finishWithError("Failed to load users. Please try again.");
  }
}

export async function changeUserRoleController(
  targetUserId: string,
  role: UserRole,
): Promise<void> {
  const { users, updateUserRole } = useUsersStore.getState();

  const previousUser = users.find((u) => u.id === targetUserId);
  const previousRole = previousUser?.role;

  updateUserRole(targetUserId, role);

  try {
    await changeUserRoleApi({ targetUserId, role });
  } catch {
    if (previousRole !== undefined) {
      updateUserRole(targetUserId, previousRole);
    }
    throw new Error("Failed to update user role. Please try again.");
  }
}

export async function createUserController(
  payload: CreateUserRequestDto,
): Promise<void> {
  const response = await createUserApi(payload);
  useUsersStore.getState().addUser(normalizeUser(response.user));
}
