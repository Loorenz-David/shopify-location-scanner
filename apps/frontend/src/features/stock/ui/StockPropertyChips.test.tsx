import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { StockPropertyChips } from "./StockPropertyChips";
import type { CriteriaChip } from "../domain/stock-criteria.domain";

// jsdom lays nothing out — every offset reads 0 — so the truncation rule has nothing to
// measure and no test could see it work. These getters stand in a layout for the duration
// of one test: a 220-wide container, chips 100 wide two to a row, a 40-wide pill. The
// column gap stays 0 because jsdom resolves no stylesheet, which the arithmetic allows for.
const CHIP_WIDTH = 100;
const PER_ROW = 2;
const ROW_HEIGHT = 30;
const installed: string[] = [];

function chipIndex(element: HTMLElement): number {
  return [...(element.parentElement?.children ?? [])]
    .filter((child) => child.getAttribute("data-testid") === "stock-property-chip")
    .indexOf(element);
}

function fakeLayout(): void {
  const define = (name: string, get: (this: HTMLElement) => number): void => {
    Object.defineProperty(HTMLElement.prototype, name, { configurable: true, get });
    installed.push(name);
  };
  const testId = (element: HTMLElement): string | null => element.getAttribute("data-testid");

  define("clientWidth", function () {
    return testId(this) === null ? 220 : 0;
  });
  define("offsetWidth", function () {
    if (testId(this) === "stock-property-chip") return CHIP_WIDTH;
    if (testId(this) === "stock-property-chip-overflow") return 40;
    return 0;
  });
  define("offsetLeft", function () {
    return testId(this) === "stock-property-chip"
      ? (chipIndex(this) % PER_ROW) * CHIP_WIDTH
      : 0;
  });
  define("offsetTop", function () {
    return testId(this) === "stock-property-chip"
      ? Math.floor(chipIndex(this) / PER_ROW) * ROW_HEIGHT
      : 0;
  });
}

afterEach(() => {
  for (const name of installed.splice(0)) {
    Reflect.deleteProperty(HTMLElement.prototype, name);
  }
});

function chipsFor(count: number): CriteriaChip[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `key_${index}`,
    label: `Key ${index}`,
    values: [`Value ${index}`],
    isWildcard: false,
  }));
}

function renderedChipKeys(): (string | null)[] {
  return screen
    .queryAllByTestId("stock-property-chip")
    .map((chip) => chip.getAttribute("data-property-key"));
}

describe("StockPropertyChips", () => {
  it("renders every chip and no pill when no cap is asked for", () => {
    fakeLayout();
    render(<StockPropertyChips chips={chipsFor(7)} />);

    expect(renderedChipKeys()).toHaveLength(7);
    expect(screen.queryByTestId("stock-property-chip-overflow")).toBeNull();
  });

  it("leaves a list that fits inside the cap untouched", () => {
    fakeLayout();
    // Four chips are exactly two rows of this layout.
    render(<StockPropertyChips chips={chipsFor(4)} maxRows={2} />);

    expect(renderedChipKeys()).toEqual(["key_0", "key_1", "key_2", "key_3"]);
    expect(screen.queryByTestId("stock-property-chip-overflow")).toBeNull();
  });

  it("caps at two rows and counts what it dropped on the pill", () => {
    fakeLayout();
    // Five chips need three rows. Both chips of row two cannot stay — the second ends at
    // 200 of 220, leaving no room for the 40-wide pill — so the pill takes its place and
    // stands for it as well as for the chip that was on row three.
    render(<StockPropertyChips chips={chipsFor(5)} maxRows={2} />);

    expect(renderedChipKeys()).toEqual(["key_0", "key_1", "key_2"]);
    const pill = screen.getByTestId("stock-property-chip-overflow");
    expect(pill).toHaveTextContent("2+");
    expect(pill).toHaveAttribute("aria-label", "2 more properties");
    expect(pill.className).not.toContain("invisible");
  });

  it("re-measures from the full list when the chips change", () => {
    fakeLayout();
    const { rerender } = render(<StockPropertyChips chips={chipsFor(5)} maxRows={2} />);
    expect(renderedChipKeys()).toHaveLength(3);

    rerender(<StockPropertyChips chips={chipsFor(3)} maxRows={2} />);

    // Three chips fit in two rows, so the shorter list is not still truncated to the
    // count the longer one produced.
    expect(renderedChipKeys()).toEqual(["key_0", "key_1", "key_2"]);
    expect(screen.queryByTestId("stock-property-chip-overflow")).toBeNull();
  });

  it("keeps the wildcard placeholder for an empty list", () => {
    fakeLayout();
    render(<StockPropertyChips chips={[]} maxRows={2} />);

    expect(screen.getByText("any property").tagName).toBe("EM");
    expect(renderedChipKeys()).toHaveLength(0);
    expect(screen.queryByTestId("stock-property-chip-overflow")).toBeNull();
  });
});
