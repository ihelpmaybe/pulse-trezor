import { describe, expect, it } from "vitest";
import { bumpFees, sendPhaseLabel } from "./signPulseTx";

describe("sendPhaseLabel", () => {
  it("separates device sign from broadcast", () => {
    expect(sendPhaseLabel("sign")).toMatch(/Trezor/i);
    expect(sendPhaseLabel("broadcast")).toMatch(/Broadcast/i);
    expect(sendPhaseLabel(null)).toBe("Sign & send");
  });
});

describe("bumpFees", () => {
  it("bumps eip1559 fees by 25%", () => {
    const next = bumpFees({
      eip1559: true,
      gas: 21_000n,
      maxFeePerGas: 100n,
      maxPriorityFeePerGas: 40n,
    });
    expect(next.maxFeePerGas).toBe(125n);
    expect(next.maxPriorityFeePerGas).toBe(50n);
    expect(next.gas).toBe(21_000n);
  });

  it("bumps legacy gasPrice", () => {
    const next = bumpFees({
      eip1559: false,
      gas: 21_000n,
      gasPrice: 200n,
    });
    expect(next.gasPrice).toBe(250n);
  });

  it("meets common RBF floor (≥12.5%) at default 125%", () => {
    const base = 1_000_000_000n;
    const next = bumpFees({
      eip1559: true,
      gas: 21_000n,
      maxFeePerGas: base,
      maxPriorityFeePerGas: base,
    });
    const floor = (base * 1125n) / 1000n;
    expect(next.maxFeePerGas! >= floor).toBe(true);
    expect(next.maxPriorityFeePerGas! >= floor).toBe(true);
  });
});
