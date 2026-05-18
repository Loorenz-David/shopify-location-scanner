import { useContext } from "react";
import { RoleContext } from "../context/role-context";
export function useRoleCapabilities() {
    const ctx = useContext(RoleContext);
    if (!ctx) {
        throw new Error("useRoleCapabilities must be used inside RoleContextProvider");
    }
    return ctx;
}
