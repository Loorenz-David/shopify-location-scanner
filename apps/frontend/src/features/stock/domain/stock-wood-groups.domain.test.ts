import { describe, expect, it } from "vitest";

import { stockOptionsFixture } from "../api/mocks/get-stock-options.fixture";
import type { StockOptionsDto } from "../types/stock.dto";
import {
  WOOD_GROUP_KEY,
  WOOD_TYPE_KEY,
  withoutConflictingWoodKey,
  woodGroupCaption,
  woodGroupLegend,
} from "./stock-wood-groups.domain";

const definitions = [
  { key: WOOD_TYPE_KEY },
  { key: WOOD_GROUP_KEY },
  { key: "country" },
];

describe("stock wood groups", () => {
  it("offers both wood keys while neither is in use", () => {
    expect(withoutConflictingWoodKey(definitions, [])).toEqual(definitions);
    expect(withoutConflictingWoodKey(definitions, ["country"])).toEqual(
      definitions,
    );
  });

  it("hides each wood key once the other is in use", () => {
    // Criteria are AND-ed, so the pair can only ever match their intersection.
    expect(
      withoutConflictingWoodKey(definitions, [WOOD_TYPE_KEY]).map((d) => d.key),
    ).toEqual([WOOD_TYPE_KEY, "country"]);
    expect(
      withoutConflictingWoodKey(definitions, [WOOD_GROUP_KEY]).map((d) => d.key),
    ).toEqual([WOOD_GROUP_KEY, "country"]);
  });

  it("never hides a non-wood key", () => {
    expect(
      withoutConflictingWoodKey(definitions, ["country", "years"]).map(
        (d) => d.key,
      ),
    ).toEqual([WOOD_TYPE_KEY, WOOD_GROUP_KEY, "country"]);
  });

  it("captions a group with the woods it catches", () => {
    expect(woodGroupCaption("Dark", stockOptionsFixture)).toBe(
      "Mahogany, Santos Rosewood, Dark Oak, Dark Teak, Walnut",
    );
    expect(woodGroupCaption("Light", stockOptionsFixture)).toBe(
      "Oak, Beech, Pine, Birch, Elm",
    );
  });

  it("falls back to no caption when the server sent no members", () => {
    // The members are expected to be edited server-side, so an older or
    // trimmed payload must leave the picker showing the bare group name
    // rather than breaking it.
    const withoutGroups: StockOptionsDto = {
      itemCategories: stockOptionsFixture.itemCategories,
      propertyOptions: stockOptionsFixture.propertyOptions,
    };
    expect(woodGroupCaption("Dark", withoutGroups)).toBeNull();
    expect(woodGroupCaption("Unknown", stockOptionsFixture)).toBeNull();
  });
  describe("the PDF legend", () => {
    const groupRow = { properties: { [WOOD_GROUP_KEY]: ["dark"] } };
    const namedRow = { properties: { [WOOD_TYPE_KEY]: ["teak"] } };

    it("lists every configured group once any row uses one", () => {
      // Not only the groups on the page: the reader's question is usually about
      // a wood that is absent from this particular report.
      expect(woodGroupLegend([namedRow, groupRow], stockOptionsFixture)).toEqual([
        { group: "Dark", members: "Mahogany, Santos Rosewood, Dark Oak, Dark Teak, Walnut" },
        { group: "Teak", members: "Teak, Cherry" },
        { group: "Light", members: "Oak, Beech, Pine, Birch, Elm" },
      ]);
    });

    it("prints nothing when no row uses a group", () => {
      expect(woodGroupLegend([namedRow], stockOptionsFixture)).toEqual([]);
      expect(woodGroupLegend([], stockOptionsFixture)).toEqual([]);
    });

    it("counts a wildcard group as usage, since it still needs explaining", () => {
      expect(
        woodGroupLegend([{ properties: { [WOOD_GROUP_KEY]: null } }], stockOptionsFixture),
      ).toHaveLength(3);
    });

    it("prints nothing when the server sent no members", () => {
      const withoutGroups: StockOptionsDto = {
        itemCategories: stockOptionsFixture.itemCategories,
        propertyOptions: stockOptionsFixture.propertyOptions,
      };
      expect(woodGroupLegend([groupRow], withoutGroups)).toEqual([]);
    });
  });
});
