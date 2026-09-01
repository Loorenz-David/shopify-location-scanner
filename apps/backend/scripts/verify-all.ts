import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

export const EXPECTED_SCRIPTS = [
  "verify-stock-domain.ts",
  "verify-stock-reconciliation.ts",
] as const;

const scriptsDirectory = process.cwd() + "/scripts";

type Status = "PASS" | "FAIL" | "REFUSED" | "MISSING";

const statusForExitCode = (exitCode: number | null): Status => {
  if (exitCode === 0) {
    return "PASS";
  }
  if (exitCode === 3) {
    return "REFUSED";
  }
  return "FAIL";
};

const runScript = (scriptName: string): Status => {
  const scriptPath = join(scriptsDirectory, scriptName);
  if (!existsSync(scriptPath)) {
    return "MISSING";
  }

  console.log(`--- ${scriptName} ---`);
  const child = spawnSync(
    process.execPath,
    ["--import", "tsx", scriptPath],
    {
      cwd: process.cwd(),
      env: process.env,
      encoding: "utf8",
    },
  );
  if (child.stdout) {
    process.stdout.write(child.stdout);
  }
  if (child.stderr) {
    process.stderr.write(child.stderr);
  }
  return statusForExitCode(child.error ? null : child.status);
};

const main = (): void => {
  const discovered = readdirSync(scriptsDirectory)
    .filter((name) => /^verify-.*\.ts$/.test(name) && name !== "verify-all.ts")
    .sort();
  const scriptNames = [...new Set([...EXPECTED_SCRIPTS, ...discovered])];
  const statuses: Array<{ scriptName: string; status: Status }> = [];

  for (const scriptName of scriptNames) {
    const status = runScript(scriptName);
    statuses.push({ scriptName, status });
    console.log(`${status} ${scriptName}`);
  }

  const allPassed =
    statuses.length === scriptNames.length &&
    EXPECTED_SCRIPTS.every((scriptName) =>
      statuses.some((entry) => entry.scriptName === scriptName && entry.status === "PASS"),
    ) &&
    statuses.every((entry) => entry.status === "PASS");
  console.log(`SUMMARY ${allPassed ? "PASS" : "FAIL"} ${statuses.length} script(s)`);
  if (!allPassed) {
    process.exitCode = 1;
  }
};

main();

