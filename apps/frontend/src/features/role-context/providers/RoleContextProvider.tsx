import { useMemo, type ReactNode } from "react";

import type { AuthUserDto } from "../../auth/types/auth.dto";
import { buildRoleCapabilities } from "../domain/role-context.domain";
import { RoleContext } from "../context/role-context";

interface RoleContextProviderProps {
  user: AuthUserDto;
  children: ReactNode;
}

export function RoleContextProvider({
  user,
  children,
}: RoleContextProviderProps) {
  const capabilities = useMemo(
    () => buildRoleCapabilities(user.role),
    [user.role],
  );

  return (
    <RoleContext.Provider value={capabilities}>{children}</RoleContext.Provider>
  );
}
