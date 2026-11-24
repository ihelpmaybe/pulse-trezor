/**
 * Local bag cache — balances, activity, HEX stakes survive close.
 * Addresses stay in deskStorage; this is the money face only.
 * Clear via Settings; Forget desk also wipes these keys.
 */
import { isAddress, type Address } from "viem";
import type { ActivityRow } from "./activity";
import { DESK_CHAIN_IDS, type DeskChainId } from "./client";
import type { CustomToken } from "./customTokens";
import type { FullBag, HexStakeRow, ScanNft, ScanToken } from "./portfolio";
import type { PackToken } from "./tokens";

export const BAG_CACHE_PREFIX = "pulse-perch-bag-cache-v1:";
export const BAG_CACHE_KIND = "pulse-perch-bag-snapshot" as const;
export const BAG_CACHE_VERSION = 1 as const;

export type CachedTokenRow = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  raw: string;
  formatted: string;
  tags?: string[];
};

export type CachedCustomRow = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: DeskChainId;
  raw: string;
  formatted: string;
};

export type BagCacheEntry = {
  kind: typeof BAG_CACHE_KIND;
  version: typeof BAG_CACHE_VERSION;
  savedAt: string;
  chainId: DeskChainId;
  address: Address;
  pls: string | null;
  stakeCount: number;
  tokenRows: CachedTokenRow[];
  customRows: CachedCustomRow[];
  fullBag: {
    tokens: Array<{
      address: string;
      symbol: string;
      name: string;
      decimals: number;
      raw: string;
      formatted: string;
    }>;
    tokensTruncated: number;
    nfts: ScanNft[];
    nftsTruncated: number;
    stakes: Array<{
      stakeId: number;
      stakedHearts: string;
      stakedDays: number;
      lockedDay: number;
      unlockedDay: number;
      formattedHex: string;
    }>;
    stakeCount: number;
    warnings?: string[];
  } | null;
  activity: ActivityRow[];
  nfts: ScanNft[];
  nftsTruncated: number;
};

export type BagFaceSnapshot = {
  pls: bigint | null;
  stakeCount: number;
  tokenRows: { token: PackToken; raw: bigint; formatted: string }[];
  customRows: { token: CustomToken; raw: bigint; formatted: string }[];
  fullBag: FullBag | null;
  activity: ActivityRow[];
  nfts: ScanNft[];
  nftsTruncated: number;
};

function cacheKey(chainId: DeskChainId, address: string): string {
  return `${BAG_CACHE_PREFIX}${chainId}:${address.toLowerCase()}`;
}

function toTokenRows(
  rows: CachedTokenRow[],
): { token: PackToken; raw: bigint; formatted: string }[] {
  return rows.map((r) => {
    const token = {
      address: r.address as Address,
      symbol: r.symbol,
      name: r.name,
      decimals: r.decimals,
      tags: r.tags ?? [],
    } as PackToken;
    let raw = 0n;
    try {
      raw = BigInt(r.raw);
    } catch {
      raw = 0n;
    }
    return { token, raw, formatted: r.formatted };
  });
}

function fromTokenRows(
  rows: { token: PackToken; raw: bigint; formatted: string }[],
): CachedTokenRow[] {
  return rows.map((r) => ({
    address: r.token.address,
    symbol: r.token.symbol,
    name: r.token.name,
    decimals: r.token.decimals,
    raw: r.raw.toString(),
    formatted: r.formatted,
    tags: r.token.tags ?? [],
  }));
}

function toCustomRows(
  rows: CachedCustomRow[],
): { token: CustomToken; raw: bigint; formatted: string }[] {
  return rows.map((r) => {
    let raw = 0n;
    try {
      raw = BigInt(r.raw);
    } catch {
      raw = 0n;
    }
    return {
      token: {
        chainId: r.chainId,
        address: r.address as Address,
        symbol: r.symbol,
        name: r.name,
        decimals: r.decimals,
      },
      raw,
      formatted: r.formatted,
    };
  });
}

function fromCustomRows(
  rows: { token: CustomToken; raw: bigint; formatted: string }[],
): CachedCustomRow[] {
  return rows.map((r) => ({
    address: r.token.address,
    symbol: r.token.symbol,
    name: r.token.name,
    decimals: r.token.decimals,
    chainId: r.token.chainId,
    raw: r.raw.toString(),
    formatted: r.formatted,
  }));
}

function encodeFullBag(bag: FullBag): NonNullable<BagCacheEntry["fullBag"]> {
  return {
    tokens: bag.tokens.map((t) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      raw: t.raw.toString(),
      formatted: t.formatted,
    })),
    tokensTruncated: bag.tokensTruncated,
    nfts: bag.nfts,
    nftsTruncated: bag.nftsTruncated,
    stakes: bag.stakes.map((s) => ({
      stakeId: s.stakeId,
      stakedHearts: s.stakedHearts.toString(),
      stakedDays: s.stakedDays,
      lockedDay: s.lockedDay,
      unlockedDay: s.unlockedDay,
      formattedHex: s.formattedHex,
    })),
    stakeCount: bag.stakeCount,
    warnings: bag.warnings,
  };
}

function decodeFullBag(
  bag: NonNullable<BagCacheEntry["fullBag"]>,
): FullBag {
  const tokens: ScanToken[] = bag.tokens.map((t) => {
    let raw = 0n;
    try {
      raw = BigInt(t.raw);
    } catch {
      raw = 0n;
    }
    return {
      address: t.address as Address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      raw,
      formatted: t.formatted,
    };
  });
  const stakes: HexStakeRow[] = bag.stakes.map((s) => {
    let stakedHearts = 0n;
    try {
      stakedHearts = BigInt(s.stakedHearts);
    } catch {
      stakedHearts = 0n;
    }
    return {
      stakeId: s.stakeId,
      stakedHearts,
      stakedDays: s.stakedDays,
      lockedDay: s.lockedDay,
      unlockedDay: s.unlockedDay,
      formattedHex: s.formattedHex,
    };
  });
  return {
    tokens,
    tokensTruncated: bag.tokensTruncated,
    nfts: bag.nfts,
    nftsTruncated: bag.nftsTruncated,
    stakes,
    stakeCount: bag.stakeCount,
    warnings: bag.warnings,
  };
}

export function buildBagCacheEntry(
  chainId: DeskChainId,
  address: Address,
  face: BagFaceSnapshot,
): BagCacheEntry {
  return {
    kind: BAG_CACHE_KIND,
    version: BAG_CACHE_VERSION,
    savedAt: new Date().toISOString(),
    chainId,
    address,
    pls: face.pls != null ? face.pls.toString() : null,
    stakeCount: face.stakeCount,
    tokenRows: fromTokenRows(face.tokenRows),
    customRows: fromCustomRows(face.customRows),
    fullBag: face.fullBag ? encodeFullBag(face.fullBag) : null,
    activity: face.activity,
    nfts: face.nfts,
    nftsTruncated: face.nftsTruncated,
  };
}

export function decodeBagCacheEntry(entry: BagCacheEntry): BagFaceSnapshot {
  let pls: bigint | null = null;
  if (entry.pls != null) {
    try {
      pls = BigInt(entry.pls);
    } catch {
      pls = null;
    }
  }
  return {
    pls,
    stakeCount: entry.stakeCount,
    tokenRows: toTokenRows(entry.tokenRows || []),
    customRows: toCustomRows(entry.customRows || []),
    fullBag: entry.fullBag ? decodeFullBag(entry.fullBag) : null,
    activity: Array.isArray(entry.activity) ? entry.activity : [],
    nfts: Array.isArray(entry.nfts) ? entry.nfts : [],
    nftsTruncated: entry.nftsTruncated || 0,
  };
}

export function saveBagCache(entry: BagCacheEntry): boolean {
  try {
    localStorage.setItem(
      cacheKey(entry.chainId, entry.address),
      JSON.stringify(entry),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadBagCache(
  chainId: DeskChainId,
  address: Address,
): BagCacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(chainId, address));
    if (!raw) return null;
    const j = JSON.parse(raw) as BagCacheEntry;
    if (j?.kind !== BAG_CACHE_KIND) return null;
    if (!j.address || !isAddress(j.address)) return null;
    if (j.chainId !== chainId) return null;
    if (j.address.toLowerCase() !== address.toLowerCase()) return null;
    return j;
  } catch {
    return null;
  }
}

/** Parse export / import JSON (same shape as cache). */
export function parseBagSnapshotJson(
  text: string,
): { ok: true; entry: BagCacheEntry } | { ok: false; error: string } {
  try {
    const j = JSON.parse(text) as Partial<BagCacheEntry> & {
      fullBag?: BagCacheEntry["fullBag"] | {
        tokenCount?: number;
        stakeCount?: number;
        stakes?: Array<{
          stakeId: number;
          hex?: string;
          days?: number;
          unlockedDay?: number;
          stakedHearts?: string;
          stakedDays?: number;
          lockedDay?: number;
          formattedHex?: string;
        }>;
      };
    };
    if (j?.kind !== BAG_CACHE_KIND) {
      return { ok: false, error: "Not a Pulse Perch bag snapshot." };
    }
    if (!j.address || !isAddress(j.address)) {
      return { ok: false, error: "Bag snapshot missing a valid address." };
    }
    if (
      !(DESK_CHAIN_IDS as readonly number[]).includes(Number(j.chainId))
    ) {
      return { ok: false, error: "Bag snapshot has an unknown chain." };
    }

    // Older thin exports only had stake summaries — upgrade if possible.
    let fullBag: BagCacheEntry["fullBag"] = null;
    if (j.fullBag && Array.isArray((j.fullBag as { stakes?: unknown }).stakes)) {
      const fb = j.fullBag as NonNullable<BagCacheEntry["fullBag"]> & {
        stakes: Array<Record<string, unknown>>;
      };
      if (fb.tokens && Array.isArray(fb.tokens)) {
        fullBag = fb as NonNullable<BagCacheEntry["fullBag"]>;
      } else {
        // Thin export: stakes with hex/days only
        fullBag = {
          tokens: [],
          tokensTruncated: 0,
          nfts: [],
          nftsTruncated: 0,
          stakes: fb.stakes.map((s) => {
            const row = s as Record<string, unknown>;
            return {
              stakeId: Number(row.stakeId),
              stakedHearts: String(row.stakedHearts ?? "0"),
              stakedDays: Number(row.stakedDays ?? row.days ?? 0),
              lockedDay: Number(row.lockedDay ?? 0),
              unlockedDay: Number(row.unlockedDay ?? 0),
              formattedHex: String(row.formattedHex ?? row.hex ?? "0"),
            };
          }),
          stakeCount: Number(fb.stakeCount ?? fb.stakes.length),
        };
      }
    }

    const entry: BagCacheEntry = {
      kind: BAG_CACHE_KIND,
      version: BAG_CACHE_VERSION,
      savedAt:
        typeof j.savedAt === "string"
          ? j.savedAt
          : typeof (j as { exportedAt?: string }).exportedAt === "string"
            ? (j as { exportedAt: string }).exportedAt
            : new Date().toISOString(),
      chainId: j.chainId as DeskChainId,
      address: j.address,
      pls: j.pls ?? null,
      stakeCount: Number(j.stakeCount ?? fullBag?.stakeCount ?? 0),
      tokenRows: Array.isArray(j.tokenRows)
        ? j.tokenRows
        : Array.isArray((j as { tokens?: CachedTokenRow[] }).tokens)
          ? ((j as { tokens: CachedTokenRow[] }).tokens || []).map((t) => ({
              address: t.address,
              symbol: t.symbol,
              name: t.name || t.symbol,
              decimals: t.decimals ?? 18,
              raw: t.raw,
              formatted: t.formatted,
              tags: t.tags,
            }))
          : [],
      customRows: Array.isArray(j.customRows)
        ? j.customRows
        : Array.isArray((j as { custom?: CachedCustomRow[] }).custom)
          ? ((j as { custom: CachedCustomRow[] }).custom || []).map((c) => ({
              address: c.address,
              symbol: c.symbol,
              name: c.name || c.symbol,
              decimals: c.decimals ?? 18,
              chainId: (c.chainId ?? j.chainId) as DeskChainId,
              raw: c.raw,
              formatted: c.formatted,
            }))
          : [],
      fullBag,
      activity: Array.isArray(j.activity) ? j.activity : [],
      nfts: Array.isArray(j.nfts) ? j.nfts : fullBag?.nfts || [],
      nftsTruncated: Number(j.nftsTruncated ?? fullBag?.nftsTruncated ?? 0),
    };
    return { ok: true, entry };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not read bag file.",
    };
  }
}

export function clearBagCache(
  chainId?: DeskChainId,
  address?: Address,
): number {
  let n = 0;
  try {
    if (chainId != null && address) {
      localStorage.removeItem(cacheKey(chainId, address));
      return 1;
    }
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(BAG_CACHE_PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      if (chainId != null && !k.startsWith(`${BAG_CACHE_PREFIX}${chainId}:`)) {
        continue;
      }
      localStorage.removeItem(k);
      n += 1;
    }
  } catch {
    /* ignore */
  }
  return n;
}

export function bagCacheCount(): number {
  let n = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(BAG_CACHE_PREFIX)) n += 1;
    }
  } catch {
    /* ignore */
  }
  return n;
}
