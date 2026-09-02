import { describe, expect, it } from "vitest";
import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import type { StockPropertiesDto } from "../types/stock.dto";
import {
  buildCriteria,
  displayValueFor,
  propertyKeyLabel,
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

  it("C3(b): quantity reads as Set Of everywhere a key is shown", () => {
    expect(propertyKeyLabel("quantity")).toBe("Set Of");
    expect(renderCriteriaChips({ quantity: null }, stockOptionsFixture)).toEqual([
      "SET OF · any",
    ]);
  });

  it("C3(c): a key with no display name is humanized", () => {
    expect(propertyKeyLabel("wood_type")).toBe("Wood Type");
    expect(propertyKeyLabel("upholstery")).toBe("Upholstery");
    expect(propertyKeyLabel("a_key_the_backend_added")).toBe(
      "A Key The Backend Added",
    );
    expect(propertyKeyLabel("height_2")).toBe("Height 2");
    expect(renderCriteriaChips({ upholstery: null }, stockOptionsFixture)).toEqual([
      "UPHOLSTERY · any",
    ]);
    expect(renderCriteriaChips({ wood_type: null }, stockOptionsFixture)).toEqual([
      "WOOD TYPE · any",
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

    expect(renderCriteriaChips(universalOnly, stockOptionsFixture)).toEqual([
      "Teak",
      "1950-1960s",
      "1-20 kg",
      "Sweden",
    ]);
  });
});
