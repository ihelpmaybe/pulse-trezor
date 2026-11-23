import { describe, expect, it } from "vitest";
import {
  clearSignMessage,
  clearSignTx,
  isBlindCalldata,
  needsBlindConfirm,
  needsDangerAck,
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
    expect(phishingWarn("https://wallet-validate.example")?.tone).toBe(
      "danger",
    );
    expect(phishingWarn("https://pulsex.xyz")?.tone).toBe("danger");
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

  it("flags raw hex and Permit for danger ack", () => {
    const hex = clearSignMessage({
      method: "eth_sign",
      dappUrl: "https://app.pulsex.com",
      preview: "0x" + "ab".repeat(32),
    });
    expect(hex.some((l) => l.title === "Raw hex")).toBe(true);
    expect(needsDangerAck(hex)).toBe(true);

    const permit = clearSignMessage({
      method: "eth_signTypedData_v4",
      dappUrl: "https://app.pulsex.com",
      preview: JSON.stringify({
        primaryType: "Permit",
        message: { spender: "0x1", value: "1" },
      }),
    });
    expect(permit.some((l) => l.title === "Permit")).toBe(true);
    expect(needsDangerAck(permit)).toBe(true);
    expect(needsBlindConfirm(permit)).toBe(false);
  });
});
