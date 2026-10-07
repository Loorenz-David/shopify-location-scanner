import "../src/config/load-env.js";
import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { stdin, stdout } from "node:process";
import { prisma } from "../src/shared/database/prisma-client.js";
import { setupAdminCommand } from "../src/modules/users/commands/setup-admin.command.js";

async function readPassword(): Promise<string> {
  stdout.write("Password: ");
  emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  return new Promise((resolve, reject) => {
    let password = "";
    const cleanup = () => {
      stdin.off("keypress", onKey);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
    };
    const onKey = (
      text: string | undefined,
      key: { name?: string; ctrl?: boolean },
    ) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Setup cancelled"));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(password);
        return;
      }
      if (key.name === "backspace") {
        if (password.length) {
          password = Array.from(password).slice(0, -1).join("");
          stdout.write("\b \b");
        }
        return;
      }
      if (text && !key.ctrl && !/[\x00-\x1f\x7f]/.test(text)) {
        password += text;
        stdout.write("*".repeat(Array.from(text).length));
      }
    };
    stdin.on("keypress", onKey);
  });
}

try {
  if (!stdin.isTTY || !stdout.isTTY)
    throw new Error("Run setup:admin in an interactive terminal.");
  if (await prisma.user.count({ where: { role: "admin" } }))
    throw new Error("An admin already exists. Use the Users page.");
  const prompt = createInterface({ input: stdin, output: stdout });
  let username: string;
  try {
    username = await prompt.question("Username: ");
  } finally {
    prompt.close();
  }
  const password = await readPassword();
  const user = await setupAdminCommand(prisma, { username, password });
  stdout.write(
    `Created admin ${user.username}. Log in to link Shopify if needed.\n`,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Admin setup failed");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
