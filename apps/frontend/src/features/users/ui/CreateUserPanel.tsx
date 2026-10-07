import { useEffect, useRef, useState, type RefObject } from "react";
import { CloseIcon } from "../../../assets/icons";
import { usersActions } from "../actions/users.actions";
import { USER_ROLE_LABELS, USER_ROLE_ORDER } from "../domain/users.domain";
import type { UserRole } from "../types/users.types";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  allowedRoles?: UserRole[];
}

export function CreateUserPanel({
  onClose,
  onCreated,
  returnFocusRef,
  allowedRoles = USER_ROLE_ORDER,
}: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("worker");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trigger = returnFocusRef.current;
    usernameRef.current?.focus();
    return () => {
      trigger?.focus();
    };
  }, [returnFocusRef]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!savingRef.current) onClose();
      }
      if (event.key === "Tab") {
        const controls = Array.from(
          formRef.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled)",
          ) ?? [],
        );
        const first = controls[0];
        const last = controls.at(-1);
        if (!first) {
          event.preventDefault();
          formRef.current?.focus();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !formRef.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !formRef.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) {
      setError("Username must be 3–50 characters.");
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError("Password must be 8–128 characters.");
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setError(null);
    try {
      await usersActions.createUser({
        username: trimmedUsername,
        password,
        role,
      });
      setPassword("");
      onCreated();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Failed to create user. Please try again.",
      );
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        type="button"
        className="min-h-8 flex-1 cursor-default"
        aria-label="Dismiss create user"
        disabled={isSaving}
        onClick={onClose}
        tabIndex={-1}
      />
      <section className="mx-auto flex max-h-[90svh] w-full max-w-[720px] shrink-0 flex-col overflow-y-auto rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]">
        <form
          ref={formRef}
          tabIndex={-1}
          onSubmit={(event) => void submit(event)}
          noValidate
          aria-busy={isSaving}
          className="flex flex-col gap-5 px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5"
        >
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Create user</h2>
              <p className="mt-1 text-sm text-slate-500">
                Add someone to your shop.
              </p>
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              aria-label="Close create user"
              className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            >
              <CloseIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            Username
            <input
              ref={usernameRef}
              className={inputClass}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              required
              minLength={3}
              maxLength={50}
              disabled={isSaving}
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            Password
            <input
              type="password"
              className={inputClass}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={isSaving}
            />
            <span className="text-xs font-normal text-slate-500">
              Use at least 8 characters.
            </span>
          </label>
          <label className="flex flex-col gap-2 text-sm font-semibold text-slate-800">
            Role
            <select
              className={inputClass}
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              disabled={isSaving}
            >
              {allowedRoles.map((value) => (
                <option key={value} value={value}>
                  {USER_ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700"
            >
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSaving ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
