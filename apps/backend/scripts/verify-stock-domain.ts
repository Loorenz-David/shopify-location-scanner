type Criteria = Record<string, string[] | null>;
type CriteriaInput = Record<string, string | string[] | null>;

type Candidate = {
  id: string;
  createdAt: Date;
  location: string;
  criteria: Criteria;
};

type LocationPattern =
  | { kind: "exact"; value: string }
  | { kind: "prefix"; prefix: string };

// Every pre-pattern case is written against one concrete code, so the location
// rungs of the ladder tie and the cases assert exactly what they asserted
// before patterns existed.
const DEFAULT_LOCATION = "LC10";

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
  orderedPropertyTokens: (stored: string) => string[];
  deriveItemProperties: (properties: Record<string, string> | null) => Record<string, string> | null;
  woodSpecificity: (criteria: Criteria) => number;
  woodGroupOfToken: (token: string) => string | null;
  WOOD_GROUPS: Readonly<Record<string, readonly string[]>>;
  WOOD_GROUP_NAMES: readonly string[];
  validateStockCriteria: (itemCategory: string, criteria: CriteriaInput) => Criteria;
  resolveBestMatch: (candidates: readonly Candidate[], item: { location: string; properties: Record<string, string> | null }) => Candidate | null;
  parseLocationPattern: (stored: string) => LocationPattern;
  isLocationPattern: (stored: string) => boolean;
  matchesLocation: (pattern: LocationPattern, itemLocation: string) => boolean;
  locationSpecificity: (pattern: LocationPattern) => readonly [number, number];
  locationBlock: (stored: string) => string | null;
  findConflict: (candidate: Criteria, siblings: readonly { id: string; criteria: Criteria }[]) => { conflictingId: string } | null;
  allocateGroup: (candidates: readonly Candidate[], items: readonly { quantity: number; properties: Record<string, string> | null; location?: string }[]) => Map<string, { quantity: number; instanceCount: number }>;
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

const candidate = (
  modules: DomainModules,
  id: string,
  input: CriteriaInput,
  createdAt: string,
  location: string = DEFAULT_LOCATION,
): Candidate => ({
  id,
  createdAt: new Date(createdAt),
  location,
  criteria: criteria(modules, input),
});

const winnerId = (
  modules: DomainModules,
  candidates: readonly Candidate[],
  itemProperties: Record<string, string> | null,
  itemLocation: string = DEFAULT_LOCATION,
): string | null =>
  modules.resolveBestMatch(candidates, {
    location: itemLocation,
    properties: itemProperties,
  })?.id ?? null;

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
    key: "wood_group",
    values: ["Dark", "Teak", "Light"],
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
      for (const key of ["wood_type", "wood_group", "years", "weight_definition", "country"]) {
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
    run: (m) => equalJson(m.getPropertyOptionsForCategory("Sofas").map((option) => option.key), ["wood_type", "wood_group", "years", "weight_definition", "country"]),
  },
  {
    id: "C9(g)",
    run: (m) => equalJson(m.getPropertyOptionsForCategory("Dining Tables").map((option) => option.key), ["wood_type", "wood_group", "years", "weight_definition", "country", "shape", "extension_type", "extension_quantity"]),
  },
  {
    id: "C9(h)",
    run: (m) => equalJson(m.getPropertyOptionsForCategory("Dining Chairs").map((option) => option.key), ["wood_type", "wood_group", "years", "weight_definition", "country", "upholstery", "quantity"]),
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
  // LP — prefix location patterns ("LC%"): the grammar, the match, and the rung
  // of the ladder that sits above property specificity.
  {
    id: "LP.C1(a)",
    detail: "a plain code parses as exact; a trailing % parses as a prefix",
    run: (m) => {
      equalJson(m.parseLocationPattern("LC10"), { kind: "exact", value: "LC10" });
      equalJson(m.parseLocationPattern("LC%"), { kind: "prefix", prefix: "LC" });
      equalJson(m.parseLocationPattern("  LC%  "), { kind: "prefix", prefix: "LC" });
      assert(!m.isLocationPattern("LC10"), "a concrete code reported as a pattern");
      assert(m.isLocationPattern("LC%"), "a prefix did not report as a pattern");
    },
  },
  {
    id: "LP.C1(b)",
    detail: "% is rejected anywhere but last, and a bare % is rejected outright",
    run: (m) => {
      expectValidationError(() => m.parseLocationPattern("%LC"));
      expectValidationError(() => m.parseLocationPattern("L%C"));
      expectValidationError(() => m.parseLocationPattern("LC%%"));
      expectValidationError(() => m.parseLocationPattern("%"));
      expectValidationError(() => m.parseLocationPattern("   "));
    },
  },
  {
    id: "LP.C1(c)",
    detail: "a prefix catches every code that starts with it; an exact code catches only itself",
    run: (m) => {
      const block = m.parseLocationPattern("LC%");
      assert(m.matchesLocation(block, "LC10"), "LC% missed LC10");
      assert(m.matchesLocation(block, "LC9"), "LC% missed LC9");
      assert(m.matchesLocation(block, "LC1:2"), "LC% missed a levelled code");
      assert(m.matchesLocation(block, "LC"), "LC% missed its own prefix");
      assert(!m.matchesLocation(block, "H1"), "LC% caught another block");
      assert(!m.matchesLocation(block, "lc10"), "LC% matched case-insensitively");

      const exact = m.parseLocationPattern("LC10");
      assert(m.matchesLocation(exact, "LC10"), "LC10 missed itself");
      assert(!m.matchesLocation(exact, "LC101"), "LC10 matched by prefix");
    },
  },
  {
    id: "LP.C1(d)",
    detail: "the `_` of SQL LIKE is a literal here: LC_% catches only codes with a real underscore",
    run: (m) => {
      const pattern = m.parseLocationPattern("LC_%");
      assert(m.matchesLocation(pattern, "LC_1"), "LC_% missed LC_1");
      assert(!m.matchesLocation(pattern, "LC10"), "an underscore behaved as a wildcard");
    },
  },
  {
    id: "LP.C1(e)",
    detail: "exact outranks any prefix; a longer prefix outranks a shorter one",
    run: (m) => {
      equalJson(m.locationSpecificity(m.parseLocationPattern("LC10")), [1, 4]);
      equalJson(m.locationSpecificity(m.parseLocationPattern("LC%")), [0, 2]);
      equalJson(m.locationSpecificity(m.parseLocationPattern("L%")), [0, 1]);
    },
  },
  {
    id: "LP.C2(a)",
    detail: "an exact definition with no properties beats a prefix definition with three",
    run: (m) =>
      equalJson(
        winnerId(
          m,
          [
            candidate(m, "block", { wood_type: "Teak", country: "Denmark", years: "1960-1970s" }, "2026-01-01T00:00:00Z", "LC%"),
            candidate(m, "shelf", {}, "2026-01-02T00:00:00Z", "LC10"),
          ],
          { wood_type: "Teak", country: "Denmark", years: "1960-1970s" },
          "LC10",
        ),
        "shelf",
      ),
  },
  {
    id: "LP.C2(b)",
    detail: "the longer prefix wins between two overlapping block rules",
    run: (m) =>
      equalJson(
        winnerId(
          m,
          [
            candidate(m, "wide", {}, "2026-01-01T00:00:00Z", "L%"),
            candidate(m, "narrow", {}, "2026-01-02T00:00:00Z", "LC%"),
          ],
          {},
          "LC10",
        ),
        "narrow",
      ),
  },
  {
    id: "LP.C2(c)",
    detail: "at equal location specificity the property ladder decides, exactly as before",
    run: (m) =>
      equalJson(
        winnerId(
          m,
          [
            candidate(m, "catch-all", {}, "2026-01-01T00:00:00Z", "LC%"),
            candidate(m, "teak", { wood_type: "Teak" }, "2026-01-02T00:00:00Z", "LC%"),
          ],
          { wood_type: "Teak" },
          "LC10",
        ),
        "teak",
      ),
  },
  {
    id: "LP.C2(d)",
    detail: "a definition whose location does not match is not a candidate at all",
    run: (m) => {
      equalJson(
        winnerId(
          m,
          [candidate(m, "block", {}, "2026-01-01T00:00:00Z", "LC%")],
          {},
          "H1",
        ),
        null,
      );
      equalJson(
        winnerId(
          m,
          [candidate(m, "shelf", {}, "2026-01-01T00:00:00Z", "LC10")],
          {},
          "LC11",
        ),
        null,
      );
    },
  },
  {
    id: "LP.C3(a)",
    detail: "allocation spreads a block rule across locations while an exact rule keeps its own",
    run: (m) => {
      const totals = m.allocateGroup(
        [
          candidate(m, "block", {}, "2026-01-01T00:00:00Z", "LC%"),
          candidate(m, "shelf", {}, "2026-01-02T00:00:00Z", "LC10"),
        ],
        [
          { quantity: 2, properties: {}, location: "LC10" },
          { quantity: 3, properties: {}, location: "LC11" },
          { quantity: 4, properties: {}, location: "LC9" },
          { quantity: 5, properties: {}, location: "H1" },
        ],
      );
      // LC10 belongs to the exact rule; LC11 and LC9 fall to the block rule; H1
      // matches neither and contributes to neither number.
      equalJson(totals.get("shelf"), { quantity: 2, instanceCount: 1 });
      equalJson(totals.get("block"), { quantity: 7, instanceCount: 2 });
    },
  },

  // WG — wood groups: a coarse alternative to naming individual woods. The
  // group is DERIVED from the item's first wood_type token; no item stores it.
  {
    id: "LP.C4(a)",
    detail: "the letter block of a code, and the codes that have none",
    run: (m) => {
      assert(m.locationBlock("LC10") === "LC", "LC10 did not resolve to LC");
      assert(m.locationBlock("LC2:1") === "LC", "LC2:1 did not resolve to LC");
      assert(m.locationBlock("H1") === "H", "H1 did not resolve to H");
      assert(m.locationBlock("  LC0  ") === "LC", "a padded code did not resolve");
      // No number to strip: converting these to patterns would widen them
      // ("STORE%" would also catch STOREROOM), so the caller must skip them.
      assert(m.locationBlock("STORE") === null, "an all-letter code produced a block");
      assert(m.locationBlock("LC%") === null, "an existing pattern produced a block");
      assert(m.locationBlock("1LC") === null, "a leading-digit code produced a block");
      assert(m.locationBlock("") === null, "an empty code produced a block");
    },
  },
  {
    id: "WG.C1(a)",
    detail: "the table is well formed: no separator in a name, no wood in two groups",
    run: (m) => {
      // This is the guard on the one file that is meant to be hand-edited. A
      // name carrying ',' or '/' would be re-split by the tokenizer into pieces
      // that match nothing; a wood in two groups would resolve by declaration
      // order. Both fail silently in production, so they fail loudly here.
      const seen = new Map<string, string>();
      for (const [group, members] of Object.entries(m.WOOD_GROUPS)) {
        assert(!/[,\/]/.test(group), `group name '${group}' contains a separator`);
        for (const member of members) {
          const key = member.trim().toLowerCase();
          const previous = seen.get(key);
          assert(previous === undefined, `'${member}' is in both '${previous}' and '${group}'`);
          seen.set(key, group);
        }
      }
      assert(seen.size > 0, "the wood group table is empty");
    },
  },
  {
    id: "WG.C1(b)",
    detail: "every member resolves to its group, case-insensitively",
    run: (m) => {
      for (const [group, members] of Object.entries(m.WOOD_GROUPS)) {
        for (const member of members) {
          assert(m.woodGroupOfToken(member) === group, `'${member}' did not resolve to ${group}`);
          assert(m.woodGroupOfToken(member.toLowerCase()) === group, `'${member}' lowercased did not resolve to ${group}`);
          assert(m.woodGroupOfToken(`  ${member.toUpperCase()}  `) === group, `'${member}' padded/uppercased did not resolve to ${group}`);
        }
      }
    },
  },
  {
    id: "WG.C1(c)",
    detail: "a wood in no group, and an unknown wood, both resolve to null",
    run: (m) => {
      const grouped = new Set(
        Object.values(m.WOOD_GROUPS).flatMap((members) => members.map((member) => member.toLowerCase())),
      );
      // `Other` is the live shop's only wood_type value outside every group, so
      // it is the stand-in for "ungrouped" throughout these cases. If a future
      // edit adopts it, this fails rather than letting the cases below quietly
      // stop testing the ungrouped path at all.
      assert(!grouped.has("other"), "'Other' joined a group; the ungrouped cases below need a new stand-in");
      assert(m.woodGroupOfToken("Other") === null, "an ungrouped wood resolved to a group");
      assert(m.woodGroupOfToken("Wenge") === null, "an unknown wood resolved to a group");
      assert(m.woodGroupOfToken("") === null, "an empty token resolved to a group");
      // Dark Oak and Dark Teak are listed but absent from the data; they must
      // still resolve, and must not be confused with plain Oak and Teak.
      assert(m.woodGroupOfToken("Dark Oak") === "Dark", "Dark Oak did not resolve to Dark");
      assert(m.woodGroupOfToken("Dark Teak") === "Dark", "Dark Teak did not resolve to Dark");
      assert(m.woodGroupOfToken("Oak") === "Light", "plain Oak was pulled into Dark");
      assert(m.woodGroupOfToken("Teak") === "Teak", "plain Teak was pulled into Dark");
    },
  },
  {
    id: "WG.C2(a)",
    detail: "ordered tokens keep source order; the Set form is built from them",
    run: (m) => {
      equalJson(m.orderedPropertyTokens("Teak, Beech"), ["teak", "beech"]);
      equalJson(m.orderedPropertyTokens("Beech, Teak"), ["beech", "teak"]);
      equalJson(m.orderedPropertyTokens("Oval/Rectangular"), ["oval", "rectangular"]);
      equalJson(m.orderedPropertyTokens("  Teak  "), ["teak"]);
      equalJson(m.orderedPropertyTokens(""), []);
    },
  },
  {
    id: "WG.C2(b)",
    detail: "the ordered split is the same rule as the Set split, '&' included",
    run: (m) => {
      for (const stored of ["Teak, Beech", "Up & Down", "Oval/Rectangular", "1-20 kg", "Santos Rosewood"]) {
        equalJson(setValues(new Set(m.orderedPropertyTokens(stored))), setValues(m.tokenizePropertyValue(stored)));
      }
    },
  },
  {
    id: "WG.C3(a)",
    detail: "the derived group comes from the FIRST wood only",
    run: (m) => {
      // Mahogany is Dark and Beech is Light; the item is Dark because Mahogany
      // is written first. This is the whole point of the feature.
      equalJson(m.deriveItemProperties({ wood_type: "Mahogany, Beech" })?.wood_group, "Dark");
      equalJson(m.deriveItemProperties({ wood_type: "Beech, Mahogany" })?.wood_group, "Light");
      equalJson(m.deriveItemProperties({ wood_type: "Teak, Beech" })?.wood_group, "Teak");
    },
  },
  {
    id: "WG.C3(b)",
    detail: "an ungrouped wood gets no wood_group key at all",
    run: (m) => {
      const derived = m.deriveItemProperties({ wood_type: "Other, Teak" });
      assert(derived !== null && !("wood_group" in derived), "an ungrouped first wood still produced a group");
      // ...and so the key is absent, which matchesCriteria treats as no match
      // rather than as a wildcard.
      assert(!m.matchesCriteria(derived, criteria(m, { wood_group: "Teak" })), "an ungrouped item matched a group");
    },
  },
  {
    id: "WG.C3(c)",
    detail: "null properties, a missing wood_type and a blank one are all passed through",
    run: (m) => {
      assert(m.deriveItemProperties(null) === null, "null properties did not stay null");
      equalJson(m.deriveItemProperties({ country: "Denmark" }), { country: "Denmark" });
      equalJson(m.deriveItemProperties({ wood_type: "   " }), { wood_type: "   " });
      equalJson(m.deriveItemProperties({}), {});
    },
  },
  {
    id: "WG.C3(d)",
    detail: "a wood_group stored on the item is overwritten, and the input is not mutated",
    run: (m) => {
      const item = { wood_type: "Teak", wood_group: "Light" };
      const derived = m.deriveItemProperties(item);
      equalJson(derived?.wood_group, "Teak");
      equalJson(item.wood_group, "Light");
    },
  },
  {
    id: "WG.C4(a)",
    detail: "a group definition catches every wood in its group",
    run: (m) => {
      const candidates = [candidate(m, "dark", { wood_group: "Dark" }, "2026-01-01T00:00:00Z")];
      assert(winnerId(m, candidates, { wood_type: "Mahogany" }) === "dark", "Mahogany missed the Dark group");
      assert(winnerId(m, candidates, { wood_type: "Santos Rosewood" }) === "dark", "Santos Rosewood missed the Dark group");
      assert(winnerId(m, candidates, { wood_type: "Walnut" }) === "dark", "Walnut missed the Dark group");
      assert(winnerId(m, candidates, { wood_type: "Oak" }) === null, "Oak matched the Dark group");
      assert(winnerId(m, candidates, { wood_type: "Other" }) === null, "an ungrouped wood matched the Dark group");
      assert(winnerId(m, candidates, null) === null, "an item with no properties matched a group");
    },
  },
  {
    id: "WG.C4(b)",
    detail: "a group reads the first wood only, while wood_type still reads any",
    run: (m) => {
      const groups = [candidate(m, "light", { wood_group: "Light" }, "2026-01-01T00:00:00Z")];
      // "Teak, Beech": Beech is Light, but it is not first, so the group misses.
      assert(winnerId(m, groups, { wood_type: "Teak, Beech" }) === null, "a group matched on a non-first wood");
      assert(winnerId(m, groups, { wood_type: "Beech, Teak" }) === "light", "a group missed its first wood");

      // The same item against a named criterion: unchanged, still any-token.
      const named = [candidate(m, "beech", { wood_type: "Beech" }, "2026-01-01T00:00:00Z")];
      assert(winnerId(m, named, { wood_type: "Teak, Beech" }) === "beech", "wood_type stopped matching on a later token");
    },
  },
  {
    id: "WG.C4(c)",
    detail: "a wildcard group requires the item's first wood to be in some group",
    run: (m) => {
      const candidates = [candidate(m, "any-group", { wood_group: null }, "2026-01-01T00:00:00Z")];
      assert(winnerId(m, candidates, { wood_type: "Teak" }) === "any-group", "a grouped wood missed the wildcard group");
      assert(winnerId(m, candidates, { wood_type: "Other" }) === null, "an ungrouped wood matched the wildcard group");
    },
  },
  {
    id: "WG.C5(a)",
    detail: "the wood specificity scale: named 3, group 2, wildcard 1, absent 0",
    run: (m) => {
      assert(m.woodSpecificity(criteria(m, { wood_type: "Teak" })) === 3, "a named wood did not score 3");
      assert(m.woodSpecificity(criteria(m, { wood_type: ["Teak", "Oak"] })) === 3, "a multi-value named wood did not score 3");
      assert(m.woodSpecificity(criteria(m, { wood_group: "Teak" })) === 2, "a group did not score 2");
      assert(m.woodSpecificity(criteria(m, { wood_type: null })) === 1, "a wood_type wildcard did not score 1");
      assert(m.woodSpecificity(criteria(m, { wood_group: null })) === 1, "a wood_group wildcard did not score 1");
      assert(m.woodSpecificity(criteria(m, { country: "Denmark" })) === 0, "a criteria set with no wood scored above 0");
      assert(m.woodSpecificity(criteria(m, {})) === 0, "empty criteria scored above 0");
    },
  },
  {
    id: "WG.C5(b)",
    detail: "a named wood beats a group, always — even a group pinning three more properties",
    run: (m) => {
      const winner = winnerId(
        m,
        [
          candidate(m, "group", { wood_group: "Teak", country: "Denmark", years: "1960-1970s" }, "2026-01-01T00:00:00Z"),
          candidate(m, "named", { wood_type: "Teak" }, "2026-01-02T00:00:00Z"),
        ],
        { wood_type: "Teak", country: "Denmark", years: "1960-1970s" },
      );
      // The group is older and matches on three keys to the named one's single
      // key; the wood rung is read first, so the named wood still wins.
      assert(winner === "named", `expected the named wood to win, got ${winner}`);
    },
  },
  {
    id: "WG.C5(c)",
    detail: "a group beats a definition carrying no wood criterion at all",
    run: (m) => {
      const winner = winnerId(
        m,
        [
          candidate(m, "no-wood", { country: "Denmark", years: "1960-1970s" }, "2026-01-01T00:00:00Z"),
          candidate(m, "group", { wood_group: "Teak" }, "2026-01-02T00:00:00Z"),
        ],
        { wood_type: "Teak", country: "Denmark", years: "1960-1970s" },
      );
      assert(winner === "group", `expected the group to win, got ${winner}`);
    },
  },
  {
    id: "WG.C5(d)",
    detail: "at equal wood specificity the property ladder decides, exactly as before",
    run: (m) => {
      const winner = winnerId(
        m,
        [
          candidate(m, "bare", { wood_group: "Teak" }, "2026-01-01T00:00:00Z"),
          candidate(m, "narrow", { wood_group: "Teak", country: "Denmark" }, "2026-01-02T00:00:00Z"),
        ],
        { wood_type: "Teak", country: "Denmark" },
      );
      assert(winner === "narrow", `expected the extra property to decide, got ${winner}`);
    },
  },
  {
    id: "WG.C5(e)",
    detail: "location still outranks wood: an exact-location group beats a block-rule named wood",
    run: (m) => {
      const winner = winnerId(
        m,
        [
          candidate(m, "block-named", { wood_type: "Teak" }, "2026-01-01T00:00:00Z", "LC%"),
          candidate(m, "exact-group", { wood_group: "Teak" }, "2026-01-02T00:00:00Z", "LC10"),
        ],
        { wood_type: "Teak" },
        "LC10",
      );
      assert(winner === "exact-group", `expected location to outrank wood, got ${winner}`);
    },
  },
  {
    id: "WG.C6(a)",
    detail: "a definition carrying both a wood type and a wood group is refused",
    run: (m) => {
      expectValidationError(() => m.validateStockCriteria("Sofas", { wood_type: "Teak", wood_group: "Teak" }));
      expectValidationError(() => m.validateStockCriteria("Sofas", { wood_type: null, wood_group: "Dark" }));
      expectValidationError(() => m.validateStockCriteria("Sofas", { wood_type: "Teak", wood_group: null }));
    },
  },
  {
    id: "WG.C6(b)",
    detail: "either key alone is accepted, for every category",
    run: (m) => {
      for (const category of ["Sofas", "Dining Tables", "Dining Chairs"]) {
        equalJson(m.validateStockCriteria(category, { wood_group: "Dark" }), { wood_group: ["dark"] });
        equalJson(m.validateStockCriteria(category, { wood_type: "Teak" }), { wood_type: ["teak"] });
      }
    },
  },
  {
    id: "WG.C6(c)",
    detail: "a group name outside the table is refused, like any other vocabulary value",
    run: (m) => {
      expectValidationError(() => m.validateStockCriteria("Sofas", { wood_group: "Medium" }));
      // ...and the accepted names are exactly the table's keys.
      equalJson(m.WOOD_GROUP_NAMES, Object.keys(m.WOOD_GROUPS));
    },
  },
  {
    id: "WG.C7(a)",
    detail: "allocation splits items between a named definition and a group across both paths",
    run: (m) => {
      const totals = m.allocateGroup(
        [
          candidate(m, "named-teak", { wood_type: "Teak" }, "2026-01-01T00:00:00Z"),
          candidate(m, "dark", { wood_group: "Dark" }, "2026-01-02T00:00:00Z"),
        ],
        [
          { quantity: 2, properties: { wood_type: "Teak" } },
          // Dark only.
          { quantity: 3, properties: { wood_type: "Mahogany" } },
          // The interesting one: BOTH match — the group on the first wood
          // (Santos Rosewood is Dark), the named definition on the second
          // (Teak). The wood rung gives it to the named definition, so the
          // precedence rule holds on the allocation path and not just in
          // resolveBestMatch.
          { quantity: 4, properties: { wood_type: "Santos Rosewood, Teak" } },
          // First wood is Teak, so the Dark group misses it entirely.
          { quantity: 5, properties: { wood_type: "Teak, Mahogany" } },
          // Ungrouped and not Teak: counted by neither.
          { quantity: 6, properties: { wood_type: "Other" } },
        ],
      );
      equalJson(totals.get("named-teak"), { quantity: 11, instanceCount: 3 });
      equalJson(totals.get("dark"), { quantity: 3, instanceCount: 1 });
    },
  },
];

const loadModules = async (): Promise<DomainModules> => {
  const [stockState, propertyCriteria, bestMatch, conflict, options, allocation, locationPattern, woodGroups, contract] = await Promise.all([
    import("../src/modules/stock/domain/stock-state.js"),
    import("../src/modules/stock/domain/property-criteria.js"),
    import("../src/modules/stock/domain/best-match.js"),
    import("../src/modules/stock/domain/conflict.js"),
    import("../src/shared/item-properties/item-property-options.js"),
    import("../src/modules/stock/domain/allocation.js"),
    import("../src/modules/stock/domain/location-pattern.js"),
    import("../src/shared/item-properties/wood-groups.js"),
    import("../src/modules/stock/contracts/stock.contract.js"),
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
    orderedPropertyTokens: propertyCriteria.orderedPropertyTokens,
    deriveItemProperties: bestMatch.deriveItemProperties,
    woodSpecificity: bestMatch.woodSpecificity,
    woodGroupOfToken: woodGroups.woodGroupOfToken,
    WOOD_GROUPS: woodGroups.WOOD_GROUPS,
    WOOD_GROUP_NAMES: woodGroups.WOOD_GROUP_NAMES,
    validateStockCriteria: (itemCategory, input) => contract.validateStockCriteria(itemCategory, input),
    resolveBestMatch: bestMatch.resolveBestMatch,
    parseLocationPattern: locationPattern.parseLocationPattern,
    isLocationPattern: locationPattern.isLocationPattern,
    matchesLocation: locationPattern.matchesLocation,
    locationSpecificity: locationPattern.locationSpecificity,
    locationBlock: locationPattern.locationBlock,
    findConflict: conflict.findConflict,
    allocateGroup: (candidates, items) =>
      allocation.allocateGroup(
        candidates,
        items.map((item) => ({
          location: item.location ?? DEFAULT_LOCATION,
          quantity: item.quantity,
          properties: item.properties,
        })),
      ),
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
