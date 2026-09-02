import { describe, expect, it } from "vitest";
import { STOCK_STATE_META, STOCK_STATES } from "./stock-states.domain";
import {
  commitThreshold,
  deriveBands,
  thresholdDraftFrom,
  thresholdDtosFrom,
} from "./stock-thresholds.domain";
import type { ThresholdDraft } from "../types/stock.types";

const startingDraft: ThresholdDraft = { low: 5, medium: 15, high: 39 };

describe("stock threshold domain", () => {
  it.each([
    ["C5(a)", "high", 14, { low: 5, medium: 13, high: 14 }],
    ["C5(b)", "high", 2, { low: 1, medium: 2, high: 3 }],
    ["C5(c)", "medium", 5, { low: 4, medium: 5, high: 39 }],
    ["C5(d)", "low", 15, { low: 15, medium: 16, high: 39 }],
    ["C5(e)", "low", 39, { low: 39, medium: 40, high: 41 }],
    ["C5(f)", "medium", 39, { low: 5, medium: 39, high: 40 }],
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

    expect(notANumber).toEqual(startingDraft);
    expect(notANumber).not.toBe(startingDraft);
  });

  it("C5(h): committing 0 or an empty field deletes the threshold", () => {
    expect(commitThreshold(startingDraft, "low", 0)).toEqual({
      low: null,
      medium: 15,
      high: 39,
    });
    expect(commitThreshold(startingDraft, "medium", "")).toEqual({
      low: 5,
      medium: null,
      high: 39,
    });
    expect(commitThreshold(startingDraft, "high", 0)).toEqual({
      low: 5,
      medium: 15,
      high: null,
    });
  });

  it("C5(i): the last configured threshold cannot be deleted", () => {
    const single: ThresholdDraft = { low: null, medium: null, high: 39 };

    expect(commitThreshold(single, "high", 0)).toEqual(single);
    expect(commitThreshold(single, "high", "")).toEqual(single);
    expect(commitThreshold(single, "low", 0)).toEqual(single);
  });

  it("C5(j): a single configured threshold can go all the way down to 1", () => {
    const single: ThresholdDraft = { low: null, medium: null, high: 5 };

    expect(commitThreshold(single, "high", 1)).toEqual({
      low: null,
      medium: null,
      high: 1,
    });
  });

  it("C5(k): enabling a row slots it strictly above configured rows below", () => {
    expect(
      commitThreshold({ low: null, medium: null, high: 39 }, "low", 3),
    ).toEqual({ low: 3, medium: null, high: 39 });
    expect(
      commitThreshold({ low: 5, medium: null, high: 39 }, "medium", 2),
    ).toEqual({ low: 5, medium: 6, high: 39 });
    expect(
      commitThreshold({ low: 5, medium: 6, high: null }, "high", 1),
    ).toEqual({ low: 5, medium: 6, high: 7 });
  });

  it("C6: 200 deterministic random commits preserve a strict valid ladder", () => {
    let seed = 0x12345678;
    let draft = startingDraft;
    const rows = ["low", "medium", "high"] as const;

    for (let index = 0; index < 200; index += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const row = rows[seed % rows.length];
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const value = seed % 50;
      draft = commitThreshold(draft, row, value);

      const configured = rows
        .map((currentRow) => draft[currentRow])
        .filter((limit): limit is number => limit !== null);
      expect(configured.length).toBeGreaterThanOrEqual(1);
      let previous = 0;
      for (const limit of configured) {
        expect(limit).toBeGreaterThan(previous);
        previous = limit;
      }
    }
  });

  it.each([
    [
      "C7 fixture 5/15/39",
      { low: 5, medium: 15, high: 39 },
      ["0", "1–5", "6–15", "16–39", "40+"],
      [...STOCK_STATES],
      44,
    ],
    [
      "C7 minimal fixture 1/2/3",
      { low: 1, medium: 2, high: 3 },
      ["0", "1", "2", "3", "4+"],
      [...STOCK_STATES],
      8,
    ],
    [
      "C7 single high threshold",
      { low: null, medium: null, high: 5 },
      ["0", "1–5", "6+"],
      [STOCK_STATES[0], STOCK_STATES[3], STOCK_STATES[4]],
      10,
    ],
    [
      "C7 low and high only",
      { low: 2, medium: null, high: 5 },
      ["0", "1–2", "3–5", "6+"],
      [STOCK_STATES[0], STOCK_STATES[1], STOCK_STATES[3], STOCK_STATES[4]],
      10,
    ],
  ] as const)(
    "%s: labels and colors cover every quantity without gaps or overlap",
    (_name, draft, expectedLabels, expectedStates, maximum) => {
      const bands = deriveBands(draft);

      expect(bands.map((band) => band.label)).toEqual([...expectedLabels]);
      expect(bands.map((band) => band.state)).toEqual([...expectedStates]);
      bands.forEach((band) => {
        expect(band.tint).toBe(STOCK_STATE_META[band.state].tint);
        expect(band.text).toBe(STOCK_STATE_META[band.state].text);
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

  it("C8: draft/wire adapters round-trip only configured thresholds", () => {
    const wire = [
      { state: STOCK_STATES[1], thresholdQuantity: 2 },
      { state: STOCK_STATES[3], thresholdQuantity: 9 },
    ];
    const draft = thresholdDraftFrom(wire);

    expect(draft).toEqual({ low: 2, medium: null, high: 9 });
    expect(thresholdDtosFrom(draft)).toEqual(wire);
  });
});
