import { describe, expect, it } from "vitest";
import { STOCK_STATE_META, STOCK_STATES } from "./stock-states.domain";
import { commitThreshold, deriveBands } from "./stock-thresholds.domain";
import type { ThresholdDraft } from "../types/stock.types";

const startingDraft: ThresholdDraft = { low: 5, medium: 15, normal: 39 };

describe("stock threshold domain", () => {
  it.each([
    ["C5(a)", "normal", 14, { low: 5, medium: 13, normal: 14 }],
    ["C5(b)", "normal", 2, { low: 1, medium: 2, normal: 3 }],
    ["C5(c)", "medium", 5, { low: 4, medium: 5, normal: 39 }],
    ["C5(d)", "low", 15, { low: 15, medium: 16, normal: 39 }],
    ["C5(e)", "low", 39, { low: 39, medium: 40, normal: 41 }],
    ["C5(f)", "medium", 39, { low: 5, medium: 39, normal: 40 }],
    ["C5(h)", "low", 0, { low: 1, medium: 15, normal: 39 }],
  ] as const)(
    "%s: committing %s produces the exact threshold triple",
    (_criterion, row, value, expected) => {
      const result = commitThreshold(startingDraft, row, value);

      expect(result).toEqual(expected);
      expect(result).not.toBe(startingDraft);
    },
  );

  it("C5(g): typed non-numeric values leave the draft unchanged", () => {
    const notANumber = commitThreshold(
      startingDraft,
      "medium",
      "not-a-number",
    );
    const empty = commitThreshold(startingDraft, "medium", "");

    expect(notANumber).toEqual(startingDraft);
    expect(notANumber).not.toBe(startingDraft);
    expect(empty).toEqual(startingDraft);
    expect(empty).not.toBe(startingDraft);
  });

  it("C6: 200 deterministic random commits preserve a strict valid ladder", () => {
    let seed = 0x12345678;
    let draft = startingDraft;
    const rows = ["low", "medium", "normal"] as const;

    for (let index = 0; index < 200; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const row = rows[seed % rows.length];
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const value = seed % 50;
      draft = commitThreshold(draft, row, value);

      expect(draft.low).toBeGreaterThanOrEqual(1);
      expect(draft.low).toBeLessThan(draft.medium);
      expect(draft.medium).toBeLessThan(draft.normal);
    }
  });

  it.each([
    [
      "C7 fixture 5/15/39",
      [5, 15, 39],
      ["0", "1–5", "6–15", "16–39", "40+"],
      44,
    ],
    [
      "C7 minimal fixture 1/2/3",
      [1, 2, 3],
      ["0", "1", "2", "3", "4+"],
      8,
    ],
  ] as const)(
    "%s: labels and colors cover every quantity without gaps or overlap",
    (_name, thresholds, expectedLabels, maximum) => {
      const bands = deriveBands(
        thresholds[0],
        thresholds[1],
        thresholds[2],
      );

      expect(bands.map((band) => band.label)).toEqual(expectedLabels);
      expect(bands.map((band) => band.state)).toEqual([...STOCK_STATES]);
      bands.forEach((band, index) => {
        expect(band.tint).toBe(STOCK_STATE_META[STOCK_STATES[index]].tint);
        expect(band.text).toBe(STOCK_STATE_META[STOCK_STATES[index]].text);
      });

      const membership = Array.from({ length: maximum + 1 }, (_, quantity) =>
        bands
          .filter(
            (band) =>
              quantity >= band.minQuantity &&
              (band.maxQuantity === null || quantity <= band.maxQuantity),
          )
          .map((band) => band.state),
      );
      expect(membership.every((states) => states.length === 1)).toBe(true);
      expect(membership.flat()).toHaveLength(maximum + 1);
    },
  );
});
