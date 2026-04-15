import { CloseIcon } from "../../../assets/icons";
import {
  USER_ROLE_COLORS,
  USER_ROLE_LABELS,
  USER_ROLE_ORDER,
} from "../domain/users.domain";
import type { User, UserRole } from "../types/users.types";

interface UserRolePanelProps {
  user: User;
  onChangeRole: (role: UserRole) => void;
  onClose: () => void;
}

export function UserRolePanel({
  user,
  onChangeRole,
  onClose,
}: UserRolePanelProps) {
  return (
    <div className="flex h-svh flex-col">
      <button
        type="button"
        className="flex-1 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />

      <section className="flex max-h-[50svh] shrink-0 flex-col overflow-hidden rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-5 px-5 pb-10 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Change Role
              </h2>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100"
                onClick={onClose}
                aria-label="Close"
              >
                <CloseIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <p className="text-sm text-slate-600">
              Changing role for{" "}
              <span className="font-semibold text-slate-900">
                {user.username}
              </span>
            </p>

            <div className="grid grid-cols-2 gap-3">
              {USER_ROLE_ORDER.map((role: UserRole) => {
                const colors = USER_ROLE_COLORS[role];
                const isActive = user.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    className={`rounded-xl border p-4 text-sm font-semibold transition-colors ${
                      isActive ? colors.active : colors.inactive
                    }`}
                    onClick={() => onChangeRole(role)}
                  >
                    {USER_ROLE_LABELS[role]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
