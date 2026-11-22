import {
  erc20Abi,
  formatUnits,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import { encodeFunctionData } from "viem";
import tokenlist from "../pack/tokenlist.json";
import { makePublicClient, type DeskChainId } from "./client";

export type PackToken = (typeof tokenlist.tokens)[number];

export function coreErc20Tokens(chainId: DeskChainId): PackToken[] {
  if (chainId !== 369) return [];
  return tokenlist.tokens.filter(
    (t) =>
      t.chainId === 369 &&
      !t.extensions?.native &&
      t.tags?.includes("core") &&
      t.address !== "0x0000000000000000000000000000000000000000",
  );
}

export async function fetchTokenBalances(
  chainId: DeskChainId,
  owner: Address,
): Promise<{ token: PackToken; raw: bigint; formatted: string }[]> {
  const tokens = coreErc20Tokens(chainId);
  if (!tokens.length) return [];
  const client = makePublicClient(chainId);
  const rows = await Promise.all(
    tokens.map(async (token) => {
      try {
        const raw = await client.readContract({
          address: token.address as Address,
          abi: erc20Abi,
          functionName: "balanceOf",
          args: [owner],
        });
        return {
          token,
          raw,
          formatted: formatUnits(raw, token.decimals),
        };
      } catch {
        return { token, raw: 0n, formatted: "—" };
      }
    }),
  );
  return rows;
}

export function encodeErc20Transfer(
  to: Address,
  amount: bigint,
): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amount],
  });
}

export function encodeErc20Approve(
  spender: Address,
  amount: bigint,
): Hex {
  return encodeFunctionData({
    abi: erc20Abi,
    functionName: "approve",
    args: [spender, amount],
  });
}

export function parseTokenAmount(amount: string, decimals: number): bigint {
  return parseUnits(amount, decimals);
}

export { tokenlist };
