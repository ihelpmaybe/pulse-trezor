import { describe, expect, it } from "vitest";
import { decodeErc20Transfer } from "../wc/clearSign";

describe("txSimulate helpers", () => {
  it("decodes ERC-20 transfer for balance hint", () => {
    const to = "0000000000000000000000001111111111111111111111111111111111111111";
    const amt = "0000000000000000000000000000000000000000000000000000000000000064";
    const data = `0xa9059cbb${to}${amt}`;
    const d = decodeErc20Transfer(data);
    expect(d?.to.toLowerCase()).toBe(
      "0x1111111111111111111111111111111111111111",
    );
    expect(d?.raw).toBe(100n);
  });
});
