import { describe, expect, it } from "vitest";

interface SourceFile {
  path: string;
  content: string;
}

function findFilesContaining(
  files: readonly SourceFile[],
  matcher: RegExp,
): Set<string> {
  return new Set(
    files.filter((file) => matcher.test(file.content)).map((file) => file.path),
  );
}

function readStockSourceFiles(): SourceFile[] {
  const modules = import.meta.glob("./**/*.{ts,tsx}", {
    eager: true,
    import: "default",
    query: "?raw",
  }) as Record<string, string>;

  return Object.entries(modules)
    .filter(([path]) => !/\.test\.tsx?$/.test(path))
    .toSorted(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => ({
      path: path.replace(/^\.\//, ""),
      content,
    }));
}

function escapedAlternation(values: readonly string[]): RegExp {
  return new RegExp(values.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "i");
}

const stateHexes = [
  "#C0392B",
  "#FCEAE7",
  "#D9453D",
  "#C4661C",
  "#FDF0E4",
  "#E8843C",
  "#93750F",
  "#FBF4DC",
  "#E0B93A",
  "#157F58",
  "#E4F6EC",
  "#0E8A5F",
  "#2D7FC4",
  "#E6F1FB",
  "#3B9BF0",
] as const;

const stateNames = [
  "out_of_stock",
  "low_in_stock",
  "medium_in_stock",
  "high_in_stock",
  "extra_in_stock",
] as const;

describe("stock source allowlists", () => {
  it("C6(a): the env flag is confined to its one read site", () => {
    const files = readStockSourceFiles();
    expect(findFilesContaining(files, /VITE_STOCK_API_MODE/)).toEqual(
      new Set(["api/stock-api-mode.ts"]),
    );
  });

  it("C6(b): state hexes are confined to the state domain", () => {
    const files = readStockSourceFiles();
    expect(findFilesContaining(files, escapedAlternation(stateHexes))).toEqual(
      new Set(["domain/stock-states.domain.ts"]),
    );
  });

  it("C6(c): state names are confined to the state union, domain, and report fixture", () => {
    const files = readStockSourceFiles();
    expect(findFilesContaining(files, escapedAlternation(stateNames))).toEqual(
      new Set([
        "domain/stock-states.domain.ts",
        "types/stock.dto.ts",
        "api/mocks/get-stock-report.fixture.ts",
      ]),
    );
  });

  it("C6 shipped call site: the guard reads the real non-test feature file list", () => {
    const files = readStockSourceFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files.map((file) => file.path)).toContain(
      "domain/stock-states.domain.ts",
    );
    expect(files.every((file) => !/\.test\.tsx?$/.test(file.path))).toBe(true);
  });

  it("C6(a) probe: an injected env-flag violation changes the matched file set", () => {
    const files = readStockSourceFiles();
    const violated = [...files, { path: "synthetic/env.ts", content: "VITE_STOCK_API_MODE" }];
    expect(findFilesContaining(violated, /VITE_STOCK_API_MODE/)).not.toEqual(
      new Set(["api/stock-api-mode.ts"]),
    );
  });

  it("C6(b) probe: an injected hex violation changes the matched file set", () => {
    const files = readStockSourceFiles();
    const violated = [...files, { path: "synthetic/hex.ts", content: "#C0392B" }];
    expect(findFilesContaining(violated, escapedAlternation(stateHexes))).not.toEqual(
      new Set(["domain/stock-states.domain.ts"]),
    );
  });

  it("C6(c) probe: an injected state-name violation changes the matched file set", () => {
    const files = readStockSourceFiles();
    const violated = [...files, { path: "synthetic/state.ts", content: "out_of_stock" }];
    expect(findFilesContaining(violated, escapedAlternation(stateNames))).not.toEqual(
      new Set([
        "domain/stock-states.domain.ts",
        "types/stock.dto.ts",
        "api/mocks/get-stock-report.fixture.ts",
      ]),
    );
  });
});
