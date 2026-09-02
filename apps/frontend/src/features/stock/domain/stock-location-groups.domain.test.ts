import { describe, expect, it } from "vitest";

import { locationBlockOf, splitLocationCode } from "../../../share/location-codes";
import { groupLocationsByLetter } from "./stock-location-groups.domain";

// The shape that broke both pickers: real racking carries levels, so H1:1 must land in
// block H beside H1, not loose on the first step as if it had no block at all.
describe("location code parsing", () => {
  it("splits a plain code, a levelled code and a multi-letter block", () => {
    expect(splitLocationCode("H1")).toEqual({ letter: "H", suffix: "1" });
    expect(splitLocationCode("H1:1")).toEqual({ letter: "H", suffix: "1:1" });
    expect(splitLocationCode("LC13")).toEqual({ letter: "LC", suffix: "13" });
    expect(splitLocationCode("h1:2")).toEqual({ letter: "H", suffix: "1:2" });
  });

  it("returns null for a code that carries no block", () => {
    expect(splitLocationCode("ZF")).toBeNull();
    expect(splitLocationCode("")).toBeNull();
    expect(locationBlockOf("ZF")).toBeNull();
    expect(locationBlockOf("H1:1")).toBe("H");
  });
});

describe("groupLocationsByLetter", () => {
  it("keeps a bay's levels inside its own block, in order", () => {
    const { groups, unstructured } = groupLocationsByLetter([
      "H2",
      "H1:2",
      "H1",
      "H1:1",
      "ZF",
      "LC10",
      "LC2",
    ]);

    expect(groups).toEqual([
      { letter: "H", locations: ["H1", "H1:1", "H1:2", "H2"] },
      // Numeric collation: 2 before 10.
      { letter: "LC", locations: ["LC2", "LC10"] },
    ]);
    expect(unstructured).toEqual(["ZF"]);
  });

  it("offers nothing when there is nothing to offer", () => {
    expect(groupLocationsByLetter([])).toEqual({ groups: [], unstructured: [] });
  });
});
