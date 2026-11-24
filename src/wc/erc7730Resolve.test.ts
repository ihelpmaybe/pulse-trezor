import { describe, expect, it } from "vitest";
import { encodeFunctionData, erc20Abi, parseUnits } from "viem";
import { resolveErc7730 } from "./erc7730Resolve";

const HEX = "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39";
const PULSEX_V2 = "0x165C3410fC91EF562C50559f7d2289fEbed552d9";

describe("resolveErc7730", () => {
  it("clears HEX transfer with 8 decimals", () => {
    const data = encodeFunctionData({
      abi: erc20Abi,
      functionName: "transfer",
      args: ["0x73d0385F4d8E00C5e6504C6030F47BF6212736A8", parseUnits("1.5", 8)],
    });
    const hit = resolveErc7730({ to: HEX, data, chainId: 369 });
    expect(hit?.kind).toBe("clear");
    expect(hit?.intent).toMatch(/Send HEX/);
    expect(hit?.detail).toMatch(/1\.5 HEX/);
  });

  it("clears PulseX swapExactETHForTokens", () => {
    const data = encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "swapExactETHForTokens",
          stateMutability: "payable",
          inputs: [
            { name: "amountOutMin", type: "uint256" },
            { name: "path", type: "address[]" },
            { name: "to", type: "address" },
            { name: "deadline", type: "uint256" },
          ],
          outputs: [{ name: "amounts", type: "uint256[]" }],
        },
      ],
      functionName: "swapExactETHForTokens",
      args: [
        1n,
        [
          "0xa1077a294dde1b09bb078844df40758a5d0f9a27",
          "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
        ],
        "0x73d0385F4d8E00C5e6504C6030F47BF6212736A8",
        9999999999n,
      ],
    });
    const hit = resolveErc7730({ to: PULSEX_V2, data });
    expect(hit?.kind).toBe("clear");
    expect(hit?.intent).toMatch(/Swap PLS/);
  });

  it("returns null for unknown contract", () => {
    expect(
      resolveErc7730({
        to: "0x1111111111111111111111111111111111111111",
        data: "0xa9059cbb",
      }),
    ).toBeNull();
  });
});
