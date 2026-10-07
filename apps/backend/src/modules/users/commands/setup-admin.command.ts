import type { PrismaClient } from "@prisma/client";
import { ConflictError } from "../../../shared/errors/http-errors.js";
import { CreateUserInputSchema } from "../contracts/users.contract.js";
import { createUser } from "../services/create-user.service.js";

export async function setupAdminCommand(
  db: PrismaClient,
  input: { username: string; password: string },
) {
  const payload = CreateUserInputSchema.parse({ ...input, role: "admin" });
  return db.$transaction(
    async (tx) => {
      if (await tx.user.count({ where: { role: "admin" } })) {
        throw new ConflictError(
          "An admin already exists. Use the Users page to create additional users.",
        );
      }
      const shop = await tx.shop.findFirst({
        where: { accessToken: { not: null } },
        orderBy: { createdAt: "asc" },
      });
      return createUser(tx, shop?.id ?? null, payload);
    },
    { timeout: 15000 },
  );
}
