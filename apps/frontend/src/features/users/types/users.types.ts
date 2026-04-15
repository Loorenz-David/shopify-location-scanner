import type { UserRole } from "../../role-context/types/role-context.types";

export type { UserRole };

export interface User {
  id: string;
  username: string;
  role: UserRole;
  shopId: string | null;
  createdAt: string;
}
