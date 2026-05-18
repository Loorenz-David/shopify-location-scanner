import { changeUserRoleApi } from "../api/change-user-role.api";
import { getUsersApi } from "../api/get-users.api";
import { normalizeUsers } from "../domain/users.domain";
import { useUsersStore } from "../stores/users.store";
export async function loadUsersController() {
    const { isLoading, hydrateAndFinish, finishWithError } = useUsersStore.getState();
    if (isLoading)
        return;
    useUsersStore.setState({ isLoading: true, errorMessage: null });
    try {
        const response = await getUsersApi();
        const users = normalizeUsers(response.users);
        hydrateAndFinish(users);
    }
    catch {
        finishWithError("Failed to load users. Please try again.");
    }
}
export async function changeUserRoleController(targetUserId, role) {
    const { users, updateUserRole } = useUsersStore.getState();
    const previousUser = users.find((u) => u.id === targetUserId);
    const previousRole = previousUser?.role;
    updateUserRole(targetUserId, role);
    try {
        await changeUserRoleApi({ targetUserId, role });
    }
    catch {
        if (previousRole !== undefined) {
            updateUserRole(targetUserId, previousRole);
        }
        throw new Error("Failed to update user role. Please try again.");
    }
}
