import { useContext } from "react";

import { RoleContext } from "../context/role-context";
import type { RoleCapabilities } from "../types/role-context.types";

export function useRoleCapabilities(): RoleCapabilities {
  const ctx = useContext(RoleContext);
  if (!ctx) {
    throw new Error(
      "useRoleCapabilities must be used inside RoleContextProvider",
    );
  }
  return ctx;
}
