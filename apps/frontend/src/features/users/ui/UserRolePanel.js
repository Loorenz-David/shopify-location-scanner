import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CloseIcon } from "../../../assets/icons";
import { USER_ROLE_COLORS, USER_ROLE_LABELS, USER_ROLE_ORDER, } from "../domain/users.domain";
export function UserRolePanel({ user, onChangeRole, onClose, }) {
    return (_jsxs("div", { className: "flex h-svh flex-col", children: [_jsx("button", { type: "button", className: "flex-1 cursor-default", onClick: onClose, "aria-label": "Close" }), _jsx("section", { className: "flex max-h-[50svh] shrink-0 flex-col overflow-hidden rounded-t-[28px] border-t border-slate-900/10 bg-white shadow-[0_-24px_70px_rgba(15,23,42,0.18)]", children: _jsx("div", { className: "flex-1 overflow-y-auto", children: _jsxs("div", { className: "flex flex-col gap-5 px-5 pb-10 pt-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-base font-bold text-slate-900", children: "Change Role" }), _jsx("button", { type: "button", className: "grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100", onClick: onClose, "aria-label": "Close", children: _jsx(CloseIcon, { className: "h-5 w-5", "aria-hidden": "true" }) })] }), _jsxs("p", { className: "text-sm text-slate-600", children: ["Changing role for", " ", _jsx("span", { className: "font-semibold text-slate-900", children: user.username })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: USER_ROLE_ORDER.map((role) => {
                                    const colors = USER_ROLE_COLORS[role];
                                    const isActive = user.role === role;
                                    return (_jsx("button", { type: "button", className: `rounded-xl border p-4 text-sm font-semibold transition-colors ${isActive ? colors.active : colors.inactive}`, onClick: () => onChangeRole(role), children: USER_ROLE_LABELS[role] }, role));
                                }) })] }) }) })] }));
}
