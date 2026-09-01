import { describe, expect, it } from "vitest";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import type { StockPropertiesDto } from "../types/stock.dto";
import {
  buildCriteria,
  displayValueFor,
  renderCriteriaChips,
} from "./stock-criteria.domain";

describe("stock criteria domain", () => {
  it("C1(a): selected values always build as a display-cased array", () => {
    const result = buildCriteria({
      properties: [
        { key: "wood_type", selectedValues: ["Teak", "Oak"], anyValue: false },
      ],
    });

    expect(result).toEqual({ wood_type: ["Teak", "Oak"] });
    expect(Array.isArray(result.wood_type)).toBe(true);
  });

  it("C1(b): Any value builds the wildcard null value", () => {
    expect(
      buildCriteria({
        properties: [
          { key: "upholstery", selectedValues: [], anyValue: true },
        ],
      }),
    ).toEqual({ upholstery: null });
  });

  it("C1(c): a removed property row leaves its key absent", () => {
    const result = buildCriteria({
      properties: [
        { key: "wood_type", selectedValues: ["Teak"], anyValue: false },
      ],
    });

    expect(result).not.toHaveProperty("upholstery");
  });

  it("C1(d): an empty property draft builds catch-all criteria", () => {
    expect(buildCriteria({ properties: [] })).toEqual({});
  });

  it("C2: display casing round-trips wire values and preserves the wildcard chip", () => {
    const wireCriteria: StockPropertiesDto = {
      wood_type: ["teak"],
      upholstery: null,
    };
    const chips = renderCriteriaChips(wireCriteria, stockOptionsFixture);
    const renderedValues = chips.filter((chip) => chip !== "UPHOLSTERY · any");
    const rebuilt = buildCriteria({
      properties: [
        {
          key: "wood_type",
          selectedValues: renderedValues,
          anyValue: false,
        },
        {
          key: "upholstery",
          selectedValues: [],
          anyValue: chips.includes("UPHOLSTERY · any"),
        },
      ],
    });

    expect(displayValueFor("wood_type", "teak", stockOptionsFixture)).toBe(
      "Teak",
    );
    expect(chips).toContain("Teak");
    expect(chips).toContain("UPHOLSTERY · any");
    expect(rebuilt).toEqual({ wood_type: ["Teak"], upholstery: null });
    expect(
      Object.fromEntries(
        Object.entries(rebuilt).map(([key, value]) => [
          key,
          value === null
            ? null
            : (Array.isArray(value) ? value : [value]).map((item) =>
                item.toLowerCase(),
              ),
        ]),
      ),
    ).toEqual({ wood_type: ["teak"], upholstery: null });
  });

  it("C3: an unknown wire value is rendered raw without throwing", () => {
    expect(
      renderCriteriaChips(
        { wood_type: ["mystery"] },
        stockOptionsFixture,
      ),
    ).toEqual(["mystery"]);
  });

  it("C4: chips follow vocabulary order and include universal-only keys", () => {
    const universalOnly: StockPropertiesDto = {
      country: ["sweden"],
      wood_type: ["teak"],
      weight_definition: ["1-20 kg"],
      years: ["1950-1960s"],
    };

    expect(renderCriteriaChips(universalOnly, stockOptionsFixture)).toEqual([
      "Teak",
      "1950-1960s",
      "1-20 kg",
      "Sweden",
    ]);
  });
});
