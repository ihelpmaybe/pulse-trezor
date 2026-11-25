import { describe, expect, it } from "vitest";
import {
  PULSE_TIP_CAP_WEI,
  clampGasTierFees,
  clampGasTiers,
} from "./gasOracle";

describe("clampGasTierFees", () => {
  it("caps Instant-scale tips that blow a small bag", () => {
    const millionBeats = 1_000_000n * 1_000_000_000n;
    const next = clampGasTierFees({
      maxFeePerGas: millionBeats + 7n,
      maxPriorityFeePerGas: millionBeats,
      gasPrice: millionBeats,
    });
    expect(next.maxPriorityFeePerGas).toBe(PULSE_TIP_CAP_WEI);
    expect(next.maxFeePerGas).toBe(PULSE_TIP_CAP_WEI);
    expect(next.gasPrice).toBe(PULSE_TIP_CAP_WEI);
  });

  it("leaves sane WC-scale tips alone", () => {
    const tenK = 10_000n * 1_000_000_000n;
    const next = clampGasTierFees({
      maxFeePerGas: tenK + 7n,
      maxPriorityFeePerGas: tenK,
      gasPrice: tenK,
    });
    expect(next.maxPriorityFeePerGas).toBe(tenK);
    expect(next.maxFeePerGas).toBe(tenK + 7n);
  });

  it("keeps maxFee >= tip after clamp", () => {
    const tip = PULSE_TIP_CAP_WEI;
    const next = clampGasTierFees({
      maxFeePerGas: 1n,
      maxPriorityFeePerGas: tip,
      gasPrice: 1n,
    });
    expect(next.maxFeePerGas).toBe(tip);
  });

  it("clamps every ladder rung", () => {
    const huge = 5_000_000n * 1_000_000_000n;
    const tiers = clampGasTiers({
      slow: {
        maxFeePerGas: huge,
        maxPriorityFeePerGas: huge,
        gasPrice: huge,
      },
      standard: {
        maxFeePerGas: huge,
        maxPriorityFeePerGas: huge,
        gasPrice: huge,
      },
      fast: {
        maxFeePerGas: huge,
        maxPriorityFeePerGas: huge,
        gasPrice: huge,
      },
      instant: {
        maxFeePerGas: huge,
        maxPriorityFeePerGas: huge,
        gasPrice: huge,
      },
    });
    expect(tiers.instant.maxPriorityFeePerGas).toBe(PULSE_TIP_CAP_WEI);
    expect(tiers.slow.maxPriorityFeePerGas).toBe(PULSE_TIP_CAP_WEI);
  });
});
