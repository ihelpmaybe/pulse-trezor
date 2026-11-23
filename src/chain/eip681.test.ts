import { describe, expect, it } from "vitest";
import { eip681PayNative, eip681Receive } from "./eip681";

describe("eip681", () => {
  it("builds receive URI with chain id", () => {
    expect(
      eip681Receive("0x73d0385F4d8E00C5e6504C6030F47BF6212736A8", 369),
    ).toBe("ethereum:0x73d0385F4d8E00C5e6504C6030F47BF6212736A8@369");
  });

  it("builds pay URI with value", () => {
    expect(
      eip681PayNative(
        "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
        943,
        10n ** 18n,
      ),
    ).toContain("?value=1000000000000000000");
  });
});
