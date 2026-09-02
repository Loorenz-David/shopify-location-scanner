import { describe, expect, it } from "vitest";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { STOCK_STATES } from "./stock-states.domain";
import type {
  CompactedReportRow,
  ReportLocationGroup,
  ReportView,
  StockFilterState,
  StockState,
} from "../types/stock.types";
import type {
  StockPropertiesDto,
  StockReportEntryDto,
} from "../types/stock.dto";
import { countNoun, stockCountLabels } from "./stock-count-mode.domain";
import {
  applyStockFilters,
  buildReportView,
  compactEntries,
  compareGroups,
  computeCounterTiles,
  countPendingRows,
  deriveEntryDetail,
  displayedCount,
  makeCompactRowComparator,
  makeGroupEntryComparator,
  missingQuantityForEntry,
  propertiesComparisonString,
} from "./stock-report.domain";

const keyOrder = stockOptionsFixture.propertyOptions.map((option) => option.key);
const thresholds = [
  { state: "low_in_stock", thresholdQuantity: 10 },
  { state: "medium_in_stock", thresholdQuantity: 15 },
  { state: "high_in_stock", thresholdQuantity: 20 },
] satisfies StockReportEntryDto["thresholds"];

function entry(
  overrides: Partial<StockReportEntryDto> = {},
): StockReportEntryDto {
  return {
    location: "H1",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["walnut"] },
    mergeKey: "k1",
    quantity: 1,
    // Defaults to the quantity so pre-P7 rows keep their numbers; P7 rows set it apart.
    instanceCount: overrides.instanceCount ?? overrides.quantity ?? 1,
    stockState: "high_in_stock",
    thresholds,
    unitsToRestockTarget: 19,
    ...overrides,
  };
}

function filter(
  overrides: Partial<StockFilterState> = {},
): StockFilterState {
  return {
    states: new Set(STOCK_STATES),
    locations: new Set<string>(),
    groupByLocation: false,
    ...overrides,
  };
}

function row(overrides: Partial<CompactedReportRow> = {}): CompactedReportRow {
  const location = overrides.locations ?? "H1";
  const quantity = overrides.quantity ?? 1;
  const instanceCount = overrides.instanceCount ?? quantity;
  const unitsToRestockTarget = overrides.unitsToRestockTarget ?? 19;
  return {
    mergeKey: "k1",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["walnut"] },
    quantity,
    instanceCount,
    unitsToRestockTarget,
    stockState: "high_in_stock",
    locations: location,
    contributions: [{ location, quantity, instanceCount, unitsToRestockTarget }],
    ...overrides,
  };
}

function group(
  location: string,
  entries: StockReportEntryDto[],
): ReportLocationGroup {
  return { location, entries };
}

function compactView(view: ReportView): CompactedReportRow[] {
  if (!("rows" in view)) {
    throw new Error("Expected compact report view");
  }

  return view.rows;
}

function groupedView(view: ReportView): ReportLocationGroup[] {
  if (!("groups" in view)) {
    throw new Error("Expected grouped report view");
  }

  return view.groups;
}

describe("stock report domain", () => {
  it("C1(a): compacts current and missing quantities and retains sorted contributions", () => {
    const result = compactEntries([
      entry({ location: "LC1", quantity: 2, instanceCount: 2, unitsToRestockTarget: 18 }),
      entry({ location: "H1", quantity: 3, instanceCount: 3, unitsToRestockTarget: 17 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      mergeKey: "k1",
      quantity: 5, instanceCount: 5,
      unitsToRestockTarget: 35,
      locations: "H1 · LC1",
      contributions: [
        { location: "H1", quantity: 3, instanceCount: 3, unitsToRestockTarget: 17 },
        { location: "LC1", quantity: 2, instanceCount: 2, unitsToRestockTarget: 18 },
      ],
    });

    expect(compactEntries([
      entry({ location: "LC1", quantity: 2, instanceCount: 2, unitsToRestockTarget: 18 }),
      entry({ location: "LC1", quantity: 3, instanceCount: 3, unitsToRestockTarget: 17 }),
    ])[0]).toMatchObject({
      quantity: 5, instanceCount: 5,
      unitsToRestockTarget: 35,
      locations: "LC1",
      contributions: [
        { location: "LC1", quantity: 2, instanceCount: 2, unitsToRestockTarget: 18 },
        { location: "LC1", quantity: 3, instanceCount: 3, unitsToRestockTarget: 17 },
      ],
    });
  });

  it("C1(b): preserves quantity totals independently for every state", () => {
    const entries = [
      entry({ mergeKey: "a", stockState: "out_of_stock", quantity: 0, instanceCount: 0 }),
      entry({ mergeKey: "a", stockState: "out_of_stock", quantity: 2, instanceCount: 2 }),
      entry({ mergeKey: "b", stockState: "low_in_stock", quantity: 3, instanceCount: 3 }),
      entry({ mergeKey: "b", stockState: "low_in_stock", quantity: 4, instanceCount: 4 }),
      entry({ mergeKey: "c", stockState: "high_in_stock", quantity: 8, instanceCount: 8 }),
    ];
    const before = new Map<StockState, number>();
    const after = new Map<StockState, number>();

    for (const item of entries) {
      before.set(item.stockState, (before.get(item.stockState) ?? 0) + item.quantity);
    }
    for (const item of compactEntries(entries)) {
      after.set(item.stockState, (after.get(item.stockState) ?? 0) + item.quantity);
    }

    expect(after).toEqual(before);
  });

  it("C1(c): emits no duplicate mergeKey and state pair", () => {
    const result = compactEntries([
      entry({ location: "LC1", mergeKey: "a", stockState: "low_in_stock" }),
      entry({ location: "H1", mergeKey: "a", stockState: "low_in_stock" }),
      entry({ location: "H1", mergeKey: "a", stockState: "high_in_stock" }),
    ]);
    const pairs = result.map((item) => `${item.mergeKey}\u001f${item.stockState}`);

    expect(new Set(pairs).size).toBe(pairs.length);
  });

  it("C1(d): leaves a single-entry group unchanged apart from wrappers", () => {
    const source = entry({ location: "LC1", quantity: 7, instanceCount: 7 });
    const [result] = compactEntries([source]);

    expect(result).toMatchObject({
      mergeKey: source.mergeKey,
      itemCategory: source.itemCategory,
      properties: source.properties,
      quantity: source.quantity,
      stockState: source.stockState,
      locations: "LC1",
      contributions: [{ location: "LC1", quantity: 7, instanceCount: 7 }],
    });
  });

  it("C1(e): derives missing units from the state-keyed normal threshold during rollout", () => {
    expect(missingQuantityForEntry(entry({
      quantity: 18, instanceCount: 18,
      unitsToRestockTarget: undefined,
    }))).toBe(2);
    expect(missingQuantityForEntry(entry({
      quantity: 25, instanceCount: 25,
      unitsToRestockTarget: undefined,
    }))).toBe(0);
  });

  it("C2: keeps same-key entries in different states as separate rows", () => {
    const result = compactEntries([
      entry({ location: "LC1", mergeKey: "same", quantity: 2, instanceCount: 2, stockState: "low_in_stock" }),
      entry({ location: "H1", mergeKey: "same", quantity: 18, instanceCount: 18, stockState: "high_in_stock" }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map(({ quantity, stockState }) => ({ quantity, stockState }))).toEqual(
      expect.arrayContaining([
        { quantity: 2, stockState: "low_in_stock" },
        { quantity: 18, stockState: "high_in_stock" },
      ]),
    );
  });

  it("C3(a): orders state before quantity", () => {
    const compare = makeCompactRowComparator(keyOrder);
    expect(compare(row({ stockState: "out_of_stock", quantity: 9, instanceCount: 9 }), row({ stockState: "low_in_stock", quantity: 1, instanceCount: 1 }))).toBeLessThan(0);
  });

  it("C3(b): orders quantity ascending after equal state", () => {
    const compare = makeCompactRowComparator(keyOrder);
    expect(compare(row({ stockState: "low_in_stock", quantity: 1, instanceCount: 1 }), row({ stockState: "low_in_stock", quantity: 2, instanceCount: 2 }))).toBeLessThan(0);
  });

  it("C3(c): orders category case-insensitively by code point", () => {
    const compare = makeCompactRowComparator(keyOrder);
    expect(compare(row({ itemCategory: "armchairs" }), row({ itemCategory: "Dining Tables" }))).toBeLessThan(0);
  });

  it("C3(d): orders the canonical properties string", () => {
    const compare = makeCompactRowComparator(keyOrder);
    expect(propertiesComparisonString({ country: ["sweden"], wood_type: ["oak"] }, keyOrder)).toBe(
      "wood_type\u001foak\u001ecountry\u001fsweden",
    );
    expect(propertiesComparisonString({
      unknown_key: ["x,y"],
      upholstery: null,
      wood_type: ["z", "a"],
    }, keyOrder)).toBe(
      "wood_type\u001fz\u001fa\u001eupholstery\u001f*\u001eunknown_key\u001fx,y",
    );
    expect(compare(row({ properties: { wood_type: ["oak"] } }), row({ properties: { wood_type: ["teak"] } }))).toBeLessThan(0);
  });

  it("C3(e): orders the joined location list and returns zero only for identical rows", () => {
    const compare = makeCompactRowComparator(keyOrder);
    const left = row({
      locations: "H1",
      contributions: [{ location: "H1", quantity: 1, instanceCount: 1, unitsToRestockTarget: 19 }],
    });
    const right = row({
      locations: "LC1",
      contributions: [{ location: "LC1", quantity: 1, instanceCount: 1, unitsToRestockTarget: 19 }],
    });

    expect(compare(left, right)).toBeLessThan(0);
    expect(compare(left, { ...left })).toBe(0);
    expect(compare(left, { ...left, mergeKey: "different" })).not.toBe(0);
  });

  it("C4(a): ranks groups by out-of-stock count descending", () => {
    expect(compareGroups(
      group("H1", [entry({ stockState: "out_of_stock" }), entry({ stockState: "out_of_stock" }), entry({ stockState: "out_of_stock" })]),
      group("LC1", [entry({ stockState: "out_of_stock" }), entry({ stockState: "low_in_stock" }), entry({ stockState: "low_in_stock" }), entry({ stockState: "low_in_stock" })]),
    )).toBeLessThan(0);
  });

  it("C4(b): uses low count when out counts tie", () => {
    expect(compareGroups(
      group("H1", [entry({ stockState: "out_of_stock" })]),
      group("LC1", [entry({ stockState: "out_of_stock" }), entry({ stockState: "low_in_stock" }), entry({ stockState: "low_in_stock" })]),
    )).toBeGreaterThan(0);
  });

  it("C4(c): uses medium count when out and low counts tie", () => {
    expect(compareGroups(
      group("H1", [entry({ stockState: "out_of_stock" }), entry({ stockState: "low_in_stock" })]),
      group("LC1", [entry({ stockState: "out_of_stock" }), entry({ stockState: "low_in_stock" }), entry({ stockState: "medium_in_stock" })]),
    )).toBeGreaterThan(0);
  });

  it("C4(d): uses location code points as the final group tiebreak", () => {
    expect(compareGroups(
      group("H1", [entry({ stockState: "high_in_stock" })]),
      group("LC1", [entry({ stockState: "high_in_stock" })]),
    )).toBeLessThan(0);
  });

  it("C4(e1): omits groups with no surviving entries after a state filter", () => {
    const view = buildReportView([
      entry({ location: "H1", stockState: "out_of_stock", quantity: 0, instanceCount: 0 }),
      entry({ location: "H1", stockState: "out_of_stock", quantity: 0, instanceCount: 0, mergeKey: "h2" }),
      entry({ location: "H1", stockState: "out_of_stock", quantity: 0, instanceCount: 0, mergeKey: "h3" }),
      entry({ location: "LC1", stockState: "low_in_stock", quantity: 12, instanceCount: 12 }),
    ], filter({ groupByLocation: true, states: new Set(["low_in_stock"]) }), keyOrder);

    expect(groupedView(view).map(({ location }) => location)).toEqual(["LC1"]);
  });

  it("C4(e2): ranks on surviving counts and flips when the state filter changes", () => {
    const entries = [
      entry({ location: "H1", stockState: "out_of_stock", mergeKey: "h-out", quantity: 0, instanceCount: 0 }),
      entry({ location: "LC1", stockState: "out_of_stock", mergeKey: "l-out", quantity: 0, instanceCount: 0 }),
      entry({ location: "LC1", stockState: "low_in_stock", mergeKey: "l-low-1" }),
      entry({ location: "LC1", stockState: "low_in_stock", mergeKey: "l-low-2" }),
      entry({ location: "LC1", stockState: "low_in_stock", mergeKey: "l-low-3" }),
      entry({ location: "LC1", stockState: "low_in_stock", mergeKey: "l-low-4" }),
    ];
    const all = groupedView(buildReportView(entries, filter({ groupByLocation: true }), keyOrder));
    const out = groupedView(buildReportView(entries, filter({ groupByLocation: true, states: new Set(["out_of_stock"]) }), keyOrder));

    expect(all.map(({ location }) => location)).toEqual(["LC1", "H1"]);
    expect(out.map(({ location }) => location)).toEqual(["H1", "LC1"]);
  });

  it("C4(f): enumerates all four within-group comparator levels", () => {
    const compare = makeGroupEntryComparator(keyOrder);
    const pairs: [StockReportEntryDto, StockReportEntryDto][] = [
      [entry({ stockState: "out_of_stock" }), entry({ stockState: "low_in_stock" })],
      [entry({ stockState: "low_in_stock", quantity: 1, instanceCount: 1 }), entry({ stockState: "low_in_stock", quantity: 2, instanceCount: 2 })],
      [entry({ itemCategory: "armchairs" }), entry({ itemCategory: "Dining Tables" })],
      [entry({ properties: { wood_type: ["oak"] } }), entry({ properties: { wood_type: ["teak"] } })],
    ];

    for (const [left, right] of pairs) {
      expect(compare(left, right)).toBeLessThan(0);
    }
  });

  it("C5(a): state filtering excludes non-selected states", () => {
    expect(applyStockFilters(
      [entry({ stockState: "low_in_stock" }), entry({ stockState: "high_in_stock" })],
      filter({ states: new Set(["low_in_stock"]) }),
    ).map(({ stockState }) => stockState)).toEqual(["low_in_stock"]);
  });

  it("C5(b): grouped location filtering drops other locations", () => {
    expect(applyStockFilters(
      [entry({ location: "H1" }), entry({ location: "LC1" })],
      filter({ groupByLocation: true, locations: new Set(["LC1"]) }),
    ).map(({ location }) => location)).toEqual(["LC1"]);
  });

  it("C5(c): compact location filtering re-quantifies current and missing contributions", () => {
    const [source] = compactEntries([
      entry({ location: "LC1", quantity: 2, instanceCount: 2, unitsToRestockTarget: 18 }),
      entry({ location: "H1", quantity: 18, instanceCount: 18, unitsToRestockTarget: 2 }),
    ]);
    const [result] = applyStockFilters(source ? [source] : [], filter({ locations: new Set(["LC1"]) }));

    expect(result).toMatchObject({
      quantity: 2, instanceCount: 2,
      unitsToRestockTarget: 18,
      locations: "LC1",
      contributions: [{
        location: "LC1",
        quantity: 2, instanceCount: 2,
        unitsToRestockTarget: 18,
      }],
    });
  });

  it("C5(d): compact rows with no selected location disappear", () => {
    const [source] = compactEntries([entry({ location: "H1" })]);
    expect(applyStockFilters([source], filter({ locations: new Set(["LC1"]) }))).toEqual([]);
  });

  it("C5(e): an empty location selection means all locations", () => {
    const [source] = compactEntries([
      entry({ location: "LC1", quantity: 2, instanceCount: 2 }),
      entry({ location: "H1", quantity: 18, instanceCount: 18 }),
    ]);
    expect(applyStockFilters([source], filter())).toEqual([source]);
  });

  it("C5(f): buildReportView composes compact, filter-and-requantify, then sort", () => {
    const entries = [
      entry({ location: "LC1", quantity: 2, instanceCount: 2, stockState: "low_in_stock" }),
      entry({ location: "H1", quantity: 18, instanceCount: 18, stockState: "low_in_stock" }),
      entry({ location: "H1", mergeKey: "other", quantity: 0, instanceCount: 0, stockState: "out_of_stock" }),
    ];
    const pipelineFilter = filter({
      states: new Set(["low_in_stock"]),
      locations: new Set(["LC1"]),
    });
    const expected = applyStockFilters(
      compactEntries(entries),
      pipelineFilter,
    ).toSorted(makeCompactRowComparator(keyOrder));

    expect(compactView(buildReportView(entries, pipelineFilter, keyOrder))).toEqual(expected);
  });

  it("C6: countPendingRows equals the rendered length in all four grouping and filter cases", () => {
    const entries = [
      entry({ location: "LC1", quantity: 2, instanceCount: 2, stockState: "low_in_stock" }),
      entry({ location: "H1", quantity: 18, instanceCount: 18, stockState: "low_in_stock" }),
      entry({ location: "H1", mergeKey: "other", quantity: 0, instanceCount: 0, stockState: "out_of_stock" }),
    ];
    const cases = [
      filter(),
      filter({ states: new Set(["low_in_stock"]), locations: new Set(["LC1"]) }),
      filter({ groupByLocation: true }),
      filter({ groupByLocation: true, locations: new Set(["LC1"]) }),
    ];

    for (const currentFilter of cases) {
      const view = buildReportView(entries, currentFilter, keyOrder);
      const rendered = "rows" in view
        ? view.rows.length
        : view.groups.reduce((count, currentGroup) => count + currentGroup.entries.length, 0);
      expect(countPendingRows(entries, currentFilter, keyOrder)).toBe(rendered);
    }
  });

  it("C7: counter tiles sum missing units, ignore state selection, and respect location selection in compact mode", () => {
    const tiles = computeCounterTiles([
      entry({ location: "LC1", stockState: "low_in_stock" }),
      entry({ location: "H1", stockState: "out_of_stock", quantity: 0, instanceCount: 0 }),
    ], filter({ states: new Set(["out_of_stock"]), locations: new Set(["LC1"]) }));

    expect(tiles).toEqual({ out: 0, low: 19, medium: 0, rest: 0 });
  });

  it("C7 grouped mode: counter tiles use per-location entries with the same filter rule", () => {
    const tiles = computeCounterTiles([
      entry({ location: "LC1", stockState: "low_in_stock" }),
      entry({ location: "H1", stockState: "out_of_stock", quantity: 0, instanceCount: 0 }),
    ], filter({ groupByLocation: true, states: new Set(["out_of_stock"]), locations: new Set(["LC1"]) }));

    expect(tiles).toEqual({ out: 0, low: 19, medium: 0, rest: 0 });
  });

  it("C8(a): derives a display-cased single-property config label", () => {
    const [source] = compactEntries([entry({ itemCategory: "Dining Chairs", properties: { wood_type: ["walnut"] } })]);
    const detail = deriveEntryDetail(source, [entry({ itemCategory: "Dining Chairs", properties: { wood_type: ["walnut"] } })], stockOptionsFixture);

    expect(detail.entries[0].configLabel).toBe("Config: Dining Chairs / Wood Type: Walnut");
  });

  it("C8(b): renders catch-all config with the vocabulary's plural category", () => {
    const source = compactEntries([entry({ itemCategory: "Side Tables", properties: {} })])[0];
    const detail = deriveEntryDetail(source, [entry({ itemCategory: "Side Tables", properties: {} })], stockOptionsFixture);

    expect(detail.entries[0].configLabel).toBe("Config: Side Tables");
  });

  it("C8(c): renders wildcard config with the humanized option key name", () => {
    const source = compactEntries([entry({ properties: { upholstery: null } })])[0];
    const detail = deriveEntryDetail(source, [entry({ properties: { upholstery: null } })], stockOptionsFixture);

    expect(detail.entries[0].configLabel).toBe("Config: Dining Chairs / Upholstery: Any");
  });

  it("C8(c2): a wildcard config on quantity reads as Set Of", () => {
    const source = compactEntries([entry({ properties: { quantity: null } })])[0];
    const detail = deriveEntryDetail(source, [entry({ properties: { quantity: null } })], stockOptionsFixture);

    expect(detail.entries[0].configLabel).toBe("Config: Dining Chairs / Set Of: Any");
  });

  it("C8(d): orders two config keys by propertyOptions and joins values", () => {
    const properties: StockPropertiesDto = {
      country: ["sweden"],
      wood_type: ["walnut", "oak"],
    };
    const source = compactEntries([entry({ properties })])[0];
    const detail = deriveEntryDetail(source, [entry({ properties })], stockOptionsFixture);

    expect(detail.entries[0].configLabel).toBe(
      "Config: Dining Chairs / Wood Type: Walnut, Oak · Country: Sweden",
    );
  });

  it("C8 detail: orders members by location and marks only multi-location groups", () => {
    const members = [
      entry({ location: "LC1", quantity: 2, instanceCount: 2 }),
      entry({ location: "H1", quantity: 3, instanceCount: 3 }),
    ];
    const source = compactEntries(members)[0];
    const detail = deriveEntryDetail(source, members, stockOptionsFixture);

    expect(detail.isMultiLocation).toBe(true);
    expect(detail.entries.map(({ location, quantity }) => ({ location, quantity }))).toEqual([
      { location: "H1", quantity: 3 },
      { location: "LC1", quantity: 2 },
    ]);
    expect(deriveEntryDetail(compactEntries([members[0]])[0], [members[0]], stockOptionsFixture).isMultiLocation).toBe(false);
  });

});

describe("stock report domain — P7 count mode", () => {
  // Every row here sets instanceCount apart from quantity, so a function that
  // silently reads the wrong one cannot pass.
  const lc1 = entry({ location: "LC1", mergeKey: "pair", quantity: 10, instanceCount: 2, unitsToRestockTarget: 18 });
  const h1 = entry({ location: "H1", mergeKey: "pair", quantity: 30, instanceCount: 3, unitsToRestockTarget: 17 });

  it("C6(a): compaction sums instanceCount and quantity independently across locations", () => {
    const [result] = compactEntries([lc1, h1]);

    expect(result).toMatchObject({ quantity: 40, instanceCount: 5, unitsToRestockTarget: 35 });
    expect(result.contributions).toEqual([
      { location: "H1", quantity: 30, instanceCount: 3, unitsToRestockTarget: 17 },
      { location: "LC1", quantity: 10, instanceCount: 2, unitsToRestockTarget: 18 },
    ]);
  });

  it("C6(a) location filter: re-summing a compact row keeps the two numbers apart", () => {
    const [filtered] = applyStockFilters(compactEntries([lc1, h1]), filter({ locations: new Set(["H1"]) }));

    expect(filtered).toMatchObject({ quantity: 30, instanceCount: 3, locations: "H1" });
  });

  it("C6(b): displayedCount reads instanceCount in instances mode and quantity in units mode", () => {
    const item = { quantity: 10, instanceCount: 2 };

    expect(displayedCount(item, "instances")).toBe(2);
    expect(displayedCount(item, "units")).toBe(10);
  });

  it("C6(c): compact and group comparators order by the displayed number and flip with the mode", () => {
    // Same state; a has fewer items but more units than b.
    const a = row({ mergeKey: "a", stockState: "low_in_stock", quantity: 50, instanceCount: 1, locations: "H1" });
    const b = row({ mergeKey: "b", stockState: "low_in_stock", quantity: 5, instanceCount: 4, locations: "H1" });
    const byItems = makeCompactRowComparator(keyOrder, "instances");
    const byUnits = makeCompactRowComparator(keyOrder, "units");

    expect(byItems(a, b)).toBeLessThan(0);
    expect(byUnits(a, b)).toBeGreaterThan(0);
    expect(makeCompactRowComparator(keyOrder)(a, b)).toBeLessThan(0);

    const ea = entry({ mergeKey: "a", stockState: "low_in_stock", quantity: 50, instanceCount: 1 });
    const eb = entry({ mergeKey: "b", stockState: "low_in_stock", quantity: 5, instanceCount: 4 });
    expect(makeGroupEntryComparator(keyOrder, "instances")(ea, eb)).toBeLessThan(0);
    expect(makeGroupEntryComparator(keyOrder, "units")(ea, eb)).toBeGreaterThan(0);

    const itemsView = compactView(buildReportView([ea, eb], filter(), keyOrder, "instances"));
    const unitsView = compactView(buildReportView([ea, eb], filter(), keyOrder, "units"));
    expect(itemsView.map(({ mergeKey }) => mergeKey)).toEqual(["a", "b"]);
    expect(unitsView.map(({ mergeKey }) => mergeKey)).toEqual(["b", "a"]);
  });

  it("C6(d): the missing figure is mode-independent, and its fallback subtracts items, not units", () => {
    const wire = entry({ quantity: 40, instanceCount: 4, unitsToRestockTarget: 16 });
    expect(missingQuantityForEntry(wire)).toBe(16);

    const fallback = entry({ quantity: 40, instanceCount: 4, unitsToRestockTarget: undefined });
    // target 20 − 4 items = 16; a unit-based fallback would clamp to 0.
    expect(missingQuantityForEntry(fallback)).toBe(16);

    const [compacted] = compactEntries([fallback]);
    expect(compacted.unitsToRestockTarget).toBe(16);
  });

  it("C6(e): counter tiles do not depend on the count mode", () => {
    const entries = [lc1, h1, entry({ location: "LC1", mergeKey: "zero", stockState: "out_of_stock", quantity: 0, instanceCount: 0, unitsToRestockTarget: 20 })];
    const tiles = computeCounterTiles(entries, filter());

    expect(tiles).toEqual({ out: 20, low: 0, medium: 0, rest: 35 });
    // computeCounterTiles takes no mode; the rows it sums carry the item gap only.
    expect(computeCounterTiles(entries, filter({ locations: new Set(["H1"]) }))).toEqual({ out: 0, low: 0, medium: 0, rest: 17 });
  });

  it("C6(b) detail: deriveEntryDetail carries both numbers per contributing location", () => {
    const [source] = compactEntries([lc1, h1]);
    const detail = deriveEntryDetail(source, [lc1, h1], stockOptionsFixture);

    expect(detail.entries.map(({ location, quantity, instanceCount }) => ({ location, quantity, instanceCount }))).toEqual([
      { location: "H1", quantity: 30, instanceCount: 3 },
      { location: "LC1", quantity: 10, instanceCount: 2 },
    ]);
  });

  it("C7 labels: the current label follows the mode and the missing label names items in units mode", () => {
    expect(stockCountLabels("instances")).toEqual({ current: "Items", missing: "To normal" });
    expect(stockCountLabels("units")).toEqual({ current: "Units", missing: "Missing items" });
    expect(countNoun(1, "instances")).toBe("item");
    expect(countNoun(2, "instances")).toBe("items");
    expect(countNoun(1, "units")).toBe("unit");
    expect(countNoun(5, "units")).toBe("units");
  });
});
