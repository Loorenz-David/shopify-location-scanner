import type { Request, Response } from "express";
import {
  LoginInputSchema,
  LogoutInputSchema,
  RefreshInputSchema,
  RegisterInputSchema,
} from "../contracts/auth.contract.js";
import { registerCommand } from "../commands/register.command.js";
import { loginCommand } from "../commands/login.command.js";
import { refreshAccessTokenCommand } from "../commands/refresh-access-token.command.js";
import { logoutCommand } from "../commands/logout.command.js";
import { getCurrentUserQuery } from "../queries/get-current-user.query.js";

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const input = RegisterInputSchema.parse(req.body);
    const result = await registerCommand(input);
    res.status(201).json(result);
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const input = LoginInputSchema.parse(req.body);
    const result = await loginCommand(input);
    res.status(200).json(result);
  },

  refresh: async (req: Request, res: Response): Promise<void> => {
    const input = RefreshInputSchema.parse(req.body);
    const result = await refreshAccessTokenCommand(input);
    res.status(200).json(result);
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    const input = LogoutInputSchema.parse(req.body);
    await logoutCommand(input, req.authUser.userId);
    res.status(200).json({ ok: true });
  },

  me: async (req: Request, res: Response): Promise<void> => {
    const user = await getCurrentUserQuery(req.authUser.userId);
    res.status(200).json({ user });
  },
};
