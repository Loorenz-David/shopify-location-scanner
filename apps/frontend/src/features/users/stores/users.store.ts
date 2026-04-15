import { create } from "zustand";

import type { UserRole } from "../../role-context/types/role-context.types";
import type { User } from "../types/users.types";

interface UsersStoreState {
  users: User[];
  isLoading: boolean;
  hasLoaded: boolean;
  errorMessage: string | null;

  hydrateAndFinish: (users: User[]) => void;
  finishWithError: (message: string) => void;
  updateUserRole: (id: string, role: UserRole) => void;
  reset: () => void;
}

const initialState = {
  users: [] as User[],
  isLoading: false,
  hasLoaded: false,
  errorMessage: null as string | null,
};

export const useUsersStore = create<UsersStoreState>((set) => ({
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

export const selectUsersItems = (state: UsersStoreState) => state.users;
export const selectUsersIsLoading = (state: UsersStoreState) => state.isLoading;
export const selectUsersHasLoaded = (state: UsersStoreState) => state.hasLoaded;
export const selectUsersErrorMessage = (state: UsersStoreState) =>
  state.errorMessage;
