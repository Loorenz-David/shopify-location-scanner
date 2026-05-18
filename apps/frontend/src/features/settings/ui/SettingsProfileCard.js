import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getInitialsFromUsername } from "../domain/settings-options.domain";
export function SettingsProfileCard({ username, role, }) {
    const initials = getInitialsFromUsername(username);
    return (_jsxs("article", { className: "flex items-center gap-4 rounded-2xl border border-slate-900/10 bg-white/85 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur", children: [_jsx("div", { className: "grid h-14 w-14 place-items-center rounded-full border border-slate-300/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(226,232,240,0.52))] text-lg font-bold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_3px_24px_rgba(15,23,42,0.12)] backdrop-blur-md", children: initials }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "m-0 truncate text-base font-bold text-slate-900", children: username }), _jsx("p", { className: "m-0 mt-1 text-sm capitalize text-slate-600", children: role })] })] }));
}
