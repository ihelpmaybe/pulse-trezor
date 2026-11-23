/**
 * PulseX V2 swap helpers — quote + calldata for Trezor broadcast.
 * Router from live pulsex_quote; Uniswap-V2-compatible ABI.
 */
import {
  encodeFunctionData,
  erc20Abi,
  parseUnits,
  type Address,
  type Hex,
} from "viem";
import {
  makePublicClient,
  type DeskChainId,
  type RpcOverride,
} from "./client";
import { coreErc20Tokens } from "./tokens";

export const WPLS = "0xA1077a294dDE1B09bB078844df40758a5D0f9a27" as Address;
/** PulseX V2 router (confirmed via MCP pulsex_quote). */
export const PULSEX_V2_ROUTER =
  "0x165C3410fC91EF562C50559f7d2289fEbed552d9" as Address;

const routerAbi = [
  {
    type: "function",
    name: "getAmountsOut",
    stateMutability: "view",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "path", type: "address[]" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
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
  {
    type: "function",
    name: "swapExactTokensForETH",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "swapExactTokensForTokens",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amounts", type: "uint256[]" }],
  },
] as const;

export type SwapAsset = "PLS" | Address;

export function swapTokenMeta(chainId: DeskChainId, asset: SwapAsset) {
  if (asset === "PLS") {
    return { symbol: "PLS", decimals: 18, address: null as Address | null };
  }
  const t = coreErc20Tokens(chainId).find(
    (x) => x.address.toLowerCase() === asset.toLowerCase(),
  );
  if (!t) return null;
  return {
    symbol: t.symbol,
    decimals: t.decimals,
    address: t.address as Address,
  };
}

export function buildSwapPath(tokenIn: SwapAsset, tokenOut: SwapAsset): Address[] {
  const inAddr = tokenIn === "PLS" ? WPLS : (tokenIn as Address);
  const outAddr = tokenOut === "PLS" ? WPLS : (tokenOut as Address);
  if (inAddr.toLowerCase() === outAddr.toLowerCase()) {
    throw new Error("Same asset in and out.");
  }
  // Direct if one side is WPLS; else hop WPLS
  if (
    inAddr.toLowerCase() === WPLS.toLowerCase() ||
    outAddr.toLowerCase() === WPLS.toLowerCase()
  ) {
    return [inAddr, outAddr];
  }
  return [inAddr, WPLS, outAddr];
}

export type SwapQuote = {
  path: Address[];
  amountIn: bigint;
  amountOut: bigint;
  amountOutMin: bigint;
};

export async function quotePulsexSwap(
  chainId: DeskChainId,
  tokenIn: SwapAsset,
  tokenOut: SwapAsset,
  amountInHuman: string,
  slippageBps: number,
  rpc?: RpcOverride,
): Promise<SwapQuote> {
  if (chainId !== 369) throw new Error("PulseX swap is mainnet only.");
  const metaIn = swapTokenMeta(chainId, tokenIn);
  if (!metaIn) throw new Error("Unknown input token.");
  const amountIn = parseUnits(amountInHuman.trim() || "0", metaIn.decimals);
  if (amountIn <= 0n) throw new Error("Amount must be > 0.");
  const path = buildSwapPath(tokenIn, tokenOut);
  const client = makePublicClient(chainId, rpc);
  const amounts = await client.readContract({
    address: PULSEX_V2_ROUTER,
    abi: routerAbi,
    functionName: "getAmountsOut",
    args: [amountIn, path],
  });
  const amountOut = amounts[amounts.length - 1]!;
  const bps = BigInt(Math.max(0, Math.min(5_000, Math.floor(slippageBps))));
  const amountOutMin = amountOut - (amountOut * bps) / 10_000n;
  return { path, amountIn, amountOut, amountOutMin };
}

export async function routerAllowance(
  chainId: DeskChainId,
  token: Address,
  owner: Address,
  rpc?: RpcOverride,
): Promise<bigint> {
  const client = makePublicClient(chainId, rpc);
  return client.readContract({
    address: token,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, PULSEX_V2_ROUTER],
  });
}

export type PreparedSwap = {
  to: Address;
  value: bigint;
  data: Hex;
  quote: SwapQuote;
};

export function preparePulsexSwap(args: {
  account: Address;
  tokenIn: SwapAsset;
  tokenOut: SwapAsset;
  quote: SwapQuote;
  deadlineSec?: number;
}): PreparedSwap {
  const deadline = BigInt(
    Math.floor(Date.now() / 1000) + (args.deadlineSec ?? 20 * 60),
  );
  const { path, amountIn, amountOutMin } = args.quote;
  const nativeIn = args.tokenIn === "PLS";
  const nativeOut = args.tokenOut === "PLS";

  if (nativeIn) {
    return {
      to: PULSEX_V2_ROUTER,
      value: amountIn,
      data: encodeFunctionData({
        abi: routerAbi,
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, path, args.account, deadline],
      }),
      quote: args.quote,
    };
  }
  if (nativeOut) {
    return {
      to: PULSEX_V2_ROUTER,
      value: 0n,
      data: encodeFunctionData({
        abi: routerAbi,
        functionName: "swapExactTokensForETH",
        args: [amountIn, amountOutMin, path, args.account, deadline],
      }),
      quote: args.quote,
    };
  }
  return {
    to: PULSEX_V2_ROUTER,
    value: 0n,
    data: encodeFunctionData({
      abi: routerAbi,
      functionName: "swapExactTokensForTokens",
      args: [amountIn, amountOutMin, path, args.account, deadline],
    }),
    quote: args.quote,
  };
}
