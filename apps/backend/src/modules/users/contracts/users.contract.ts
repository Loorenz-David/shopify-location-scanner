import { z } from "zod";

export const CreateUserInputSchema = z.object({
  username: z.string().trim().min(3).max(50),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "manager", "worker", "seller"]),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

export const ChangeUserRoleInputSchema = z.object({
  targetUserId: z.string().min(1),
  role: z.enum(["admin", "manager", "worker", "seller"]),
});

export type ChangeUserRoleInput = z.infer<typeof ChangeUserRoleInputSchema>;

export type UserSummaryDto = {
  id: string;
  username: string;
  role: "admin" | "manager" | "worker" | "seller";
  shopId: string | null;
  createdAt: string;
};

export type GetUsersResponseDto = {
  users: UserSummaryDto[];
};
