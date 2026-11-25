import { describe, expect, it } from "vitest";
import { scanApiFromIndexer, scanUiFromIndexer } from "./indexer";
import tokenlist from "../pack/tokenlist.json";

describe("pulse-core pack consume", () => {
  it("indexer pack has PulseScan APIs for 369 and 943", () => {
    expect(scanApiFromIndexer(369)).toBe("https://api.scan.pulsechain.com");
    expect(scanApiFromIndexer(943)).toBe(
      "https://api.scan.v4.testnet.pulsechain.com",
    );
    expect(scanUiFromIndexer(369)).toMatch(/scan\.pulsechain\.com/);
  });

  it("tokenlist PLSX matches dead-end / swap face address", () => {
    const plsx = tokenlist.tokens.find(
      (t) => t.symbol === "PLSX" && t.chainId === 369,
    );
    expect(plsx?.address.toLowerCase()).toBe(
      "0x95b303987a60c71504d99aa1b13b4da07b0790ab",
    );
  });
});
