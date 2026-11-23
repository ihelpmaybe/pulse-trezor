import { describe, expect, it } from "vitest";
import {
  clearSignTx,
  isBlindCalldata,
  needsBlindConfirm,
  phishingWarn,
} from "./clearSign";

describe("blind calldata", () => {
  it("flags unknown selectors", () => {
    expect(isBlindCalldata("0x")).toBe(false);
    expect(isBlindCalldata("0xa9059cbb" + "00".repeat(64))).toBe(false);
    expect(isBlindCalldata("0xdeadbeef" + "00".repeat(32))).toBe(true);
  });

  it("clear-sign requires blind confirm for unknown", () => {
    const lines = clearSignTx({
      to: "0x1111111111111111111111111111111111111111",
      data: "0xdeadbeef0001",
      method: "eth_sendTransaction",
    });
    expect(needsBlindConfirm(lines)).toBe(true);
    expect(lines.some((l) => l.tone === "danger")).toBe(true);
  });

  it("known transfer is not blind", () => {
    const lines = clearSignTx({
      to: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
      data: "0xa9059cbb" + "00".repeat(64),
    });
    expect(needsBlindConfirm(lines)).toBe(false);
  });

  it("flags phishing-ish origins", () => {
    expect(phishingWarn("https://claim-hex.example")?.tone).toBe("danger");
    expect(phishingWarn("https://app.pulsex.com")).toBeNull();
  });

  it("always surfaces Origin line", () => {
    const lines = clearSignTx({
      to: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
      data: "0x",
      dappUrl: "https://ipfs.app.pulsex.com",
    });
    expect(lines.some((l) => l.title === "Origin")).toBe(true);
  });
});
