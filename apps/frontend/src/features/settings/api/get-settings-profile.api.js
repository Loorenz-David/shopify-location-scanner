import { getCurrentUserApi } from "../../auth/api/get-current-user.api";
export async function getSettingsProfileApi() {
    const response = await getCurrentUserApi();
    return response.user;
}
