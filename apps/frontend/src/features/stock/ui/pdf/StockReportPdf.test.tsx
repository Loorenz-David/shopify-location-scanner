// @vitest-environment node
//
// react-pdf's node build is the only one that exposes `renderToBuffer`, and under the
// jsdom environment vitest swaps in jsdom's typed-array globals, so pdfkit's
// `instanceof Uint8Array` fails on Node buffers and every compressed stream comes out
// mangled. The shared teardown (`src/test/setup.ts`) clears `localStorage`, which a node
// environment does not define; the shim below gives it something to clear.
// The app tsconfig types only `vite/client`, so nothing here imports a `node:` module:
// streams are inflated with the Web `DecompressionStream`, and the registered `file:`
// font sources are served from Vite-inlined data URLs.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { stockOptionsFixture } from "../../api/mocks/get-stock-options.fixture";
import { buildPdfModel, pdfFilename } from "../../domain/stock-pdf.domain";
import { STOCK_STATES } from "../../domain/stock-states.domain";
import { createDefaultStockFilter } from "../../stores/stock-report.store";
import type { StockPdfModel } from "../../domain/stock-pdf.domain";
import type { StockReportEntryDto } from "../../types/stock.dto";
import { readStockPdfPageCount } from "./stock-pdf-page-count";
import ibmPlexMonoMedium from "../../../../assets/fonts/IBMPlexMono-Medium.ttf?inline";
import ibmPlexMonoRegular from "../../../../assets/fonts/IBMPlexMono-Regular.ttf?inline";
import poppinsBold from "../../../../assets/fonts/Poppins-Bold.ttf?inline";
import poppinsMedium from "../../../../assets/fonts/Poppins-Medium.ttf?inline";
import poppinsRegular from "../../../../assets/fonts/Poppins-Regular.ttf?inline";
import poppinsSemiBold from "../../../../assets/fonts/Poppins-SemiBold.ttf?inline";

const inlineFonts: Record<string, string> = {
  "IBMPlexMono-Medium.ttf": ibmPlexMonoMedium,
  "IBMPlexMono-Regular.ttf": ibmPlexMonoRegular,
  "Poppins-Bold.ttf": poppinsBold,
  "Poppins-Medium.ttf": poppinsMedium,
  "Poppins-Regular.ttf": poppinsRegular,
  "Poppins-SemiBold.ttf": poppinsSemiBold,
};

if (!("localStorage" in globalThis)) {
  Reflect.set(globalThis, "localStorage", { clear: () => undefined });
}

// Registered font sources are `file:` URLs here; Node's fetch does not serve them.
beforeAll(() => {
  const realFetch = globalThis.fetch;
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("file:")) {
      const file = url.slice(url.lastIndexOf("/") + 1);
      const inline = inlineFonts[file];
      if (inline === undefined) {
        throw new Error(`no inlined font for ${file}`);
      }
      return realFetch(inline);
    }
    return realFetch(input, init);
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Text extraction over the rendered bytes. pdfkit embeds each font as a CID font with
// an Identity-H encoding, writes text as `[<gid gid …>] TJ` inside `BT … ET` blocks (one
// block per laid-out line) and maps glyph ids back to Unicode through a ToUnicode CMap.
// Everything except the FlateDecode streams is plain ASCII.
// ---------------------------------------------------------------------------

interface PdfObject {
  dictionary: string;
  stream: Uint8Array | null;
}

const latin1 = new TextDecoder("latin1");

function parseObjects(bytes: Uint8Array): Map<number, PdfObject> {
  const source = latin1.decode(bytes);
  const objects = new Map<number, PdfObject>();
  const objectStart = /(\d+) 0 obj\s*/g;
  let match: RegExpExecArray | null;

  while ((match = objectStart.exec(source)) !== null) {
    let cursor = match.index + match[0].length;
    if (source.slice(cursor, cursor + 2) !== "<<") {
      continue;
    }

    let depth = 0;
    const dictionaryStart = cursor;
    while (cursor < source.length) {
      if (source.startsWith("<<", cursor)) {
        depth += 1;
        cursor += 2;
      } else if (source.startsWith(">>", cursor)) {
        depth -= 1;
        cursor += 2;
        if (depth === 0) {
          break;
        }
      } else {
        cursor += 1;
      }
    }

    const dictionary = source.slice(dictionaryStart, cursor);
    const streamKeyword = /^\s*stream\r?\n/.exec(source.slice(cursor, cursor + 12));
    let stream: Uint8Array | null = null;
    if (streamKeyword !== null) {
      const length = Number(/\/Length (\d+)/.exec(dictionary)?.[1] ?? "0");
      const dataStart = cursor + streamKeyword[0].length;
      stream = bytes.subarray(dataStart, dataStart + length);
    }

    objects.set(Number(match[1]), { dictionary, stream });
  }

  return objects;
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function streamText(object: PdfObject): Promise<string> {
  if (object.stream === null) {
    return "";
  }
  return latin1.decode(
    object.dictionary.includes("/FlateDecode") ? await inflate(object.stream) : object.stream,
  );
}

function hexToUnicode(hex: string): string {
  const units: number[] = [];
  for (let offset = 0; offset < hex.length; offset += 4) {
    units.push(Number.parseInt(hex.slice(offset, offset + 4), 16));
  }
  return String.fromCharCode(...units);
}

function parseToUnicode(cmap: string): Map<number, string> {
  const glyphs = new Map<number, string>();
  const hexToken = /<([0-9a-fA-F]+)>/g;

  for (const block of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    const tokens = [...block[1]!.matchAll(hexToken)].map((token) => token[1]!);
    for (let index = 0; index + 1 < tokens.length; index += 2) {
      glyphs.set(Number.parseInt(tokens[index]!, 16), hexToUnicode(tokens[index + 1]!));
    }
  }

  for (const block of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const entry = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]+>)/g;
    for (const range of block[1]!.matchAll(entry)) {
      const low = Number.parseInt(range[1]!, 16);
      const high = Number.parseInt(range[2]!, 16);
      const destination = range[3]!;
      if (destination.startsWith("[")) {
        const targets = [...destination.matchAll(hexToken)].map((token) => token[1]!);
        targets.forEach((target, index) => glyphs.set(low + index, hexToUnicode(target)));
      } else {
        const base = Number.parseInt(destination.slice(1, -1), 16);
        for (let glyph = low; glyph <= high; glyph += 1) {
          glyphs.set(glyph, String.fromCharCode(base + (glyph - low)));
        }
      }
    }
  }

  return glyphs;
}

function reference(dictionary: string, key: string): number | null {
  const match = new RegExp(`\\/${key}\\s+(\\d+) 0 R`).exec(dictionary);
  return match === null ? null : Number(match[1]);
}

// Lines of text per page, in page order. A line is one `BT … ET` block; its text runs
// are concatenated so a label split only by a style change still reads whole.
async function extractPdfLines(bytes: Uint8Array): Promise<string[][]> {
  const objects = parseObjects(bytes);
  const pageTree = [...objects.values()].find((object) =>
    /\/Type\s*\/Pages\b/.test(object.dictionary),
  );
  if (pageTree === undefined) {
    throw new Error("no page tree in the rendered document");
  }
  const kids = /\/Kids\s*\[([^\]]*)\]/.exec(pageTree.dictionary)?.[1] ?? "";
  const pageNumbers = [...kids.matchAll(/(\d+) 0 R/g)].map((kid) => Number(kid[1]));
  const cmapCache = new Map<number, Map<number, string>>();

  const pages: string[][] = [];
  for (const pageNumber of pageNumbers) {
    const page = objects.get(pageNumber)!;
    const resources = objects.get(reference(page.dictionary, "Resources")!)!;
    const fontsByName = new Map<string, Map<number, string>>();
    const fontBlock = /\/Font\s*<<([\s\S]*?)>>/.exec(resources.dictionary)?.[1] ?? "";
    for (const font of fontBlock.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
      const fontObject = objects.get(Number(font[2]))!;
      const toUnicode = reference(fontObject.dictionary, "ToUnicode")!;
      if (!cmapCache.has(toUnicode)) {
        cmapCache.set(toUnicode, parseToUnicode(await streamText(objects.get(toUnicode)!)));
      }
      fontsByName.set(font[1]!, cmapCache.get(toUnicode)!);
    }

    const content = await streamText(objects.get(reference(page.dictionary, "Contents")!)!);
    const lines: string[] = [];
    let current: string | null = null;
    let glyphs: Map<number, string> | null = null;
    const token = /\/(F\d+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>|\bBT\b|\bET\b/g;
    for (const operator of content.matchAll(token)) {
      if (operator[0] === "BT") {
        current = "";
      } else if (operator[0] === "ET") {
        if (current !== null) {
          lines.push(current);
        }
        current = null;
      } else if (operator[1] !== undefined) {
        glyphs = fontsByName.get(operator[1]) ?? null;
      } else if (operator[2] !== undefined && current !== null && glyphs !== null) {
        const hex = operator[2];
        for (let offset = 0; offset < hex.length; offset += 4) {
          current += glyphs.get(Number.parseInt(hex.slice(offset, offset + 4), 16)) ?? "�";
        }
      }
    }

    pages.push(lines);
  }

  return pages;
}

// A text run with the position react-pdf placed it at. `extractPdfLines` reads the
// character stream, which is enough for "does this text appear"; a wrap question needs
// coordinates. react-pdf positions every run by nesting `q / 1 0 0 1 x y cm / Q`
// translations around it rather than by moving the text cursor (every `BT` block carries
// the same identity matrix), so placing one means walking the graphics stack.
interface PlacedRun {
  x: number;
  y: number;
  text: string;
}

async function extractPlacedRuns(bytes: Uint8Array): Promise<PlacedRun[]> {
  const objects = parseObjects(bytes);
  const pageTree = [...objects.values()].find((object) =>
    /\/Type\s*\/Pages\b/.test(object.dictionary),
  )!;
  const kids = /\/Kids\s*\[([^\]]*)\]/.exec(pageTree.dictionary)![1]!;
  const page = objects.get(Number(/(\d+) 0 R/.exec(kids)![1]))!;
  const resources = objects.get(reference(page.dictionary, "Resources")!)!;
  const fontsByName = new Map<string, Map<number, string>>();
  const fontBlock = /\/Font\s*<<([\s\S]*?)>>/.exec(resources.dictionary)?.[1] ?? "";
  for (const font of fontBlock.matchAll(/\/(F\d+)\s+(\d+) 0 R/g)) {
    const toUnicode = reference(objects.get(Number(font[2]))!.dictionary, "ToUnicode")!;
    fontsByName.set(font[1]!, parseToUnicode(await streamText(objects.get(toUnicode)!)));
  }

  const content = await streamText(objects.get(reference(page.dictionary, "Contents")!)!);
  const token =
    /\bq\b|\bQ\b|([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+) cm|\/(F\d+)\s+[\d.]+\s+Tf|<([0-9a-fA-F]+)>|\bBT\b|\bET\b/g;
  const stack: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  const runs: PlacedRun[] = [];
  let glyphs: Map<number, string> | null = null;
  let current: PlacedRun | null = null;

  for (const operator of content.matchAll(token)) {
    const top = stack[stack.length - 1]!;
    if (operator[0] === "q") {
      stack.push({ ...top });
    } else if (operator[0] === "Q") {
      stack.pop();
    } else if (operator[1] !== undefined) {
      // The page is drawn under a `1 0 0 -1 0 height cm` flip, so a negative y scale
      // mirrors what has been accumulated so far.
      top.x += Number(operator[5]);
      top.y = Number(operator[4]) < 0 ? Number(operator[6]) - top.y : top.y + Number(operator[6]);
    } else if (operator[7] !== undefined) {
      glyphs = fontsByName.get(operator[7]) ?? null;
    } else if (operator[0] === "BT") {
      current = { x: top.x, y: top.y, text: "" };
    } else if (operator[0] === "ET") {
      if (current !== null && current.text !== "") {
        runs.push(current);
      }
      current = null;
    } else if (operator[8] !== undefined && current !== null && glyphs !== null) {
      const hex = operator[8];
      for (let offset = 0; offset < hex.length; offset += 4) {
        current.text += glyphs.get(Number.parseInt(hex.slice(offset, offset + 4), 16)) ?? "�";
      }
    }
  }

  return runs;
}

function countWordBounded(haystack: string, needle: string): number {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [...haystack.matchAll(new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, "g"))].length;
}

// ---------------------------------------------------------------------------
// Fixture: every contract category, most of them twice with distinct properties, spread
// round-robin over the five states — enough rows to spill past one A4 page (C1) and,
// for C2, a mix of categories that occur once and twice so a doubled row render or a
// dropped section header changes a count.
// ---------------------------------------------------------------------------

const keyOrder = stockOptionsFixture.propertyOptions.map((option) => option.key);
const woods = stockOptionsFixture.propertyOptions.find((option) => option.key === "wood_type")!
  .values.map((value) => value.toLowerCase());

function twoPageEntries(): StockReportEntryDto[] {
  const entries: StockReportEntryDto[] = [];
  stockOptionsFixture.itemCategories.forEach((itemCategory, categoryIndex) => {
    const variants = categoryIndex < 20 ? 2 : 1;
    for (let variant = 0; variant < variants; variant += 1) {
      const ordinal = entries.length;
      entries.push({
        location: ordinal % 3 === 0 ? "LC1" : "H1",
        itemCategory,
        properties: { wood_type: [woods[(categoryIndex + variant) % woods.length]!] },
        mergeKey: `p9-${categoryIndex}-${variant}`,
        quantity: ordinal % 7,
        instanceCount: ordinal % 7,
        stockState: STOCK_STATES[ordinal % STOCK_STATES.length]!,
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 10 },
          { state: STOCK_STATES[2], thresholdQuantity: 15 },
          { state: STOCK_STATES[3], thresholdQuantity: 20 },
        ],
        unitsToRestockTarget: 20 - (ordinal % 7),
      });
    }
  });
  return entries;
}

function twoPageModel(): StockPdfModel {
  return buildPdfModel(twoPageEntries(), {
    ...createDefaultStockFilter(),
    includeSummaryCounts: true,
    showContributingLocations: true,
    countMode: "instances",
    propertyKeyOrder: keyOrder,
  });
}

const generatedAt = new Date(2026, 8, 2, 9, 37);

async function renderFixture(model: StockPdfModel): Promise<Uint8Array> {
  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { StockReportPdfDocument } = await import("./StockReportPdf");
  return renderToBuffer(
    <StockReportPdfDocument
      model={model}
      options={stockOptionsFixture}
      filename={pdfFilename(generatedAt)}
      generatedAt={generatedAt}
    />,
  );
}

describe("stock report PDF document", () => {
  it("C1: renders a multi-page PDF whose page-count read-back equals the page objects written", async () => {
    const model = twoPageModel();
    const buffer = await renderFixture(model);

    // (a) it is a PDF
    expect(latin1.decode(buffer.subarray(0, 4))).toBe("%PDF");

    // (b) the two-page fixture spans at least two pages — counted from the page objects
    // themselves, independently of the read-back under test
    const pageObjects = [...parseObjects(buffer).values()].filter((object) =>
      /\/Type\s*\/Page\b/.test(object.dictionary),
    );
    expect(pageObjects.length).toBeGreaterThanOrEqual(2);

    // (c) P8's page-count stub, fulfilled: the read-back the sheet uses agrees
    expect(readStockPdfPageCount(buffer)).toBe(pageObjects.length);
  });

  it("C2: every section label and row category appears exactly once per model occurrence", async () => {
    const model = twoPageModel();
    const buffer = await renderFixture(model);
    const text = (await extractPdfLines(buffer)).flat().join("\n");

    // Expected counts are derived from the model: a section label is printed once as a
    // section title and once per mention in the settings box; a category once per row.
    const expectedLabels = new Map<string, number>();
    for (const section of model.sections) {
      expectedLabels.set(section.label, (expectedLabels.get(section.label) ?? 0) + 1);
    }
    for (const label of model.settings.states) {
      expectedLabels.set(label, (expectedLabels.get(label) ?? 0) + 1);
    }
    const expectedCategories = new Map<string, number>();
    for (const row of model.sections.flatMap((section) => section.rows)) {
      expectedCategories.set(row.itemCategory, (expectedCategories.get(row.itemCategory) ?? 0) + 1);
    }

    // S10: the input discriminates — sections exist for every state, and categories
    // occur both once and twice, so a duplicated or dropped render changes a count.
    expect(model.sections.length).toBe(STOCK_STATES.length);
    expect(new Set(expectedCategories.values())).toEqual(new Set([1, 2]));

    const labelCounts = Object.fromEntries(
      [...expectedLabels.keys()].map((label) => [label, countWordBounded(text, label)]),
    );
    expect(labelCounts).toEqual(Object.fromEntries(expectedLabels));

    const categoryCounts = Object.fromEntries(
      [...expectedCategories.keys()].map((category) => [category, countWordBounded(text, category)]),
    );
    expect(categoryCounts).toEqual(Object.fromEntries(expectedCategories));
  });

  it("C3: renders separate Items and Missing columns with their supplied values", async () => {
    const model = buildPdfModel([
      {
        location: "LC1",
        itemCategory: "Dining Chairs",
        properties: {},
        mergeKey: "current-missing-proof",
        quantity: 83, instanceCount: 83,
        stockState: STOCK_STATES[1],
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 90 },
          { state: STOCK_STATES[2], thresholdQuantity: 95 },
          { state: STOCK_STATES[3], thresholdQuantity: 180 },
        ],
        unitsToRestockTarget: 97,
      },
    ], {
      ...createDefaultStockFilter(),
      includeSummaryCounts: false,
      showContributingLocations: true,
      countMode: "instances",
      propertyKeyOrder: keyOrder,
    });
    const lines = (await extractPdfLines(await renderFixture(model))).flat();
    const text = lines.join("\n");

    expect(text).toMatch(/items/i);
    expect(text).toMatch(/missing/i);
    expect(lines).toContain("83");
    expect(lines).toContain("97");
  });

  it("C3(properties): a criteria pair too long for the column moves whole to the next line", async () => {
    // The reported layout: in the narrow (with-locations) properties column, the inline
    // run broke at the space after "Extension Type:", leaving the key at the end of one
    // line and "Outside Extension" alone on the next.
    const model = buildPdfModel([
      {
        location: "O2",
        itemCategory: "Dining Tables",
        properties: { shape: ["oval"], extension_type: ["Outside Extension"] },
        mergeKey: "wrapping-pair",
        quantity: 2, instanceCount: 2,
        stockState: STOCK_STATES[1],
        thresholds: [{ state: STOCK_STATES[3], thresholdQuantity: 20 }],
        unitsToRestockTarget: 18,
      },
    ], {
      ...createDefaultStockFilter(),
      includeSummaryCounts: false,
      // The narrow column is the one that wraps; the wide one fits the pairs on one line.
      showContributingLocations: true,
      countMode: "instances",
      propertyKeyOrder: keyOrder,
    });
    const runs = await extractPlacedRuns(await renderFixture(model));
    const lineOf = (text: string): number => {
      const matches = runs.filter((run) => run.text.startsWith(text));
      expect(matches).toHaveLength(1);
      return matches[0]!.y;
    };

    // S10: the fixture must actually wrap — the pairs do not fit on one line, which is
    // where a key could be left behind by its value.
    expect(lineOf("Extension Type")).not.toBe(lineOf("Shape"));
    // Each key shares its line with the start of its own value.
    expect(lineOf("Oval")).toBe(lineOf("Shape"));
    expect(lineOf("Outside")).toBe(lineOf("Extension Type"));
    // The pair that did not fit moved down, rather than the value alone.
    expect(lineOf("Extension Type")).toBeLessThan(lineOf("Shape"));
  });

  it("C4: renders missing-unit totals in the state summary tiles", async () => {
    const entries: StockReportEntryDto[] = [
      {
        location: "H1",
        itemCategory: "Armchairs",
        properties: {},
        mergeKey: "out-1",
        quantity: 0, instanceCount: 0,
        stockState: STOCK_STATES[0],
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 2 },
          { state: STOCK_STATES[2], thresholdQuantity: 4 },
          { state: STOCK_STATES[3], thresholdQuantity: 6 },
        ],
        unitsToRestockTarget: 6,
      },
      {
        location: "H1",
        itemCategory: "Sofas",
        properties: {},
        mergeKey: "out-2",
        quantity: 0, instanceCount: 0,
        stockState: STOCK_STATES[0],
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 3 },
          { state: STOCK_STATES[2], thresholdQuantity: 6 },
          { state: STOCK_STATES[3], thresholdQuantity: 8 },
        ],
        unitsToRestockTarget: 8,
      },
      {
        location: "H1",
        itemCategory: "Dining Chairs",
        properties: {},
        mergeKey: "out-3",
        quantity: 0, instanceCount: 0,
        stockState: STOCK_STATES[0],
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 10 },
          { state: STOCK_STATES[2], thresholdQuantity: 15 },
          { state: STOCK_STATES[3], thresholdQuantity: 20 },
        ],
        unitsToRestockTarget: 20,
      },
      {
        location: "O2",
        itemCategory: "Dining Tables",
        properties: {},
        mergeKey: "out-4",
        quantity: 0, instanceCount: 0,
        stockState: STOCK_STATES[0],
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 10 },
          { state: STOCK_STATES[2], thresholdQuantity: 15 },
          { state: STOCK_STATES[3], thresholdQuantity: 20 },
        ],
        unitsToRestockTarget: 20,
      },
      {
        location: "H1",
        itemCategory: "Dining Chairs",
        properties: {},
        mergeKey: "medium",
        quantity: 12, instanceCount: 12,
        stockState: STOCK_STATES[2],
        thresholds: [
          { state: STOCK_STATES[1], thresholdQuantity: 10 },
          { state: STOCK_STATES[2], thresholdQuantity: 15 },
          { state: STOCK_STATES[3], thresholdQuantity: 20 },
        ],
        unitsToRestockTarget: 8,
      },
    ];
    const model = buildPdfModel(entries, {
      ...createDefaultStockFilter(),
      states: new Set(STOCK_STATES.slice(0, 4)),
      includeSummaryCounts: true,
      showContributingLocations: true,
      countMode: "instances",
      propertyKeyOrder: keyOrder,
    });
    const lines = (await extractPdfLines(await renderFixture(model))).flat();
    const text = lines.join("\n");

    expect(lines).toContain("54");
    expect(lines.filter((line) => line === "8")).toHaveLength(3);
    expect(text).not.toMatch(/extra/i);
  });
});

describe("stock report PDF document — P7 count mode (C7(d))", () => {
  const discriminatingEntry: StockReportEntryDto = {
    location: "LC1",
    itemCategory: "Dining Chairs",
    properties: {},
    mergeKey: "count-mode-proof",
    quantity: 83,
    instanceCount: 41,
    stockState: STOCK_STATES[1],
    thresholds: [
      { state: STOCK_STATES[1], thresholdQuantity: 90 },
      { state: STOCK_STATES[2], thresholdQuantity: 95 },
      { state: STOCK_STATES[3], thresholdQuantity: 180 },
    ],
    unitsToRestockTarget: 139,
  };

  async function renderedLines(countMode: "instances" | "units"): Promise<string[]> {
    const model = buildPdfModel([discriminatingEntry], {
      ...createDefaultStockFilter(),
      includeSummaryCounts: false,
      showContributingLocations: true,
      countMode,
      propertyKeyOrder: keyOrder,
    });
    return (await extractPdfLines(await renderFixture(model))).flat();
  }

  // Column headers render upper-cased and the extractor splits nested Text runs, so
  // the header reads "ITEMS"/"UNITS", a wrapped "Missing items" reads "MISSING " then
  // "ITEMS", and the settings line reads "Count · " followed by its value.
  function settingsValue(lines: readonly string[], key: string): string | undefined {
    const index = lines.indexOf(key);
    return index === -1 ? undefined : lines[index + 1];
  }

  it("C7(d) items: the current column is headed Items, shows instanceCount, and the settings box says Items", async () => {
    const lines = await renderedLines("instances");
    const text = lines.join("\n");

    expect(lines).toContain("ITEMS");
    expect(lines).not.toContain("UNITS");
    expect(lines).toContain("41");
    expect(lines).not.toContain("83");
    expect(lines).toContain("139");
    expect(settingsValue(lines, "Count · ")).toBe("Items");
    expect(text).not.toMatch(/MISSING \nITEMS/);
  });

  it("C7(d) units: the current column is headed Units, shows quantity, the gap is labelled Missing items, and the settings box says Units", async () => {
    const lines = await renderedLines("units");
    const text = lines.join("\n");

    expect(lines).toContain("UNITS");
    expect(lines).toContain("83");
    expect(lines).not.toContain("41");
    expect(lines).toContain("139");
    expect(text).toMatch(/MISSING \nITEMS/);
    expect(settingsValue(lines, "Count · ")).toBe("Units");
  });
});
