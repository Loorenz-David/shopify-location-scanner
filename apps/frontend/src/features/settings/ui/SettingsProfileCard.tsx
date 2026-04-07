import { getInitialsFromUsername } from "../domain/settings-options.domain";

interface SettingsProfileCardProps {
  username: string;
  role: string;
}

export function SettingsProfileCard({
  username,
  role,
}: SettingsProfileCardProps) {
  const initials = getInitialsFromUsername(username);

  return (
    <article className="flex items-center gap-4 rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="grid h-14 w-14 place-items-center rounded-full border border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(226,232,240,0.52))] text-lg font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_24px_rgba(15,23,42,0.12)] backdrop-blur-md">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="m-0 truncate text-base font-bold text-slate-900">
          {username}
        </p>
        <p className="m-0 mt-1 text-sm capitalize text-slate-600">{role}</p>
      </div>
    </article>
  );
}
