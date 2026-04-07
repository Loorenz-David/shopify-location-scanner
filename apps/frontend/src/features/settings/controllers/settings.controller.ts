import { ApiClientError } from "../../../core/api-client";
import { getSettingsProfileApi } from "../api/get-settings-profile.api";
import { useSettingsStore } from "../stores/settings.store";

export async function loadSettingsProfileController(): Promise<void> {
  const store = useSettingsStore.getState();
  store.setProfileLoading(true);
  store.setProfileError(null);

  try {
    const profile = await getSettingsProfileApi();
    store.setProfile(profile);
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) {
      store.setProfileError("Session expired. Please log in again.");
    } else {
      store.setProfileError("Unable to load profile right now.");
    }
  } finally {
    store.setProfileLoading(false);
  }
}
