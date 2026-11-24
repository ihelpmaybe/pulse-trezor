import { describe, expect, it } from "vitest";
import {
  bumpFeesAtStep,
  bumpPercentAtStep,
  clearPendingBroadcast,
  nextPendingNonce,
  rememberPendingBroadcast,
  RBF_BUMP_PERCENTS,
} from "./rbf";

describe("rbf bump ladder", () => {
  it("ynatm-style percents escalate", () => {
    expect(bumpPercentAtStep(0)).toBe(125n);
    expect(bumpPercentAtStep(1)).toBe(150n);
    expect(bumpPercentAtStep(2)).toBe(200n);
    expect(bumpPercentAtStep(99)).toBe(RBF_BUMP_PERCENTS.at(-1));
  });

  it("bumpFeesAtStep scales eip1559", () => {
    const next = bumpFeesAtStep(
      {
        eip1559: true,
        gas: 21_000n,
        maxFeePerGas: 100n,
        maxPriorityFeePerGas: 40n,
      },
      0,
    );
    expect(next.maxFeePerGas).toBe(125n);
    expect(next.maxPriorityFeePerGas).toBe(50n);
  });

  it("step 2 is 2×", () => {
    const next = bumpFeesAtStep(
      {
        eip1559: false,
        gas: 21_000n,
        gasPrice: 100n,
      },
      2,
    );
    expect(next.gasPrice).toBe(200n);
  });
});

describe("pending nonce track", () => {
  const account = "0x1111111111111111111111111111111111111111" as const;

  it("raises next nonce above local pending", () => {
    rememberPendingBroadcast(369, account, 7, "0xabc");
    expect(nextPendingNonce(369, account, 7)).toBe(8);
    expect(nextPendingNonce(369, account, 9)).toBe(9);
    clearPendingBroadcast(369, account, "0xabc");
    expect(nextPendingNonce(369, account, 7)).toBe(7);
  });
});
