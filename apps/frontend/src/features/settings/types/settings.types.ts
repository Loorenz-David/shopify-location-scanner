import type { AuthUserDto } from "../../auth/types/auth.dto";

export type SettingsOptionPageId =
  | "settings-shopify"
  | "settings-location-options"
  | "settings-users"
  | "settings-store-map";

export interface SettingsOptionSubscription {
  id: SettingsOptionPageId;
  label: string;
}

export interface SettingsState {
  profile: AuthUserDto | null;
  isProfileLoading: boolean;
  profileError: string | null;
  setProfile: (profile: AuthUserDto | null) => void;
  setProfileLoading: (isLoading: boolean) => void;
  setProfileError: (message: string | null) => void;
}
