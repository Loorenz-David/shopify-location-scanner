import { Prisma, type PrismaClient } from "@prisma/client";
import { ConflictError } from "../../../shared/errors/http-errors.js";
import { passwordHasher } from "../../auth/integrations/password-hasher.js";
import {
  CreateUserInputSchema,
  type CreateUserInput,
  type UserSummaryDto,
} from "../contracts/users.contract.js";

type Database = Pick<PrismaClient, "user"> | Prisma.TransactionClient;

export async function createUser(
  db: Database,
  shopId: string | null,
  input: CreateUserInput,
): Promise<UserSummaryDto> {
  const payload = CreateUserInputSchema.parse(input);
  if (await db.user.findUnique({ where: { username: payload.username } })) {
    throw new ConflictError("Username already exists");
  }
  const passwordHash = await passwordHasher.hash(payload.password);
  try {
    const user = await db.user.create({
      data: {
        username: payload.username,
        passwordHash,
        role: payload.role,
        shopId,
      },
    });
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      shopId: user.shopId,
      createdAt: user.createdAt.toISOString(),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("Username already exists");
    }
    throw error;
  }
}
