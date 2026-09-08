import { isAbsolute, resolve } from "node:path";

import type {
  LocationStock,
  LocationStockCreateData,
} from "../src/modules/stock/contracts/stock.contract.js";

const configuredDevelopmentDatabasePath = resolve(process.cwd(), "prisma/dev.db");

const databasePathFromUrl = (databaseUrl: string): string => {
  const rawPath = databaseUrl.startsWith("file:")
    ? databaseUrl.slice("file:".length).split("?")[0] ?? ""
    : databaseUrl;
  return isAbsolute(rawPath)
    ? resolve(rawPath)
    : resolve(process.cwd(), "prisma", rawPath);
};

const refuseDatabase = (reason: string): never => {
  console.log(
    `REFUSED ${reason}; DATABASE_URL path is ${process.env.DATABASE_URL ?? "<unset>"}; configured development database is ${configuredDevelopmentDatabasePath}`,
  );
  process.exitCode = 3;
  throw new Error("verification refused");
};

const assert: (condition: unknown, message: string) => asserts condition = (
  condition,
  message,
) => {
  if (!condition) {
    throw new Error(message);
  }
};

const equalJson = (actual: unknown, expected: unknown): void => {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
  );
};

const wait = (milliseconds: number): Promise<void> =>
  new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

type CapturedOutput = {
  stdout: string;
  stderr: string;
};

const captureOutput = async <T>(operation: () => Promise<T>): Promise<{ value: T; output: CapturedOutput }> => {
  let stdout = "";
  let stderr = "";
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stderr.write;

  try {
    return { value: await operation(), output: { stdout, stderr } };
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }
};

const parseJsonLines = (output: CapturedOutput): Array<Record<string, unknown>> => {
  const lines = `${output.stdout}\n${output.stderr}`
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parsed: unknown = JSON.parse(line);
    assert(typeof parsed === "object" && parsed !== null, `expected JSON object log, got ${line}`);
    return parsed as Record<string, unknown>;
  });
};

const thresholds = [
  { state: "low_in_stock" as const, thresholdQuantity: 1 },
  { state: "medium_in_stock" as const, thresholdQuantity: 3 },
  { state: "high_in_stock" as const, thresholdQuantity: 5 },
];

const main = async (): Promise<void> => {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    refuseDatabase("DATABASE_URL is unset or empty");
    return;
  }

  const databasePath = databasePathFromUrl(databaseUrl);
  if (databasePath === configuredDevelopmentDatabasePath) {
    refuseDatabase("DATABASE_URL resolves to the configured development database");
  }

  const shopId = process.env.SHOP_ID?.trim();
  if (!shopId) {
    throw new Error("SHOP_ID must be set for reconciliation verification");
  }

  const { prisma } = await import("../src/shared/database/prisma-client.js");
  const { locationStockRepository } = await import(
    "../src/modules/stock/repositories/location-stock.repository.js"
  );
  const { reconcileAllCategories, reconcileCategory } = await import(
    "../src/modules/stock/services/stock-reconciliation.service.js"
  );
  const { canonicalCriteriaString } = await import(
    "../src/modules/stock/domain/property-criteria.js"
  );
  const { applyItemStockChange } = await import(
    "../src/modules/stock/services/apply-item-stock-change.service.js"
  );
  const { calculateStockState } = await import(
    "../src/modules/stock/domain/stock-state.js"
  );

  const createdStockIds: string[] = [];
  const createdScanHistoryIds: string[] = [];
  const createdShopIds: string[] = [];
  const location = (label: string): string =>
    `__P2_VERIFY__${label}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const itemCategory = "Dining Chairs";

  type VerificationCreateInput = Omit<
    LocationStockCreateData,
    "createdByUsername" | "updatedByUsername"
  >;

  const createConfigurations = async (
    shop: string,
    input: readonly VerificationCreateInput[],
  ): Promise<LocationStock[]> => {
    const rows = await locationStockRepository.createMany(
      shop,
      input.map((configuration) => ({
        ...configuration,
        createdByUsername: "p2-verification",
        updatedByUsername: "p2-verification",
      })),
    );
    createdStockIds.push(...rows.map((row) => row.id));
    return rows;
  };

  const createItem = async (input: {
    shopId: string;
    productId: string;
    location: string | null;
    itemCategory: string | null;
    quantity: number;
    isSold?: boolean;
    properties?: Record<string, string> | null;
  }): Promise<string> => {
    const row = await prisma.scanHistory.create({
      data: {
        shopId: input.shopId,
        username: "p2-verification",
        productId: input.productId,
        itemType: input.itemCategory ?? "unknown",
        itemTitle: "P2 verification item",
        itemCategory: input.itemCategory,
        latestLocation: input.location,
        quantity: input.quantity,
        isSold: input.isSold ?? false,
        ...(input.properties !== undefined && input.properties !== null
          ? { properties: input.properties }
          : {}),
      },
    });
    createdScanHistoryIds.push(row.id);
    return row.id;
  };

  const findConfig = async (id: string): Promise<LocationStock> => {
    const row = await locationStockRepository.findById(id, shopId);
    assert(row !== null, `expected LocationStock ${id} to exist`);
    return row;
  };

  const verifyC1 = async (): Promise<void> => {
    const groupLocation = location("c1");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "configuration was not created");
    equalJson(created.properties, {});

    const createdRaw = await prisma.locationStock.findUnique({
      where: { id: created.id },
      select: { properties: true, propertiesCanonical: true },
    });
    assert(createdRaw !== null, "created raw configuration was not found");
    assert(
      createdRaw.propertiesCanonical === canonicalCriteriaString(created.properties),
      "create canonical criteria string was not persisted",
    );

    const updated = await locationStockRepository.updateConfig(
      created.id,
      shopId,
      {
        properties: { wood_type: ["Teak", "Oak"] },
        updatedByUsername: "p2-verification-update",
      },
    );
    const updatedRaw = await prisma.locationStock.findUnique({
      where: { id: created.id },
      select: { propertiesCanonical: true },
    });
    assert(updatedRaw !== null, "updated raw configuration was not found");
    assert(
      updatedRaw.propertiesCanonical === canonicalCriteriaString(updated.properties),
      "update canonical criteria string was not persisted",
    );

    const { value: duplicateError } = await captureOutput(async () => {
      try {
        await locationStockRepository.createMany(shopId, [
          {
            location: groupLocation,
            itemCategory,
            properties: { wood_type: ["Teak", "Oak"] },
            thresholds,
            createdByUsername: "p2-verification",
            updatedByUsername: "p2-verification",
          },
        ]);
      } catch (error) {
        return error;
      }
      return null;
    });
    assert(
      typeof duplicateError === "object" && duplicateError !== null &&
        "code" in duplicateError && duplicateError.code === "P2002",
      `expected raw Prisma P2002, got ${duplicateError instanceof Error ? duplicateError.constructor.name : String(duplicateError)}`,
    );
  };

  const verifyC2 = async (): Promise<void> => {
    const groupLocation = location("c2");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "configuration was not created");

    await prisma.locationStock.update({ where: { id: created.id }, data: { quantity: 5, instanceCount: 5 } });
    assert(await locationStockRepository.applyGuardedDecrement(
      created.id,
      shopId,
      { quantity: 3, instances: 3 },
      { productId: "p2-c2-product", itemCategory, operation: "reconciliation" },
    ), "guarded decrement unexpectedly refused");
    const decremented = await findConfig(created.id);
    assert(decremented.quantity === 2, `expected quantity 2, got ${decremented.quantity}`);
    assert(decremented.instanceCount === 2, `expected instanceCount 2, got ${decremented.instanceCount}`);
    assert(decremented.stockState === "medium_in_stock", `expected medium state, got ${decremented.stockState}`);
  };

  const verifyC2Refusal = async (): Promise<void> => {
    const groupLocation = location("c2-refusal");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "configuration was not created");
    await prisma.locationStock.update({ where: { id: created.id }, data: { quantity: 2, instanceCount: 2 } });

    const { value: result, output } = await captureOutput(() =>
      locationStockRepository.applyGuardedDecrement(
        created.id,
        shopId,
        { quantity: 3, instances: 3 },
        {
          productId: "p2-c2-refusal-product",
          itemCategory,
          operation: "reconciliation",
        },
      ),
    );
    assert(result === false, "short decrement did not report refusal");
    const after = await findConfig(created.id);
    assert(after.quantity === 2, `refused decrement changed quantity to ${after.quantity}`);

    const errorLogs = parseJsonLines(output).filter((entry) => entry.level === "error");
    assert(errorLogs.length === 1, `expected one error log, got ${errorLogs.length}`);
    const context = errorLogs[0]?.context;
    assert(typeof context === "object" && context !== null, "error log had no context object");
    const contextRecord = context as Record<string, unknown>;
    equalJson(Object.keys(contextRecord).sort(), [
      "currentInstanceCount",
      "currentQuantity",
      "itemCategory",
      "location",
      "locationStockId",
      "operation",
      "productId",
      "requestedDecrement",
      "requestedInstanceDecrement",
      "shopId",
    ]);
    equalJson(contextRecord, {
      locationStockId: created.id,
      location: groupLocation,
      shopId,
      requestedDecrement: 3,
      requestedInstanceDecrement: 3,
      currentQuantity: 2,
      currentInstanceCount: 2,
      productId: "p2-c2-refusal-product",
      itemCategory,
      operation: "reconciliation",
    });
  };

  const verifyC2Increment = async (): Promise<void> => {
    const groupLocation = location("c2-increment");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "configuration was not created");
    await prisma.locationStock.update({ where: { id: created.id }, data: { quantity: 2, instanceCount: 2 } });
    await locationStockRepository.applyIncrement(created.id, { quantity: 4, instances: 4 });
    const incremented = await findConfig(created.id);
    assert(incremented.quantity === 6, `expected quantity 6, got ${incremented.quantity}`);
    assert(incremented.instanceCount === 6, `expected instanceCount 6, got ${incremented.instanceCount}`);
    assert(incremented.stockState === "extra_in_stock", `expected high state, got ${incremented.stockState}`);
  };

  const verifyC3 = async (): Promise<void> => {
    const groupLocation = location("c3");
    const [specific, wildcard, zeroMatch] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: { wood_type: "Teak" }, thresholds },
      { location: groupLocation, itemCategory, properties: { wood_type: null }, thresholds },
      { location: groupLocation, itemCategory, properties: { country: "Sweden" }, thresholds },
    ]);
    assert(specific !== undefined && wildcard !== undefined && zeroMatch !== undefined, "C3 configs were not created");

    await createItem({ shopId, productId: `${groupLocation}-specific`, location: groupLocation, itemCategory, quantity: 4, properties: { wood_type: "Teak" } });
    await createItem({ shopId, productId: `${groupLocation}-wildcard`, location: groupLocation, itemCategory, quantity: 3, properties: { wood_type: "Oak" } });
    await createItem({ shopId, productId: `${groupLocation}-unmatched`, location: groupLocation, itemCategory, quantity: 7, properties: { upholstery: "Up" } });
    await createItem({ shopId, productId: `${groupLocation}-wrong-location`, location: `${groupLocation}-other`, itemCategory, quantity: 9, properties: { wood_type: "Teak" } });
    await createItem({ shopId, productId: `${groupLocation}-wrong-category`, location: groupLocation, itemCategory: "Easy Chairs", quantity: 8, properties: { wood_type: "Teak" } });
    await createItem({ shopId, productId: `${groupLocation}-sold`, location: groupLocation, itemCategory, quantity: 6, isSold: true, properties: { wood_type: "Teak" } });

    const result = await reconcileCategory(shopId, itemCategory);
    assert(result.get(specific.id)?.quantity === 4, "specific winner did not receive item quantity 4");
    assert(result.get(wildcard.id)?.quantity === 3, "wildcard winner did not receive item quantity 3");
    assert(result.get(zeroMatch.id)?.quantity === 0, "zero-match configuration was not reset to zero");
    // P7: one allocated item each, so both definitions sit at low_in_stock (1 <= 1).
    assert((await findConfig(specific.id)).stockState === "low_in_stock", "specific state was not recalculated");
    assert((await findConfig(wildcard.id)).stockState === "low_in_stock", "wildcard state was not recalculated");
    assert((await findConfig(zeroMatch.id)).stockState === "out_of_stock", "zero-match state was not recalculated");
  };

  type C4Scenario = {
    noSecondWrite: boolean;
    firstHookCount: number;
    warningContext: Record<string, unknown>;
    secondHookCount: number;
    returnedQuantity: number;
    returnedState: string;
  };
  let c4Scenario: C4Scenario | null = null;
  const runC4Scenario = async (): Promise<C4Scenario> => {
    if (c4Scenario) {
      return c4Scenario;
    }

    const groupLocation = location("c4");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "C4 config was not created");
    const itemId = await createItem({ shopId, productId: "p2-c4-item", location: groupLocation, itemCategory, quantity: 1, properties: {} });

    let firstPassTimestamp: Date | undefined;
    let firstHookCount = 0;
    const firstResult = await reconcileCategory(shopId, itemCategory, {
      betweenPasses: async () => {
        firstHookCount += 1;
        const row = await prisma.locationStock.findUnique({ where: { id: created.id }, select: { updatedAt: true } });
        assert(row !== null, "C4 row disappeared between passes");
        firstPassTimestamp = row.updatedAt;
        await wait(25);
      },
    });
    const afterFirst = await findConfig(created.id);
    assert(firstResult.get(created.id)?.quantity === 1, "pass 1/2 did not return quantity 1");

    let secondHookCount = 0;
    const { value: secondResult, output } = await captureOutput(() =>
      reconcileCategory(shopId, itemCategory, {
        betweenPasses: async () => {
          secondHookCount += 1;
          await prisma.scanHistory.update({ where: { id: itemId }, data: { quantity: 4 } });
        },
      }),
    );
    const afterSecond = await findConfig(created.id);
    const warning = parseJsonLines(output).find((entry) => entry.level === "warn");
    if (!warning) {
      throw new Error("pass 2 correction emitted no warning");
    }
    assert(typeof warning.context === "object" && warning.context !== null, "pass 2 warning had no context");

    c4Scenario = {
      noSecondWrite: firstPassTimestamp?.getTime() === afterFirst.updatedAt.getTime(),
      firstHookCount,
      warningContext: warning.context as Record<string, unknown>,
      secondHookCount,
      returnedQuantity: secondResult.get(created.id)?.quantity ?? -1,
      returnedState: secondResult.get(created.id)?.stockState ?? "missing",
    };
    return c4Scenario;
  };

  const verifyC4a = async (): Promise<void> => {
    assert((await runC4Scenario()).noSecondWrite, "pass 2 performed an unexpected second write");
  };

  const verifyC4b = async (): Promise<void> => {
    const scenario = await runC4Scenario();
    assert(scenario.warningContext.location === undefined, "warning still names a single location; the unit is the category");
    assert(scenario.warningContext.itemCategory === itemCategory, "warning did not name item category");
    const delta = scenario.warningContext.delta;
    assert(Array.isArray(delta) && delta.length === 1, "warning did not contain one config delta");
    const [entry] = delta as Array<Record<string, unknown>>;
    assert(entry?.locationStockId !== undefined, "warning delta did not name config");
    assert((entry.from as { quantity: number }).quantity === 1, "warning delta had wrong old quantity");
    assert((entry.to as { quantity: number }).quantity === 4, "warning delta had wrong new quantity");
  };

  const verifyC4c = async (): Promise<void> => {
    const scenario = await runC4Scenario();
    assert(scenario.firstHookCount === 1, `expected one first between-pass hook, got ${scenario.firstHookCount}`);
    assert(scenario.secondHookCount === 1, `expected one second between-pass hook, got ${scenario.secondHookCount}`);
  };

  const verifyC4d = async (): Promise<void> => {
    const scenario = await runC4Scenario();
    assert(scenario.returnedQuantity === 4, `expected pass-2 return quantity 4, got ${scenario.returnedQuantity}`);
    // P7: the item's quantity moved 1 -> 4 but it is still one instance, so the state stays low_in_stock.
    assert(scenario.returnedState === "low_in_stock", `expected pass-2 low state, got ${scenario.returnedState}`);
  };

  const verifyC5 = async (): Promise<void> => {
    const groupLocation = location("c5");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "C5 config was not created");
    await createItem({ shopId, productId: `${groupLocation}-item`, location: groupLocation, itemCategory, quantity: 3, properties: {} });
    await prisma.locationStock.update({ where: { id: created.id }, data: { quantity: 99, stockState: "extra_in_stock", updatedByUsername: "manual-drift" } });

    const { value: result, output } = await captureOutput(() =>
      reconcileCategory(shopId, itemCategory),
    );
    assert(result.get(created.id)?.quantity === 3, "absolute reconciliation did not repair quantity 99 to 3");
    const after = await findConfig(created.id);
    assert(after.quantity === 3 && after.instanceCount === 1 && after.stockState === "low_in_stock", "absolute reconciliation left the wrong persisted state");
    const errorLogs = parseJsonLines(output).filter((entry) => entry.level === "error");
    assert(errorLogs.length === 0, `absolute reconciliation emitted ${errorLogs.length} guard error(s)`);
  };

  const verifyC6 = async (): Promise<void> => {
    const temporaryShop = await prisma.shop.create({
      data: { shopDomain: `p2-verification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.example` },
    });
    createdShopIds.push(temporaryShop.id);
    const firstLocation = location("c6-first");
    const secondLocation = location("c6-second");
    const [firstSpecific, firstCatchAll, secondCatchAll] = await createConfigurations(temporaryShop.id, [
      { location: firstLocation, itemCategory, properties: { wood_type: "Teak" }, thresholds },
      { location: firstLocation, itemCategory, properties: {}, thresholds },
      { location: secondLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(firstSpecific !== undefined && firstCatchAll !== undefined && secondCatchAll !== undefined, "C6 configs were not created");
    await createItem({ shopId: temporaryShop.id, productId: "p2-c6-first-item", location: firstLocation, itemCategory, quantity: 2, properties: { wood_type: "Teak" } });
    await createItem({ shopId: temporaryShop.id, productId: "p2-c6-second-item", location: secondLocation, itemCategory, quantity: 3, properties: { wood_type: "Oak" } });

    // Both locations share one category, so the sweep is one call that still has
    // to land the right number on all three definitions across both of them.
    const categories: Array<{ itemCategory: string }> = [];
    await reconcileAllCategories(temporaryShop.id, {
      onCategoryReconciled: (category) => categories.push(category),
    });
    assert(categories.length === 1, `expected one category hook call, got ${categories.length}`);
    assert(categories[0]?.itemCategory === itemCategory, "category hook did not name the category");
    assert((await locationStockRepository.findById(firstSpecific.id, temporaryShop.id))?.quantity === 2, "first location specific config was not reconciled");
    assert((await locationStockRepository.findById(firstCatchAll.id, temporaryShop.id))?.quantity === 0, "first location catch-all was not reconciled");
    assert((await locationStockRepository.findById(secondCatchAll.id, temporaryShop.id))?.quantity === 3, "second location was not reconciled");
  };

  // ---------------------------------------------------------------------------
  // P7 — per-instance count. Rows are numbered after plan_7's criteria table.
  // ---------------------------------------------------------------------------

  type P7AllocationScenario = {
    specific: LocationStock;
    wildcard: LocationStock;
    zeroMatch: LocationStock;
  };
  let p7Allocation: P7AllocationScenario | null = null;
  const runP7Allocation = async (): Promise<P7AllocationScenario> => {
    if (p7Allocation) {
      return p7Allocation;
    }
    const groupLocation = location("p7-c2a");
    const [specific, wildcard, zeroMatch] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: { wood_type: "Teak" }, thresholds },
      { location: groupLocation, itemCategory, properties: { wood_type: null }, thresholds },
      { location: groupLocation, itemCategory, properties: { country: "Sweden" }, thresholds },
    ]);
    assert(specific !== undefined && wildcard !== undefined && zeroMatch !== undefined, "P7.C2(a) configs were not created");
    await createItem({ shopId, productId: `${groupLocation}-specific`, location: groupLocation, itemCategory, quantity: 4, properties: { wood_type: "Teak" } });
    await createItem({ shopId, productId: `${groupLocation}-wildcard`, location: groupLocation, itemCategory, quantity: 3, properties: { wood_type: "Oak" } });
    await createItem({ shopId, productId: `${groupLocation}-unmatched`, location: groupLocation, itemCategory, quantity: 7, properties: { upholstery: "Up" } });
    await createItem({ shopId, productId: `${groupLocation}-wrong-location`, location: `${groupLocation}-other`, itemCategory, quantity: 9, properties: { wood_type: "Teak" } });
    await createItem({ shopId, productId: `${groupLocation}-wrong-category`, location: groupLocation, itemCategory: "Easy Chairs", quantity: 8, properties: { wood_type: "Teak" } });
    await createItem({ shopId, productId: `${groupLocation}-sold`, location: groupLocation, itemCategory, quantity: 6, isSold: true, properties: { wood_type: "Teak" } });
    await reconcileCategory(shopId, itemCategory);
    p7Allocation = {
      specific: await findConfig(specific.id),
      wildcard: await findConfig(wildcard.id),
      zeroMatch: await findConfig(zeroMatch.id),
    };
    return p7Allocation;
  };

  const verifyP7C2a = async (): Promise<void> => {
    const { specific, wildcard, zeroMatch } = await runP7Allocation();
    assert(specific.quantity === 4 && specific.instanceCount === 1, `P7.C2(a): teak expected 4/1, got ${specific.quantity}/${specific.instanceCount}`);
    assert(wildcard.quantity === 3 && wildcard.instanceCount === 1, `P7.C2(a): catch-all expected 3/1, got ${wildcard.quantity}/${wildcard.instanceCount}`);
    assert(zeroMatch.quantity === 0 && zeroMatch.instanceCount === 0, `P7.C2(a): zero-match expected 0/0, got ${zeroMatch.quantity}/${zeroMatch.instanceCount}`);
  };

  const verifyP7C2b = async (): Promise<void> => {
    const groupLocation = location("p7-c2b");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "P7.C2(b) config was not created");
    await createItem({ shopId, productId: `${groupLocation}-item`, location: groupLocation, itemCategory, quantity: 3, properties: {} });
    // quantity is already right; only instanceCount drifted.
    await prisma.locationStock.update({
      where: { id: created.id },
      data: { quantity: 3, instanceCount: 99, stockState: "extra_in_stock", updatedByUsername: "manual-drift" },
    });
    const result = await reconcileCategory(shopId, itemCategory);
    assert(result.get(created.id)?.instanceCount === 1, "P7.C2(b): recount did not return instanceCount 1");
    const after = await findConfig(created.id);
    assert(after.instanceCount === 1, `P7.C2(b): drifted instanceCount was not repaired, got ${after.instanceCount}`);
    assert(after.quantity === 3, `P7.C2(b): quantity changed to ${after.quantity}`);
    assert(after.stockState === "low_in_stock", `P7.C2(b): state was not re-derived, got ${after.stockState}`);
    assert(after.updatedByUsername === "system:stock-reconciliation", "P7.C2(b): the row was not written (three-value compare missed the instanceCount drift)");
  };

  const verifyP7C2c = async (): Promise<void> => {
    const groupLocation = location("p7-c2c");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "P7.C2(c) config was not created");
    await createItem({ shopId, productId: `${groupLocation}-first`, location: groupLocation, itemCategory, quantity: 2, properties: {} });
    const { output } = await captureOutput(() =>
      reconcileCategory(shopId, itemCategory, {
        betweenPasses: async () => {
          await createItem({ shopId, productId: `${groupLocation}-second`, location: groupLocation, itemCategory, quantity: 5, properties: {} });
        },
      }),
    );
    const warning = parseJsonLines(output).find((entry) => entry.level === "warn");
    assert(warning !== undefined, "P7.C2(c): pass 2 emitted no correction warning");
    const delta = (warning.context as { delta: Array<Record<string, unknown>> }).delta;
    assert(Array.isArray(delta) && delta.length === 1, "P7.C2(c): warning did not carry one delta");
    const [entry] = delta;
    const from = entry?.from as { quantity: number; instanceCount: number };
    const to = entry?.to as { quantity: number; instanceCount: number };
    assert(from.quantity === 2 && from.instanceCount === 1, `P7.C2(c): from was ${JSON.stringify(from)}`);
    assert(to.quantity === 7 && to.instanceCount === 2, `P7.C2(c): to was ${JSON.stringify(to)}`);
    const after = await findConfig(created.id);
    assert(after.quantity === 7 && after.instanceCount === 2, "P7.C2(c): pass 2 did not persist both numbers");
  };

  const verifyP7C2d = async (): Promise<void> => {
    const groupLocation = location("p7-c2d");
    const bandThresholds = [
      { state: "low_in_stock" as const, thresholdQuantity: 2 },
      { state: "medium_in_stock" as const, thresholdQuantity: 4 },
      { state: "high_in_stock" as const, thresholdQuantity: 6 },
    ];
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds: bandThresholds },
    ]);
    assert(created !== undefined, "P7.C2(d) config was not created");
    await createItem({ shopId, productId: `${groupLocation}-item`, location: groupLocation, itemCategory, quantity: 5, properties: {} });
    const result = await reconcileCategory(shopId, itemCategory);
    const value = result.get(created.id);
    assert(value !== undefined, "P7.C2(d): no result for the definition");
    assert(value.quantity === 5 && value.instanceCount === 1, `P7.C2(d): expected 5/1, got ${value.quantity}/${value.instanceCount}`);
    // The discriminating assertion: quantity 5 under 2/4/6 would read high_in_stock; one item reads low_in_stock.
    assert(value.stockState === "low_in_stock", `P7.C2(d): state derived from the wrong basis, got ${value.stockState}`);
    assert((await findConfig(created.id)).stockState === "low_in_stock", "P7.C2(d): persisted state was not item-based");
  };

  const verifyP7C2e = async (): Promise<void> => {
    const groupLocation = location("p7-c2e");
    const [created] = await createConfigurations(shopId, [
      { location: groupLocation, itemCategory, properties: {}, thresholds },
    ]);
    assert(created !== undefined, "P7.C2(e) config was not created");
    await createItem({ shopId, productId: `${groupLocation}-item`, location: groupLocation, itemCategory, quantity: 3, properties: {} });
    // A row as the migration leaves it: correct quantity, instanceCount at the column default.
    await prisma.locationStock.update({
      where: { id: created.id },
      data: { quantity: 3, instanceCount: 0, stockState: "out_of_stock" },
    });
    await reconcileCategory(shopId, itemCategory);
    const after = await findConfig(created.id);
    assert(after.instanceCount === 1 && after.quantity === 3, `P7.C2(e): backfill left ${after.quantity}/${after.instanceCount}`);
    assert(after.stockState === "low_in_stock", `P7.C2(e): state not re-derived after backfill, got ${after.stockState}`);
  };

  type HookSnapshot = {
    location: string | null;
    itemCategory: string | null;
    properties: Record<string, string> | null;
    quantity: number;
    isSold: boolean;
  };
  const snapshot = (locationName: string | null, quantity: number): HookSnapshot | null =>
    locationName === null
      ? null
      : { location: locationName, itemCategory, properties: {}, quantity, isSold: false };

  type HookStep = { quantity: number; instanceCount: number; stockState: string };
  type P7HookScenario = {
    a: HookStep;
    b: HookStep;
    c: HookStep;
    d: HookStep;
    e: { from: HookStep; to: HookStep };
    f: { changed: boolean; row: HookStep; context: Record<string, unknown> | null };
    g: { changed: boolean; row: HookStep };
    thresholdsOfA: LocationStock["thresholds"];
    statesChecked: number;
  };
  let p7Hooks: P7HookScenario | null = null;
  const runP7Hooks = async (): Promise<P7HookScenario> => {
    if (p7Hooks) {
      return p7Hooks;
    }
    const locationA = location("p7-c3-a");
    const locationB = location("p7-c3-b");
    const [configA, configB] = await createConfigurations(shopId, [
      { location: locationA, itemCategory, properties: {}, thresholds },
      { location: locationB, itemCategory, properties: {}, thresholds },
    ]);
    assert(configA !== undefined && configB !== undefined, "P7.C3 configs were not created");
    const step = async (id: string): Promise<HookStep> => {
      const row = await findConfig(id);
      return { quantity: row.quantity, instanceCount: row.instanceCount, stockState: row.stockState };
    };
    const set = (id: string, quantity: number, instanceCount: number) =>
      prisma.locationStock.update({ where: { id }, data: { quantity, instanceCount } });
    const change = (before: HookSnapshot | null, after: HookSnapshot | null): Promise<{ changed: boolean }> =>
      applyItemStockChange({
        shopId,
        before,
        after,
        operation: "location_move",
        itemIdentifiers: { productId: "p7-c3-product" },
      });
    let statesChecked = 0;
    const checkState = async (id: string): Promise<void> => {
      const row = await findConfig(id);
      assert(
        row.stockState === calculateStockState(row.instanceCount, row.thresholds),
        `P7.C3(h): ${id} state ${row.stockState} is not derived from instanceCount ${row.instanceCount}`,
      );
      statesChecked += 1;
    };

    // (a) enter
    await set(configA.id, 0, 0);
    await change(null, snapshot(locationA, 3));
    const a = await step(configA.id);
    await checkState(configA.id);
    // (b) leave
    await change(snapshot(locationA, 3), null);
    const b = await step(configA.id);
    await checkState(configA.id);
    // (c) same definition, quantity 1 -> 4
    await set(configA.id, 1, 1);
    await change(snapshot(locationA, 1), snapshot(locationA, 4));
    const c = await step(configA.id);
    await checkState(configA.id);
    // (d) same definition, quantity 4 -> 1
    await change(snapshot(locationA, 4), snapshot(locationA, 1));
    const d = await step(configA.id);
    await checkState(configA.id);
    // (e) move A -> B
    await set(configA.id, 2, 1);
    await set(configB.id, 0, 0);
    await change(snapshot(locationA, 2), snapshot(locationB, 2));
    const e = { from: await step(configA.id), to: await step(configB.id) };
    await checkState(configA.id);
    await checkState(configB.id);
    // (f) guard on both columns: row 2/1, leave with quantity 5
    await set(configA.id, 2, 1);
    const fRun = await captureOutput(() => change(snapshot(locationA, 5), null));
    const fLog = parseJsonLines(fRun.output).find((entry) => entry.level === "error");
    const f = { changed: fRun.value.changed, row: await step(configA.id), context: (fLog?.context as Record<string, unknown> | undefined) ?? null };
    // (g) guard on the instance half alone: row 5/0 (corrupt), leave with quantity 3
    await set(configA.id, 5, 0);
    const gRun = await captureOutput(() => change(snapshot(locationA, 3), null));
    const g = { changed: gRun.value.changed, row: await step(configA.id) };

    p7Hooks = { a, b, c, d, e, f, g, thresholdsOfA: configA.thresholds, statesChecked };
    return p7Hooks;
  };

  const expectStep = (label: string, actual: HookStep, quantity: number, instanceCount: number): void => {
    assert(
      actual.quantity === quantity && actual.instanceCount === instanceCount,
      `${label}: expected ${quantity}/${instanceCount}, got ${actual.quantity}/${actual.instanceCount}`,
    );
  };
  const verifyP7C3a = async (): Promise<void> => expectStep("P7.C3(a) enter", (await runP7Hooks()).a, 3, 1);
  const verifyP7C3b = async (): Promise<void> => expectStep("P7.C3(b) leave", (await runP7Hooks()).b, 0, 0);
  const verifyP7C3c = async (): Promise<void> => expectStep("P7.C3(c) same +3", (await runP7Hooks()).c, 4, 1);
  const verifyP7C3d = async (): Promise<void> => expectStep("P7.C3(d) same -3", (await runP7Hooks()).d, 1, 1);
  const verifyP7C3e = async (): Promise<void> => {
    const { e } = await runP7Hooks();
    expectStep("P7.C3(e) source", e.from, 0, 0);
    expectStep("P7.C3(e) target", e.to, 2, 1);
  };
  const verifyP7C3f = async (): Promise<void> => {
    const { f } = await runP7Hooks();
    assert(f.changed === false, "P7.C3(f): over-decrement was not refused");
    expectStep("P7.C3(f) row untouched", f.row, 2, 1);
    assert(f.context !== null, "P7.C3(f): refusal was not logged");
    assert(f.context.currentQuantity === 2 && f.context.currentInstanceCount === 1, `P7.C3(f): log context ${JSON.stringify(f.context)} does not name both current values`);
    assert(f.context.requestedDecrement === 5 && f.context.requestedInstanceDecrement === 1, "P7.C3(f): log context does not name both requested decrements");
  };
  const verifyP7C3g = async (): Promise<void> => {
    const { g } = await runP7Hooks();
    assert(g.changed === false, "P7.C3(g): instance-half refusal did not fire");
    expectStep("P7.C3(g) row untouched", g.row, 5, 0);
  };
  const verifyP7C3h = async (): Promise<void> => {
    const { statesChecked } = await runP7Hooks();
    assert(statesChecked === 6, `P7.C3(h): expected 6 state checks across (a)-(e), got ${statesChecked}`);
  };

  // ---------------------------------------------------------------------------
  // LP — prefix location patterns ("LC%"). A pattern definition draws items from
  // many locations at once, which is exactly what the old per-location
  // reconciliation unit could not see.
  // ---------------------------------------------------------------------------

  type LpScenario = {
    afterFirst: LocationStock;
    afterSecond: LocationStock;
    exact: LocationStock;
    pattern: LocationStock;
  };
  let lpScenario: LpScenario | null = null;
  const runLpScenario = async (): Promise<LpScenario> => {
    if (lpScenario) {
      return lpScenario;
    }

    // The label is unique per run, so no other case's location can sit under
    // this prefix and the counts below are the only items in play.
    const blockPrefix = location("lp");
    const [pattern, exact] = await createConfigurations(shopId, [
      { location: `${blockPrefix}%`, itemCategory, properties: {}, thresholds },
      { location: `${blockPrefix}A1`, itemCategory, properties: {}, thresholds },
    ]);
    assert(pattern !== undefined && exact !== undefined, "LP configs were not created");

    await createItem({ shopId, productId: `${blockPrefix}-a1`, location: `${blockPrefix}A1`, itemCategory, quantity: 2, properties: {} });
    await createItem({ shopId, productId: `${blockPrefix}-a2`, location: `${blockPrefix}A2`, itemCategory, quantity: 3, properties: {} });
    await createItem({ shopId, productId: `${blockPrefix}-a9`, location: `${blockPrefix}A9`, itemCategory, quantity: 4, properties: {} });
    // Outside the prefix: it must reach neither definition.
    await createItem({ shopId, productId: `${blockPrefix}-out`, location: `ZZ${blockPrefix}`, itemCategory, quantity: 9, properties: {} });

    await reconcileCategory(shopId, itemCategory);
    const afterFirst = await findConfig(pattern.id);
    // The regression: a second sweep must not walk the pattern back to zero.
    await reconcileCategory(shopId, itemCategory);

    lpScenario = {
      afterFirst,
      afterSecond: await findConfig(pattern.id),
      exact: await findConfig(exact.id),
      pattern: await findConfig(pattern.id),
    };
    return lpScenario;
  };

  const verifyLp1a = async (): Promise<void> => {
    const { afterFirst } = await runLpScenario();
    assert(
      afterFirst.quantity === 7 && afterFirst.instanceCount === 2,
      `LP1(a): the pattern should hold A2+A9 = 7/2, got ${afterFirst.quantity}/${afterFirst.instanceCount}`,
    );
  };

  const verifyLp1b = async (): Promise<void> => {
    const { afterSecond } = await runLpScenario();
    assert(
      afterSecond.quantity === 7 && afterSecond.instanceCount === 2,
      `LP1(b): a second sweep zeroed the pattern definition to ${afterSecond.quantity}/${afterSecond.instanceCount}`,
    );
  };

  const verifyLp1c = async (): Promise<void> => {
    const { exact } = await runLpScenario();
    assert(
      exact.quantity === 2 && exact.instanceCount === 1,
      `LP1(c): the exact definition should keep A1 alone at 2/1, got ${exact.quantity}/${exact.instanceCount}`,
    );
  };

  const verifyLp2 = async (): Promise<void> => {
    // Scan-time precedence, through the incremental path rather than the recount:
    // an exact definition takes the item even when the pattern carries properties.
    const blockPrefix = location("lp2");
    const [pattern, exact] = await createConfigurations(shopId, [
      { location: `${blockPrefix}%`, itemCategory, properties: { wood_type: "Teak" }, thresholds },
      { location: `${blockPrefix}A1`, itemCategory, properties: {}, thresholds },
    ]);
    assert(pattern !== undefined && exact !== undefined, "LP2 configs were not created");

    const enter = (locationName: string) =>
      applyItemStockChange({
        shopId,
        before: null,
        after: { location: locationName, itemCategory, properties: { wood_type: "Teak" }, quantity: 5, isSold: false },
        operation: "location_move",
        itemIdentifiers: { productId: `${blockPrefix}-product` },
      });

    await enter(`${blockPrefix}A1`);
    const exactAfterA1 = await findConfig(exact.id);
    const patternAfterA1 = await findConfig(pattern.id);
    assert(
      exactAfterA1.quantity === 5 && exactAfterA1.instanceCount === 1,
      `LP2: the exact definition did not take the A1 item, got ${exactAfterA1.quantity}/${exactAfterA1.instanceCount}`,
    );
    assert(
      patternAfterA1.quantity === 0 && patternAfterA1.instanceCount === 0,
      `LP2: the pattern stole an item the exact definition owns, got ${patternAfterA1.quantity}/${patternAfterA1.instanceCount}`,
    );

    await enter(`${blockPrefix}A2`);
    const patternAfterA2 = await findConfig(pattern.id);
    assert(
      patternAfterA2.quantity === 5 && patternAfterA2.instanceCount === 1,
      `LP2: the pattern did not catch the A2 item, got ${patternAfterA2.quantity}/${patternAfterA2.instanceCount}`,
    );
  };

  // WG — wood groups. The group is derived from the item's FIRST wood_type
  // token, and a named wood outranks a group. Both must hold identically on the
  // absolute path (reconciliation) and the incremental one (a scan), or the two
  // drift apart the moment anything is recounted.
  const woodProperties = (wood: string): Record<string, string> => ({
    wood_type: wood,
    country: "Denmark",
    years: "1960-1970s",
  });

  const woodItems: readonly { suffix: string; wood: string; quantity: number }[] = [
    { suffix: "teak", wood: "Teak", quantity: 2 },
    { suffix: "mahogany", wood: "Mahogany", quantity: 3 },
    // Both definitions match this one: the group on the first wood (Santos
    // Rosewood is Dark), the named definition on the second (Teak). The named
    // wood wins.
    { suffix: "rosewood-teak", wood: "Santos Rosewood, Teak", quantity: 4 },
    // First wood is Teak, so the Dark group misses it entirely.
    { suffix: "teak-mahogany", wood: "Teak, Mahogany", quantity: 5 },
    // Ungrouped and not Teak: owned by neither definition. `Other` is the live
    // shop's only wood_type value outside every group.
    { suffix: "other", wood: "Other", quantity: 6 },
  ];

  const verifyWg1 = async (): Promise<void> => {
    const woodLocation = location("wg1");
    const [named, group] = await createConfigurations(shopId, [
      { location: woodLocation, itemCategory, properties: { wood_type: "Teak" }, thresholds },
      // Deliberately the BROADER wood with the NARROWER everything-else: on the
      // property ladder alone this group outranks the bare named wood (weight 6
      // to 2). Only the wood rung gives the shared item to the named wood, so
      // these numbers move the moment that rung is removed.
      {
        location: woodLocation,
        itemCategory,
        properties: { wood_group: "Dark", country: "Denmark", years: "1960-1970s" },
        thresholds,
      },
    ]);
    assert(named !== undefined && group !== undefined, "WG1 configs were not created");

    for (const item of woodItems) {
      await createItem({
        shopId,
        productId: `wg1-${item.suffix}`,
        location: woodLocation,
        itemCategory,
        quantity: item.quantity,
        properties: woodProperties(item.wood),
      });
    }

    await reconcileCategory(shopId, itemCategory);
    const namedRow = await findConfig(named.id);
    const groupRow = await findConfig(group.id);

    assert(
      namedRow.quantity === 11 && namedRow.instanceCount === 3,
      `WG1: the named wood should hold Teak + Rosewood/Teak + Teak/Mahogany = 11/3, got ${namedRow.quantity}/${namedRow.instanceCount}`,
    );
    assert(
      groupRow.quantity === 3 && groupRow.instanceCount === 1,
      `WG1: the Dark group should hold Mahogany alone at 3/1, got ${groupRow.quantity}/${groupRow.instanceCount}`,
    );

    // Idempotent: a second sweep must land on the same numbers.
    await reconcileCategory(shopId, itemCategory);
    const namedAgain = await findConfig(named.id);
    const groupAgain = await findConfig(group.id);
    assert(
      namedAgain.quantity === 11 && namedAgain.instanceCount === 3,
      `WG1: a second sweep moved the named wood to ${namedAgain.quantity}/${namedAgain.instanceCount}`,
    );
    assert(
      groupAgain.quantity === 3 && groupAgain.instanceCount === 1,
      `WG1: a second sweep moved the group to ${groupAgain.quantity}/${groupAgain.instanceCount}`,
    );
  };

  const verifyWg2 = async (): Promise<void> => {
    // The same five items, but through the incremental scan path. The totals
    // must come out identical to WG1's recount.
    const woodLocation = location("wg2");
    const [named, group] = await createConfigurations(shopId, [
      { location: woodLocation, itemCategory, properties: { wood_type: "Teak" }, thresholds },
      {
        location: woodLocation,
        itemCategory,
        properties: { wood_group: "Dark", country: "Denmark", years: "1960-1970s" },
        thresholds,
      },
    ]);
    assert(named !== undefined && group !== undefined, "WG2 configs were not created");

    for (const item of woodItems) {
      await applyItemStockChange({
        shopId,
        before: null,
        after: {
          location: woodLocation,
          itemCategory,
          properties: woodProperties(item.wood),
          quantity: item.quantity,
          isSold: false,
        },
        operation: "location_move",
        itemIdentifiers: { productId: `wg2-${item.suffix}` },
      });
    }

    const namedRow = await findConfig(named.id);
    const groupRow = await findConfig(group.id);
    assert(
      namedRow.quantity === 11 && namedRow.instanceCount === 3,
      `WG2: the scan path gave the named wood ${namedRow.quantity}/${namedRow.instanceCount}, not 11/3 as the recount does`,
    );
    assert(
      groupRow.quantity === 3 && groupRow.instanceCount === 1,
      `WG2: the scan path gave the group ${groupRow.quantity}/${groupRow.instanceCount}, not 3/1 as the recount does`,
    );
  };

  const verifyWg3 = async (): Promise<void> => {
    // An item leaving must be taken off the same definition that caught it —
    // the guarded decrement resolves the group again, so a mismatch here would
    // strand the count above zero.
    const woodLocation = location("wg3");
    const [group] = await createConfigurations(shopId, [
      { location: woodLocation, itemCategory, properties: { wood_group: "Dark" }, thresholds },
    ]);
    assert(group !== undefined, "WG3 config was not created");

    const item = {
      location: woodLocation,
      itemCategory,
      properties: { wood_type: "Santos Rosewood, Oak" },
      quantity: 4,
      isSold: false,
    };
    await applyItemStockChange({
      shopId,
      before: null,
      after: item,
      operation: "location_move",
      itemIdentifiers: { productId: "wg3-product" },
    });
    const entered = await findConfig(group.id);
    assert(
      entered.quantity === 4 && entered.instanceCount === 1,
      `WG3: the group did not take the entering item, got ${entered.quantity}/${entered.instanceCount}`,
    );

    await applyItemStockChange({
      shopId,
      before: item,
      after: null,
      operation: "location_move",
      itemIdentifiers: { productId: "wg3-product" },
    });
    const left = await findConfig(group.id);
    assert(
      left.quantity === 0 && left.instanceCount === 0,
      `WG3: the leaving item did not come off the group, got ${left.quantity}/${left.instanceCount}`,
    );
  };

  const cases: readonly { id: string; run: () => Promise<void> }[] = [
    { id: "C1(a)", run: verifyC1 },
    { id: "C1(b)", run: verifyC1 },
    { id: "C1(c)", run: verifyC1 },
    { id: "C2(a)", run: verifyC2 },
    { id: "C2(b)", run: verifyC2Refusal },
    { id: "C2(c)", run: verifyC2Refusal },
    { id: "C2(d)", run: verifyC2Increment },
    { id: "C3(a)", run: verifyC3 },
    { id: "C3(b)", run: verifyC3 },
    { id: "C3(c)", run: verifyC3 },
    { id: "C3(d)", run: verifyC3 },
    { id: "C3(e)", run: verifyC3 },
    { id: "C4(a)", run: verifyC4a },
    { id: "C4(b)", run: verifyC4b },
    { id: "C4(c)", run: verifyC4c },
    { id: "C4(d)", run: verifyC4d },
    { id: "C5(a)", run: verifyC5 },
    { id: "C5(b)", run: verifyC5 },
    { id: "C6(a)", run: verifyC6 },
    { id: "C6(b)", run: verifyC6 },
    { id: "P7.C2(a)", run: verifyP7C2a },
    { id: "P7.C2(b)", run: verifyP7C2b },
    { id: "P7.C2(c)", run: verifyP7C2c },
    { id: "P7.C2(d)", run: verifyP7C2d },
    { id: "P7.C2(e)", run: verifyP7C2e },
    { id: "P7.C3(a)", run: verifyP7C3a },
    { id: "P7.C3(b)", run: verifyP7C3b },
    { id: "P7.C3(c)", run: verifyP7C3c },
    { id: "P7.C3(d)", run: verifyP7C3d },
    { id: "P7.C3(e)", run: verifyP7C3e },
    { id: "P7.C3(f)", run: verifyP7C3f },
    { id: "P7.C3(g)", run: verifyP7C3g },
    { id: "P7.C3(h)", run: verifyP7C3h },
    { id: "LP1(a)", run: verifyLp1a },
    { id: "LP1(b)", run: verifyLp1b },
    { id: "LP1(c)", run: verifyLp1c },
    { id: "LP2", run: verifyLp2 },
    { id: "WG1", run: verifyWg1 },
    { id: "WG2", run: verifyWg2 },
    { id: "WG3", run: verifyWg3 },
  ];

  let failures = 0;
  try {
    for (const verificationCase of cases) {
      try {
        await verificationCase.run();
        console.log(`PASS ${verificationCase.id}`);
      } catch (error) {
        failures += 1;
        console.log(`FAIL ${verificationCase.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    if (createdStockIds.length > 0) {
      await prisma.locationStock.deleteMany({ where: { id: { in: createdStockIds } } });
    }
    if (createdScanHistoryIds.length > 0) {
      await prisma.scanHistory.deleteMany({ where: { id: { in: createdScanHistoryIds } } });
    }
    for (const temporaryShopId of createdShopIds) {
      await prisma.shop.delete({ where: { id: temporaryShopId } });
    }
    await prisma.$disconnect();
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
};

void main().catch((error: unknown) => {
  if (process.exitCode === 3) {
    return;
  }
  console.log(`FAIL setup: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
