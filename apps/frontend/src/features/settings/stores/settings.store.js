import { create } from "zustand";
export const useSettingsStore = create((set) => ({
    profile: null,
    isProfileLoading: false,
    profileError: null,
    setProfile: (profile) => set({ profile }),
    setProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
    setProfileError: (profileError) => set({ profileError }),
}));
export const selectSettingsProfile = (state) => state.profile;
export const selectSettingsProfileLoading = (state) => state.isProfileLoading;
export const selectSettingsProfileError = (state) => state.profileError;
