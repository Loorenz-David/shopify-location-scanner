import { useRoleCapabilities } from "../../role-context/hooks/use-role-capabilities";
import { CreateUserPanel } from "./CreateUserPanel";
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
  const { can_create_users, can_change_user_roles, creatable_user_roles } =
    useRoleCapabilities();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const createButtonRef = useRef<HTMLButtonElement>(null);
  const { users, isLoading, hasLoaded, errorMessage } = useUsersFlow();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

  // Keep the selected card data available during the panel's exit animation.
  const [lastSelectedUser, setLastSelectedUser] = useState<User | null>(null);
  const panelUser = selectedUser ?? lastSelectedUser;

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
          {can_create_users && (
            <button
              ref={createButtonRef}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={isCreateOpen}
              className="ml-auto min-h-10 rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              onClick={() => {
                setSelectedUserId(null);
                setSuccessMessage(null);
                setIsCreateOpen(true);
              }}
            >
              <span aria-hidden="true">+ </span>Create user
            </button>
          )}
        </header>
        {successMessage && (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
          >
            {successMessage}
          </p>
        )}

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
                  canChangeRole={can_change_user_roles}
                  onClick={() => {
                    if (!can_change_user_roles) return;
                    setLastSelectedUser(user);
                    setSelectedUserId(user.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <SlidingOverlayContainer
        isOpen={isCreateOpen && can_create_users}
        title="Create user"
        zIndexClassName="z-[70]"
      >
        <CreateUserPanel
          onClose={() => setIsCreateOpen(false)}
          onCreated={() => {
            setSuccessMessage("User created successfully.");
            setIsCreateOpen(false);
          }}
          allowedRoles={creatable_user_roles}
          returnFocusRef={createButtonRef}
        />
      </SlidingOverlayContainer>

      <SlidingOverlayContainer
        isOpen={selectedUser !== null && can_change_user_roles}
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
