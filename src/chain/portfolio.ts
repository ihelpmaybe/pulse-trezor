/**
 * Full-bag reads via PulseScan (Blockscout v2) + HEX stakeLists.
 * Core liquid balances stay on the RPC path in tokens.ts.
 */
import { formatUnits, type Address } from "viem";
import {
  makePublicClient,
  packFor,
  type DeskChainId,
  type RpcOverride,
} from "./client";

const HEX = "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as Address;

const hexStakeAbi = [
  {
    type: "function",
    name: "stakeCount",
    stateMutability: "view",
    inputs: [{ name: "stakerAddr", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "stakeLists",
    stateMutability: "view",
    inputs: [
      { name: "stakerAddr", type: "address" },
      { name: "stakeIndex", type: "uint256" },
    ],
    outputs: [
      { name: "stakeId", type: "uint40" },
      { name: "stakedHearts", type: "uint72" },
      { name: "stakeShares", type: "uint72" },
      { name: "lockedDay", type: "uint16" },
      { name: "stakedDays", type: "uint16" },
      { name: "unlockedDay", type: "uint16" },
      { name: "isAutoStake", type: "bool" },
    ],
  },
] as const;

export type ScanToken = {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  raw: bigint;
  formatted: string;
};

export type ScanNft = {
  contract: Address;
  collection: string;
  tokenId: string;
  type: string;
};

export type HexStakeRow = {
  stakeId: number;
  stakedHearts: bigint;
  stakedDays: number;
  lockedDay: number;
  unlockedDay: number;
  formattedHex: string;
};

export type FullBag = {
  tokens: ScanToken[];
  tokensTruncated: number;
  nfts: ScanNft[];
  nftsTruncated: number;
  stakes: HexStakeRow[];
  stakeCount: number;
  warnings?: string[];
};

function scanApiBase(chainId: DeskChainId): string | null {
  const explorers = packFor(chainId).explorers as
    | { apiUrl?: string; url?: string }[]
    | undefined;
  const api = explorers?.[0]?.apiUrl?.trim();
  if (api) return api.replace(/\/$/, "");
  if (chainId === 369) return "https://api.scan.pulsechain.com";
  if (chainId === 943) return "https://api.scan.v4.testnet.pulsechain.com";
  return null;
}

function looksLikeSpam(value: string, decimals: string | null | undefined): boolean {
  if (value.length >= 70) return true;
  if ((decimals === "0" || decimals == null) && value.length > 24) return true;
  return false;
}

async function fetchScanPage<T>(
  url: string,
  mapItem: (raw: unknown) => T | null,
  maxItems: number,
): Promise<{ items: T[]; hasMore: boolean }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PulseScan ${res.status}`);
  const body = (await res.json()) as {
    items?: unknown[];
    next_page_params?: Record<string, string | number> | null;
  };
  const out: T[] = [];
  for (const raw of body.items ?? []) {
    const row = mapItem(raw);
    if (row) out.push(row);
    if (out.length >= maxItems) break;
  }
  return {
    items: out,
    hasMore: !!body.next_page_params || (body.items?.length ?? 0) > out.length,
  };
}

export async function fetchScanErc20(
  chainId: DeskChainId,
  owner: Address,
  opts?: { max?: number; skip?: Set<string> },
): Promise<{ tokens: ScanToken[]; truncated: number }> {
  const base = scanApiBase(chainId);
  if (!base) return { tokens: [], truncated: 0 };
  const max = opts?.max ?? 48;
  const skip = opts?.skip ?? new Set<string>();
  const first = `${base}/api/v2/addresses/${owner}/tokens?type=ERC-20`;
  const { items, hasMore } = await fetchScanPage(
    first,
    (raw) => {
      const r = raw as {
        value?: string;
        token?: {
          address?: string;
          symbol?: string;
          name?: string;
          decimals?: string | null;
        };
      };
      const addr = r.token?.address?.toLowerCase();
      if (!addr || skip.has(addr)) return null;
      const value = r.value ?? "0";
      if (value === "0") return null;
      if (looksLikeSpam(value, r.token?.decimals)) return null;
      const decimals = Number(r.token?.decimals ?? 18);
      if (!Number.isFinite(decimals) || decimals < 0 || decimals > 36) return null;
      let rawBal: bigint;
      try {
        rawBal = BigInt(value);
      } catch {
        return null;
      }
      if (rawBal === 0n) return null;
      return {
        address: addr as Address,
        symbol: (r.token?.symbol || "?").slice(0, 16),
        name: (r.token?.name || "Token").slice(0, 48),
        decimals,
        raw: rawBal,
        formatted: formatUnits(rawBal, decimals),
      };
    },
    max,
  );
  return { tokens: items, truncated: hasMore ? 1 : 0 };
}

export async function fetchScanNfts(
  chainId: DeskChainId,
  owner: Address,
  max = 24,
): Promise<{ nfts: ScanNft[]; truncated: number }> {
  const base = scanApiBase(chainId);
  if (!base) return { nfts: [], truncated: 0 };
  const first = `${base}/api/v2/addresses/${owner}/nft?type=ERC-721%2CERC-1155`;
  const { items, hasMore } = await fetchScanPage(
    first,
    (raw) => {
      const r = raw as {
        id?: string;
        token_type?: string;
        token?: { address?: string; name?: string; symbol?: string };
      };
      const addr = r.token?.address;
      if (!addr) return null;
      return {
        contract: addr as Address,
        collection: (r.token?.name || r.token?.symbol || "NFT").slice(0, 40),
        tokenId: String(r.id ?? "?"),
        type: r.token_type || "NFT",
      };
    },
    max,
  );
  return { nfts: items, truncated: hasMore ? 1 : 0 };
}

const STAKE_MULTICALL_CHUNK = 80;
/**
 * Functionality headroom for reading fat HEX bags (not Blsx monthly product cap).
 * Product month ceiling = 186. 0xfc44…7002 ~2066 live can clip by a few dozen here.
 */
const STAKE_SOFT_CEILING = 2000;

function rowToStake(row: readonly unknown[]): HexStakeRow {
  const [
    stakeId,
    stakedHearts,
    ,
    lockedDay,
    stakedDays,
    unlockedDay,
  ] = row as [
    bigint,
    bigint,
    bigint,
    number | bigint,
    number | bigint,
    number | bigint,
  ];
  return {
    stakeId: Number(stakeId),
    stakedHearts,
    stakedDays: Number(stakedDays),
    lockedDay: Number(lockedDay),
    unlockedDay: Number(unlockedDay),
    formattedHex: formatUnits(stakedHearts, 8),
  };
}

export async function fetchHexStakes(
  chainId: DeskChainId,
  staker: Address,
  rpc?: RpcOverride,
  max = STAKE_SOFT_CEILING,
): Promise<{ stakes: HexStakeRow[]; stakeCount: number }> {
  if (chainId !== 369) return { stakes: [], stakeCount: 0 };
  const client = makePublicClient(chainId, rpc);
  const count = await client.readContract({
    address: HEX,
    abi: hexStakeAbi,
    functionName: "stakeCount",
    args: [staker],
  });
  const n = Number(count);
  if (!Number.isFinite(n) || n <= 0) return { stakes: [], stakeCount: 0 };
  const take = Math.min(n, max);
  const stakes: HexStakeRow[] = [];

  try {
    for (let start = 0; start < take; start += STAKE_MULTICALL_CHUNK) {
      const end = Math.min(take, start + STAKE_MULTICALL_CHUNK);
      const contracts = [];
      for (let i = start; i < end; i++) {
        contracts.push({
          address: HEX,
          abi: hexStakeAbi,
          functionName: "stakeLists" as const,
          args: [staker, BigInt(i)] as const,
        });
      }
      const rows = await client.multicall({
        contracts,
        allowFailure: false,
      });
      for (const row of rows) {
        stakes.push(rowToStake(row as readonly unknown[]));
      }
    }
  } catch {
    stakes.length = 0;
    for (let i = 0; i < take; i++) {
      const row = await client.readContract({
        address: HEX,
        abi: hexStakeAbi,
        functionName: "stakeLists",
        args: [staker, BigInt(i)],
      });
      stakes.push(rowToStake(row));
    }
  }
  return { stakes, stakeCount: n };
}

export async function fetchFullBag(
  chainId: DeskChainId,
  owner: Address,
  rpc?: RpcOverride,
  coreAddresses?: Set<string>,
): Promise<FullBag> {
  const skip = new Set(
    [...(coreAddresses ?? [])].map((a) => a.toLowerCase()),
  );
  const [tokR, nftR, hexR] = await Promise.allSettled([
    fetchScanErc20(chainId, owner, { skip }),
    fetchScanNfts(chainId, owner),
    fetchHexStakes(chainId, owner, rpc),
  ]);
  const tok =
    tokR.status === "fulfilled"
      ? tokR.value
      : { tokens: [] as ScanToken[], truncated: 0 };
  const nft =
    nftR.status === "fulfilled"
      ? nftR.value
      : { nfts: [] as ScanNft[], truncated: 0 };
  const hex =
    hexR.status === "fulfilled"
      ? hexR.value
      : { stakes: [] as HexStakeRow[], stakeCount: 0 };
  const scanErrors = [tokR, nftR]
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) =>
      r.reason instanceof Error ? r.reason.message : String(r.reason),
    );
  return {
    tokens: tok.tokens,
    tokensTruncated: tok.truncated,
    nfts: nft.nfts,
    nftsTruncated: nft.truncated,
    stakes: hex.stakes,
    stakeCount: hex.stakeCount,
    /** Soft warnings when PulseScan flakes; stakes may still be present. */
    warnings: scanErrors,
  };
}
