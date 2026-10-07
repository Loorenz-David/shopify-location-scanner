import { it, expect, vi } from "vitest";
import { createUserController } from "./users.controller";
import { createUserApi } from "../api/create-user.api";
import { useUsersStore } from "../stores/users.store";
import { tokenAuthController } from "../../../core/api-client";
vi.mock("../api/create-user.api", () => ({ createUserApi: vi.fn() }));
it("updates the list without duplicates and keeps the admin tokens", async () => {
  useUsersStore.getState().reset();
  const setTokens = vi.spyOn(tokenAuthController, "setTokens");
  const user = {
    id: "new",
    username: "new-user",
    role: "seller" as const,
    shopId: "shop",
    createdAt: new Date().toISOString(),
  };
  vi.mocked(createUserApi).mockResolvedValue({ user });
  const payload = {
    username: user.username,
    password: "password123",
    role: user.role,
  };
  await createUserController(payload);
  await createUserController(payload);
  expect(useUsersStore.getState().users).toEqual([user]);
  expect(setTokens).not.toHaveBeenCalled();
});
