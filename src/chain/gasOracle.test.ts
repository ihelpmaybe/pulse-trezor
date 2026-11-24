import { describe, expect, it } from "vitest";
import { GAS_TIER_PILLS, TierName } from "./gasOracle";

describe("gasOracle wrap", () => {
  it("exposes Valve ladder pills", () => {
    expect(GAS_TIER_PILLS.map((p) => p.id)).toEqual([
      TierName.slow,
      TierName.standard,
      TierName.fast,
      TierName.instant,
    ]);
  });
});
