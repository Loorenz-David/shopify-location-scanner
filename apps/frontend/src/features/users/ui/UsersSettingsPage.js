import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useRef, useState } from "react";
import { BackArrowIcon } from "../../../assets/icons";
import { homeShellActions } from "../../home/actions/home-shell.actions";
import { SlidingOverlayContainer } from "../../home/ui/SlidingOverlayContainer";
import { usersActions } from "../actions/users.actions";
import { useUsersFlow } from "../flows/use-users.flow";
import { UserCard } from "./UserCard";
import { UserRolePanel } from "./UserRolePanel";
export function UsersSettingsPage() {
    const { users, isLoading, hasLoaded, errorMessage } = useUsersFlow();
    const [selectedUserId, setSelectedUserId] = useState(null);
    const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;
    // Freeze the last known user so the exit animation renders with its data
    const panelUserRef = useRef(null);
    if (selectedUser !== null)
        panelUserRef.current = selectedUser;
    const panelUser = panelUserRef.current;
    function handleChangeRole(role) {
        if (!selectedUserId)
            return;
        void usersActions.changeUserRole(selectedUserId, role);
        setSelectedUserId(null);
    }
    const showSkeleton = isLoading || (!hasLoaded && errorMessage === null);
    return (_jsxs(_Fragment, { children: [_jsxs("section", { className: "mx-auto flex min-h-svh w-full max-w-[720px] flex-col gap-4 bg-[radial-gradient(circle_at_10%_10%,rgba(20,176,142,0.22),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(242,157,68,0.22),transparent_35%),linear-gradient(180deg,#f5fbf8_0%,#edf3ff_55%,#eef2f5_100%)] px-4 pb-10 pt-6 text-slate-900", children: [_jsxs("header", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", className: "grid h-10 w-10 place-items-center rounded-full border border-slate-900/20", onClick: () => homeShellActions.selectNavigationPage("settings"), "aria-label": "Back to settings", children: _jsx(BackArrowIcon, { className: "h-5 w-5", "aria-hidden": "true" }) }), _jsx("h1", { className: "text-xl font-bold text-slate-900", children: "Users" })] }), showSkeleton && (_jsx("ul", { className: "flex flex-col gap-3", "aria-busy": "true", "aria-label": "Loading users", children: [0, 1, 2].map((i) => (_jsx("li", { className: "h-[72px] animate-pulse rounded-xl border border-slate-900/10 bg-white/70" }, i))) })), errorMessage !== null && (_jsxs("article", { className: "rounded-2xl border border-rose-200 bg-rose-50 p-5", children: [_jsx("p", { className: "text-sm font-semibold text-rose-700", children: errorMessage }), _jsx("button", { type: "button", className: "mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white", onClick: () => void usersActions.loadUsers(), children: "Retry" })] })), hasLoaded && errorMessage === null && users.length === 0 && (_jsxs("article", { className: "rounded-2xl border border-slate-900/10 bg-white/85 p-5", children: [_jsx("p", { className: "text-sm font-semibold text-slate-700", children: "No users found" }), _jsx("p", { className: "mt-1 text-sm text-slate-500", children: "There are no users in your shop yet." })] })), hasLoaded && errorMessage === null && users.length > 0 && (_jsx("ul", { className: "flex flex-col gap-3", children: users.map((user) => (_jsx("li", { children: _jsx(UserCard, { user: user, onClick: () => setSelectedUserId(user.id) }) }, user.id))) }))] }), _jsx(SlidingOverlayContainer, { isOpen: selectedUser !== null, title: "Change Role", zIndexClassName: "z-[70]", children: panelUser !== null && (_jsx(UserRolePanel, { user: panelUser, onChangeRole: handleChangeRole, onClose: () => setSelectedUserId(null) })) })] }));
}
