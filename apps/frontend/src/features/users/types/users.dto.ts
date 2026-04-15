import type { UserRole } from "../../role-context/types/role-context.types";

export interface UserDto {
  id: string;
  username: string;
  role: UserRole;
  shopId: string | null;
  createdAt: string;
}

export interface GetUsersResponseDto {
  users: UserDto[];
}

export interface ChangeUserRoleRequestDto {
  targetUserId: string;
  role: UserRole;
}
