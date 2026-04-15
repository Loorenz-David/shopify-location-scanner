import { z } from "zod";
export declare const RegisterInputSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
    key: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const LoginInputSchema: z.ZodObject<{
    username: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const RefreshInputSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export declare const LogoutInputSchema: z.ZodObject<{
    refreshToken: z.ZodString;
}, z.core.$strip>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
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
//# sourceMappingURL=auth.contract.d.ts.map