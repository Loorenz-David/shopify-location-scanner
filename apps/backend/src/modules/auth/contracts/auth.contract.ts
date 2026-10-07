import { z } from "zod";

export const LoginInputSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RefreshInputSchema = z.object({
  refreshToken: z.string().min(1),
});

export const LogoutInputSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RefreshInput = z.infer<typeof RefreshInputSchema>;
export type LogoutInput = z.infer<typeof LogoutInputSchema>;

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthUserDto = {
  id: string;
  username: string;
  role: "admin" | "manager" | "worker" | "seller";
  shopId: string | null;
};

export type AuthResponse = {
  user: AuthUserDto;
  tokens: AuthTokens;
};
