import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:net";
import { once } from "node:events";
import { Prisma } from "@prisma/client";

async function freePort() {
  const socket = createServer();
  socket.listen(0, "127.0.0.1");
  await once(socket, "listening");
  const port = (socket.address() as { port: number }).port;
  await new Promise<void>((resolve) => socket.close(() => resolve()));
  return port;
}

test(
  "admin creation, setup and HTTP permissions",
  { timeout: 60000 },
  async () => {
    const dir = mkdtempSync(join(tmpdir(), "admin-users-test-"));
    const cwd = fileURLToPath(new URL("../../../..", import.meta.url));
    Object.assign(process.env, {
      DATABASE_URL: `file:${join(dir, "test.db")}`,
      NODE_ENV: "test",
      JWT_SECRET: "test-secret-at-least-thirty-two-characters",
      SHOPIFY_API_KEY: "test",
      SHOPIFY_API_SECRET: "test",
      SHOPIFY_SCOPES: "read_products",
      SHOPIFY_APP_URL: "https://example.test",
      EXTERNAL_API_KEY: "test-external-key-at-least-thirty-two-characters",
      VAPID_PUBLIC_KEY: "test",
      VAPID_PRIVATE_KEY: "test",
      VAPID_SUBJECT: "mailto:test@example.test",
    });
    execFileSync("python3", [
      "-c",
      "import sqlite3,sys; sqlite3.connect(sys.argv[1]).close()",
      join(dir, "test.db"),
    ]);
    execFileSync("npx", ["prisma", "migrate", "deploy"], {
      cwd,
      env: process.env,
      stdio: "pipe",
    });
    const { prisma } =
      await import("../../../shared/database/prisma-client.js");
    const { createUserCommand } = await import("./create-user.command.js");
    const { createUser } = await import("../services/create-user.service.js");
    const { setupAdminCommand } = await import("./setup-admin.command.js");
    const { passwordHasher } =
      await import("../../auth/integrations/password-hasher.js");
    const { tokenService } =
      await import("../../auth/integrations/token.service.js");
    let redis: ReturnType<typeof spawn> | undefined;
    let api: ReturnType<typeof spawn> | undefined;
    try {
      await assert.rejects(
        setupAdminCommand(prisma, { username: "x", password: "short" }),
      );
      const first = await setupAdminCommand(prisma, {
        username: "  first-admin  ",
        password: " password123 ",
      });
      assert.equal(first.username, "first-admin");
      assert.equal(first.shopId, null);
      assert.equal(first.role, "admin");
      await assert.rejects(
        setupAdminCommand(prisma, {
          username: "another",
          password: "password123",
        }),
        /admin already exists/,
      );
      await prisma.user.deleteMany();
      await createUser(prisma, null, {
        username: "taken",
        password: "password123",
        role: "worker",
      });
      await assert.rejects(
        setupAdminCommand(prisma, {
          username: "taken",
          password: "password123",
        }),
        /Username already exists/,
      );
      assert.equal(
        (await prisma.user.findUniqueOrThrow({ where: { username: "taken" } }))
          .role,
        "worker",
      );
      await prisma.shop.createMany({
        data: [
          { id: "shop-a", shopDomain: "shop-a.test", accessToken: "test" },
          { id: "shop-b", shopDomain: "shop-b.test" },
        ],
      });
      const actor = await setupAdminCommand(prisma, {
        username: "actor",
        password: "password123",
      });
      assert.equal(actor.shopId, "shop-a");
      for (const role of ["admin", "manager", "worker", "seller"] as const) {
        const user = await createUserCommand("shop-a", {
          username: `new-${role}`,
          password: " password123 ",
          role,
        });
        assert.equal(user.role, role);
        assert.equal(user.shopId, "shop-a");
        assert.deepEqual(Object.keys(user).sort(), [
          "createdAt",
          "id",
          "role",
          "shopId",
          "username",
        ]);
        const record = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.notEqual(record.passwordHash, " password123 ");
        assert.equal(
          await passwordHasher.verify(" password123 ", record.passwordHash),
          true,
        );
      }
      await assert.rejects(
        createUserCommand("shop-a", {
          username: "taken",
          password: "password123",
          role: "seller",
        }),
        /Username already exists/,
      );
      // Exercise the database conflict path separately from the preflight lookup.
      const raceDb = {
        user: {
          findUnique: async () => null,
          create: async () => {
            throw new Prisma.PrismaClientKnownRequestError("unique", {
              code: "P2002",
              clientVersion: "test",
            });
          },
        },
      };
      await assert.rejects(
        createUser(
          raceDb as unknown as Parameters<typeof createUser>[0],
          "shop-a",
          { username: "race", password: "password123", role: "worker" },
        ),
        /Username already exists/,
      );
      const redisPort = await freePort();
      process.env.REDIS_URL = `redis://127.0.0.1:${redisPort}`;
      redis = spawn(
        "redis-server",
        [
          "--port",
          String(redisPort),
          "--bind",
          "127.0.0.1",
          "--save",
          "",
          "--appendonly",
          "no",
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      await new Promise<void>((resolve, reject) => {
        redis!.stdout!.on("data", (data) => {
          if (data.toString().includes("Ready to accept connections"))
            resolve();
        });
        redis!.on("error", reject);
        redis!.on("exit", () => reject(new Error("Test Redis exited")));
      });
      api = spawn(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "-e",
          `
      import express from 'express';
      import { usersRouter } from './src/modules/users/routes/users.routes.ts';
      import { authRouter } from './src/modules/auth/routes/auth.routes.ts';
      import { errorMiddleware } from './src/shared/http/error-middleware.ts';
      const app = express(); app.use(express.json());
      app.use('/users', usersRouter); app.use('/api/users', usersRouter);
      app.use('/auth', authRouter); app.use('/api/auth', authRouter); app.use(errorMiddleware);
      const server = app.listen(0, '127.0.0.1', () => console.log('TEST_PORT=' + server.address().port));
    `,
        ],
        { cwd, env: process.env, stdio: ["ignore", "pipe", "pipe"] },
      );
      const apiPort = await new Promise<number>((resolve, reject) => {
        api!.stdout!.on("data", (data) => {
          const match = data.toString().match(/TEST_PORT=(\d+)/);
          if (match) resolve(Number(match[1]));
        });
        api!.on("error", reject);
        api!.on("exit", () => reject(new Error("Test API exited")));
      });
      const request = (
        path: string,
        token?: string,
        body: unknown = {
          username: "http-user",
          password: "password123",
          role: "seller",
        },
      ) =>
        fetch(`http://127.0.0.1:${apiPort}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });
      const token = (
        id: string,
        role: "admin" | "manager" | "worker" | "seller",
      ) =>
        tokenService.createAccessToken({
          userId: id,
          username: "actor",
          shopId: "shop-b",
          role,
          tokenVersion: 0,
        });
      assert.equal((await request("/users")).status, 401);
      for (const role of ["worker", "seller"] as const) {
        const user = await prisma.user.findUniqueOrThrow({
          where: { username: `new-${role}` },
        });
        assert.equal(
          (await request("/users", token(user.id, role))).status,
          403,
        );
      }
      const unlinked = await prisma.user.create({
        data: {
          username: "unlinked-admin",
          role: "admin",
          passwordHash: "unused",
        },
      });
      assert.equal(
        (await request("/users", token(unlinked.id, "admin"))).status,
        404,
      );
      const invalidated = await prisma.user.create({
        data: {
          username: "invalidated-admin",
          role: "admin",
          shopId: "shop-a",
          passwordHash: "unused",
          tokenVersion: 1,
        },
      });
      assert.equal(
        (await request("/users", token(invalidated.id, "admin"))).status,
        401,
      );
      const manager = await prisma.user.findUniqueOrThrow({
        where: { username: "new-manager" },
      });
      const managerToken = token(manager.id, "manager");
      for (const role of ["worker", "seller"] as const) {
        const created = await request("/users", managerToken, {
          username: `manager-created-${role}`,
          password: "password123",
          role,
        });
        assert.equal(created.status, 201);
        assert.equal(
          ((await created.json()) as { user: { shopId: string } }).user.shopId,
          "shop-a",
        );
      }
      for (const role of ["admin", "manager"] as const) {
        assert.equal(
          (
            await request("/users", managerToken, {
              username: `forbidden-${role}`,
              password: "password123",
              role,
            })
          ).status,
          403,
        );
      }
      const list = await fetch(`http://127.0.0.1:${apiPort}/users`, {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      assert.equal(list.status, 200);
      assert.equal(
        (
          await request("/users/change-role", managerToken, {
            targetUserId: actor.id,
            role: "worker",
          })
        ).status,
        403,
      );
      const adminToken = token(actor.id, "admin");
      const response = await request("/api/users", adminToken);
      assert.equal(response.status, 201);
      const body = (await response.json()) as {
        user: { shopId: string };
        tokens?: unknown;
      };
      assert.equal(body.user.shopId, "shop-a");
      assert.deepEqual(Object.keys(body), ["user"]);
      assert.equal((await request("/users", adminToken)).status, 409);
      for (const invalid of [
        { username: "x", password: "password123", role: "worker" },
        { username: "valid", password: "short", role: "worker" },
        { username: "valid", password: "password123", role: "owner" },
      ]) {
        assert.equal(
          (await request("/users", adminToken, invalid)).status,
          400,
        );
      }
      assert.equal((await request("/auth/register")).status, 404);
      assert.equal((await request("/api/auth/register")).status, 404);
      assert.equal(await prisma.refreshToken.count(), 0);
      const actorAfter = await prisma.user.findUniqueOrThrow({
        where: { id: actor.id },
      });
      assert.equal(actorAfter.tokenVersion, 0);
      assert.equal(actorAfter.role, "admin");
    } finally {
      if (api) {
        api.kill();
        await once(api, "exit");
      }
      if (redis) {
        redis.kill();
        await once(redis, "exit");
      }
      await prisma.$disconnect();
      rmSync(dir, { recursive: true, force: true });
    }
  },
);
