import type { Request, Response } from "express";
import { ChangeUserRoleInputSchema } from "../contracts/users.contract.js";
import { getUsersQuery } from "../queries/get-users.query.js";
import { changeUserRoleCommand } from "../commands/change-user-role.command.js";

export const usersController = {
  getUsers: async (req: Request, res: Response): Promise<void> => {
    const users = await getUsersQuery(req.authUser.shopId as string);
    res.status(200).json({ users });
  },

  changeRole: async (req: Request, res: Response): Promise<void> => {
    const payload = ChangeUserRoleInputSchema.parse(req.body);

    const user = await changeUserRoleCommand({
      requestingUserId: req.authUser.userId,
      shopId: req.authUser.shopId as string,
      payload,
    });

    res.status(200).json({ user });
  },
};
