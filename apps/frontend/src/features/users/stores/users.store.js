import { create } from "zustand";
const initialState = {
    users: [],
    isLoading: false,
    hasLoaded: false,
    errorMessage: null,
};
export const useUsersStore = create((set) => ({
    ...initialState,
    hydrateAndFinish(users) {
        set({ users, isLoading: false, hasLoaded: true, errorMessage: null });
    },
    finishWithError(message) {
        set({ isLoading: false, hasLoaded: true, errorMessage: message });
    },
    updateUserRole(id, role) {
        set((state) => ({
            users: state.users.map((u) => (u.id === id ? { ...u, role } : u)),
        }));
    },
    reset() {
        set(initialState);
    },
}));
export const selectUsersItems = (state) => state.users;
export const selectUsersIsLoading = (state) => state.isLoading;
export const selectUsersHasLoaded = (state) => state.hasLoaded;
export const selectUsersErrorMessage = (state) => state.errorMessage;
