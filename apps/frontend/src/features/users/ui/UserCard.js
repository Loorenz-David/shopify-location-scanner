import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BoldArrowIcon } from "../../../assets/icons";
import { USER_ROLE_COLORS, USER_ROLE_LABELS } from "../domain/users.domain";
export function UserCard({ user, onClick }) {
    const roleColors = USER_ROLE_COLORS[user.role];
    const roleLabel = USER_ROLE_LABELS[user.role];
    return (_jsxs("article", { className: "flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-900/10 bg-white/85 px-4 py-4 shadow-[0_4px_12px_rgba(15,23,42,0.06)] active:bg-slate-50", onClick: onClick, children: [_jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-1", children: [_jsx("p", { className: "truncate text-sm font-semibold text-slate-900", children: user.username }), _jsx("span", { className: `w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors.badge}`, children: roleLabel })] }), _jsx(BoldArrowIcon, { className: "h-4 w-4 shrink-0 text-slate-400", "aria-hidden": "true" })] }));
}
