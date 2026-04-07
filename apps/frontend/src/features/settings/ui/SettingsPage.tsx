import {
  formatBootstrapSyncLabel,
  settingsOptionSubscriptions,
} from "../domain/settings-options.domain";
import { useSettingsPageContext } from "../context/settings-page.context";
import { SettingsOptionRow } from "./SettingsOptionRow";
import { SettingsProfileCard } from "./SettingsProfileCard";

export function SettingsPage() {
  const {
    profile,
    isProfileLoading,
    profileError,
    bootstrapLastSyncedAt,
    scannerOnScanAsk,
    isLogoutPending,
    logoutError,
    openOption,
    setScannerOnScanAsk,
    logout,
  } = useSettingsPageContext();

  return (
    <section className="mx-auto flex min-h-[calc(100svh-7.5rem)] w-full max-w-[720px] flex-col gap-4 px-4 pb-32 pt-6">
      <header>
        <p className="m-0 text-xs uppercase tracking-[0.08em] text-slate-500">
          Workspace
        </p>
        <h1 className="m-0 mt-1 text-3xl font-black text-slate-900">
          Settings
        </h1>
        {bootstrapLastSyncedAt ? (
          <p className="m-0 mt-1 text-xs font-medium text-slate-500">
            Bootstrap last synced:{" "}
            {formatBootstrapSyncLabel(bootstrapLastSyncedAt)}
          </p>
        ) : null}
      </header>

      {isProfileLoading ? (
        <div className="h-[86px] animate-pulse rounded-2xl border border-slate-900/10 bg-white/70" />
      ) : profile ? (
        <SettingsProfileCard username={profile.username} role={profile.role} />
      ) : (
        <div className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-medium text-rose-900">
          {profileError ?? "Unable to load profile details."}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-3">
        {settingsOptionSubscriptions.map((option) => (
          <SettingsOptionRow
            key={option.id}
            label={option.label}
            onPress={() => openOption(option.id)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-slate-900/10 bg-white/85 p-3 shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm font-semibold text-slate-900">
              Ask before location scan
            </p>
            <p className="m-0 mt-1 text-xs text-slate-500">
              When enabled, item scan stays on this step until you tap Scan
              location.
            </p>
          </div>

          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              className="peer sr-only"
              checked={scannerOnScanAsk}
              onChange={(event) =>
                setScannerOnScanAsk(event.currentTarget.checked)
              }
              aria-label="Ask before location scan"
            />
            <span
              className={`relative h-6 w-11 rounded-full transition peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 ${
                scannerOnScanAsk ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                  scannerOnScanAsk ? "left-[22px]" : "left-0.5"
                }`}
              />
            </span>
          </label>
        </div>
      </div>

      <div className="mt-auto pt-4">
        {logoutError ? (
          <div className="mb-3 rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-medium text-rose-900">
            {logoutError}
          </div>
        ) : null}

        <button
          type="button"
          className="h-11 w-full rounded-xl border border-rose-200 bg-rose-50 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
          onClick={() => void logout()}
          disabled={isLogoutPending}
        >
          {isLogoutPending ? "Logging out..." : "Log out"}
        </button>
      </div>
    </section>
  );
}
