import { changeUserRoleController, loadUsersController, } from "../controllers/users.controller";
export const usersActions = {
    loadUsers() {
        return loadUsersController();
    },
    changeUserRole(targetUserId, role) {
        return changeUserRoleController(targetUserId, role);
    },
};
