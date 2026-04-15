import { useRef, useState } from "react";

import { BackArrowIcon } from "../../../assets/icons";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { SlidingOverlayContainer } from "../../home/ui/SlidingOverlayContainer";
import { usersActions } from "../actions/users.actions";
import { useUsersFlow } from "../flows/use-users.flow";
import type { User, UserRole } from "../types/users.types";
import { UserCard } from "./UserCard";
import { UserRolePanel } from "./UserRolePanel";

export function UsersSettingsPage() {
  const { users, isLoading, hasLoaded, errorMessage } = useUsersFlow();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  // Freeze the last known user so the exit animation renders with its data
  const panelUserRef = useRef<User | null>(null);
  if (selectedUser !== null) panelUserRef.current = selectedUser;
  const panelUser = panelUserRef.current;

  function handleChangeRole(role: UserRole) {
    if (!selectedUserId) return;
    void usersActions.changeUserRole(selectedUserId, role);
    setSelectedUserId(null);
  }

  const showSkeleton = isLoading || (!hasLoaded && errorMessage === null);

  return (
    <>
      <section className="mx-auto flex min-h-svh w-full max-w-[720px] flex-col gap-4 bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 pb-10 pt-6 text-slate-900">
        <header className="flex items-center gap-3">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-900/20"
            onClick={() => homeShellActions.selectNavigationPage("settings")}
            aria-label="Back to settings"
          >
            <BackArrowIcon className="h-5 w-5" aria-hidden="true" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Users</h1>
        </header>

        {showSkeleton && (
          <ul
            className="flex flex-col gap-3"
            aria-busy="true"
            aria-label="Loading users"
          >
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="h-[72px] animate-pulse rounded-xl border border-slate-900/10 bg-white/70"
              />
            ))}
          </ul>
        )}

        {errorMessage !== null && (
          <article className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
            <p className="text-sm font-semibold text-rose-700">
              {errorMessage}
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => void usersActions.loadUsers()}
            >
              Retry
            </button>
          </article>
        )}

        {hasLoaded && errorMessage === null && users.length === 0 && (
          <article className="rounded-2xl border border-slate-900/10 bg-white/85 p-5">
            <p className="text-sm font-semibold text-slate-700">
              No users found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              There are no users in your shop yet.
            </p>
          </article>
        )}

        {hasLoaded && errorMessage === null && users.length > 0 && (
          <ul className="flex flex-col gap-3">
            {users.map((user) => (
              <li key={user.id}>
                <UserCard
                  user={user}
                  onClick={() => setSelectedUserId(user.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <SlidingOverlayContainer
        isOpen={selectedUser !== null}
        title="Change Role"
        zIndexClassName="z-[70]"
      >
        {panelUser !== null && (
          <UserRolePanel
            user={panelUser}
            onChangeRole={handleChangeRole}
            onClose={() => setSelectedUserId(null)}
          />
        )}
      </SlidingOverlayContainer>
    </>
  );
}
