type Criteria = Record<string, string[] | null>;
type CriteriaInput = Record<string, string | string[] | null>;

type Candidate = {
  id: string;
  createdAt: Date;
  criteria: Criteria;
};

type DomainModules = {
  STOCK_STATES: readonly string[];
  CONFIGURABLE_THRESHOLD_STATES: readonly string[];
  calculateStockState: (quantity: number, thresholds: readonly { state: string; thresholdQuantity: number }[]) => string;
  validateThresholds: (thresholds: readonly { state: string; thresholdQuantity: number }[]) => void;
  normalizeThresholdInputs: (thresholds: readonly { state: string; thresholdQuantity: number | null }[]) => { state: string; thresholdQuantity: number }[];
  tokenizePropertyValue: (stored: string) => Set<string>;
  normalizeCriteria: (input: CriteriaInput) => Criteria;
  canonicalCriteriaString: (criteria: Criteria) => string;
  matchesCriteria: (itemProperties: Record<string, string> | null, criteria: Criteria) => boolean;
  specificityScore: (criteria: Criteria) => readonly [number, number, number];
  resolveBestMatch: (candidates: readonly Candidate[], itemProperties: Record<string, string> | null) => Candidate | null;
  findConflict: (candidate: Criteria, siblings: readonly { id: string; criteria: Criteria }[]) => { conflictingId: string } | null;
  allocateGroup: (candidates: readonly Candidate[], items: readonly { quantity: number; properties: Record<string, string> | null }[]) => Map<string, { quantity: number; instanceCount: number }>;
  ITEM_PROPERTY_OPTIONS: readonly { key: string; values: readonly string[]; categories: "universal" | readonly string[] }[];
  getPropertyOptionsForCategory: (itemCategory: string) => readonly { key: string; values: readonly string[]; categories: "universal" | readonly string[] }[];
};

type VerificationCase = {
  id: string;
  detail?: string;
  run: (modules: DomainModules) => void | Promise<void>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const equalJson = (actual: unknown, expected: unknown): void => {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
};

const setValues = (value: Set<string>): string[] => [...value].sort();

const expectValidationError = (operation: () => unknown): void => {
  try {
    operation();
  } catch (error) {
    assert(
      typeof error === "object" && error !== null && "code" in error && error.code === "VALIDATION_ERROR",
      `expected ValidationError, got ${error instanceof Error ? error.constructor.name : String(error)}`,
    );
    return;
  }
  throw new Error("expected ValidationError to be thrown");
};

const criteria = (modules: DomainModules, input: CriteriaInput): Criteria => modules.normalizeCriteria(input);

const candidate = (modules: DomainModules, id: string, input: CriteriaInput, createdAt: string): Candidate => ({
  id,
  createdAt: new Date(createdAt),
  criteria: criteria(modules, input),
});

const winnerId = (
  modules: DomainModules,
  candidates: readonly Candidate[],
  itemProperties: Record<string, string> | null,
): string | null => modules.resolveBestMatch(candidates, itemProperties)?.id ?? null;

const conflictId = (
  modules: DomainModules,
  input: CriteriaInput,
  siblings: readonly { id: string; criteria: CriteriaInput }[],
): string | null =>
  modules.findConflict(
    criteria(modules, input),
    siblings.map((sibling) => ({ id: sibling.id, criteria: criteria(modules, sibling.criteria) })),
  )?.conflictingId ?? null;

const expectedOptions = [
  {
    key: "wood_type",
    values: ["Beech", "Birch", "Cherry", "Elm", "Mahogany", "Oak", "Santos Rosewood", "Teak", "Walnut"],
    categories: "universal" as const,
  },
  {
    key: "years",
    values: ["1950-1960s", "1960-1970s", "1970-1980s", "1980-1990s", "Early 20th century furniture"],
    categories: "universal" as const,
  },
  {
    key: "weight_definition",
    values: ["1-20 kg", "21-40 kg", "41-60 kg", "61+ kg"],
    categories: "universal" as const,
  },
  {
    key: "country",
    values: ["Denmark", "Sweden", "Germany", "United Kingdom", "Italy", "Netherland"],
    categories: "universal" as const,
  },
  {
    key: "shape",
    values: ["Oval", "Rectangular", "Round", "Square"],
    categories: ["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"],
  },
  {
    key: "extension_type",
    values: ["Inside Extension", "Outside Extension"],
    categories: ["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"],
  },
  {
    key: "extension_quantity",
    values: ["1", "2", "3", "4"],
    categories: ["Dining Tables", "Bedside Tables", "Coffee Tables", "Side Tables", "Hall Tables", "Nest Of Tables"],
  },
  {
    key: "upholstery",
    values: ["Down", "Up & Down", "None"],
    categories: ["Dining Chairs", "Easy Chairs", "Armchairs"],
  },
  {
    key: "quantity",
    values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "12"],
    categories: ["Dining Chairs", "Easy Chairs", "Armchairs"],
  },
] as const;

const cases: readonly VerificationCase[] = [
  {
    id: "C2(a)",
    run: (m) => equalJson(setValues(m.tokenizePropertyValue("Teak, Beech")), ["beech", "teak"]),
  },
  {
    id: "C2(b)",
    run: (m) => equalJson(setValues(m.tokenizePropertyValue("Teak,Walnut")), ["teak", "walnut"]),
  },
  {
    id: "C2(c)",
    run: (m) => equalJson(setValues(m.tokenizePropertyValue("Oval/Rectangular")), ["oval", "rectangular"]),
  },
  {
    id: "C2(d)",
    run: (m) => equalJson(setValues(m.tokenizePropertyValue("Up & Down")), ["up & down"]),
  },
  {
    id: "C2(e)",
    run: (m) => equalJson(setValues(m.tokenizePropertyValue("1-20 kg")), ["1-20 kg"]),
  },
  {
    id: "C2(f)",
    run: (m) => equalJson(setValues(m.tokenizePropertyValue("  Teak  ")), ["teak"]),
  },
  {
    id: "C3(a)",
    run: (m) => assert(m.canonicalCriteriaString(criteria(m, { wood_type: "Teak" })) === m.canonicalCriteriaString(criteria(m, { wood_type: ["Teak"] })), "scalar and array forms differ"),
  },
  {
    id: "C3(b)",
    run: (m) => equalJson(criteria(m, { wood_type: ["Teak", "teak", "Oak"] }), { wood_type: ["oak", "teak"] }),
  },
  {
    id: "C3(c)",
    run: (m) => assert(criteria(m, { upholstery: null }).upholstery === null, "wildcard was not preserved"),
  },
  {
    id: "C3(d)",
    run: (m) => assert(m.canonicalCriteriaString(criteria(m, {})) === "{}", "empty criteria was not preserved"),
  },
  {
    id: "C3(e)",
    run: (m) => assert(m.canonicalCriteriaString({ wood_type: ["teak"], shape: ["round"] }) === m.canonicalCriteriaString({ shape: ["round"], wood_type: ["teak"] }), "key order changed the canonical string"),
  },
  {
    id: "C3(f)",
    detail: "empty array",
    run: (m) => expectValidationError(() => m.normalizeCriteria({ key: [] })),
  },
  {
    id: "C3(f)",
    detail: "blank scalar",
    run: (m) => expectValidationError(() => m.normalizeCriteria({ key: ["  "] })),
  },
  {
    id: "C4(a)",
    run: (m) => assert(m.matchesCriteria({ wood_type: "Teak, Beech" }, criteria(m, { wood_type: ["teak"] })), "tokenized membership did not match"),
  },
  {
    id: "C4(b)",
    run: (m) => {
      const match = criteria(m, { wood_type: ["teak", "mahogany"] });
      assert(m.matchesCriteria({ wood_type: "Mahogany" }, match), "multi-value criterion missed Mahogany");
      assert(!m.matchesCriteria({ wood_type: "Oak" }, match), "multi-value criterion matched Oak");
    },
  },
  {
    id: "C4(c)",
    run: (m) => assert(m.matchesCriteria({ upholstery: "Up & Down" }, criteria(m, { upholstery: null })), "wildcard did not match a present key"),
  },
  {
    id: "C4(d)",
    run: (m) => assert(!m.matchesCriteria({ wood_type: "Teak" }, criteria(m, { upholstery: null })), "wildcard matched a missing key"),
  },
  {
    id: "C4(e)",
    run: (m) => assert(m.matchesCriteria(null, criteria(m, {})), "catch-all did not match null properties"),
  },
  {
    id: "C4(f)",
    run: (m) => assert(!m.matchesCriteria(null, criteria(m, { wood_type: "Teak" })), "non-empty criteria matched null properties"),
  },
  {
    id: "C5(a)",
    run: (m) => {
      const broad = candidate(m, "broad", { up: null }, "2026-01-01T00:00:00.000Z");
      const specific = candidate(m, "specific", { up: "Up", wood: "Teak" }, "2026-01-02T00:00:00.000Z");
      assert(winnerId(m, [broad, specific], { up: "Up", wood: "Teak" }) === "specific", "weight did not prefer the two-valued definition");
    },
  },
  {
    id: "C5(b)",
    run: (m) => {
      const broad = candidate(m, "broad", { up: null }, "2026-01-01T00:00:00.000Z");
      const specific = candidate(m, "specific", { up: ["Up", "Down"], wood: ["Teak", "Mahogany"] }, "2026-01-02T00:00:00.000Z");
      assert(winnerId(m, [broad, specific], { up: "Down", wood: "Mahogany" }) === "specific", "multi-value specificity did not win");
    },
  },
  {
    id: "C5(c)",
    run: (m) => {
      const exact = candidate(m, "exact", { up: "Up" }, "2026-01-02T00:00:00.000Z");
      const wildcards = candidate(m, "wildcards", { up: null, wood: null }, "2026-01-01T00:00:00.000Z");
      assert(winnerId(m, [wildcards, exact], { up: "Up", wood: "Teak" }) === "exact", "valued-key count did not break the weight tie");
    },
  },
  {
    id: "C5(d)",
    run: (m) => {
      const narrow = candidate(m, "narrow", { wood: ["Teak"] }, "2026-01-02T00:00:00.000Z");
      const broad = candidate(m, "broad", { wood: ["Teak", "Oak"] }, "2026-01-01T00:00:00.000Z");
      assert(winnerId(m, [broad, narrow], { wood: "Teak" }) === "narrow", "lower accepted-value count did not win");
    },
  },
  {
    id: "C5(e)",
    run: (m) => {
      const earlier = candidate(m, "earlier", { wood: ["Teak"] }, "2026-01-01T00:00:00.000Z");
      const later = candidate(m, "later", { wood: ["Teak"] }, "2026-01-02T00:00:00.000Z");
      assert(winnerId(m, [later, earlier], { wood: "Teak" }) === "earlier", "createdAt did not break the tie");
      const idA = candidate(m, "a", { wood: ["Teak"] }, "2026-01-01T00:00:00.000Z");
      const idB = candidate(m, "b", { wood: ["Teak"] }, "2026-01-01T00:00:00.000Z");
      assert(winnerId(m, [idB, idA], { wood: "Teak" }) === "a", "id did not break the final tie");
    },
  },
  {
    id: "C5(f)",
    run: (m) => {
      equalJson(m.specificityScore(criteria(m, {})), [0, 0, 0]);
      const catchAll = candidate(m, "catch-all", {}, "2026-01-01T00:00:00.000Z");
      const specific = candidate(m, "specific", { wood: "Teak" }, "2026-01-02T00:00:00.000Z");
      assert(winnerId(m, [catchAll, specific], { wood: "Teak" }) === "specific", "catch-all beat a more specific match");
    },
  },
  ...[
    [0, "out_of_stock"],
    [1, "low_in_stock"],
    [10, "low_in_stock"],
    [11, "medium_in_stock"],
    [15, "medium_in_stock"],
    [16, "high_in_stock"],
    [20, "high_in_stock"],
    [21, "extra_in_stock"],
  ].map(([quantity, expected], index) => ({
    id: `C6(${String.fromCharCode(97 + index)})`,
    run: (m: DomainModules) => assert(
      m.calculateStockState(quantity as number, [
        { state: "low_in_stock", thresholdQuantity: 10 },
        { state: "medium_in_stock", thresholdQuantity: 15 },
        { state: "high_in_stock", thresholdQuantity: 20 },
      ]) === expected,
      `quantity ${quantity} produced the wrong state`,
    ),
  })),
  {
    id: "C7(a)",
    run: (m) => {
      // Any non-empty subset of configurable states is valid; empty is not.
      for (const missing of m.CONFIGURABLE_THRESHOLD_STATES) {
        const thresholds = m.CONFIGURABLE_THRESHOLD_STATES.filter((state) => state !== missing).map((state, index) => ({ state, thresholdQuantity: index + 1 }));
        m.validateThresholds(thresholds);
      }
      for (const only of m.CONFIGURABLE_THRESHOLD_STATES) {
        m.validateThresholds([{ state: only, thresholdQuantity: 1 }]);
      }
      expectValidationError(() => m.validateThresholds([]));
    },
  },
  {
    id: "C7(a2)",
    run: (m) => {
      // A single high threshold of 1 splits the range into out / high / extra.
      const thresholds = [{ state: "high_in_stock", thresholdQuantity: 1 }];
      assert(m.calculateStockState(0, thresholds) === "out_of_stock", "quantity 0 with a single threshold was not out_of_stock");
      assert(m.calculateStockState(1, thresholds) === "high_in_stock", "quantity 1 with high threshold 1 was not high_in_stock");
      assert(m.calculateStockState(2, thresholds) === "extra_in_stock", "quantity 2 with high threshold 1 was not extra_in_stock");
    },
  },
  {
    id: "C7(a3)",
    run: (m) => {
      // 0 and null quantities mean "not configured" and are dropped.
      const normalized = m.normalizeThresholdInputs([
        { state: "low_in_stock", thresholdQuantity: 0 },
        { state: "medium_in_stock", thresholdQuantity: null },
        { state: "high_in_stock", thresholdQuantity: 4 },
      ]);
      equalJson(normalized, [{ state: "high_in_stock", thresholdQuantity: 4 }]);
    },
  },
  {
    id: "C7(b)",
    run: (m) => expectValidationError(() => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "low_in_stock", thresholdQuantity: 15 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ])),
  },
  {
    id: "C7(c)",
    detail: "zero",
    run: (m) => expectValidationError(() => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: 0 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ])),
  },
  {
    id: "C7(c)",
    detail: "negative",
    run: (m) => expectValidationError(() => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: -1 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ])),
  },
  {
    id: "C7(c)",
    detail: "non-integer",
    run: (m) => expectValidationError(() => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: 10.5 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ])),
  },
  {
    id: "C7(d)",
    run: (m) => expectValidationError(() => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 10 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ])),
  },
  {
    id: "C7(e)",
    run: (m) => expectValidationError(() => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 20 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ])),
  },
  {
    id: "C7(f)",
    run: (m) => m.validateThresholds([
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "high_in_stock", thresholdQuantity: 20 },
    ]),
  },
  {
    id: "C7(g)",
    run: (m) => {
      for (const invalidState of ["out_of_stock", "extra_in_stock"]) {
        expectValidationError(() => m.validateThresholds([
          { state: invalidState, thresholdQuantity: 5 },
          { state: "medium_in_stock", thresholdQuantity: 15 },
          { state: "high_in_stock", thresholdQuantity: 20 },
        ]));
      }
    },
  },
  {
    id: "C8(a)",
    run: (m) => assert(conflictId(m, { wood: "Teak" }, [{ id: "existing", criteria: { wood: ["Teak"] } }]) === "existing", "exact duplicate was not a conflict"),
  },
  {
    id: "C8(b)",
    run: (m) => assert(conflictId(m, { up: "Up" }, [{ id: "existing", criteria: { up: null } }]) === "existing", "wildcard/value overlap was not a conflict"),
  },
  {
    id: "C8(c)",
    run: (m) => assert(conflictId(m, { wood: ["Teak"] }, [{ id: "existing", criteria: { wood: ["Teak", "Oak"] } }]) === "existing", "set overlap was not a conflict"),
  },
  {
    id: "C8(d)",
    run: (m) => assert(conflictId(m, { wood: ["Teak", "Beech"] }, [{ id: "existing", criteria: { wood: ["Beech", "Oak"] } }]) === "existing", "partial set overlap was not a conflict"),
  },
  {
    id: "C8(e)",
    run: (m) => assert(conflictId(m, { wood: ["Teak"] }, [{ id: "existing", criteria: { wood: ["Oak"] } }]) === null, "disjoint sets were reported as a conflict"),
  },
  {
    id: "C8(f)",
    run: (m) => assert(conflictId(m, { up: null }, [{ id: "existing", criteria: { up: null, wood: "Teak" } }]) === null, "different key sets were reported as a conflict"),
  },
  {
    id: "C8(g)",
    run: (m) => assert(conflictId(m, {}, [{ id: "existing", criteria: {} }]) === "existing", "empty criteria did not conflict"),
  },
  {
    id: "C8(h)",
    run: (m) => assert(conflictId(m, {}, [{ id: "existing", criteria: { up: null } }]) === null, "empty and non-empty criteria conflicted"),
  },
  {
    id: "C9(a)",
    run: (m) => equalJson(m.ITEM_PROPERTY_OPTIONS.map((option) => option.key), expectedOptions.map((option) => option.key)),
  },
  {
    id: "C9(b)",
    run: (m) => {
      assert(m.ITEM_PROPERTY_OPTIONS.length === expectedOptions.length, "options map length changed");
      for (const [index, expected] of expectedOptions.entries()) {
        equalJson(m.ITEM_PROPERTY_OPTIONS[index]?.values, expected.values);
      }
    },
  },
  {
    id: "C9(c)",
    run: (m) => {
      for (const key of ["wood_type", "years", "weight_definition", "country"]) {
        assert(m.ITEM_PROPERTY_OPTIONS.find((option) => option.key === key)?.categories === "universal", `${key} was not universal`);
      }
    },
  },
  {
    id: "C9(d)",
    run: (m) => {
      for (const key of ["shape", "extension_type", "extension_quantity"]) {
        equalJson(m.ITEM_PROPERTY_OPTIONS.find((option) => option.key === key)?.categories, expectedOptions.find((option) => option.key === key)?.categories);
      }
    },
  },
  {
    id: "C9(e)",
    run: (m) => equalJson(m.ITEM_PROPERTY_OPTIONS.find((option) => option.key === "upholstery")?.categories, ["Dining Chairs", "Easy Chairs", "Armchairs"]),
  },
  {
    id: "C9(e2)",
    run: (m) => equalJson(m.ITEM_PROPERTY_OPTIONS.find((option) => option.key === "quantity")?.categories, ["Dining Chairs", "Easy Chairs", "Armchairs"]),
  },
  {
    id: "C9(f)",
    run: (m) => equalJson(m.getPropertyOptionsForCategory("Sofas").map((option) => option.key), ["wood_type", "years", "weight_definition", "country"]),
  },
  {
    id: "C9(g)",
    run: (m) => equalJson(m.getPropertyOptionsForCategory("Dining Tables").map((option) => option.key), ["wood_type", "years", "weight_definition", "country", "shape", "extension_type", "extension_quantity"]),
  },
  {
    id: "C9(h)",
    run: (m) => equalJson(m.getPropertyOptionsForCategory("Dining Chairs").map((option) => option.key), ["wood_type", "years", "weight_definition", "country", "upholstery", "quantity"]),
  },
  // P7 — allocateGroup: the single allocation loop behind reconciliation and the rebuild.
  {
    id: "P7.C1(a)",
    detail: "three items of quantity 4, 3, 7 on one catch-all -> 14 units, 3 instances",
    run: (m) => {
      const totals = m.allocateGroup(
        [candidate(m, "all", {}, "2026-01-01T00:00:00Z")],
        [{ quantity: 4, properties: {} }, { quantity: 3, properties: {} }, { quantity: 7, properties: {} }],
      );
      equalJson(totals.get("all"), { quantity: 14, instanceCount: 3 });
    },
  },
  {
    id: "P7.C1(b)",
    detail: "an item of quantity 0 still counts as one instance (D2)",
    run: (m) => {
      const totals = m.allocateGroup(
        [candidate(m, "all", {}, "2026-01-01T00:00:00Z")],
        [{ quantity: 0, properties: {} }],
      );
      equalJson(totals.get("all"), { quantity: 0, instanceCount: 1 });
    },
  },
  {
    id: "P7.C1(c)",
    detail: "best-match splits items between a catch-all and a carve-out; each pair matches a hand count",
    run: (m) => {
      const totals = m.allocateGroup(
        [
          candidate(m, "all", {}, "2026-01-01T00:00:00Z"),
          candidate(m, "teak", { wood_type: "Teak" }, "2026-01-02T00:00:00Z"),
        ],
        [
          { quantity: 4, properties: { wood_type: "Teak" } },
          { quantity: 6, properties: { wood_type: "Teak" } },
          { quantity: 3, properties: { wood_type: "Oak" } },
          { quantity: 1, properties: null },
        ],
      );
      equalJson(totals.get("teak"), { quantity: 10, instanceCount: 2 });
      equalJson(totals.get("all"), { quantity: 4, instanceCount: 2 });
    },
  },
  {
    id: "P7.C1(d)",
    detail: "a definition with no matches is present at 0/0",
    run: (m) => {
      const totals = m.allocateGroup(
        [
          candidate(m, "all", {}, "2026-01-01T00:00:00Z"),
          candidate(m, "sweden", { country: "Sweden" }, "2026-01-02T00:00:00Z"),
        ],
        [{ quantity: 2, properties: { wood_type: "Teak" } }],
      );
      equalJson(totals.get("sweden"), { quantity: 0, instanceCount: 0 });
      equalJson(totals.get("all"), { quantity: 2, instanceCount: 1 });
    },
  },
  {
    id: "P7.C1(e)",
    detail: "an item matching no definition contributes to neither number",
    run: (m) => {
      const totals = m.allocateGroup(
        [candidate(m, "teak", { wood_type: "Teak" }, "2026-01-01T00:00:00Z")],
        [{ quantity: 5, properties: { wood_type: "Oak" } }, { quantity: 2, properties: { wood_type: "Teak" } }],
      );
      equalJson(totals.get("teak"), { quantity: 2, instanceCount: 1 });
      assert(totals.size === 1, "an unmatched item created a phantom key");
    },
  },
];

const loadModules = async (): Promise<DomainModules> => {
  const [stockState, propertyCriteria, bestMatch, conflict, options, allocation] = await Promise.all([
    import("../src/modules/stock/domain/stock-state.js"),
    import("../src/modules/stock/domain/property-criteria.js"),
    import("../src/modules/stock/domain/best-match.js"),
    import("../src/modules/stock/domain/conflict.js"),
    import("../src/shared/item-properties/item-property-options.js"),
    import("../src/modules/stock/domain/allocation.js"),
  ]);
  return {
    STOCK_STATES: stockState.STOCK_STATES,
    CONFIGURABLE_THRESHOLD_STATES: stockState.CONFIGURABLE_THRESHOLD_STATES,
    calculateStockState: (quantity, thresholds) => stockState.calculateStockState(quantity, thresholds as Parameters<typeof stockState.calculateStockState>[1]),
    validateThresholds: (thresholds) => stockState.validateThresholds(thresholds as Parameters<typeof stockState.validateThresholds>[0]),
    normalizeThresholdInputs: (thresholds) => stockState.normalizeThresholdInputs(thresholds as Parameters<typeof stockState.normalizeThresholdInputs>[0]),
    tokenizePropertyValue: propertyCriteria.tokenizePropertyValue,
    normalizeCriteria: propertyCriteria.normalizeCriteria,
    canonicalCriteriaString: propertyCriteria.canonicalCriteriaString,
    matchesCriteria: propertyCriteria.matchesCriteria,
    specificityScore: bestMatch.specificityScore,
    resolveBestMatch: bestMatch.resolveBestMatch,
    findConflict: conflict.findConflict,
    allocateGroup: allocation.allocateGroup,
    ITEM_PROPERTY_OPTIONS: options.ITEM_PROPERTY_OPTIONS,
    getPropertyOptionsForCategory: (itemCategory) => options.getPropertyOptionsForCategory(itemCategory as Parameters<typeof options.getPropertyOptionsForCategory>[0]),
  };
};

const main = async (): Promise<void> => {
  let modules: DomainModules | null = null;
  let loadError: unknown;
  try {
    modules = await loadModules();
  } catch (error) {
    loadError = error;
  }

  let failures = 0;
  for (const verificationCase of cases) {
    try {
      if (!modules) {
        throw new Error(`domain modules unavailable: ${loadError instanceof Error ? loadError.message : String(loadError)}`);
      }
      await verificationCase.run(modules);
      console.log(`PASS ${verificationCase.id}${verificationCase.detail ? ` (${verificationCase.detail})` : ""}`);
    } catch (error) {
      failures += 1;
      console.log(`FAIL ${verificationCase.id}${verificationCase.detail ? ` (${verificationCase.detail})` : ""}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
};

void main();
