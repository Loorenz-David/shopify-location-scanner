import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import { buildRoleCapabilities } from "../domain/role-context.domain";
import { RoleContext } from "../context/role-context";
export function RoleContextProvider({ user, children, }) {
    const capabilities = useMemo(() => buildRoleCapabilities(user.role), [user.role]);
    return (_jsx(RoleContext.Provider, { value: capabilities, children: children }));
}
