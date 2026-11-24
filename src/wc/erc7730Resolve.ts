/**
 * Local ERC-7730-style overlay for Pulse (official eip155:369 index is empty).
 * Thin resolve → intent lines for clearSign / TxExplain. Not a full Clear Signing SDK.
 * CC0-style display formats adapted from public ERC-7730 ERC-20 + Uniswap V2 patterns.
 */
import {
  decodeFunctionData,
  erc20Abi,
  formatUnits,
  type Hex,
} from "viem";

export type Erc7730Outcome =
  | { kind: "clear"; intent: string; detail: string }
  | { kind: "fallback"; intent: string; detail: string }
  | null;

/** Pulse mainnet deployments we overlay locally. */
const PULSE_OVERLAY: Record<
  string,
  { name: string; kind: "erc20" | "pulsex-v2"; decimals?: number }
> = {
  // HEX / WPLS / stables — ERC-20 transfer/approve face
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39": {
    name: "HEX",
    kind: "erc20",
    decimals: 8,
  },
  "0xa1077a294dde1b09bb078844df40758a5d0f9a27": {
    name: "WPLS",
    kind: "erc20",
    decimals: 18,
  },
  "0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07": {
    name: "USDC (Pulse)",
    kind: "erc20",
    decimals: 6,
  },
  "0x95b303987a60c71504d99aa1b13b4da07b0790ab": {
    name: "PLSX",
    kind: "erc20",
    decimals: 18,
  },
  // PulseX routers (Uniswap V2-shaped)
  "0x98bf93ebf5c380c0e6ae8e192a7e2ae08edacc02": {
    name: "PulseX v1 Router",
    kind: "pulsex-v2",
  },
  "0x165c3410fc91ef562c50559f7d2289febed552d9": {
    name: "PulseX v2 Router",
    kind: "pulsex-v2",
  },
};

const PULSEX_V2_ABI = [
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
    name: "addLiquidity",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "amountADesired", type: "uint256" },
      { name: "amountBDesired", type: "uint256" },
      { name: "amountAMin", type: "uint256" },
      { name: "amountBMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountA", type: "uint256" },
      { name: "amountB", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "addLiquidityETH",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountTokenDesired", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountETH", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
  },
] as const;

function short(a: string): string {
  if (!a || a.length < 12) return a || "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function overlayFor(to?: string | null) {
  if (!to) return null;
  return PULSE_OVERLAY[to.trim().toLowerCase()] ?? null;
}

/**
 * Resolve local Pulse overlay. chainId 369 preferred; still labels known addrs on other nets.
 */
export function resolveErc7730(opts: {
  chainId?: number;
  to?: string | null;
  data?: string | null;
}): Erc7730Outcome {
  const meta = overlayFor(opts.to);
  if (!meta) return null;
  const data = (opts.data || "0x") as Hex;
  if (!data || data === "0x" || data.length < 10) {
    return {
      kind: "fallback",
      intent: meta.name,
      detail: "No calldata — plain send to contract?",
    };
  }

  if (meta.kind === "erc20") {
    const dec = meta.decimals ?? 18;
    try {
      const decoded = decodeFunctionData({ abi: erc20Abi, data });
      if (decoded.functionName === "transfer") {
        const [to, value] = decoded.args as [string, bigint];
        return {
          kind: "clear",
          intent: `Send ${meta.name}`,
          detail: `${formatUnits(value, dec)} ${meta.name} → ${short(to)}`,
        };
      }
      if (decoded.functionName === "approve") {
        const [spender, value] = decoded.args as [string, bigint];
        const unlimited =
          value >=
          0x8000000000000000000000000000000000000000000000000000000000000000n;
        return {
          kind: "clear",
          intent: `Approve ${meta.name}`,
          detail: unlimited
            ? `Unlimited → ${short(spender)}`
            : `${formatUnits(value, dec)} → ${short(spender)}`,
        };
      }
    } catch {
      /* fall through */
    }
    return {
      kind: "fallback",
      intent: meta.name,
      detail: "Known token — selector not transfer/approve",
    };
  }

  // PulseX V2-shaped
  try {
    const decoded = decodeFunctionData({ abi: PULSEX_V2_ABI, data });
    if (decoded.functionName === "swapExactTokensForTokens") {
      const [amountIn, amountOutMin, path, to] = decoded.args as unknown as [
        bigint,
        bigint,
        readonly string[],
        string,
      ];
      return {
        kind: "clear",
        intent: "Swap (exact in)",
        detail: `${meta.name} · in ${amountIn.toString()} · min out ${amountOutMin.toString()} · hops ${path.length} · to ${short(to)}`,
      };
    }
    if (decoded.functionName === "swapExactETHForTokens") {
      const [amountOutMin, path, to] = decoded.args as unknown as [
        bigint,
        readonly string[],
        string,
      ];
      return {
        kind: "clear",
        intent: "Swap PLS → tokens",
        detail: `${meta.name} · min out ${amountOutMin.toString()} · hops ${path.length} · to ${short(to)}`,
      };
    }
    if (decoded.functionName === "swapExactTokensForETH") {
      const [amountIn, amountOutMin, path, to] = decoded.args as unknown as [
        bigint,
        bigint,
        readonly string[],
        string,
      ];
      return {
        kind: "clear",
        intent: "Swap tokens → PLS",
        detail: `${meta.name} · in ${amountIn.toString()} · min PLS ${amountOutMin.toString()} · hops ${path.length} · to ${short(to)}`,
      };
    }
    if (decoded.functionName === "addLiquidity") {
      return {
        kind: "clear",
        intent: "Add Liquidity",
        detail: `${meta.name} · token pair liquidity`,
      };
    }
    if (decoded.functionName === "addLiquidityETH") {
      return {
        kind: "clear",
        intent: "Add Liquidity",
        detail: `${meta.name} · token + PLS`,
      };
    }
  } catch {
    /* fall through */
  }
  return {
    kind: "fallback",
    intent: meta.name,
    detail: "Known PulseX router — selector not in thin overlay",
  };
}

export function overlayContractName(to?: string | null): string | null {
  return overlayFor(to)?.name ?? null;
}
