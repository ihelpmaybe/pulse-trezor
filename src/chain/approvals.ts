/**
 * Approval inventory — PulseScan history + Approval logs + known routers,
 * then live allowance reads. No third-party revoke sites; Perch owns scan + revoke.
 */
import {
  erc20Abi,
  formatUnits,
  maxUint256,
  type Address,
} from "viem";
import {
  makePublicClient,
  packFor,
  type DeskChainId,
  type RpcOverride,
} from "./client";
import { PULSEX_V2_ROUTER, WPLS } from "./pulsex";
import { coreErc20Tokens, type PackToken } from "./tokens";
import { loadCustomTokens, type CustomToken } from "./customTokens";

export type KnownSpender = {
  address: Address;
  name: string;
};

/** PulseX V1 router (Uniswap-V2 fork, still holds legacy allowances). */
export const PULSEX_V1_ROUTER =
  "0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02" as Address;

/** Common Pulse routers / corridors — expand as we confirm addresses. */
export const KNOWN_SPENDERS: KnownSpender[] = [
  { address: PULSEX_V2_ROUTER, name: "PulseX V2 Router" },
  { address: PULSEX_V1_ROUTER, name: "PulseX V1 Router" },
];

export type ApprovalRow = {
  token: Address;
  symbol: string;
  decimals: number;
  spender: Address;
  spenderName: string;
  allowance: bigint;
  allowanceLabel: string;
  unlimited: boolean;
};

export type ApprovalScanMeta = {
  tokensChecked: number;
  pairsChecked: number;
  sources: ("known" | "history" | "logs" | "bag")[];
};

const APPROVAL_EVENT = {
  type: "event",
  name: "Approval",
  inputs: [
    { name: "owner", type: "address", indexed: true, internalType: "address" },
    {
      name: "spender",
      type: "address",
      indexed: true,
      internalType: "address",
    },
    { name: "value", type: "uint256", indexed: false, internalType: "uint256" },
  ],
} as const;

/** Public RPCs choke on unbounded getLogs — viem splits by this. */
const LOG_BLOCK_RANGE = 100_000n;
/** How far back to walk (~2M blocks). */
const LOG_LOOKBACK = 2_000_000n;

function scanApiBase(chainId: DeskChainId): string | null {
  const explorers = packFor(chainId).explorers as
    | { apiUrl?: string }[]
    | undefined;
  const api = explorers?.[0]?.apiUrl?.trim();
  if (api) return api.replace(/\/$/, "");
  if (chainId === 369) return "https://api.scan.pulsechain.com";
  if (chainId === 943) return "https://api.scan.v4.testnet.pulsechain.com";
  return null;
}

function spenderName(addr: Address): string {
  const hit = KNOWN_SPENDERS.find(
    (s) => s.address.toLowerCase() === addr.toLowerCase(),
  );
  return hit?.name ?? "Unknown spender";
}

/** Decode spender from approve(address,uint256) calldata. */
export function decodeApproveSpender(data: string): Address | null {
  const d = (data || "").toLowerCase();
  if (!d.startsWith("0x095ea7b3") || d.length < 74) return null;
  const raw = `0x${d.slice(34, 74)}` as Address;
  if (raw === "0x0000000000000000000000000000000000000000") return null;
  return raw;
}

type TokenRef = { address: Address; symbol: string; decimals: number };

function collectTokens(
  chainId: DeskChainId,
  extra: TokenRef[] = [],
): TokenRef[] {
  const map = new Map<string, TokenRef>();
  for (const t of coreErc20Tokens(chainId) as PackToken[]) {
    map.set(t.address.toLowerCase(), {
      address: t.address as Address,
      symbol: t.symbol,
      decimals: t.decimals,
    });
  }
  for (const t of loadCustomTokens(chainId) as CustomToken[]) {
    map.set(t.address.toLowerCase(), {
      address: t.address,
      symbol: t.symbol,
      decimals: t.decimals,
    });
  }
  for (const t of extra) {
    map.set(t.address.toLowerCase(), t);
  }
  return [...map.values()];
}

/** Tokens the address actually holds (PulseScan) — expands log coverage past pack list. */
export async function fetchBagTokenRefs(
  chainId: DeskChainId,
  owner: Address,
): Promise<TokenRef[]> {
  const base = scanApiBase(chainId);
  if (!base) return [];
  const out: TokenRef[] = [];
  let url: string | null = `${base}/api/v2/addresses/${owner}/tokens?type=ERC-20`;
  let pages = 0;
  while (url && pages < 3) {
    pages += 1;
    const res = await fetch(url);
    if (!res.ok) break;
    const body = (await res.json()) as {
      items?: {
        token?: {
          address?: string;
          address_hash?: string;
          symbol?: string | null;
          decimals?: string | null;
        };
        token_address?: string;
      }[];
      next_page_params?: Record<string, string | number> | null;
    };
    for (const raw of body.items ?? []) {
      const tok = raw.token;
      const addr = (tok?.address ||
        tok?.address_hash ||
        raw.token_address) as Address | undefined;
      if (!addr || addr.toLowerCase() === WPLS.toLowerCase()) continue;
      const decimals = Number(tok?.decimals ?? 18);
      out.push({
        address: addr,
        symbol: (tok?.symbol || shortSym(addr)).slice(0, 24),
        decimals: Number.isFinite(decimals) ? decimals : 18,
      });
    }
    if (body.next_page_params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(body.next_page_params)) {
        q.set(k, String(v));
      }
      url = `${base}/api/v2/addresses/${owner}/tokens?${q}`;
    } else {
      url = null;
    }
  }
  return out;
}

/** Pull approve txs → token/spender pairs (deeper history than v1). */
export async function discoverApprovePairs(
  chainId: DeskChainId,
  owner: Address,
  maxPages = 8,
): Promise<{ token: Address; spender: Address }[]> {
  const base = scanApiBase(chainId);
  if (!base) return [];
  const pairs: { token: Address; spender: Address }[] = [];
  const seen = new Set<string>();
  let url: string | null =
    `${base}/api/v2/addresses/${owner}/transactions?filter=from`;
  let pages = 0;
  while (url && pages < maxPages) {
    pages += 1;
    const res = await fetch(url);
    if (!res.ok) break;
    const body = (await res.json()) as {
      items?: unknown[];
      next_page_params?: Record<string, string | number> | null;
    };
    for (const raw of body.items ?? []) {
      const tx = raw as {
        method?: string | null;
        raw_input?: string;
        to?: { hash?: string } | null;
        decoded_input?: {
          method_id?: string;
          parameters?: { name?: string; type?: string; value?: string }[];
        };
      };
      const isApprove =
        tx.method === "approve" ||
        (tx.raw_input || "").toLowerCase().startsWith("0x095ea7b3");
      if (!isApprove) continue;
      const token = tx.to?.hash as Address | undefined;
      if (!token) continue;
      let spender: Address | null = null;
      const params = tx.decoded_input?.parameters;
      if (params?.length) {
        const p = params.find(
          (x) =>
            x.type === "address" &&
            (x.name === "_spender" ||
              x.name === "spender" ||
              x.name === "_approved" ||
              x.name === "guy"),
        );
        if (p?.value?.startsWith("0x")) spender = p.value as Address;
      }
      if (!spender) spender = decodeApproveSpender(tx.raw_input || "");
      if (!spender) continue;
      const key = `${token.toLowerCase()}:${spender.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ token, spender });
    }
    if (body.next_page_params) {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(body.next_page_params)) {
        q.set(k, String(v));
      }
      q.set("filter", "from");
      url = `${base}/api/v2/addresses/${owner}/transactions?${q}`;
    } else {
      url = null;
    }
  }
  return pairs;
}

/**
 * Approval(owner, spender, value) logs per token — finds spenders even when
 * the approve tx fell off the recent history window.
 */
export async function discoverSpendersFromLogs(
  chainId: DeskChainId,
  owner: Address,
  tokens: TokenRef[],
  rpc?: RpcOverride,
): Promise<{ token: Address; spender: Address }[]> {
  if (!tokens.length) return [];
  const client = makePublicClient(chainId, rpc);
  const tip = await client.getBlockNumber().catch(() => null);
  if (tip == null) return [];
  const fromBlock = tip > LOG_LOOKBACK ? tip - LOG_LOOKBACK : 0n;

  const pairs: { token: Address; spender: Address }[] = [];
  const seen = new Set<string>();

  await Promise.all(
    tokens.map(async (t) => {
      try {
        const logs = await client.getLogs({
          address: t.address,
          event: APPROVAL_EVENT,
          args: { owner },
          fromBlock,
          toBlock: tip,
          blockRange: LOG_BLOCK_RANGE,
        });
        for (const log of logs) {
          const spender = log.args.spender;
          if (
            !spender ||
            spender === "0x0000000000000000000000000000000000000000"
          ) {
            continue;
          }
          const key = `${t.address.toLowerCase()}:${spender.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          pairs.push({ token: t.address, spender });
        }
      } catch {
        // Skip token on RPC refusal — history/known still cover it.
      }
    }),
  );

  return pairs;
}

export async function fetchApprovalInventory(
  chainId: DeskChainId,
  owner: Address,
  opts?: {
    rpc?: RpcOverride;
    extraTokens?: TokenRef[];
  },
): Promise<{ rows: ApprovalRow[]; meta: ApprovalScanMeta }> {
  const sources: ApprovalScanMeta["sources"] = ["known"];
  const bagTokens = await fetchBagTokenRefs(chainId, owner).catch(() => []);
  if (bagTokens.length) sources.push("bag");

  const tokens = collectTokens(chainId, [
    ...(opts?.extraTokens ?? []),
    ...bagTokens,
  ]);

  const [discovered, fromLogs] = await Promise.all([
    discoverApprovePairs(chainId, owner).then((p) => {
      if (p.length) sources.push("history");
      return p;
    }).catch(() => [] as { token: Address; spender: Address }[]),
    discoverSpendersFromLogs(chainId, owner, tokens, opts?.rpc).then((p) => {
      if (p.length) sources.push("logs");
      return p;
    }).catch(() => [] as { token: Address; spender: Address }[]),
  ]);

  type Pair = { token: TokenRef; spender: Address };
  const pairMap = new Map<string, Pair>();

  for (const t of tokens) {
    for (const s of KNOWN_SPENDERS) {
      const key = `${t.address.toLowerCase()}:${s.address.toLowerCase()}`;
      pairMap.set(key, { token: t, spender: s.address });
    }
  }
  for (const d of [...discovered, ...fromLogs]) {
    const key = `${d.token.toLowerCase()}:${d.spender.toLowerCase()}`;
    if (pairMap.has(key)) continue;
    const knownTok = tokens.find(
      (t) => t.address.toLowerCase() === d.token.toLowerCase(),
    );
    pairMap.set(key, {
      token: knownTok ?? {
        address: d.token,
        symbol: shortSym(d.token),
        decimals: 18,
      },
      spender: d.spender,
    });
  }

  const pairs = [...pairMap.values()];
  const meta: ApprovalScanMeta = {
    tokensChecked: tokens.length,
    pairsChecked: pairs.length,
    sources: [...new Set(sources)],
  };
  if (!pairs.length) return { rows: [], meta };

  const client = makePublicClient(chainId, opts?.rpc);
  const rows: ApprovalRow[] = [];
  const chunk = 20;
  for (let i = 0; i < pairs.length; i += chunk) {
    const slice = pairs.slice(i, i + chunk);
    const settled = await Promise.all(
      slice.map(async (p) => {
        try {
          const allowance = await client.readContract({
            address: p.token.address,
            abi: erc20Abi,
            functionName: "allowance",
            args: [owner, p.spender],
          });
          return { p, allowance };
        } catch {
          return null;
        }
      }),
    );
    for (const hit of settled) {
      if (!hit || hit.allowance === 0n) continue;
      const unlimited = hit.allowance >= maxUint256 / 2n;
      rows.push({
        token: hit.p.token.address,
        symbol: hit.p.token.symbol,
        decimals: hit.p.token.decimals,
        spender: hit.p.spender,
        spenderName: spenderName(hit.p.spender),
        allowance: hit.allowance,
        allowanceLabel: unlimited
          ? "Unlimited"
          : formatUnits(hit.allowance, hit.p.token.decimals),
        unlimited,
      });
    }
  }
  rows.sort((a, b) => {
    if (a.unlimited !== b.unlimited) return a.unlimited ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
  return { rows, meta };
}

function shortSym(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
