import { describe, expect, it } from "vitest";

import {
  RESTRICTED_LOCATION_BLOCK,
  restrictLocationsToBlock,
} from "./stock-location-restriction.domain";

describe("stock location restriction (temporary frontend rule)", () => {
  it("keeps the LC codes alone and names the block to open on", () => {
    expect(
      restrictLocationsToBlock(["LC1", "H1", "L2", "LC13", "LC2:1"]),
    ).toEqual({
      locations: ["LC1", "LC13", "LC2:1"],
      directBlock: "LC",
    });
    expect(RESTRICTED_LOCATION_BLOCK).toBe("LC");
  });

  it("matches the block, not the prefix: L2 is not an LC code, lc1 is", () => {
    expect(restrictLocationsToBlock(["L2", "L3"]).locations).toEqual(["L2", "L3"]);
    expect(restrictLocationsToBlock(["lc1", "L2"])).toEqual({
      locations: ["lc1"],
      directBlock: "LC",
    });
  });

  it("falls back to the incoming list, two-step picker included, when no LC code is on offer", () => {
    // Without the fallback a shop whose codes are all H/L could configure nothing at all.
    expect(restrictLocationsToBlock(["H1", "L2", "ZF"])).toEqual({
      locations: ["H1", "L2", "ZF"],
      directBlock: null,
    });
    expect(restrictLocationsToBlock([])).toEqual({
      locations: [],
      directBlock: null,
    });
  });

  it("does not hand back the caller's array", () => {
    const incoming = ["H1", "L2"];

    expect(restrictLocationsToBlock(incoming).locations).not.toBe(incoming);
  });
});
