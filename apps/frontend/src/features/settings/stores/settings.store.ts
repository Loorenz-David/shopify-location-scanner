import { create } from "zustand";

import type { SettingsState } from "../types/settings.types";

export const useSettingsStore = create<SettingsState>((set) => ({
  profile: null,
  isProfileLoading: false,
  profileError: null,
  setProfile: (profile) => set({ profile }),
  setProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
  setProfileError: (profileError) => set({ profileError }),
}));

export const selectSettingsProfile = (state: SettingsState) => state.profile;
export const selectSettingsProfileLoading = (state: SettingsState) =>
  state.isProfileLoading;
export const selectSettingsProfileError = (state: SettingsState) =>
  state.profileError;
