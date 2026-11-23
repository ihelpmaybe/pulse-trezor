import { describe, expect, it } from "vitest";
import { bumpFees } from "./signPulseTx";

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
});
