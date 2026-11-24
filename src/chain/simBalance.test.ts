import { describe, expect, it } from "vitest";
import { deltasFromCalldata, deltasFromLogs } from "./simBalance";

describe("simBalance", () => {
  it("HEX transfer uses 8 decimals", () => {
    const to = "0000000000000000000000001111111111111111111111111111111111111111";
    const amt = "0000000000000000000000000000000000000000000000000000000005f5e100"; // 100e6
    const data = `0xa9059cbb${to}${amt}`;
    const d = deltasFromCalldata({
      chainId: 369,
      from: "0x2222222222222222222222222222222222222222",
      to: "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
      data,
    });
    expect(d[0]?.kind).toBe("erc20");
    expect(d[0]?.line).toMatch(/HEX/);
    expect(d[0]?.guessed).toBeFalsy();
  });

  it("approve unlimited face", () => {
    const spender =
      "000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const max =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    const data = `0x095ea7b3${spender}${max}`;
    const d = deltasFromCalldata({
      chainId: 369,
      from: "0x2222222222222222222222222222222222222222",
      to: "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
      data,
    });
    expect(d[0]?.kind).toBe("approve");
    expect(d[0]?.line).toMatch(/unlimited WPLS/i);
  });

  it("Transfer log signed for viewer", () => {
    const me = "0x2222222222222222222222222222222222222222";
    const fromPad =
      "0x0000000000000000000000002222222222222222222222222222222222222222";
    const toPad =
      "0x0000000000000000000000001111111111111111111111111111111111111111";
    const d = deltasFromLogs(
      [
        {
          address: "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
          topics: [
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
            fromPad,
            toPad,
          ],
          data: "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
        },
      ],
      me,
    );
    expect(d[0]?.line).toMatch(/−1(\.0+)? WPLS/);
  });
});
