import type { UserRole } from "../../role-context/types/role-context.types";
import type { UserDto } from "../types/users.dto";
import type { User } from "../types/users.types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  worker: "Worker",
  seller: "Seller",
};

export const USER_ROLE_ORDER: UserRole[] = [
  "admin",
  "manager",
  "worker",
  "seller",
];

export const USER_ROLE_COLORS: Record<
  UserRole,
  { badge: string; active: string; inactive: string }
> = {
  admin: {
    badge: "bg-rose-100 text-rose-700",
    active: "border-rose-400 bg-rose-50 text-rose-800",
    inactive: "border-slate-200 bg-white text-slate-700",
  },
  manager: {
    badge: "bg-amber-100 text-amber-700",
    active: "border-amber-400 bg-amber-50 text-amber-800",
    inactive: "border-slate-200 bg-white text-slate-700",
  },
  worker: {
    badge: "bg-sky-100 text-sky-700",
    active: "border-sky-400 bg-sky-50 text-sky-800",
    inactive: "border-slate-200 bg-white text-slate-700",
  },
  seller: {
    badge: "bg-emerald-100 text-emerald-700",
    active: "border-emerald-400 bg-emerald-50 text-emerald-800",
    inactive: "border-slate-200 bg-white text-slate-700",
  },
};

export function normalizeUser(dto: UserDto): User {
  return {
    id: dto.id,
    username: dto.username,
    role: dto.role,
    shopId: dto.shopId,
    createdAt: dto.createdAt,
  };
}

export function normalizeUsers(dtos: UserDto[]): User[] {
  return dtos.map(normalizeUser);
}
