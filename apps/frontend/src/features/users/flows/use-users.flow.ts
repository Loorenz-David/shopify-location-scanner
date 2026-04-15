import { useEffect } from "react";

import { usersActions } from "../actions/users.actions";
import {
  selectUsersErrorMessage,
  selectUsersHasLoaded,
  selectUsersIsLoading,
  selectUsersItems,
  useUsersStore,
} from "../stores/users.store";

export function useUsersFlow() {
  const users = useUsersStore(selectUsersItems);
  const isLoading = useUsersStore(selectUsersIsLoading);
  const hasLoaded = useUsersStore(selectUsersHasLoaded);
  const errorMessage = useUsersStore(selectUsersErrorMessage);

  useEffect(() => {
    if (!hasLoaded) {
      void usersActions.loadUsers();
    }
  }, [hasLoaded]);

  return { users, isLoading, hasLoaded, errorMessage };
}
