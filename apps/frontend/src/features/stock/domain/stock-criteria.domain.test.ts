import { describe, expect, it } from "vitest";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import type { StockPropertiesDto } from "../types/stock.dto";
import {
  buildCriteria,
  criteriaChips,
  criteriaSummaryText,
  displayValueFor,
  propertyKeyLabel,
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
    const chips = criteriaChips(wireCriteria, stockOptionsFixture);
    const renderedValues = chips.flatMap((chip) =>
      chip.key === "wood_type" ? [...chip.values] : [],
    );
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
          anyValue: chips.some(
            (chip) => chip.key === "upholstery" && chip.isWildcard,
          ),
        },
      ],
    });

    expect(displayValueFor("wood_type", "teak", stockOptionsFixture)).toBe(
      "Teak",
    );
    expect(chips).toContainEqual({
      key: "wood_type",
      label: "Wood Type",
      values: ["Teak"],
      isWildcard: false,
    });
    expect(chips).toContainEqual({
      key: "upholstery",
      label: "Upholstery",
      values: ["Any"],
      isWildcard: true,
    });
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
      criteriaChips({ wood_type: ["mystery"] }, stockOptionsFixture),
    ).toEqual([
      { key: "wood_type", label: "Wood Type", values: ["mystery"], isWildcard: false },
    ]);
  });

  it("C3(b): quantity reads as Set Of, and a bare number never stands alone", () => {
    expect(propertyKeyLabel("quantity")).toBe("Set Of");
    expect(criteriaChips({ quantity: null }, stockOptionsFixture)).toEqual([
      { key: "quantity", label: "Set Of", values: ["Any"], isWildcard: true },
    ]);
    // The defect this pairing exists for: `6` beside the report's own quantity
    // columns read as a stock count.
    expect(criteriaChips({ quantity: ["6"] }, stockOptionsFixture)).toEqual([
      { key: "quantity", label: "Set Of", values: ["6"], isWildcard: false },
    ]);
    expect(criteriaSummaryText({ quantity: ["6"] }, stockOptionsFixture)).toEqual([
      "Set Of: 6",
    ]);
  });

  it("C3(c): a key with no display name is humanized", () => {
    expect(propertyKeyLabel("wood_type")).toBe("Wood Type");
    expect(propertyKeyLabel("upholstery")).toBe("Upholstery");
    expect(propertyKeyLabel("a_key_the_backend_added")).toBe(
      "A Key The Backend Added",
    );
    expect(propertyKeyLabel("height_2")).toBe("Height 2");
    expect(criteriaSummaryText({ upholstery: null }, stockOptionsFixture)).toEqual([
      "Upholstery: Any",
    ]);
    expect(criteriaSummaryText({ wood_type: null }, stockOptionsFixture)).toEqual([
      "Wood Type: Any",
    ]);
  });

  it("C3(e): humanizing never yields an empty label", () => {
    expect(propertyKeyLabel("___")).toBe("___");
    expect(propertyKeyLabel("")).toBe("");
    expect(propertyKeyLabel("__wood__type__")).toBe("Wood Type");
  });

  it("C3(d): the label is display only — the wire key is untouched", () => {
    expect(buildCriteria({
      properties: [{ key: "quantity", selectedValues: ["6"], anyValue: false }],
    })).toEqual({ quantity: ["6"] });
  });

  it("C4: chips follow vocabulary order and include universal-only keys", () => {
    const universalOnly: StockPropertiesDto = {
      country: ["sweden"],
      wood_type: ["teak"],
      weight_definition: ["1-20 kg"],
      years: ["1950-1960s"],
    };

    expect(
      criteriaChips(universalOnly, stockOptionsFixture).map(
        (chip) => `${chip.label}: ${chip.values.join(", ")}`,
      ),
    ).toEqual([
      "Wood Type: Teak",
      "Years: 1950-1960s",
      "Weight Definition: 1-20 kg",
      "Country: Sweden",
    ]);
  });

  it("C4(b): a multi-value criterion is one chip, not one per value", () => {
    const properties: StockPropertiesDto = { wood_type: ["teak", "oak"] };

    expect(criteriaChips(properties, stockOptionsFixture)).toEqual([
      {
        key: "wood_type",
        label: "Wood Type",
        values: ["Teak", "Oak"],
        isWildcard: false,
      },
    ]);
    expect(criteriaSummaryText(properties, stockOptionsFixture)).toEqual([
      "Wood Type: Teak, Oak",
    ]);
  });
});
