import { describe, expect, it, vi } from "vitest";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import { STOCK_STATES } from "./stock-states.domain";
import {
  buildReportView,
  compactEntries,
  makeCompactRowComparator,
  missingQuantityForEntry,
} from "./stock-report.domain";
import {
  createDefaultStockFilter,
  useStockReportStore,
} from "../stores/stock-report.store";
import type {
  StockReportEntryDto,
} from "../types/stock.dto";
import type { StockFilterState, StockState } from "../types/stock.types";
import type {
  StockPdfExportQuery,
  StockPdfModel,
} from "./stock-pdf.domain";

type PdfModule = typeof import("./stock-pdf.domain");
type PdfRenderHandle = import("../controllers/stock-report.controller").StockPdfRenderHandle;

async function loadPdfDomain(): Promise<PdfModule> {
  return import("./stock-pdf.domain");
}

function entry(
  overrides: Partial<StockReportEntryDto> = {},
): StockReportEntryDto {
  return {
    location: "H1",
    itemCategory: "Dining Chairs",
    properties: { wood_type: ["walnut"] },
    mergeKey: "chairs-walnut",
    quantity: 1,
    stockState: "normal_in_stock",
    thresholds: [
      { state: "low_in_stock", thresholdQuantity: 10 },
      { state: "medium_in_stock", thresholdQuantity: 15 },
      { state: "normal_in_stock", thresholdQuantity: 20 },
    ],
    unitsToNormalThreshold: 19,
    ...overrides,
  };
}

function exportQuery(
  overrides: Partial<StockPdfExportQuery> = {},
): StockPdfExportQuery {
  return {
    ...createDefaultStockFilter(),
    includeSummaryCounts: true,
    showContributingLocations: true,
    propertyKeyOrder: stockOptionsFixture.propertyOptions.map((option) => option.key),
    ...overrides,
  };
}

function sectionStates(model: StockPdfModel): StockState[] {
  return model.sections.map((section) => section.state);
}

function sectionCounts(model: StockPdfModel): number[] {
  return model.sections.map((section) => section.rows.length);
}

function viewCountByState(
  entries: readonly StockReportEntryDto[],
  filter: StockFilterState,
): Map<StockState, number> {
  const view = buildReportView(
    entries,
    filter,
    stockOptionsFixture.propertyOptions.map((option) => option.key),
  );
  const counts = new Map<StockState, number>();

  if ("rows" in view) {
    for (const row of view.rows) {
      counts.set(row.stockState, (counts.get(row.stockState) ?? 0) + 1);
    }
  } else {
    for (const group of view.groups) {
      for (const currentEntry of group.entries) {
        counts.set(
          currentEntry.stockState,
          (counts.get(currentEntry.stockState) ?? 0) + 1,
        );
      }
    }
  }

  return counts;
}

function viewMissingByState(
  entries: readonly StockReportEntryDto[],
  filter: StockFilterState,
): Map<StockState, number> {
  const view = buildReportView(
    entries,
    filter,
    stockOptionsFixture.propertyOptions.map((option) => option.key),
  );
  const totals = new Map<StockState, number>();

  if ("rows" in view) {
    for (const row of view.rows) {
      totals.set(
        row.stockState,
        (totals.get(row.stockState) ?? 0) + row.unitsToNormalThreshold,
      );
    }
  } else {
    for (const group of view.groups) {
      for (const currentEntry of group.entries) {
        totals.set(
          currentEntry.stockState,
          (totals.get(currentEntry.stockState) ?? 0) +
            missingQuantityForEntry(currentEntry),
        );
      }
    }
  }

  return totals;
}

function installNavigatorShare(
  share: (data: ShareData) => Promise<void>,
  canShare?: (data: ShareData) => boolean,
): void {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
  });
  if (canShare !== undefined) {
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: canShare,
    });
  }
}

function removeNavigatorShare(): void {
  Reflect.deleteProperty(navigator, "share");
  Reflect.deleteProperty(navigator, "canShare");
}

function renderHandle(blob = new Blob(["pdf"], { type: "application/pdf" })):
  PdfRenderHandle {
  return { blob, loading: false, error: null, url: null };
}

describe("stock PDF domain", () => {
  // Widened at P9 (owner authorization, 2026-09-02): the document, its font
  // registration and the sheet's render hook are react-pdf's only other homes, and all
  // three sit behind the report page's dynamic import (plan 9 C6).
  it("H1: react-pdf appears only as the controller's render-handle type and in ui/pdf", () => {
    const modules = import.meta.glob("../**/*.{ts,tsx}", {
      eager: true,
      import: "default",
      query: "?raw",
    }) as Record<string, string>;
    const matches = Object.entries(modules)
      .filter(([path]) => !/\.test\.tsx?$/.test(path))
      .filter(([, content]) => content.includes("@react-pdf/renderer"))
      .map(([path]) => path)
      .toSorted();

    expect(matches).toEqual([
      "../controllers/stock-report.controller.ts",
      "../ui/pdf/StockReportPdf.tsx",
      "../ui/pdf/stock-pdf-fonts.ts",
      "../ui/pdf/use-stock-pdf-render.tsx",
    ]);
    expect(modules["../controllers/stock-report.controller.ts"]).toMatch(
      /import type \{ UsePDFInstance \} from "@react-pdf\/renderer";/,
    );
  });

  it("C1(a): sections skip empty medium and mark produce first only on Out", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const model = buildPdfModel([
      entry({ mergeKey: "high", stockState: "high_in_stock", quantity: 9 }),
      entry({ mergeKey: "normal", stockState: "normal_in_stock", quantity: 4 }),
      entry({ mergeKey: "low", stockState: "low_in_stock", quantity: 2 }),
      entry({ mergeKey: "out", stockState: "out_of_stock", quantity: 0 }),
    ], exportQuery());

    expect(sectionStates(model)).toEqual([
      STOCK_STATES[0],
      STOCK_STATES[1],
      STOCK_STATES[3],
      STOCK_STATES[4],
    ]);
    expect(model.sections.map((section) => section.isProduceFirst)).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });

  it("C1(b): produce first moves to Low when Out has no rows", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const model = buildPdfModel([
      entry({ mergeKey: "normal", stockState: "normal_in_stock", quantity: 4 }),
      entry({ mergeKey: "low", stockState: "low_in_stock", quantity: 2 }),
    ], exportQuery());

    expect(sectionStates(model)).toEqual([STOCK_STATES[1], STOCK_STATES[3]]);
    expect(model.sections.map((section) => section.isProduceFirst)).toEqual([
      true,
      false,
    ]);
  });

  it("C2: section rows follow the compact-row comparator on a discriminating input", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const entries = [
      entry({
        mergeKey: "pine",
        properties: { wood_type: ["pine"], country: ["aaa"] },
        quantity: 5,
        stockState: "low_in_stock",
      }),
      entry({
        mergeKey: "oak",
        properties: { wood_type: ["oak"], country: ["zzz"] },
        quantity: 5,
        stockState: "low_in_stock",
      }),
    ];
    const query = exportQuery();
    const model = buildPdfModel(entries, query);
    const keyOrder = query.propertyKeyOrder ?? [];
    const expected = compactEntries(entries).toSorted(
      makeCompactRowComparator(keyOrder),
    );

    expect(model.sections[0]?.rows.map((row) => row.mergeKey)).toEqual(
      expected.map((row) => row.mergeKey),
    );
    expect(entries.map((currentEntry) => currentEntry.mergeKey)).not.toEqual(
      expected.map((row) => row.mergeKey),
    );
  });

  it("C3(a): filtered model counts equal the compact app view counts", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const entries = [
      entry({ mergeKey: "out", stockState: "out_of_stock", quantity: 0 }),
      entry({ mergeKey: "low-one", stockState: "low_in_stock", quantity: 2 }),
      entry({ mergeKey: "low-two", location: "LC1", stockState: "low_in_stock", quantity: 3 }),
      entry({ mergeKey: "normal", stockState: "normal_in_stock", quantity: 4 }),
      entry({ mergeKey: "shared", location: "LC1", stockState: "high_in_stock", quantity: 5 }),
      entry({ mergeKey: "shared", location: "H1", stockState: "high_in_stock", quantity: 6 }),
    ];
    const query = exportQuery({
      states: new Set([STOCK_STATES[1], STOCK_STATES[4]]),
      locations: new Set(["LC1"]),
    });
    const model = buildPdfModel(entries, query);
    const expectedRows = viewCountByState(entries, query);
    const expectedMissing = viewMissingByState(entries, query);

    expect(sectionCounts(model)).toEqual(
      model.sections.map((section) => expectedRows.get(section.state) ?? 0),
    );
    const selectedStates = STOCK_STATES.filter((state) =>
      query.states.has(state)
    );
    expect(model.summaryCounts).toHaveLength(selectedStates.length);
    expect(model.summaryCounts!.map(({ state, missingQuantity }) => ({
      state,
      missingQuantity,
    }))).toEqual(selectedStates.map((state) => ({
      state,
      missingQuantity: expectedMissing.get(state) ?? 0,
    })));
    expect(model.entryCount).toBe(2);
    expect(model.entryCount).not.toBe(entries.length);
  });

  it("C3(b): grouped model counts equal the grouped app view counts", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const entries = [
      entry({ mergeKey: "shared", location: "LC1", stockState: "low_in_stock", quantity: 2 }),
      entry({ mergeKey: "shared", location: "H1", stockState: "low_in_stock", quantity: 3 }),
      entry({ mergeKey: "out", stockState: "out_of_stock", quantity: 0 }),
      entry({ mergeKey: "normal", stockState: "normal_in_stock", quantity: 4 }),
    ];
    const query = exportQuery({ groupByLocation: true });
    const model = buildPdfModel(entries, query);
    const expectedRows = viewCountByState(entries, query);
    const expectedMissing = viewMissingByState(entries, query);

    expect(sectionCounts(model)).toEqual(
      model.sections.map((section) => expectedRows.get(section.state) ?? 0),
    );
    expect(model.summaryCounts!.map(({ state, missingQuantity }) => ({
      state,
      missingQuantity,
    }))).toEqual(STOCK_STATES.map((state) => ({
      state,
      missingQuantity: expectedMissing.get(state) ?? 0,
    })));
    expect(model.entryCount).toBe(4);
    expect(model.entryCount).not.toBe(compactEntries(entries).length);
  });

  it("C3(c): summary tiles total missing units per state rather than stock instances", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const model = buildPdfModel([
      entry({ mergeKey: "out-1", stockState: STOCK_STATES[0], unitsToNormalThreshold: 6 }),
      entry({ mergeKey: "out-2", stockState: STOCK_STATES[0], unitsToNormalThreshold: 8 }),
      entry({ mergeKey: "out-3", stockState: STOCK_STATES[0], unitsToNormalThreshold: 20 }),
      entry({ mergeKey: "out-4", stockState: STOCK_STATES[0], unitsToNormalThreshold: 20 }),
      entry({ mergeKey: "medium", stockState: STOCK_STATES[2], unitsToNormalThreshold: 8 }),
    ], exportQuery());

    expect(model.entryCount).toBe(5);
    expect(
      Object.fromEntries(
        model.summaryCounts!.map(({ state, missingQuantity }) => [
          state,
          missingQuantity,
        ]),
      ),
    ).toEqual({
      [STOCK_STATES[0]]: 54,
      [STOCK_STATES[1]]: 0,
      [STOCK_STATES[2]]: 8,
      [STOCK_STATES[3]]: 0,
      [STOCK_STATES[4]]: 0,
    });
  });

  it("C4: settings use state labels, exact grouping wording, locations, and derived source count", async () => {
    const { buildPdfModel } = await loadPdfDomain();
    const entries = [
      entry({ mergeKey: "shared", location: "LC1", stockState: "low_in_stock", quantity: 2 }),
      entry({ mergeKey: "shared", location: "H1", stockState: "low_in_stock", quantity: 3 }),
      entry({ mergeKey: "normal", stockState: "normal_in_stock", quantity: 4 }),
    ];
    const compactModel = buildPdfModel(entries, exportQuery({
      states: new Set([STOCK_STATES[1], STOCK_STATES[3]]),
      locations: new Set(["LC1", "H1"]),
    }));
    const groupedModel = buildPdfModel(entries, exportQuery({
      groupByLocation: true,
    }));
    const noSummaryModel = buildPdfModel(entries, exportQuery({
      includeSummaryCounts: false,
    }));

    expect(compactModel.settings.states).toEqual(["Low", "Normal"]);
    expect(compactModel.settings.grouping).toBe("Compacted across locations");
    expect(compactModel.settings.locations).toEqual(["H1", "LC1"]);
    expect(compactModel.settings.source).toContain(String(compactModel.entryCount));
    expect(compactModel.entryCount).not.toBe(entries.length);
    expect(groupedModel.settings.grouping).toBe("Grouped by location");
    expect(groupedModel.settings.locations).toEqual(["All locations"]);
    expect(noSummaryModel.summaryCounts).toBeUndefined();
  });

  it("C5: export toggles isolate the report query, including both filter Sets", async () => {
    const {
      initializeStockPdfExportController,
      setStockPdfExportGroupByLocationController,
      toggleStockPdfLocationController,
      toggleStockPdfStateController,
    } = await import("../controllers/stock-report.controller");
    const activeFilter = {
      states: new Set([STOCK_STATES[0], STOCK_STATES[1]]),
      locations: new Set(["H1"]),
      groupByLocation: false,
    } satisfies StockFilterState;
    useStockReportStore.getState().setAppliedFilter(activeFilter);
    initializeStockPdfExportController();

    const initialReportFilter = useStockReportStore.getState().appliedFilter;
    const initialExportQuery = useStockReportStore.getState().exportState.query;
    expect(initialExportQuery).not.toBeNull();
    expect(initialExportQuery!.states).not.toBe(initialReportFilter.states);
    expect(initialExportQuery!.locations).not.toBe(initialReportFilter.locations);

    setStockPdfExportGroupByLocationController(true);
    toggleStockPdfLocationController("LC1");
    toggleStockPdfStateController(STOCK_STATES[2]);

    const reportFilter = useStockReportStore.getState().appliedFilter;
    const exportFilter = useStockReportStore.getState().exportState.query!;
    expect(reportFilter.groupByLocation).toBe(false);
    expect([...reportFilter.states]).toEqual([...activeFilter.states]);
    expect([...reportFilter.locations]).toEqual([...activeFilter.locations]);
    expect(exportFilter.groupByLocation).toBe(true);
    expect([...exportFilter.locations]).toEqual(["H1", "LC1"]);
    expect([...exportFilter.states]).toEqual([
      STOCK_STATES[0],
      STOCK_STATES[1],
      STOCK_STATES[2],
    ]);
  });

  it("C5(keyOrder): the initializer copies the report's vocabulary key order into the export query", async () => {
    // Coordinator row (S10, plan-8 consumption). buildPdfModel defaults a missing
    // propertyKeyOrder to [] and every other row supplies the order itself, so deleting
    // the initializer's `propertyKeyOrder: currentKeyOrder()` left 12/12 green while the
    // PDF would sort MC2 key 4 without the vocabulary — the P4 C9 shape.
    const { buildPdfModel } = await loadPdfDomain();
    const { initializeStockPdfExportController } = await import(
      "../controllers/stock-report.controller"
    );
    useStockReportStore.getState().setOptions(stockOptionsFixture);
    useStockReportStore.getState().setAppliedFilter(createDefaultStockFilter());
    const expectedKeyOrder = stockOptionsFixture.propertyOptions.map((option) => option.key);

    initializeStockPdfExportController();
    const query = useStockReportStore.getState().exportState.query!;
    expect(query.propertyKeyOrder).toEqual(expectedKeyOrder);
    expect(expectedKeyOrder.length).toBeGreaterThan(0);

    // and the input still discriminates: without the vocabulary the C2 pair sorts the other way
    const entries = [
      entry({ mergeKey: "pine", properties: { wood_type: ["pine"], country: ["aaa"] }, quantity: 5, stockState: "low_in_stock" }),
      entry({ mergeKey: "oak", properties: { wood_type: ["oak"], country: ["zzz"] }, quantity: 5, stockState: "low_in_stock" }),
    ];
    const withVocabulary = buildPdfModel(entries, query).sections[0]!.rows.map((row) => row.mergeKey);
    const withoutVocabulary = buildPdfModel(entries, { ...query, propertyKeyOrder: [] }).sections[0]!.rows.map((row) => row.mergeKey);
    expect(withVocabulary).not.toEqual(withoutVocabulary);
  });

  it("C6: filename uses local calendar parts and zero-pads month and day", async () => {
    const { pdfFilename } = await loadPdfDomain();

    // Both ends of the day, because which one exposes a UTC implementation depends
    // on the sign of the machine's offset: 23:30 rolls forward under a negative
    // offset (the Americas), 00:30 rolls back under a positive one (this machine is
    // +0200). With only the 23:30 pair, `toISOString().slice(0,10)` passed here and
    // in UTC CI, and the bug was caught only incidentally by C7(a).
    expect(pdfFilename(new Date(2026, 0, 7, 23, 30))).toBe(
      "beyo-stock-2026-01-07.pdf",
    );
    expect(pdfFilename(new Date(2026, 0, 8, 0, 30))).toBe(
      "beyo-stock-2026-01-08.pdf",
    );
    expect(pdfFilename(new Date(2026, 8, 1, 23, 30))).toBe(
      "beyo-stock-2026-09-01.pdf",
    );
    expect(pdfFilename(new Date(2026, 8, 2, 0, 30))).toBe(
      "beyo-stock-2026-09-02.pdf",
    );
  });

  it("C7(a): share receives a PDF File with the dated filename", async () => {
    const { generateAndShareStockPdfController } = await import(
      "../controllers/stock-report.controller"
    );
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    installNavigatorShare(share, () => true);

    await generateAndShareStockPdfController(
      renderHandle(),
      new Date(2026, 8, 1),
    );

    expect(share).toHaveBeenCalledTimes(1);
    const [data] = share.mock.calls[0]!;
    expect(data.files).toHaveLength(1);
    expect(data.files?.[0]).toBeInstanceOf(File);
    expect(data.files?.[0]?.name).toBe("beyo-stock-2026-09-01.pdf");
    expect(data.files?.[0]?.type).toBe("application/pdf");
  });

  it("C7(b): absent share uses an object URL and anchor download, and preview opens its URL", async () => {
    const { generateAndShareStockPdfController, previewStockPdfController } = await import(
      "../controllers/stock-report.controller"
    );
    removeNavigatorShare();
    const objectUrl = "blob:stock-report";
    const createObjectUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue(objectUrl);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const open = vi.spyOn(window, "open").mockReturnValue(null);

    await generateAndShareStockPdfController(renderHandle(), new Date(2026, 8, 1));
    await previewStockPdfController(renderHandle(), new Date(2026, 8, 1));
    const unsupportedShare = vi.fn<(data: ShareData) => Promise<void>>().mockResolvedValue(undefined);
    installNavigatorShare(unsupportedShare, () => false);
    await generateAndShareStockPdfController(renderHandle(), new Date(2026, 8, 1));

    expect(createObjectUrl).toHaveBeenCalledTimes(3);
    expect(click).toHaveBeenCalledTimes(2);
    expect(unsupportedShare).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(objectUrl, "_blank", "noopener,noreferrer");
  });

  it("C7(c): a rejected share is treated as cancellation without an error or download", async () => {
    const { generateAndShareStockPdfController } = await import(
      "../controllers/stock-report.controller"
    );
    const share = vi.fn<(data: ShareData) => Promise<void>>().mockRejectedValue(
      new Error("share dismissed"),
    );
    installNavigatorShare(share, () => true);
    const createObjectUrl = vi.spyOn(URL, "createObjectURL");
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

    await expect(
      generateAndShareStockPdfController(renderHandle(), new Date(2026, 8, 1)),
    ).resolves.toMatchObject({ method: "cancelled" });
    expect(createObjectUrl).not.toHaveBeenCalled();
    expect(click).not.toHaveBeenCalled();
    expect(useStockReportStore.getState().exportState.errorMessage).toBeNull();
  });
});
