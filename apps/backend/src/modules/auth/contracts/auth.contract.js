import { z } from "zod";
export const RegisterInputSchema = z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(128),
    key: z.string().min(1).max(128).optional(),
});
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
//# sourceMappingURL=auth.contract.js.map