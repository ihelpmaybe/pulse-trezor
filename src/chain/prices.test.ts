import { describe, expect, it } from "vitest";
import { formatUsdHint } from "./prices";

describe("formatUsdHint", () => {
  it("formats ranges", () => {
    expect(formatUsdHint(null)).toBe("");
    expect(formatUsdHint(1500)).toBe("~$1500");
    expect(formatUsdHint(1.234)).toBe("~$1.23");
    expect(formatUsdHint(0.00123)).toBe("~$0.0012");
  });
});
