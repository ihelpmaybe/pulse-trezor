import { describe, expect, it } from "vitest";
import {
  clearSignMessage,
  clearSignTx,
  clearSignTypedFields,
  decodeApproveAmount,
  decodeHexStakeCalldata,
  hasHardDeadEnd,
  isBlindCalldata,
  needsBlindConfirm,
  needsDangerAck,
  phishingWarn,
} from "./clearSign";
import { maxUint256 } from "viem";

function padWord(n: bigint | number): string {
  return BigInt(n).toString(16).padStart(64, "0");
}

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
    // Official ProveX must not trip lookalike phishing (regression 2026-11-22)
    expect(phishingWarn("https://app.provex.com")).toBeNull();
    expect(phishingWarn("https://provex.com")).toBeNull();
    expect(phishingWarn("https://proverx.evil")?.tone).toBe("danger");
    expect(phishingWarn("https://prove-x.scam")?.tone).toBe("danger");
    expect(phishingWarn("https://suiteconnect-trezor.com")?.tone).toBe(
      "danger",
    );
    expect(phishingWarn("https://trezor-connect.com/seed")?.tone).toBe(
      "danger",
    );
    expect(phishingWarn("https://suite.trezor.io")).toBeNull();
  });

  it("always surfaces Origin line", () => {
    const lines = clearSignTx({
      to: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
      data: "0x",
      dappUrl: "https://ipfs.app.pulsex.com",
    });
    expect(lines.some((l) => l.title === "Origin")).toBe(true);
  });

  it("decodes HEX stakeStart / stakeEnd companions", () => {
    const hearts = 1_000_00000n; // 1 HEX @ 8 decimals
    const startData = `0x52a438b8${padWord(hearts)}${padWord(5555)}`;
    const start = decodeHexStakeCalldata(startData);
    expect(start.some((l) => l.title.includes("hearts") && l.detail.includes("1"))).toBe(
      true,
    );
    expect(start.some((l) => l.detail.includes("5555"))).toBe(true);

    const endData = `0x67dcb881${padWord(3)}${padWord(42)}`;
    const end = decodeHexStakeCalldata(endData);
    expect(end.some((l) => l.detail.includes("index 3"))).toBe(true);
    expect(end.some((l) => l.detail.includes("id 42"))).toBe(true);

    const lines = clearSignTx({
      to: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
      data: startData,
      dappUrl: "https://go.hex.com",
    });
    expect(lines.some((l) => l.title === "HEX stake UI")).toBe(true);
    expect(lines.some((l) => l.title.includes("stakeStart · hearts"))).toBe(
      true,
    );
  });

  it("clear-signs official ProveX host", () => {
    const lines = clearSignTx({
      to: "0xA1077a294dDE1B09bB078844df40758a5D0f9a27",
      data: "0x",
      dappUrl: "https://app.provex.com/ramp",
    });
    expect(lines.some((l) => l.title === "ProveX (official)")).toBe(true);
  });

  it("flags Permit2 primaryType", () => {
    const lines = clearSignMessage({
      method: "eth_signTypedData_v4",
      dappUrl: "https://app.pulsex.com",
      preview: JSON.stringify({
        primaryType: "PermitSingle",
        message: {
          spender: "0x" + "11".repeat(20),
          amount:
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        },
      }),
    });
    expect(lines.some((l) => l.title === "Permit2")).toBe(true);
    expect(needsDangerAck(lines)).toBe(true);
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

  it("surfaces EIP-712 spender / value / deadline fields", () => {
    const preview = JSON.stringify({
      primaryType: "Permit",
      domain: {
        name: "HEX",
        chainId: 369,
        verifyingContract: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
      },
      message: {
        owner: "0x1111111111111111111111111111111111111111",
        spender: "0x2222222222222222222222222222222222222222",
        value: "1000",
        deadline: "9999999999",
      },
    });
    const fields = clearSignTypedFields(preview);
    expect(fields.some((l) => l.title.startsWith("712 spender"))).toBe(true);
    expect(fields.some((l) => l.title.startsWith("712 value"))).toBe(true);
    expect(fields.some((l) => l.title.startsWith("712 deadline"))).toBe(true);
    expect(fields.some((l) => l.title === "712 chainId")).toBe(true);

    const lines = clearSignMessage({
      method: "eth_signTypedData_v4",
      dappUrl: "https://app.pulsex.com",
      preview,
    });
    expect(lines.some((l) => l.title === "712 spender")).toBe(true);
  });

  it("decodes approve unlimited amount", () => {
    const data =
      "0x095ea7b3" +
      "0000000000000000000000001111111111111111111111111111111111111111" +
      maxUint256.toString(16).padStart(64, "0");
    const amt = decodeApproveAmount(data);
    expect(amt?.unlimited).toBe(true);
    const lines = clearSignTx({
      to: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
      data,
    });
    expect(lines.some((l) => /UNLIMITED/i.test(l.title))).toBe(true);
  });

  it("flags plain send to HEX as dead-end", () => {
    const lines = clearSignTx({
      to: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
      data: "0x",
      valueHex: "0xde0b6b3a7640000",
    });
    expect(hasHardDeadEnd(lines)).toBe(true);
    expect(lines.some((l) => /Dead-end · HEX/i.test(l.title))).toBe(true);
  });

  it("flags never-expire Permit deadline and EIP-7702 bait", () => {
    const fields = clearSignTypedFields(
      JSON.stringify({
        primaryType: "Permit",
        domain: { name: "USDC", chainId: 1 },
        message: {
          spender: "0x2222222222222222222222222222222222222222",
          value: maxUint256.toString(),
          deadline: maxUint256.toString(),
        },
      }),
    );
    expect(fields.some((l) => /UNLIMITED/i.test(l.title))).toBe(true);

    const z = clearSignMessage({
      method: "eth_signTypedData_v4",
      dappUrl: "https://evil.example",
      preview: JSON.stringify({
        primaryType: "Authorization",
        message: { setCode: "0xdead" },
      }),
    });
    expect(z.some((l) => /7702/i.test(l.title))).toBe(true);
    expect(needsDangerAck(z)).toBe(true);
  });
});
