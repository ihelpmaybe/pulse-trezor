import { describe, expect, it } from "vitest";
import { toTemperRequest } from "./temperClient";

describe("temperClient", () => {
  it("builds Temper simulate body", () => {
    const r = toTemperRequest({
      chainId: 369,
      from: "0x00000000000000000000000000000000000000a1",
      to: "0x00000000000000000000000000000000000000b1",
      valueWei: 1_000_000_000_000_000_000n,
      data: "0x",
    });
    expect(r.chainId).toBe(369);
    expect(r.value).toBe("1000000000000000000");
    expect(r.gasLimit).toBe(500_000);
    expect(r.data).toBeUndefined();
  });
});
