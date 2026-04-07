import { homeShellActions } from "../../home/actions/home-shell.actions";
import { BackArrowIcon } from "../../../assets/icons";

export function UsersSettingsPage() {
  return (
    <section className="mx-auto flex min-h-svh w-full max-w-[720px] flex-col gap-4 bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 pb-10 pt-6 text-slate-900">
      <header className="flex items-center">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full border border-slate-900/20"
          onClick={() => homeShellActions.selectNavigationPage("settings")}
          aria-label="Back to settings"
        >
          <BackArrowIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <article className="rounded-2xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
        <p className="m-0 text-sm font-semibold text-slate-700">Coming soon</p>
        <p className="m-0 mt-2 text-sm text-slate-600">
          Users management feature shell is ready and this page will be expanded
          next.
        </p>
      </article>
    </section>
  );
}
