/**
 * Verification for the Scanner → Manager stock signals (intention §13A).
 *
 * Every check is one output line naming the measurement it serves. Checks are
 * observable outcomes only: requests a local Manager stub received, rows in the
 * database, and the return values of `computeStockDemand` and the two admin
 * queries.
 *
 * Usage (never against `prisma/dev.db` — the guard below refuses it with exit 3):
 *
 *   sqlite3 prisma/dev.db ".backup '/tmp/verify.db'"
 *   DATABASE_URL=file:/tmp/verify.db npx prisma migrate deploy
 *   DATABASE_URL=file:/tmp/verify.db npx tsx scripts/verify-manager-signals.ts
 *
 * Manager is NEVER called: a `node:http` stub started by this script answers
 * every request. Checks 12 and 13 need Redis (`REDIS_URL`); when it is
 * unreachable they print `FAIL … redis-unreachable` and never pass silently.
 */
import { spawnSync } from "node:child_process";
import { createServer, type Server } from "node:http";
import { isAbsolute, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";

const configuredDevelopmentDatabasePath = resolve(process.cwd(), "prisma/dev.db");

const databasePathFromUrl = (databaseUrl: string): string => {
  const rawPath = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length).split("?")[0] ?? ""
    : databaseUrl;
  return isAbsolute(rawPath) ? resolve(rawPath) : resolve(process.cwd(), "prisma", rawPath);
};

const refuseDatabase = (reason: string): never => {
  console.log(
    `REFUSED ${reason}; DATABASE_URL path is ${process.env.DATABASE_URL ?? "<unset>"}; configured development database is ${configuredDevelopmentDatabasePath}`,
  );
  process.exitCode = 3;
  throw new Error("verification refused");
};

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const equalJson = (actual: unknown, expected: unknown, label: string): void => {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

const waitFor = async (
  label: string,
  condition: () => boolean | Promise<boolean>,
  timeoutMs: number,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await condition()) {
      return;
    }
    await wait(100);
  }
  throw new Error(`timed out after ${timeoutMs} ms waiting for ${label}`);
};

const SECRET = "manager-signals-verification-secret";
const USERNAME = "manager-signals-verification";

// ---------------------------------------------------------------------------
// The Manager stub. Never a live Manager.
// ---------------------------------------------------------------------------

type StubAnswer = { status: number; body: string } | "silent";
type StubResponder = (input: { path: string; body: string }) => StubAnswer;

type StubRequest = {
  path: string;
  apiKey: string | null;
  contentType: string | null;
  body: string;
  startedAt: number;
  endedAt: number;
};

const envelope = (results: unknown[]): string =>
  JSON.stringify({ data: { results }, ok: true, warnings: [] });

const failureBody = (message: string): string => JSON.stringify({ error: message, ok: false });

/** The handoff's documented 200 bodies, computed from the request. */
const autoResponder: StubResponder = ({ path, body }) => {
  let entries: Array<Record<string, unknown>>;
  try {
    const parsed: unknown = JSON.parse(body);
    assert(Array.isArray(parsed), "stub: body is not an array");
    entries = parsed as Array<Record<string, unknown>>;
  } catch {
    return { status: 422, body: failureBody("body is not a JSON array") };
  }

  // Handoff v2 §3.4 / §4A.1: an empty array is a 422, never a 200.
  if (entries.length === 0) {
    return { status: 422, body: failureBody("empty array") };
  }

  if (path.endsWith("/items-processed")) {
    return {
      status: 200,
      body: envelope(
        entries.map((entry) => ({
          article_number: entry.article_number,
          outcome: "resolved",
          reason: null,
        })),
      ),
    };
  }

  const deleting = path.endsWith("/stock-demand-deleted");
  return {
    status: 200,
    body: envelope(
      entries.map((entry) => ({
        itemCategory: entry.itemCategory,
        properties: entry.properties,
        // §9 / handoff §3.1.1: this category is the one known to be missing in Manager.
        outcome:
          entry.itemCategory === "Serving Trolleys"
            ? "category_not_found"
            : deleting
              ? "deleted"
              : "applied",
      })),
    ),
  };
};

type ManagerStub = {
  url: (path: string) => string;
  requests: StubRequest[];
  /** Queue of answers for a path; the last one repeats once the queue is spent. */
  plan: (path: string, responders: StubResponder[]) => void;
  delay: (milliseconds: number) => void;
  reset: () => void;
  since: () => number;
  close: () => Promise<void>;
};

const startManagerStub = async (): Promise<ManagerStub> => {
  const requests: StubRequest[] = [];
  const planned = new Map<string, StubResponder[]>();
  let delayMs = 0;

  const server: Server = createServer((request, response) => {
    const startedAt = Date.now();
    const path = (request.url ?? "/").split("?")[0] ?? "/";
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const queue = planned.get(path) ?? [autoResponder];
      const responder = queue.length > 1 ? (queue.shift() as StubResponder) : (queue[0] as StubResponder);
      const answer = responder({ path, body });

      // Recorded on arrival, not when the answer goes out. A check that waits
      // for "a sync is active" has to see the request while the stub is still
      // holding it open; recording on answer would only reveal it once the job
      // was already finishing, and the trigger it then sends would no longer
      // meet an active job.
      const record: StubRequest = {
        path,
        apiKey: (request.headers["x-api-key"] as string | undefined) ?? null,
        contentType: (request.headers["content-type"] as string | undefined) ?? null,
        body,
        startedAt,
        endedAt: Date.now(),
      };
      requests.push(record);

      if (answer === "silent") {
        // Never answers: the client's own 8 s timeout must decide.
        return;
      }

      setTimeout(() => {
        response.writeHead(answer.status, { "Content-Type": "application/json" });
        response.end(answer.body);
        record.endedAt = Date.now();
      }, delayMs);
    });
  });

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address() as AddressInfo;

  return {
    url: (path) => `http://127.0.0.1:${address.port}${path}`,
    requests,
    plan: (path, responders) => planned.set(path, responders),
    delay: (milliseconds) => {
      delayMs = milliseconds;
    },
    reset: () => {
      requests.length = 0;
      planned.clear();
      delayMs = 0;
    },
    since: () => requests.length,
    close: async () => {
      // A `silent` answer leaves its socket open on purpose, so close it by force.
      server.closeAllConnections();
      await new Promise<void>((resolveClose) => server.close(() => resolveClose()));
    },
  };
};

const statusResponder = (status: number, body: string): StubResponder => () => ({ status, body });
const silentResponder: StubResponder = () => "silent";

// ---------------------------------------------------------------------------
// Modules under test, imported only after the database guard has run.
// ---------------------------------------------------------------------------

const loadModules = async () => {
  const { prisma } = await import("../src/shared/database/prisma-client.js");
  const stockDemand = await import("../src/modules/stock/domain/stock-demand.js");
  const restock = await import("../src/modules/stock/domain/restock.js");
  const propertyCriteria = await import("../src/modules/stock/domain/property-criteria.js");
  const stockContract = await import("../src/modules/stock/contracts/stock.contract.js");
  const locationStock = await import("../src/modules/stock/repositories/location-stock.repository.js");
  const stockReport = await import("../src/modules/stock/queries/get-stock-report.query.js");
  const createCommand = await import("../src/modules/stock/commands/create-location-stocks.command.js");
  const updateCommand = await import("../src/modules/stock/commands/update-location-stock.command.js");
  const applyChange = await import("../src/modules/stock/services/apply-item-stock-change.service.js");
  const scanHistory = await import("../src/modules/scanner/repositories/scan-history.repository.js");
  const stockSync = await import("../src/modules/outbound-webhook/manager/stock-sync.service.js");
  const itemsProcessed = await import("../src/modules/outbound-webhook/manager/items-processed.service.js");
  const managerHttp = await import("../src/modules/outbound-webhook/manager/manager-http.js");
  const managerSignals = await import("../src/modules/outbound-webhook/manager/manager-signals.js");
  const managerQueues = await import("../src/modules/outbound-webhook/manager/manager-queues.js");
  const stockSchedule = await import("../src/modules/outbound-webhook/manager/stock-sync-schedule.js");
  const deliveriesQuery = await import("../src/modules/outbound-webhook/queries/list-deliveries.query.js");
  const managerStockQuery = await import("../src/modules/outbound-webhook/queries/list-manager-stock.query.js");
  return {
    prisma,
    ...stockDemand,
    ...restock,
    ...propertyCriteria,
    validateStockCriteria: stockContract.validateStockCriteria,
    locationStockRepository: locationStock.locationStockRepository,
    getStockReportQuery: stockReport.getStockReportQuery,
    createLocationStocksCommand: createCommand.createLocationStocksCommand,
    updateLocationStockCommand: updateCommand.updateLocationStockCommand,
    applyItemStockChange: applyChange.applyItemStockChange,
    scanHistoryRepository: scanHistory.scanHistoryRepository,
    runStockSync: stockSync.runStockSync,
    runProcessedDelivery: itemsProcessed.runProcessedDelivery,
    listProcessedRedriveCandidates: itemsProcessed.listProcessedRedriveCandidates,
    ...managerHttp,
    ...managerSignals,
    ...managerQueues,
    ...stockSchedule,
    listDeliveriesQuery: deliveriesQuery.listDeliveriesQuery,
    listManagerStockQuery: managerStockQuery.listManagerStockQuery,
  };
};

/**
 * The Express router is loaded only by the checks that exercise the two read
 * endpoints. It reaches `authenticate-user.middleware` →
 * `logistic-notification.service` → `notification-queue`, each of which opens a
 * Redis connection at import time. A script-context child (check 16) must not
 * pull those in: a script mounts no routes, and importing them would measure
 * those pre-existing connections instead of what §12A.5 is about.
 */
const loadHttpModules = async () => {
  const routes = await import("../src/modules/outbound-webhook/routes/outbound-webhook.routes.js");
  const httpErrors = await import("../src/shared/errors/http-errors.js");

  return {
    outboundWebhookRouter: routes.outboundWebhookRouter,
    ValidationError: httpErrors.ValidationError,
  };
};

/** What a script imports: repositories, commands, services — no HTTP layer. */
type ScriptModules = Awaited<ReturnType<typeof loadModules>>;
type Modules = ScriptModules & Awaited<ReturnType<typeof loadHttpModules>>;

const THRESHOLD_STATES = ["low_in_stock", "medium_in_stock", "high_in_stock"] as const;

const createStockRow = async (
  modules: ScriptModules,
  input: {
    shopId: string;
    location: string;
    itemCategory: string;
    properties: Record<string, string[] | null>;
    thresholds: number[];
    instanceCount: number;
    quantity?: number;
  },
): Promise<{ id: string }> => {
  const row = await modules.prisma.locationStock.create({
    data: {
      shopId: input.shopId,
      location: input.location,
      itemCategory: input.itemCategory,
      properties: input.properties,
      propertiesCanonical: modules.canonicalCriteriaString(input.properties),
      quantity: input.quantity ?? 0,
      instanceCount: input.instanceCount,
      createdByUsername: USERNAME,
      updatedByUsername: USERNAME,
      thresholds: {
        create: input.thresholds.map((thresholdQuantity, index) => ({
          shopId: input.shopId,
          state: THRESHOLD_STATES[index] as (typeof THRESHOLD_STATES)[number],
          thresholdQuantity,
          createdByUsername: USERNAME,
          updatedByUsername: USERNAME,
        })),
      },
    },
    select: { id: true },
  });

  return row;
};

/**
 * The operations of check 18, run identically with signalling on and off. Only
 * values a caller can observe are returned.
 */
const runObservableStockOperations = async (
  modules: ScriptModules,
  input: { shopId: string; suffix: string },
): Promise<unknown> => {
  const location = `LCVERIFY18${input.suffix}`;
  const created = await createStockRow(modules, {
    shopId: input.shopId,
    location,
    itemCategory: "Dining Chairs",
    properties: {},
    thresholds: [1, 3, 5],
    instanceCount: 0,
  });

  const updated = await modules.updateLocationStockCommand({
    id: created.id,
    shopId: input.shopId,
    username: USERNAME,
    payload: {
      thresholds: [
        { state: "low_in_stock", thresholdQuantity: 2 },
        { state: "medium_in_stock", thresholdQuantity: 4 },
        { state: "high_in_stock", thresholdQuantity: 6 },
      ],
    },
  });

  const changed = await modules.applyItemStockChange({
    shopId: input.shopId,
    before: null,
    after: {
      location,
      itemCategory: "Dining Chairs",
      properties: null,
      quantity: 1,
      isSold: false,
    },
    operation: "location_move",
    itemIdentifiers: { productId: `verify-18-${input.suffix}` },
  });

  const scanned = await modules.scanHistoryRepository.appendLocationEvent({
    shopId: input.shopId,
    username: USERNAME,
    productId: `verify-18-product-${input.suffix}`,
    itemType: "Dining Chairs",
    itemTitle: "Verification chair",
    itemBarcode: "0000612",
    location,
  });

  return {
    update: {
      itemCategory: updated.itemCategory,
      properties: updated.properties,
      instanceCount: updated.instanceCount,
      stockState: updated.stockState,
      thresholds: updated.thresholds.map((threshold) => ({
        state: threshold.state,
        thresholdQuantity: threshold.thresholdQuantity,
      })),
    },
    applyItemStockChange: changed,
    scanHistory: {
      itemBarcode: scanned.itemBarcode,
      eventCount: scanned.events.length,
      eventType: scanned.events[0]?.eventType ?? null,
    },
  };
};

// ---------------------------------------------------------------------------
// Child-process modes. Checks 16 and 18 are about what a *script process* does,
// so they cannot be observed from inside a process that has already enabled
// signals or already parsed `REDIS_URL`.
// ---------------------------------------------------------------------------

const runChild = async (mode: string): Promise<void> => {
  const modules = await loadModules();
  const shopId = process.env.VERIFY_SHOP_ID ?? "";
  assert(shopId !== "", "VERIFY_SHOP_ID must be set for a child run");

  try {
    if (mode === "16") {
      // §12A.5: a script that never enables signals writes no delivery row and
      // opens no Redis connection, and still exits on its own.
      const before = await modules.prisma.outboundWebhookDelivery.count({ where: { shopId } });
      const record = await modules.scanHistoryRepository.appendLocationEvent({
        shopId,
        username: USERNAME,
        productId: "verify-16-product",
        itemType: "Dining Chairs",
        itemTitle: "Verification chair",
        itemBarcode: "0000616",
        location: "LCVERIFY16",
      });
      await createStockRow(modules, {
        shopId,
        location: "LCVERIFY16",
        itemCategory: "Dining Chairs",
        properties: {},
        thresholds: [1],
        instanceCount: 0,
      });
      const after = await modules.prisma.outboundWebhookDelivery.count({ where: { shopId } });
      console.log(
        `RESULT ${JSON.stringify({
          deliveriesBefore: before,
          deliveriesAfter: after,
          scanHistoryCreated: record.id !== "",
          signalsEnabled: modules.managerSignalsEnabled(),
        })}`,
      );
      return;
    }

    if (mode === "18" || mode === "18off") {
      if (mode === "18") {
        modules.enableManagerSignals();
      }
      const result = await runObservableStockOperations(modules, {
        shopId,
        suffix: mode === "18" ? "C" : "P",
      });
      console.log(`RESULT ${JSON.stringify(result)}`);
      return;
    }

    throw new Error(`unknown child mode ${mode}`);
  } finally {
    if (mode === "18") {
      await modules.closeManagerSignals();
    }
    await modules.prisma.$disconnect();
  }
};

const spawnChild = (mode: string, extraEnv: Record<string, string>) => {
  const scriptPath = fileURLToPath(import.meta.url);
  return spawnSync(process.execPath, ["--import", "tsx", scriptPath], {
    cwd: process.cwd(),
    env: { ...process.env, MANAGER_SIGNALS_CHILD: mode, ...extraEnv },
    encoding: "utf8",
    timeout: 60_000,
  });
};

const childResult = (output: string): unknown => {
  const line = output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("RESULT "));
  assert(line !== undefined, `child produced no RESULT line; output was:\n${output}`);
  return JSON.parse(line.slice("RESULT ".length)) as unknown;
};

// ---------------------------------------------------------------------------
// Output capture — check 20 asserts that a no-op sync says nothing at all.
// ---------------------------------------------------------------------------

const captureOutput = async (operation: () => Promise<void>): Promise<string> => {
  let captured = "";
  const originalStdout = process.stdout.write.bind(process.stdout);
  const originalStderr = process.stderr.write.bind(process.stderr);
  const collect = (chunk: string | Uint8Array): boolean => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  };
  process.stdout.write = collect as typeof process.stdout.write;
  process.stderr.write = collect as typeof process.stderr.write;

  try {
    await operation();
  } finally {
    process.stdout.write = originalStdout;
    process.stderr.write = originalStderr;
  }

  return captured;
};

const expectRejection = async (
  operation: () => Promise<unknown>,
  label: string,
): Promise<unknown> => {
  try {
    await operation();
  } catch (error) {
    return error;
  }
  throw new Error(`${label}: expected the operation to throw, it resolved`);
};

const main = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    refuseDatabase("DATABASE_URL is unset or empty");
    return;
  }
  if (databasePathFromUrl(databaseUrl) === configuredDevelopmentDatabasePath) {
    refuseDatabase("DATABASE_URL resolves to the configured development database");
  }

  const childMode = process.env.MANAGER_SIGNALS_CHILD;
  if (childMode) {
    await runChild(childMode);
    return;
  }

  const modules: Modules = {
    ...(await loadModules()),
    ...(await loadHttpModules()),
  };
  const stub = await startManagerStub();
  const prisma = modules.prisma;

  const shop = await prisma.shop.create({
    data: {
      shopDomain: `manager-signals-verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.myshopify.com`,
    },
    select: { id: true },
  });
  const shopId = shop.id;

  const createTarget = async (
    eventType: "stock_demand" | "stock_demand_deleted" | "items_processed",
    path: string,
    label: string,
  ): Promise<{ id: string }> =>
    prisma.outboundWebhookTarget.create({
      data: { shopId, label, targetUrl: stub.url(path), secret: SECRET, eventType, active: true },
      select: { id: true },
    });

  const demandTarget = await createTarget("stock_demand", "/stock-demand", "verify-demand");
  const deleteTarget = await createTarget(
    "stock_demand_deleted",
    "/stock-demand-deleted",
    "verify-delete",
  );
  const processedTarget = await createTarget(
    "items_processed",
    "/items-processed",
    "verify-processed",
  );

  const setTargetActive = async (id: string, active: boolean): Promise<void> => {
    await prisma.outboundWebhookTarget.update({ where: { id }, data: { active } });
  };

  const resetState = async (): Promise<void> => {
    await prisma.locationStock.deleteMany({ where: { shopId } });
    await prisma.managerStockLedger.deleteMany({ where: { shopId } });
    await prisma.outboundWebhookDelivery.deleteMany({ where: { shopId } });
    await prisma.scanHistory.deleteMany({ where: { shopId } });
    await setTargetActive(demandTarget.id, true);
    await setTargetActive(deleteTarget.id, true);
    await setTargetActive(processedTarget.id, true);
    stub.reset();
  };

  const sync = async (): Promise<void> => {
    await modules.runStockSync(shopId, { post: modules.postJson, now: () => new Date() }, "full");
  };

  const syncDelta = async (): Promise<void> => {
    await modules.runStockSync(shopId, { post: modules.postJson, now: () => new Date() }, "delta");
  };

  const requestsOn = (path: string): StubRequest[] =>
    stub.requests.filter((request) => request.path === path);

  const bodyOf = (request: StubRequest): Array<Record<string, unknown>> =>
    JSON.parse(request.body) as Array<Record<string, unknown>>;

  const deliveries = async (where: Record<string, unknown> = {}) =>
    prisma.outboundWebhookDelivery.findMany({
      where: { shopId, ...where },
      orderBy: { createdAt: "asc" },
    });

  const ledger = async () =>
    prisma.managerStockLedger.findMany({
      where: { shopId },
      orderBy: [{ itemCategory: "asc" }, { propertiesCanonical: "asc" }],
    });

  const chairs = (properties: Record<string, string[] | null>) => properties;

  // -------------------------------------------------------------------------
  // The checks.
  // -------------------------------------------------------------------------

  const check1 = async (): Promise<void> => {
    await resetState();
    const properties = chairs({ quantity: ["4"], upholstery: ["down"], wood_group: ["teak"] });
    await createStockRow(modules, {
      shopId,
      location: "LC10",
      itemCategory: "Dining Chairs",
      properties,
      thresholds: [2, 4, 5],
      instanceCount: 3,
    });
    await createStockRow(modules, {
      shopId,
      location: "LC11",
      itemCategory: "Dining Chairs",
      properties,
      thresholds: [1, 2],
      instanceCount: 2,
    });

    const rows = await modules.locationStockRepository.listByShop(shopId);
    const entries = modules.computeStockDemand(rows);
    equalJson(
      entries,
      [{ itemCategory: "Dining Chairs", properties, quantityRequested: 8 }],
      "worked fixture",
    );

    const report = await modules.getStockReportQuery(shopId);
    for (const row of rows) {
      const entry = report.entries.find((candidate) => candidate.location === row.location);
      assert(entry !== undefined, `report has no entry for ${row.location}`);
      assert(
        modules.missingItems(row) === entry.unitsToRestockTarget,
        `${row.location}: missingItems ${modules.missingItems(row)} != report ${entry.unitsToRestockTarget}`,
      );
    }
  };

  const check2 = async (): Promise<void> => {
    const cases: Array<[Record<string, string[] | null>, number]> = [
      [{ quantity: ["4"] }, 4],
      [{}, 1],
      [{ quantity: null }, 1],
      [{ quantity: ["4", "6"] }, 1],
      [{ quantity: ["0"] }, 1],
      [{ quantity: ["04"] }, 1],
    ];
    for (const [properties, expected] of cases) {
      const actual = modules.unitsPerItem(properties);
      assert(
        actual === expected,
        `unitsPerItem(${JSON.stringify(properties)}) = ${actual}, expected ${expected}`,
      );
    }
  };

  const check3 = async (): Promise<void> => {
    await resetState();
    const shared = chairs({ wood_group: ["teak"] });
    await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Dining Chairs", properties: shared, thresholds: [5], instanceCount: 1 });
    await createStockRow(modules, { shopId, location: "LC11", itemCategory: "Dining Chairs", properties: shared, thresholds: [4], instanceCount: 1 });
    await createStockRow(modules, { shopId, location: "LC12", itemCategory: "Armchairs", properties: chairs({ wood_group: ["light"] }), thresholds: [2], instanceCount: 0 });
    await createStockRow(modules, { shopId, location: "LC13", itemCategory: "Sofas", properties: chairs({}), thresholds: [3], instanceCount: 1 });

    await sync();

    const demandRequests = requestsOn("/stock-demand");
    assert(demandRequests.length === 1, `expected one demand request, got ${demandRequests.length}`);
    const entries = bodyOf(demandRequests[0] as StubRequest);
    assert(entries.length === 3, `expected three entries, got ${entries.length}`);

    const keys = entries.map((entry) =>
      modules.identityKeyOf(
        entry.itemCategory as string,
        modules.canonicalCriteriaString(entry.properties as Record<string, string[] | null>),
      ),
    );
    assert(new Set(keys).size === keys.length, `request carries a duplicate identity: ${keys.join(" | ")}`);
    equalJson(keys, [...keys].sort(), "entries sorted by identity key");

    const sharedEntry = entries.find(
      (entry) => entry.itemCategory === "Dining Chairs",
    );
    assert(sharedEntry !== undefined, "the shared identity is missing");
    assert(
      sharedEntry.quantityRequested === 7,
      `shared identity summed to ${String(sharedEntry.quantityRequested)}, expected 7`,
    );
  };

  const check4 = async (): Promise<void> => {
    await resetState();
    await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: chairs({}), thresholds: [1, 2, 3], instanceCount: 5 });
    await sync();
    const entries = bodyOf(requestsOn("/stock-demand")[0] as StubRequest);
    equalJson(
      entries,
      [{ itemCategory: "Sofas", properties: {}, quantityRequested: 0 }],
      "a satisfied rule is sent as 0",
    );
  };

  const check5 = async (): Promise<void> => {
    await resetState();
    const shared = chairs({ wood_group: ["teak"] });
    const lc10 = await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: shared, thresholds: [5], instanceCount: 3 });
    await createStockRow(modules, { shopId, location: "LC11", itemCategory: "Sofas", properties: shared, thresholds: [4], instanceCount: 1 });
    await sync();
    assert(requestsOn("/stock-demand-deleted").length === 0, "a first sync must never delete");

    await prisma.locationStock.delete({ where: { id: lc10.id } });
    stub.reset();
    await sync();

    assert(
      requestsOn("/stock-demand-deleted").length === 0,
      "a delete was sent although another location still holds the identity",
    );
    const entries = bodyOf(requestsOn("/stock-demand")[0] as StubRequest);
    equalJson(
      entries,
      [{ itemCategory: "Sofas", properties: shared, quantityRequested: 3 }],
      "the remaining location's lower sum",
    );
  };

  const check6 = async (): Promise<void> => {
    await resetState();
    const going = chairs({ wood_group: ["teak"] });
    const staying = chairs({ wood_group: ["light"] });
    const doomed = await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: going, thresholds: [5], instanceCount: 1 });
    await createStockRow(modules, { shopId, location: "LC11", itemCategory: "Sofas", properties: staying, thresholds: [2], instanceCount: 0 });
    await sync();

    await prisma.locationStock.delete({ where: { id: doomed.id } });
    stub.reset();
    await sync();

    const order = stub.requests.map((request) => request.path);
    equalJson(order, ["/stock-demand-deleted", "/stock-demand"], "delete precedes demand");

    const deleteBody = bodyOf(requestsOn("/stock-demand-deleted")[0] as StubRequest);
    equalJson(deleteBody, [{ itemCategory: "Sofas", properties: going }], "delete body");

    const rows = await ledger();
    const deleted = rows.find((row) => row.propertiesCanonical === modules.canonicalCriteriaString(going));
    assert(deleted !== undefined, "the deleted identity left the ledger");
    assert(deleted.state === "deleted", `ledger state is ${deleted.state}, expected deleted`);
    assert(deleted.lastOutcome === "deleted", `ledger outcome is ${String(deleted.lastOutcome)}`);
  };

  const check7 = async (): Promise<void> => {
    await resetState();
    const teak = chairs({ wood_group: ["teak"] });
    const light = chairs({ wood_group: ["light"] });
    const row = await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: teak, thresholds: [5], instanceCount: 1 });
    await sync();

    // Teak → Light → Teak, all before the next sync reads state.
    await prisma.locationStock.update({
      where: { id: row.id },
      data: { properties: light, propertiesCanonical: modules.canonicalCriteriaString(light) },
    });
    await prisma.locationStock.update({
      where: { id: row.id },
      data: { properties: teak, propertiesCanonical: modules.canonicalCriteriaString(teak) },
    });

    stub.reset();
    await sync();

    assert(requestsOn("/stock-demand-deleted").length === 0, "a round trip must send no delete");
    const entries = bodyOf(requestsOn("/stock-demand")[0] as StubRequest);
    equalJson(entries, [{ itemCategory: "Sofas", properties: teak, quantityRequested: 4 }], "teak still demanded");
  };

  const check8 = async (): Promise<void> => {
    await resetState();
    const going = chairs({ wood_group: ["teak"] });
    const staying = chairs({ wood_group: ["light"] });
    const doomed = await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: going, thresholds: [5], instanceCount: 1 });
    await createStockRow(modules, { shopId, location: "LC11", itemCategory: "Sofas", properties: staying, thresholds: [2], instanceCount: 0 });
    await sync();

    await prisma.locationStock.delete({ where: { id: doomed.id } });
    stub.reset();
    stub.plan("/stock-demand-deleted", [
      statusResponder(503, failureBody("over the 5 s limit")),
      statusResponder(503, failureBody("over the 5 s limit")),
      autoResponder,
    ]);

    for (const attempt of [1, 2]) {
      await expectRejection(sync, `attempt ${attempt} on a 503 delete`);
      assert(
        requestsOn("/stock-demand").length === 0,
        `attempt ${attempt}: demand was sent although the delete had no final answer`,
      );
    }

    await sync();
    assert(requestsOn("/stock-demand-deleted").length === 3, "the delete was not re-derived by every run");
    const order = stub.requests.map((request) => request.path);
    equalJson(
      order,
      ["/stock-demand-deleted", "/stock-demand-deleted", "/stock-demand-deleted", "/stock-demand"],
      "demand waits for the delete's final answer",
    );
  };

  const check9 = async (): Promise<void> => {
    await resetState();
    const going = chairs({ wood_group: ["teak"] });
    const staying = chairs({ wood_group: ["light"] });
    const doomed = await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: going, thresholds: [5], instanceCount: 1 });
    await createStockRow(modules, { shopId, location: "LC11", itemCategory: "Sofas", properties: staying, thresholds: [2], instanceCount: 0 });
    await sync();

    await prisma.locationStock.delete({ where: { id: doomed.id } });
    stub.reset();
    stub.plan("/stock-demand-deleted", [statusResponder(401, failureBody("unauthorized"))]);

    // §12A.3: "any non-200 … unchanged", so the row must still carry exactly
    // what the first run's demand answer left on it.
    const ledgerRowOf = async (): Promise<Record<string, unknown>> => {
      const row = (await ledger()).find(
        (candidate) => candidate.propertiesCanonical === modules.canonicalCriteriaString(going),
      );
      assert(row !== undefined, "the identity left the ledger");
      return {
        state: row.state,
        lastSentQuantity: row.lastSentQuantity,
        lastAppliedQuantity: row.lastAppliedQuantity,
        lastOutcome: row.lastOutcome,
        lastDeliveryId: row.lastDeliveryId,
      };
    };
    const before = await ledgerRowOf();

    await sync();
    equalJson(
      stub.requests.map((request) => request.path),
      ["/stock-demand-deleted", "/stock-demand"],
      "a final 401 on the delete lets demand proceed in the same run",
    );

    equalJson(await ledgerRowOf(), before, "a 401 on the delete changed the ledger row");
    assert(before.state === "active", `the ledger row is ${String(before.state)}, not active`);

    stub.reset();
    stub.plan("/stock-demand-deleted", [statusResponder(401, failureBody("unauthorized"))]);
    await sync();
    assert(requestsOn("/stock-demand-deleted").length === 1, "the next run did not re-derive the delete");
  };

  const check10 = async (): Promise<void> => {
    await resetState();
    await sync();
    assert(stub.requests.length === 0, `the stub received ${stub.requests.length} request(s) for an empty shop`);
    assert((await deliveries()).length === 0, "an empty sync wrote a delivery row");
  };

  const check11 = async (): Promise<void> => {
    await resetState();
    const going = chairs({ wood_group: ["teak"] });
    const staying = chairs({ wood_group: ["light"] });
    const doomed = await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: going, thresholds: [5], instanceCount: 1 });
    await createStockRow(modules, { shopId, location: "LC11", itemCategory: "Sofas", properties: staying, thresholds: [2], instanceCount: 0 });
    await sync();

    await prisma.locationStock.delete({ where: { id: doomed.id } });
    await setTargetActive(deleteTarget.id, false);
    await prisma.outboundWebhookDelivery.deleteMany({ where: { shopId } });
    stub.reset();
    await sync();

    const skipped = (await deliveries({ status: "skipped" }))[0];
    assert(skipped !== undefined, "no skipped row was written for the missing delete target");
    assert(skipped.lastError === "no_delete_target", `lastError is ${String(skipped.lastError)}`);
    equalJson(
      JSON.parse(skipped.requestBody),
      [{ itemCategory: "Sofas", properties: going }],
      "the skipped row carries the deletes it would have sent",
    );
    assert(requestsOn("/stock-demand").length === 1, "demand must still be sent without a delete target");
    assert(requestsOn("/stock-demand-deleted").length === 0, "a delete was sent without a delete target");

    // Two active demand targets.
    await setTargetActive(deleteTarget.id, true);
    const second = await createTarget("stock_demand", "/stock-demand-second", "verify-demand-2");
    await prisma.outboundWebhookDelivery.deleteMany({ where: { shopId } });
    stub.reset();
    await sync();

    assert(stub.requests.length === 0, "an ambiguous target set still sent a request");
    const ambiguous = (await deliveries({ status: "skipped" }))[0];
    assert(ambiguous !== undefined, "no skipped row was written for ambiguous targets");
    assert(ambiguous.lastError === "ambiguous_targets", `lastError is ${String(ambiguous.lastError)}`);

    await prisma.outboundWebhookTarget.delete({ where: { id: second.id } });
  };

  const redisUrl = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

  const redisReachable = async (): Promise<boolean> => {
    try {
      const { Redis } = await import("ioredis");
      const client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 2_000,
      });
      client.on("error", () => undefined);
      await client.connect();
      await client.ping();
      client.disconnect();
      return true;
    } catch {
      return false;
    }
  };

  const withStockSyncWorker = async (operation: () => Promise<void>): Promise<void> => {
    const { Worker } = await import("bullmq");
    const { Redis } = await import("ioredis");
    // A worker connection must not cap retries per request (BullMQ blocking
    // commands); the *producer* connection in `manager-queues.ts` is the
    // isolated one §12A.5 describes.
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    connection.on("error", () => undefined);
    const worker = new Worker(
      modules.MANAGER_STOCK_SYNC_QUEUE,
      async (job: { data: { shopId: string; mode?: "delta" | "full" } }) => {
        await modules.runStockSync(job.data.shopId, {
          post: modules.postJson,
          now: () => new Date(),
        }, job.data.mode ?? "full");
      },
      { connection, prefix: modules.MANAGER_QUEUE_PREFIX, concurrency: 1 },
    );
    worker.on("error", () => undefined);

    try {
      await operation();
    } finally {
      await worker.close();
      connection.disconnect();
    }
  };

  const check12 = async (): Promise<void> => {
    if (!(await redisReachable())) {
      throw new Error("redis-unreachable");
    }
    await resetState();
    await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: chairs({}), thresholds: [5], instanceCount: 1 });

    await withStockSyncWorker(async () => {
      stub.delay(1_200);
      await modules.enqueueStockSync(shopId, "full");
      await waitFor("the first sync to become active", () => requestsOn("/stock-demand").length >= 1, 20_000);

      for (let trigger = 0; trigger < 5; trigger += 1) {
        await modules.enqueueStockSync(shopId, "full");
      }

      await waitFor("the coalesced sync to run", () => requestsOn("/stock-demand").length >= 2, 30_000);
      await wait(4_000);
    });
    stub.delay(0);

    const runs = requestsOn("/stock-demand").sort((left, right) => left.startedAt - right.startedAt);
    assert(runs.length === 2, `five triggers during an active sync produced ${runs.length} runs, expected 2`);
    for (let index = 1; index < runs.length; index += 1) {
      const previous = runs[index - 1] as StubRequest;
      const current = runs[index] as StubRequest;
      assert(
        current.startedAt >= previous.endedAt,
        `two stock requests overlapped (${previous.startedAt}-${previous.endedAt} vs ${current.startedAt})`,
      );
    }
  };

  const check13 = async (): Promise<void> => {
    if (!(await redisReachable())) {
      throw new Error("redis-unreachable");
    }
    await resetState();
    await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: chairs({}), thresholds: [5], instanceCount: 1 });
    stub.plan("/stock-demand", [silentResponder]);

    const queue = modules.managerStockSyncQueue();
    let attemptsMade = 0;
    let state = "";

    await withStockSyncWorker(async () => {
      await modules.enqueueStockSync(shopId, "full");
      await waitFor(
        "the silent target's job to be retried",
        async () => {
          const jobs = await queue.getJobs([
            "active",
            "delayed",
            "waiting",
            "prioritized",
            "failed",
            "completed",
          ]);
          const mine = jobs.find((job) => job.data?.shopId === shopId);
          if (!mine) {
            return false;
          }
          attemptsMade = mine.attemptsMade;
          state = await mine.getState();
          return attemptsMade > 1;
        },
        60_000,
      );
    });

    assert(attemptsMade > 1, `the job stopped at attempt ${attemptsMade}; a timeout was not retried`);
    assert(state !== "completed", "a timed-out delivery completed instead of retrying");

    // The same classifier the `item_placed` worker uses (handoff v2 §6.6).
    let timeoutError: unknown;
    try {
      await fetch(stub.url("/stock-demand"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": SECRET },
        body: "[]",
        signal: AbortSignal.timeout(400),
      });
    } catch (error) {
      timeoutError = error;
    }
    assert(
      timeoutError instanceof Error && timeoutError.name === "TimeoutError",
      `expected a TimeoutError, got ${String(timeoutError)}`,
    );
    assert(
      modules.isRetryableError(timeoutError),
      "the shared isRetryableError does not recognise an AbortSignal timeout",
    );
    const workerSource = readFileSync("src/workers/outbound-webhook-worker.ts", "utf8");
    assert(
      /import \{ isRetryableError \} from "\.\.\/modules\/outbound-webhook\/manager\/manager-http\.js";/.test(
        workerSource,
      ),
      "item_placed's worker does not use the shared isRetryableError",
    );
  };

  const check14 = async (): Promise<void> => {
    await resetState();
    modules.enableManagerSignals();
    const barcode = "04 2 001 0034";

    const record = await modules.scanHistoryRepository.appendLocationEvent({
      shopId,
      username: USERNAME,
      productId: "verify-14-product",
      itemType: "Dining Chairs",
      itemTitle: "Verification chair",
      itemBarcode: barcode,
      location: "LC10",
    });

    await waitFor(
      "the processed delivery row",
      async () => (await deliveries({ eventType: "items_processed" })).length >= 1,
      10_000,
    );

    const rows = await deliveries({ eventType: "items_processed" });
    assert(rows.length === 1, `a creation produced ${rows.length} reports, expected 1`);
    const row = rows[0] as (typeof rows)[number];
    const stored = await prisma.scanHistory.findUnique({
      where: { id: record.id },
      select: { itemBarcode: true },
    });
    const sent = (JSON.parse(row.requestBody) as Array<{ article_number: string }>)[0];
    assert(sent !== undefined, "the report body carries no entry");
    assert(
      sent.article_number === stored?.itemBarcode,
      `article_number ${JSON.stringify(sent.article_number)} is not byte-identical to ${JSON.stringify(stored?.itemBarcode)}`,
    );
    assert(row.subjectKey === stored?.itemBarcode, "subjectKey is not the stored article number");

    await modules.scanHistoryRepository.appendLocationEvent({
      shopId,
      username: USERNAME,
      productId: "verify-14-product",
      itemType: "Dining Chairs",
      itemTitle: "Verification chair",
      itemBarcode: barcode,
      location: "LC11",
    });
    await wait(1_000);
    const afterAppend = await deliveries({ eventType: "items_processed" });
    assert(afterAppend.length === 1, `an append produced ${afterAppend.length} reports, expected 1`);
  };

  const check15 = async (): Promise<void> => {
    await resetState();
    modules.enableManagerSignals();

    await modules.scanHistoryRepository.appendSoldTerminalEventWithFallback({
      shopId,
      username: USERNAME,
      productId: "verify-15-sold",
      itemType: "Sofas",
      itemTitle: "Verification sofa",
      itemBarcode: "0000615",
      unknownLocation: "UNKNOWN",
      soldLocation: "SOLD",
    });
    await waitFor(
      "the sold creation's report",
      async () => (await deliveries({ eventType: "items_processed" })).length >= 1,
      10_000,
    );

    // A create that is rolled back after the fact: the row never lands, so the
    // post-commit hook must never run. A hook inside the callback would. Both
    // creating functions are exercised — a hook misplaced in either one has to
    // be caught, and a rollback of only one of them leaves the other untested.
    const rolledBack = async (label: string, operation: () => Promise<unknown>): Promise<void> => {
      const originalTransaction = prisma.$transaction.bind(prisma);
      (prisma as unknown as { $transaction: unknown }).$transaction = ((
        callback: (tx: unknown) => Promise<unknown>,
        options?: unknown,
      ) =>
        (originalTransaction as unknown as (cb: unknown, opts?: unknown) => Promise<unknown>)(
          async (tx: unknown) => {
            await callback(tx);
            throw new Error("verification rollback");
          },
          options,
        )) as unknown;

      try {
        const error = await expectRejection(operation, label);
        assert(
          error instanceof Error && error.message.includes("verification rollback"),
          `${label}: expected the forced rollback, got ${String(error)}`,
        );
      } finally {
        (prisma as unknown as { $transaction: unknown }).$transaction = originalTransaction;
      }
    };

    await rolledBack("a rolled-back location creation", () =>
      modules.scanHistoryRepository.appendLocationEvent({
        shopId,
        username: USERNAME,
        productId: "verify-15-rollback",
        itemType: "Sofas",
        itemTitle: "Verification sofa",
        itemBarcode: "0000617",
        location: "LC10",
      }),
    );
    await rolledBack("a rolled-back sold creation", () =>
      modules.scanHistoryRepository.appendSoldTerminalEventWithFallback({
        shopId,
        username: USERNAME,
        productId: "verify-15-rollback-sold",
        itemType: "Sofas",
        itemTitle: "Verification sofa",
        itemBarcode: "0000618",
        unknownLocation: "UNKNOWN",
        soldLocation: "SOLD",
      }),
    );

    await wait(1_000);
    for (const productId of ["verify-15-rollback", "verify-15-rollback-sold"]) {
      assert(
        (await prisma.scanHistory.count({ where: { shopId, productId } })) === 0,
        `the rolled-back row for ${productId} was committed after all`,
      );
    }
    assert(
      (await deliveries({ eventType: "items_processed" })).length === 1,
      "a rolled-back creation produced a report",
    );

    const requestsBefore = stub.since();
    await modules.scanHistoryRepository.appendLocationEvent({
      shopId,
      username: USERNAME,
      productId: "verify-15-blank",
      itemType: "Sofas",
      itemTitle: "Verification sofa",
      itemBarcode: "   ",
      location: "LC12",
    });
    await waitFor(
      "the skipped report row",
      async () => (await deliveries({ eventType: "items_processed" })).length >= 2,
      10_000,
    );

    const skipped = (await deliveries({ eventType: "items_processed", status: "skipped" }))[0];
    assert(skipped !== undefined, "a blank article number wrote no skipped row");
    assert(skipped.lastError === "no_article_number", `lastError is ${String(skipped.lastError)}`);
    assert(skipped.subjectKey === null, "a skipped row carries a subject key");
    assert(
      stub.since() === requestsBefore,
      "the stub received a request for a blank article number",
    );
  };

  const check16 = async (): Promise<void> => {
    await resetState();
    const child = spawnChild("16", {
      VERIFY_SHOP_ID: shopId,
      REDIS_URL: "redis://127.0.0.1:59997",
    });

    assert(child.signal === null, `the script had to be killed (${String(child.signal)})`);
    assert(child.status === 0, `the script exited ${String(child.status)}: ${child.stderr}`);

    const result = childResult(child.stdout) as {
      deliveriesBefore: number;
      deliveriesAfter: number;
      scanHistoryCreated: boolean;
      signalsEnabled: boolean;
    };
    assert(result.signalsEnabled === false, "a script process enabled signals");
    assert(result.scanHistoryCreated, "the script created no ScanHistory row");
    assert(
      result.deliveriesBefore === 0 && result.deliveriesAfter === 0,
      `a script wrote ${result.deliveriesAfter - result.deliveriesBefore} delivery row(s)`,
    );

    const combined = `${child.stdout}\n${child.stderr}`;
    assert(
      !/ECONNREFUSED|ioredis|redis/i.test(combined),
      `the script touched Redis: ${combined.slice(0, 500)}`,
    );
  };

  const check17 = async (): Promise<void> => {
    const stockCases: Array<{
      label: string;
      responder: StubResponder;
      status: string;
      retried: boolean;
      lastError: string | null;
      responseStatus: number | null;
    }> = [
      { label: "401", responder: statusResponder(401, failureBody("unauthorized")), status: "rejected", retried: false, lastError: null, responseStatus: 401 },
      { label: "422", responder: statusResponder(422, failureBody("duplicate identity")), status: "rejected", retried: false, lastError: null, responseStatus: 422 },
      { label: "418", responder: statusResponder(418, failureBody("teapot")), status: "rejected", retried: false, lastError: null, responseStatus: 418 },
      { label: "500", responder: statusResponder(500, failureBody("statement over the limit")), status: "failed", retried: true, lastError: "Manager returned HTTP 500", responseStatus: 500 },
      { label: "unparseable 200", responder: statusResponder(200, "definitely not json"), status: "delivered", retried: false, lastError: "unparseable_response", responseStatus: 200 },
      { label: "results count mismatch", responder: statusResponder(200, envelope([])), status: "delivered", retried: false, lastError: "unparseable_response", responseStatus: 200 },
    ];

    for (const stockCase of stockCases) {
      await resetState();
      await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: chairs({}), thresholds: [5], instanceCount: 1 });
      stub.plan("/stock-demand", [stockCase.responder]);

      if (stockCase.retried) {
        await expectRejection(sync, `${stockCase.label} must be retried`);
      } else {
        await sync();
      }

      const row = (await deliveries({ eventType: "stock_demand" }))[0];
      assert(row !== undefined, `${stockCase.label}: no delivery row`);
      assert(row.status === stockCase.status, `${stockCase.label}: status ${row.status}, expected ${stockCase.status}`);
      assert(
        row.responseStatus === stockCase.responseStatus,
        `${stockCase.label}: responseStatus ${String(row.responseStatus)}`,
      );
      assert(
        row.lastError === stockCase.lastError,
        `${stockCase.label}: lastError ${String(row.lastError)}, expected ${String(stockCase.lastError)}`,
      );

      const ledgerRow = (await ledger())[0];
      assert(ledgerRow !== undefined, `${stockCase.label}: the pre-written ledger row is missing`);
      assert(
        ledgerRow.lastOutcome === null && ledgerRow.lastAppliedQuantity === null,
        `${stockCase.label}: a non-200 touched the ledger outcome (${String(ledgerRow.lastOutcome)})`,
      );
      assert(ledgerRow.state === "active", `${stockCase.label}: ledger state ${ledgerRow.state}`);
    }

    // The four closed processed codes of handoff v2 §4.3, recorded verbatim.
    const processedCases = [
      { outcome: "resolved", reason: null },
      { outcome: "resolved", reason: "early" },
      { outcome: "ignored", reason: "item_not_found" },
      { outcome: "ignored", reason: "no_open_assignment" },
    ];

    for (const processedCase of processedCases) {
      await resetState();
      const delivery = await prisma.outboundWebhookDelivery.create({
        data: {
          shopId,
          targetId: processedTarget.id,
          eventType: "items_processed",
          subjectKey: "0000617",
          status: "pending",
          requestBody: JSON.stringify([{ article_number: "0000617" }]),
        },
        select: { id: true },
      });
      stub.plan("/items-processed", [
        statusResponder(
          200,
          envelope([{ article_number: "0000617", outcome: processedCase.outcome, reason: processedCase.reason }]),
        ),
      ]);

      await modules.runProcessedDelivery(
        { deliveryId: delivery.id, isFinalAttempt: false },
        { post: modules.postJson, now: () => new Date() },
      );

      const row = await prisma.outboundWebhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
      assert(row.status === "delivered", `${processedCase.outcome}/${String(processedCase.reason)}: status ${row.status}`);
      const parsed = JSON.parse(row.responseBody ?? "null") as {
        data: { results: Array<{ outcome: string; reason: string | null }> };
      };
      equalJson(
        parsed.data.results[0],
        { article_number: "0000617", outcome: processedCase.outcome, reason: processedCase.reason },
        "the processed answer is stored verbatim",
      );
    }
  };

  const check18 = async (): Promise<void> => {
    await resetState();

    const withoutSignals = spawnChild("18off", { VERIFY_SHOP_ID: shopId });
    assert(withoutSignals.signal === null, `the signals-off run had to be killed (${String(withoutSignals.signal)})`);
    assert(withoutSignals.status === 0, `the signals-off run exited ${String(withoutSignals.status)}: ${withoutSignals.stderr}`);

    // Signals enabled, Redis on a dead port and every target pointing at a
    // closed port: the commands must answer exactly as they did above.
    const withSignals = spawnChild("18", {
      VERIFY_SHOP_ID: shopId,
      REDIS_URL: "redis://127.0.0.1:59997",
    });
    assert(withSignals.signal === null, `the signals-on run had to be killed (${String(withSignals.signal)})`);
    assert(withSignals.status === 0, `the signals-on run exited ${String(withSignals.status)}: ${withSignals.stderr}`);

    equalJson(
      childResult(withSignals.stdout),
      childResult(withoutSignals.stdout),
      "signalling changed what an operation returns",
    );
  };

  const check19 = async (): Promise<void> => {
    await resetState();
    modules.enableManagerSignals();
    const barcode = "04 2 001 0034";

    await modules.scanHistoryRepository.appendLocationEvent({
      shopId,
      username: USERNAME,
      productId: "verify-19-product",
      itemType: "Dining Chairs",
      itemTitle: "Verification chair",
      itemBarcode: barcode,
      location: "LC10",
    });
    await waitFor(
      "the report row the endpoint must find",
      async () => (await deliveries({ eventType: "items_processed" })).length >= 1,
      10_000,
    );

    await createStockRow(modules, { shopId, location: "LC14", itemCategory: "Serving Trolleys", properties: chairs({}), thresholds: [3], instanceCount: 0 });
    await sync();

    const found = await modules.listDeliveriesQuery({ shopId, subject: barcode, limit: 50 });
    assert(found.length === 1, `/deliveries?subject= returned ${found.length} rows, expected 1`);
    const foundRow = found[0] as (typeof found)[number];
    assert(foundRow.subjectKey === barcode, "the row returned is not the article's row");
    const sent = (JSON.parse(foundRow.requestBody) as Array<{ article_number: string }>)[0];
    assert(sent?.article_number === barcode, "the stored request body is not the article's");

    const identities = await modules.listManagerStockQuery({ shopId, outcome: "category_not_found" });
    assert(
      identities.some((identity) => identity.itemCategory === "Serving Trolleys"),
      "/manager-stock?outcome=category_not_found did not surface the refused rule",
    );

    const serialized = JSON.stringify({ found, identities });
    assert(!serialized.includes(SECRET), "a read endpoint exposed the target secret");

    const stack = (
      modules.outboundWebhookRouter as unknown as {
        stack: Array<{ route?: { path: string } }>;
      }
    ).stack;
    const paths = stack.map((layer) => layer.route?.path).filter((path): path is string => path !== undefined);
    const deliveriesIndex = paths.indexOf("/deliveries");
    const managerStockIndex = paths.indexOf("/manager-stock");
    const parameterIndex = paths.findIndex((path) => path.startsWith("/:id"));
    assert(deliveriesIndex >= 0 && managerStockIndex >= 0, `the read routes are not registered: ${paths.join(", ")}`);
    assert(
      parameterIndex === -1 || (deliveriesIndex < parameterIndex && managerStockIndex < parameterIndex),
      `the read routes are registered after a /:id route: ${paths.join(", ")}`,
    );
  };

  const check20 = async (): Promise<void> => {
    await resetState();
    await createStockRow(modules, { shopId, location: "LC10", itemCategory: "Sofas", properties: chairs({}), thresholds: [5], instanceCount: 1 });
    await setTargetActive(demandTarget.id, false);
    await setTargetActive(deleteTarget.id, false);

    const before = (await deliveries()).length;
    const output = await captureOutput(async () => {
      await sync();
    });

    assert(stub.requests.length === 0, "a shop with no active target still sent a request");
    assert((await deliveries()).length === before, "a shop with no active target wrote a delivery row");
    assert(output.trim() === "", `a no-target sync logged above debug: ${output.trim()}`);
  };

  const check21 = async (): Promise<void> => {
    await resetState();
    const now = new Date();
    const makeDelivery = async (input: {
      status: "pending" | "delivered" | "rejected" | "failed";
      createdAt: Date;
      responseStatus: number | null;
      subjectKey: string;
    }): Promise<{ id: string }> =>
      prisma.outboundWebhookDelivery.create({
        data: {
          shopId,
          targetId: processedTarget.id,
          eventType: "items_processed",
          subjectKey: input.subjectKey,
          status: input.status,
          attempts: 6,
          requestBody: JSON.stringify([{ article_number: input.subjectKey }]),
          responseStatus: input.responseStatus,
          createdAt: input.createdAt,
        },
        select: { id: true },
      });

    const minute = 60 * 1_000;
    const day = 24 * 60 * minute;
    const failedRecent = await makeDelivery({ status: "failed", createdAt: new Date(now.getTime() - minute), responseStatus: 500, subjectKey: "0000621" });
    const rejected401 = await makeDelivery({ status: "rejected", createdAt: new Date(now.getTime() - minute), responseStatus: 401, subjectKey: "0000622" });
    await makeDelivery({ status: "delivered", createdAt: new Date(now.getTime() - minute), responseStatus: 200, subjectKey: "0000623" });
    await makeDelivery({ status: "failed", createdAt: new Date(now.getTime() - 8 * day), responseStatus: 500, subjectKey: "0000624" });

    // §12A.7's selection is deliberately shop-wide: the tick re-drives every
    // shop. Only this shop's rows are asserted on, so a row left behind by an
    // interrupted run cannot decide the outcome either way.
    const candidates = (await modules.listProcessedRedriveCandidates(now)).filter(
      (candidate) => candidate.shopId === shopId,
    );
    equalJson(
      candidates.map((candidate) => candidate.subjectKey).sort(),
      ["0000621", "0000622"],
      "re-drive selection",
    );

    for (const candidate of candidates) {
      await modules.runProcessedDelivery(
        { deliveryId: candidate.id, isFinalAttempt: false },
        { post: modules.postJson, now: () => new Date() },
      );
    }

    for (const id of [failedRecent.id, rejected401.id]) {
      const row = await prisma.outboundWebhookDelivery.findUniqueOrThrow({ where: { id } });
      assert(row.status === "delivered", `a re-driven report ended ${row.status}, expected delivered`);
    }

    await prisma.outboundWebhookDelivery.createMany({
      data: Array.from({ length: 205 }, (_, index) => ({
        shopId,
        targetId: processedTarget.id,
        eventType: "items_processed" as const,
        subjectKey: `cap-${index}`,
        status: "pending" as const,
        requestBody: JSON.stringify([{ article_number: `cap-${index}` }]),
        createdAt: new Date(now.getTime() - 10 * minute),
      })),
    });

    const capped = await modules.listProcessedRedriveCandidates(new Date());
    assert(capped.length === 200, `a tick offered ${capped.length} reports, expected at most 200`);
  };

  const check22 = async (): Promise<void> => {
    await resetState();
    const thresholds = [{ state: "low_in_stock" as const, thresholdQuantity: 1 }];
    const expectedMessage = "A stock definition can use only one set size";
    const before = await prisma.locationStock.count({ where: { shopId } });

    const refuse = async (operation: () => Promise<unknown>, label: string): Promise<void> => {
      const error = await expectRejection(operation, label);
      assert(error instanceof modules.ValidationError, `${label}: got ${String(error)}`);
      assert(
        (error as unknown as { statusCode?: number }).statusCode === 400,
        `${label}: status ${String((error as unknown as { statusCode?: number }).statusCode)}, expected 400`,
      );
      assert(
        (error as Error).message === expectedMessage,
        `${label}: message ${JSON.stringify((error as Error).message)}`,
      );
    };

    const createRule = (
      location: string,
      itemCategory: "Dining Chairs" | "Dining Tables",
      properties: Record<string, string | string[] | null>,
    ) =>
      modules.createLocationStocksCommand({
        shopId,
        username: USERNAME,
        payload: { configurations: [{ location, itemCategory, properties, thresholds }] },
      });

    await refuse(() => createRule("LCV22A", "Dining Chairs", { quantity: ["4", "6"] }), "create with several set sizes");
    await refuse(() => createRule("LCV22A", "Dining Chairs", { quantity: null }), "create with any set size");
    assert(
      (await prisma.locationStock.count({ where: { shopId } })) === before,
      "a refused create wrote a row",
    );

    const saved = await createRule("LCV22B", "Dining Chairs", { quantity: ["4"] });
    assert(saved.length === 1, "a single set size was not saved");
    const savedId = (saved[0] as (typeof saved)[number]).id;

    await refuse(
      () => modules.updateLocationStockCommand({ id: savedId, shopId, username: USERNAME, payload: { properties: { quantity: ["4", "6"] } } }),
      "update with several set sizes",
    );
    await refuse(
      () => modules.updateLocationStockCommand({ id: savedId, shopId, username: USERNAME, payload: { properties: { quantity: null } } }),
      "update with any set size",
    );

    const noSetSize = await createRule("LCV22C", "Dining Chairs", { upholstery: ["down"] });
    assert(noSetSize.length === 1, "a rule without a set size was refused");

    const manyExtensions = await createRule("LCV22D", "Dining Tables", { extension_quantity: ["1", "2"] });
    assert(manyExtensions.length === 1, "extension_quantity with several values was refused");

    const anyExtension = await createRule("LCV22E", "Dining Tables", { extension_quantity: null });
    assert(anyExtension.length === 1, "extension_quantity 'any value' was refused");
  };

  const check23 = async (): Promise<void> => {
    await resetState();
    const shared = chairs({ quantity: ["4"], upholstery: ["down"], wood_group: ["teak"] });
    const other = chairs({ wood_group: ["light"] });
    const first = await createStockRow(modules, {
      shopId,
      location: "LCV23A",
      itemCategory: "Dining Chairs",
      properties: shared,
      thresholds: [5],
      instanceCount: 1,
    });
    await createStockRow(modules, {
      shopId,
      location: "LCV23B",
      itemCategory: "Dining Chairs",
      properties: shared,
      thresholds: [3],
      instanceCount: 1,
    });
    await createStockRow(modules, {
      shopId,
      location: "LCV23C",
      itemCategory: "Armchairs",
      properties: other,
      thresholds: [2],
      instanceCount: 0,
    });
    await sync();

    await prisma.locationStock.update({ where: { id: first.id }, data: { instanceCount: 2 } });
    stub.reset();
    await syncDelta();
    equalJson(
      bodyOf(requestsOn("/stock-demand")[0] as StubRequest),
      [{ itemCategory: "Dining Chairs", properties: shared, quantityRequested: 20 }],
      "a delta sends only the changed aggregate group",
    );
    assert(requestsOn("/stock-demand").length === 1, "one changed group sent more than one request");

    stub.reset();
    await syncDelta();
    assert(stub.requests.length === 0, "an unchanged delta sent a request");

    await prisma.locationStock.update({ where: { id: first.id }, data: { instanceCount: 5 } });
    await prisma.locationStock.updateMany({
      where: { shopId, location: "LCV23B" },
      data: { instanceCount: 3 },
    });
    stub.reset();
    await syncDelta();
    equalJson(
      bodyOf(requestsOn("/stock-demand")[0] as StubRequest),
      [{ itemCategory: "Dining Chairs", properties: shared, quantityRequested: 0 }],
      "an existing group that reaches zero remains a demand upsert",
    );
  };

  const check24 = async (): Promise<void> => {
    await resetState();
    const doomedProperties = chairs({ wood_group: ["teak"] });
    const stableProperties = chairs({ wood_group: ["light"] });
    const doomed = await createStockRow(modules, {
      shopId,
      location: "LCV24A",
      itemCategory: "Sofas",
      properties: doomedProperties,
      thresholds: [2],
      instanceCount: 0,
    });
    await createStockRow(modules, {
      shopId,
      location: "LCV24B",
      itemCategory: "Sofas",
      properties: stableProperties,
      thresholds: [2],
      instanceCount: 0,
    });
    await sync();

    await prisma.locationStock.delete({ where: { id: doomed.id } });
    stub.reset();
    await syncDelta();
    equalJson(
      stub.requests.map((request) => request.path),
      ["/stock-demand-deleted"],
      "a vanished identity sends only its targeted delete",
    );
    equalJson(
      bodyOf(requestsOn("/stock-demand-deleted")[0] as StubRequest),
      [{ itemCategory: "Sofas", properties: doomedProperties }],
      "the targeted delete identity",
    );
  };

  const check25 = async (): Promise<void> => {
    await resetState();
    const properties = chairs({ wood_group: ["teak"] });
    await createStockRow(modules, {
      shopId,
      location: "LCV25",
      itemCategory: "Sofas",
      properties,
      thresholds: [2],
      instanceCount: 0,
    });
    stub.plan("/stock-demand", [statusResponder(401, failureBody("unauthorized"))]);
    await syncDelta();
    const firstDelivery = (await deliveries({ eventType: "stock_demand" }))[0];
    assert(firstDelivery?.status === "rejected", "the planned 401 did not reject the delta");

    stub.reset();
    await syncDelta();
    assert(
      requestsOn("/stock-demand").length === 1,
      "an unconfirmed demand group was not retried by a later delta",
    );
    const finalDelivery = (await deliveries({ eventType: "stock_demand" }))[1];
    assert(finalDelivery?.status === "delivered", "the retry did not deliver the group");
  };

  const check26 = async (): Promise<void> => {
    const schedule = {
      timeZone: "Europe/Stockholm",
      times: modules.parseManagerFullSyncTimes("17:00,07:00,12:00"),
    };
    equalJson(schedule.times, ["07:00", "12:00", "17:00"], "schedule time ordering");
    assert(
      modules.managerFullSyncSlotKey(new Date("2026-01-15T06:00:00.000Z"), schedule)
        ?.includes("T07:00") === true,
      "winter Stockholm schedule did not match 07:00",
    );
    assert(
      modules.managerFullSyncSlotKey(new Date("2026-07-15T05:00:00.000Z"), schedule)
        ?.includes("T07:00") === true,
      "summer Stockholm schedule did not match 07:00",
    );
    assert(
      modules.managerFullSyncSlotKey(new Date("2026-01-15T06:01:00.000Z"), schedule) === null,
      "a non-scheduled minute matched a full-sync slot",
    );
  };

  const cases: Array<{ id: string; run: () => Promise<void> }> = [
    { id: "1 (M1) worked fixture and one restock-target source", run: check1 },
    { id: "2 (M1) unitsPerItem", run: check2 },
    { id: "3 (M1) one entry per identity, sorted, no duplicate", run: check3 },
    { id: "4 (M1) a satisfied rule is sent as 0", run: check4 },
    { id: "5 (M2) no delete while another location holds the identity", run: check5 },
    { id: "6 (M1,M2) delete before demand, ledger closed", run: check6 },
    { id: "7 (M2) Teak -> Light -> Teak sends no delete", run: check7 },
    { id: "8 (M3) a retryable delete retries the whole run", run: check8 },
    { id: "9 (M2,M5) a final 401 on a delete lets demand proceed", run: check9 },
    { id: "10 (M1) an empty shop sends nothing", run: check10 },
    { id: "11 (M7) missing delete target and ambiguous targets", run: check11 },
    { id: "12 (M3) triggers coalesce into one further run", run: check12 },
    { id: "13 (M5) a timeout is retried, not completed", run: check13 },
    { id: "14 (M4) one report per creation, byte-identical", run: check14 },
    { id: "15 (M4) sold creation, rollback and blank barcode", run: check15 },
    { id: "16 (M6,M7) a script signals nothing and exits", run: check16 },
    { id: "17 (M5) response classification", run: check17 },
    { id: "18 (M6) signalling never changes an operation's result", run: check18 },
    { id: "19 (M6) the two read endpoints", run: check19 },
    { id: "20 (M7) no active target is silent", run: check20 },
    { id: "21 (M4) bounded processed re-drive", run: check21 },
    { id: "22 (M1) one set size per rule", run: check22 },
    { id: "23 (M1) targeted aggregate deltas and zero demand", run: check23 },
    { id: "24 (M2) targeted deletion without unchanged demand", run: check24 },
    { id: "25 (M3) unconfirmed delta remains retryable", run: check25 },
    { id: "26 (M3) Stockholm full-sync schedule", run: check26 },
  ];

  let failures = 0;
  try {
    for (const verificationCase of cases) {
      try {
        await verificationCase.run();
        console.log(`PASS ${verificationCase.id}`);
      } catch (error) {
        failures += 1;
        console.log(
          `FAIL ${verificationCase.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  } finally {
    try {
      const ownDeliveryIds = new Set(
        (await prisma.outboundWebhookDelivery.findMany({ where: { shopId }, select: { id: true } })).map(
          (row) => row.id,
        ),
      );
      const states = ["waiting", "delayed", "active", "completed", "failed", "prioritized"] as const;
      const stockJobs = await modules.managerStockSyncQueue().getJobs([...states]);
      for (const job of stockJobs) {
        if ((job.data as { shopId?: string } | undefined)?.shopId === shopId) {
          await job.remove().catch(() => undefined);
        }
      }
      const processedJobs = await modules.managerItemsProcessedQueue().getJobs([...states]);
      for (const job of processedJobs) {
        const deliveryId = (job.data as { deliveryId?: string } | undefined)?.deliveryId;
        if (deliveryId !== undefined && ownDeliveryIds.has(deliveryId)) {
          await job.remove().catch(() => undefined);
        }
      }
    } catch {
      // Redis may be unreachable; checks 12 and 13 already said so.
    }

    await modules.closeManagerSignals();
    await stub.close();
    await prisma.shop.delete({ where: { id: shopId } }).catch(() => undefined);
    await prisma.$disconnect();
  }

  if (failures > 0) {
    process.exitCode = 1;
  }

  // `loadHttpModules` mounts the Express router, which reaches
  // `notification-queue` and `logistic-notification.service`; both open a Redis
  // connection at import time that only the server's own shutdown closes. This
  // script owns no handle on either, so it ends the process itself rather than
  // hanging `verify-all`. Nothing is weakened by that: check 16 asserts the
  // "exits by itself" property in a child that mounts no routes, which is what
  // §12A.5 is about.
  process.exit(failures > 0 ? 1 : 0);
};

void main().catch((error: unknown) => {
  if (process.exitCode === 3) {
    return;
  }
  console.log(`FAIL setup: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
  // Setup may already have mounted the router; see the note at the end of main().
  process.exit(1);
});
