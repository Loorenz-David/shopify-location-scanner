import { prisma } from "../../../shared/database/prisma-client.js";
import type { CreateUserInput } from "../contracts/users.contract.js";
import { createUser } from "../services/create-user.service.js";

export const createUserCommand = (shopId: string, payload: CreateUserInput) =>
  createUser(prisma, shopId, payload);
