import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

import type {
  LocationStock,
  LocationStockCreateData,
  StockReportDto,
  StockReportEntry,
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

const thresholds = [
  { state: "low_in_stock" as const, thresholdQuantity: 1 },
  { state: "medium_in_stock" as const, thresholdQuantity: 3 },
  { state: "normal_in_stock" as const, thresholdQuantity: 5 },
];

type VerificationCreateInput = Omit<
  LocationStockCreateData,
  "createdByUsername" | "updatedByUsername"
>;

type FixtureDefinition = Omit<VerificationCreateInput, "thresholds">;
type FixtureDefinitionWithRow = FixtureDefinition & { row: LocationStock };

type Fixture = {
  definitions: Record<string, FixtureDefinitionWithRow>;
  primaryDefinitionNames: string[];
  otherShopDefinition: FixtureDefinitionWithRow;
};

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
    throw new Error("SHOP_ID must be set for stock report verification");
  }

  const { prisma } = await import("../src/shared/database/prisma-client.js");
  const { locationStockRepository } = await import(
    "../src/modules/stock/repositories/location-stock.repository.js"
  );
  const { getStockReportQuery } = await import(
    "../src/modules/stock/queries/get-stock-report.query.js"
  );

  const createdStockIds: string[] = [];
  const createdShopIds: string[] = [];
  const fixturePrefix = `__P5_VERIFY__${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const location = (label: string): string => `${fixturePrefix}_${label}`;
  const createConfigurations = async (
    targetShopId: string,
    inputs: readonly VerificationCreateInput[],
  ): Promise<LocationStock[]> => {
    const rows = await locationStockRepository.createMany(
      targetShopId,
      inputs.map((configuration) => ({
        ...configuration,
        createdByUsername: "p5-verification",
        updatedByUsername: "p5-verification",
      })),
    );
    createdStockIds.push(...rows.map((row) => row.id));
    return rows;
  };

  const buildFixture = async (): Promise<Fixture> => {
    const definitions: Record<string, FixtureDefinition> = {
      sameCriteriaA: {
        location: location("same-criteria-a"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: "Teak" },
      },
      sameCriteriaB: {
        location: location("same-criteria-b"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: "Teak" },
      },
      scalarCriteria: {
        location: location("scalar-criteria"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: "Teak" },
      },
      arrayCriteria: {
        location: location("array-criteria"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["TEAK"] },
      },
      differentCriteria: {
        location: location("different-criteria"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: "Oak" },
      },
      differentCategory: {
        location: location("different-category"),
        itemCategory: "Easy Chairs",
        properties: { wood_type: "Teak" },
      },
      catchAllA: {
        location: location("catch-all-a"),
        itemCategory: "Dining Chairs",
        properties: {},
      },
      catchAllB: {
        location: location("catch-all-b"),
        itemCategory: "Dining Chairs",
        properties: {},
      },
      orderedArrayA: {
        location: location("ordered-array-a"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["Teak", "Oak"] },
      },
      orderedArrayB: {
        location: location("ordered-array-b"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: ["Oak", "Teak"] },
      },
      zeroMatch: {
        location: location("zero-match"),
        itemCategory: "Dining Chairs",
        properties: { upholstery: "Up" },
      },
    };

    const rows = await createConfigurations(
      shopId,
      Object.values(definitions).map((definition) => ({
        ...definition,
        thresholds,
      })),
    );
    const names = Object.keys(definitions);
    const definitionRows = Object.fromEntries(
      names.map((name, index) => {
        const definition = definitions[name];
        const row = rows[index];
        assert(definition !== undefined && row !== undefined, `fixture row ${name} was not created`);
        return [name, { ...definition, row }];
      }),
    ) as Fixture["definitions"];

    const nonZeroRow = definitionRows.sameCriteriaA?.row;
    assert(nonZeroRow !== undefined, "non-zero fixture row was not created");
    await prisma.locationStock.update({
      where: { id: nonZeroRow.id },
      data: { quantity: 2, stockState: "medium_in_stock" },
    });

    const otherShop = await prisma.shop.create({
      data: { shopDomain: `${fixturePrefix.toLowerCase()}.example` },
    });
    createdShopIds.push(otherShop.id);
    const [otherShopRow] = await createConfigurations(otherShop.id, [
      {
        location: location("other-shop"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: "Teak" },
        thresholds,
      },
    ]);
    assert(otherShopRow !== undefined, "other-shop fixture row was not created");

    return {
      definitions: definitionRows,
      primaryDefinitionNames: names,
      otherShopDefinition: {
        location: location("other-shop"),
        itemCategory: "Dining Chairs",
        properties: { wood_type: "Teak" },
        row: otherShopRow,
      },
    };
  };

  const matchesDefinition = (
    entry: StockReportEntry,
    definition: FixtureDefinitionWithRow,
  ): boolean =>
    entry.location === definition.location &&
    entry.itemCategory === definition.itemCategory &&
    JSON.stringify(entry.properties) === JSON.stringify(definition.row.properties);

  const entryFor = (
    report: StockReportDto,
    definition: FixtureDefinitionWithRow,
  ): StockReportEntry | undefined =>
    report.entries.find((entry) => matchesDefinition(entry, definition));

  const verifyC1a = (report: StockReportDto, fixture: Fixture): void => {
    assert(
      report.entries.length === fixture.primaryDefinitionNames.length,
      `C1(a): expected ${fixture.primaryDefinitionNames.length} report entries, got ${report.entries.length}`,
    );
    for (const name of fixture.primaryDefinitionNames) {
      const definition = fixture.definitions[name];
      assert(definition !== undefined, `C1(a): fixture definition ${name} is missing`);
      const matches = report.entries.filter((entry) => matchesDefinition(entry, definition));
      assert(matches.length === 1, `C1(a): definition ${name} appeared ${matches.length} times`);
    }
  };

  const verifyC1b = (report: StockReportDto, fixture: Fixture): void => {
    const definition = fixture.definitions.zeroMatch;
    assert(definition !== undefined, "C1(b): zero-match fixture definition is missing");
    const entry = entryFor(report, definition);
    assert(entry !== undefined, "C1(b): zero-match definition was omitted");
    assert(entry.quantity === 0, `C1(b): expected zero quantity, got ${entry.quantity}`);
    assert(entry.stockState === "out_of_stock", `C1(b): expected out_of_stock, got ${entry.stockState}`);
  };

  const verifyC1c = (report: StockReportDto, fixture: Fixture): void => {
    const dining = fixture.definitions.sameCriteriaA;
    const easy = fixture.definitions.differentCategory;
    assert(dining !== undefined && easy !== undefined, "C1(c): spanning fixtures are missing");
    assert(entryFor(report, dining) !== undefined, "C1(c): Dining Chairs definition was omitted");
    assert(entryFor(report, easy) !== undefined, "C1(c): Easy Chairs definition was omitted");
    assert(dining.location !== easy.location, "C1(c): fixture did not span locations");
  };

  const verifyC1d = (report: StockReportDto, fixture: Fixture): void => {
    assert(
      entryFor(report, fixture.otherShopDefinition) === undefined,
      "C1(d): a definition belonging to another shop appeared in the report",
    );
  };

  const verifyC2a = (report: StockReportDto, fixture: Fixture): void => {
    const first = fixture.definitions.sameCriteriaA;
    const second = fixture.definitions.sameCriteriaB;
    assert(first !== undefined && second !== undefined, "C2(a): equal-criteria fixtures are missing");
    const firstEntry = entryFor(report, first);
    const secondEntry = entryFor(report, second);
    assert(firstEntry !== undefined && secondEntry !== undefined, "C2(a): equal-criteria definition was omitted");
    assert(firstEntry.mergeKey === secondEntry.mergeKey, "C2(a): equal criteria at different locations produced different mergeKeys");
  };

  const verifyC2b = (report: StockReportDto, fixture: Fixture): void => {
    const scalar = fixture.definitions.scalarCriteria;
    const array = fixture.definitions.arrayCriteria;
    assert(scalar !== undefined && array !== undefined, "C2(b): scalar/array fixtures are missing");
    const scalarEntry = entryFor(report, scalar);
    const arrayEntry = entryFor(report, array);
    assert(scalarEntry !== undefined && arrayEntry !== undefined, "C2(b): scalar/array definition was omitted");
    assert(scalarEntry.mergeKey === arrayEntry.mergeKey, "C2(b): scalar and array criteria produced different mergeKeys");
  };

  const verifyC2c = (report: StockReportDto, fixture: Fixture): void => {
    const sameCategory = fixture.definitions.sameCriteriaA;
    const differentCriteria = fixture.definitions.differentCriteria;
    assert(sameCategory !== undefined && differentCriteria !== undefined, "C2(c): same-category fixtures are missing");
    const firstEntry = entryFor(report, sameCategory);
    const secondEntry = entryFor(report, differentCriteria);
    assert(firstEntry !== undefined && secondEntry !== undefined, "C2(c): same-category definition was omitted");
    assert(firstEntry.mergeKey !== secondEntry.mergeKey, "C2(c): different criteria in one category collided");
  };

  const verifyC2d = (report: StockReportDto, fixture: Fixture): void => {
    const first = fixture.definitions.sameCriteriaA;
    const second = fixture.definitions.differentCategory;
    assert(first !== undefined && second !== undefined, "C2(d): category fixtures are missing");
    const firstEntry = entryFor(report, first);
    const secondEntry = entryFor(report, second);
    assert(firstEntry !== undefined && secondEntry !== undefined, "C2(d): category definition was omitted");
    assert(firstEntry.mergeKey !== secondEntry.mergeKey, "C2(d): different categories with identical criteria collided");
  };

  const verifyC2e = (report: StockReportDto, fixture: Fixture): void => {
    const first = fixture.definitions.catchAllA;
    const second = fixture.definitions.catchAllB;
    assert(first !== undefined && second !== undefined, "C2(e): catch-all fixtures are missing");
    const firstEntry = entryFor(report, first);
    const secondEntry = entryFor(report, second);
    assert(firstEntry !== undefined && secondEntry !== undefined, "C2(e): catch-all definition was omitted");
    assert(firstEntry.mergeKey === secondEntry.mergeKey, "C2(e): catch-all criteria at different locations produced different mergeKeys");
  };

  const verifyC2f = (report: StockReportDto, fixture: Fixture): void => {
    const first = fixture.definitions.orderedArrayA;
    const second = fixture.definitions.orderedArrayB;
    assert(first !== undefined && second !== undefined, "C2(f): ordered-array fixtures are missing");
    const firstEntry = entryFor(report, first);
    const secondEntry = entryFor(report, second);
    assert(firstEntry !== undefined && secondEntry !== undefined, "C2(f): ordered-array definition was omitted");
    assert(firstEntry.mergeKey === secondEntry.mergeKey, "C2(f): member order changed the mergeKey");
  };

  const verifyC3a = (report: StockReportDto): void => {
    const expectedKeys = [
      "itemCategory",
      "location",
      "mergeKey",
      "properties",
      "quantity",
      "stockState",
    ];
    for (const entry of report.entries) {
      equalJson(Object.keys(entry).sort(), expectedKeys);
    }
  };

  const verifyC3b = (report: StockReportDto, fixture: Fixture): void => {
    const definition = fixture.definitions.scalarCriteria;
    assert(definition !== undefined, "C3(b): canonical-criteria fixture is missing");
    const entry = entryFor(report, definition);
    assert(entry !== undefined, "C3(b): canonical-criteria definition was omitted");
    equalJson(entry.properties, { wood_type: ["teak"] });
  };

  const verifyC3c = async (fixture: Fixture): Promise<void> => {
    const unparameterized = await getStockReportQuery(shopId);
    const parameterized = await (getStockReportQuery as unknown as (
      id: string,
      query: Record<string, unknown>,
    ) => Promise<StockReportDto>)(shopId, {
      states: "out_of_stock",
      groupByLocation: true,
    });
    assert(
      JSON.stringify(parameterized) === JSON.stringify(unparameterized),
      `C3(c): ignored parameters changed the payload for ${fixture.primaryDefinitionNames.length} definitions`,
    );
  };

  const verifyC3d = async (): Promise<void> => {
    const routeSource = await readFile(
      resolve(process.cwd(), "src/modules/stock/routes/stock.routes.ts"),
      "utf8",
    );
    const serverSource = await readFile(resolve(process.cwd(), "src/server.ts"), "utf8");
    assert(routeSource.includes('stockRouter.get("/report", getStockReportController)'), "C3(d): report route is not registered");
    assert(serverSource.includes('app.use("/stock", stockRouter)'), "C3(d): bare stock mount is missing");
    assert(serverSource.includes('app.use("/api/stock", stockRouter)'), "C3(d): API stock mount is missing");
  };

  let fixture: Fixture | undefined;
  let report: StockReportDto | undefined;
  const getFixture = async (): Promise<Fixture> => (fixture ??= await buildFixture());
  const getReport = async (): Promise<StockReportDto> => {
    await getFixture();
    report ??= await getStockReportQuery(shopId);
    return report;
  };

  const cases: readonly { id: string; run: () => Promise<void> }[] = [
    { id: "C1(a)", run: async () => verifyC1a(await getReport(), await getFixture()) },
    { id: "C1(b)", run: async () => verifyC1b(await getReport(), await getFixture()) },
    { id: "C1(c)", run: async () => verifyC1c(await getReport(), await getFixture()) },
    { id: "C1(d)", run: async () => verifyC1d(await getReport(), await getFixture()) },
    { id: "C2(a)", run: async () => verifyC2a(await getReport(), await getFixture()) },
    { id: "C2(b)", run: async () => verifyC2b(await getReport(), await getFixture()) },
    { id: "C2(c)", run: async () => verifyC2c(await getReport(), await getFixture()) },
    { id: "C2(d)", run: async () => verifyC2d(await getReport(), await getFixture()) },
    { id: "C2(e)", run: async () => verifyC2e(await getReport(), await getFixture()) },
    { id: "C2(f)", run: async () => verifyC2f(await getReport(), await getFixture()) },
    { id: "C3(a)", run: async () => verifyC3a(await getReport()) },
    { id: "C3(b)", run: async () => verifyC3b(await getReport(), await getFixture()) },
    { id: "C3(c)", run: async () => verifyC3c(await getFixture()) },
    { id: "C3(d)", run: verifyC3d },
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
    for (const createdShopId of createdShopIds) {
      await prisma.shop.delete({ where: { id: createdShopId } });
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
