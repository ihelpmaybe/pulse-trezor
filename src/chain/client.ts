import {
  createPublicClient,
  defineChain,
  http,
  type Address,
  type Chain,
  type PublicClient,
} from "viem";
import {
  holesky,
  mainnet,
  pulsechain,
  pulsechainV4,
  sepolia,
} from "viem/chains";
import rpcPack from "../pack/rpc.json";
import {
  getCustomEvmPack,
  isEvmChainId,
  listCustomEvmPacks,
  type EvmChainPack,
} from "./evmNetworks";

/** Builtin presets (Pulse-first). Any other positive EVM id can be added via Chainlist. */
export const DESK_CHAIN_IDS = [369, 943, 1, 11155111, 17000] as const;

/** Any EVM chain id once registered (builtin pack or custom). */
export type DeskChainId = number;

export type ChainPack = EvmChainPack;

const packById = new Map<number, ChainPack>(
  rpcPack.chains.map((c) => [
    c.chainId,
    { ...(c as ChainPack), source: "pack" as const },
  ]),
);

export function isBuiltinChainId(
  n: number,
): n is (typeof DESK_CHAIN_IDS)[number] {
  return (DESK_CHAIN_IDS as readonly number[]).includes(n);
}

/** @deprecated use isEvmChainId / hasChainPack — kept for call sites */
export function isDeskChainId(n: number): n is DeskChainId {
  return isEvmChainId(n);
}

export function hasChainPack(chainId: number): boolean {
  return packById.has(chainId) || getCustomEvmPack(chainId) != null;
}

export function packFor(chainId: DeskChainId): ChainPack {
  const builtin = packById.get(chainId);
  if (builtin) return builtin;
  const custom = getCustomEvmPack(chainId);
  if (custom) return custom;
  throw new Error(
    `No pack for chain ${chainId} — add it with chain ID + RPC (Chainlist)`,
  );
}

/** Native ticker for this chain (PLS, ETH, …). */
export function nativeSymbol(chainId: DeskChainId): string {
  return packFor(chainId).currency.symbol;
}

/** True when `asset` is the chain’s native coin (not an ERC-20). */
export function isNativeAsset(asset: string, chainId: DeskChainId): boolean {
  const sym = nativeSymbol(chainId);
  if (asset === sym) return true;
  // Legacy desk key for Pulse native
  if ((chainId === 369 || chainId === 943) && asset === "PLS") return true;
  return false;
}

export function listSelectableChainIds(): number[] {
  const ids = new Set<number>([...DESK_CHAIN_IDS]);
  for (const c of listCustomEvmPacks()) ids.add(c.chainId);
  return [...ids].sort((a, b) => a - b);
}

export function viemChain(chainId: DeskChainId): Chain {
  switch (chainId) {
    case 943:
      return pulsechainV4;
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    case 17000:
      return holesky;
    case 369:
      return pulsechain;
    default: {
      const p = packFor(chainId);
      return defineChain({
        id: chainId,
        name: p.name,
        nativeCurrency: {
          name: p.currency.name,
          symbol: p.currency.symbol,
          decimals: p.currency.decimals,
        },
        rpcUrls: {
          default: { http: p.rpc },
        },
        blockExplorers: p.explorers?.[0]
          ? {
              default: {
                name: p.explorers[0].name,
                url: p.explorers[0].url,
              },
            }
          : undefined,
      });
    }
  }
}

export function chainLabel(chainId: DeskChainId): string {
  try {
    return packFor(chainId).name;
  } catch {
    return `Chain ${chainId}`;
  }
}

/** Optional custom RPC — string for all chains, or per chainId. */
export type RpcOverride = string | Partial<Record<number, string>>;

export function resolveRpcUrl(
  chainId: DeskChainId,
  rpc?: RpcOverride,
): string {
  if (typeof rpc === "string" && rpc.trim()) return rpc.trim();
  if (rpc && typeof rpc === "object") {
    const u = rpc[chainId];
    if (u?.trim()) return u.trim();
  }
  return packFor(chainId).rpc[0];
}

export function makePublicClient(
  chainId: DeskChainId,
  rpc?: RpcOverride,
): PublicClient {
  const url = resolveRpcUrl(chainId, rpc);
  return createPublicClient({
    chain: viemChain(chainId),
    transport: http(url, { timeout: 60_000 }),
  });
}

export async function fetchPlsBalance(
  chainId: DeskChainId,
  address: Address,
  rpc?: RpcOverride,
): Promise<bigint> {
  return makePublicClient(chainId, rpc).getBalance({ address });
}

/** Cheap liveness check — chainId + block. */
export async function probeRpc(
  chainId: DeskChainId,
  rpc?: RpcOverride,
): Promise<{ ok: true; block: bigint } | { ok: false; error: string }> {
  const d = await probeRpcDetailed(chainId, rpc);
  if (d.ok) return { ok: true, block: d.block };
  return { ok: false, error: d.error };
}

export type RpcProbeOk = {
  ok: true;
  block: bigint;
  latencyMs: number;
  url: string;
};
export type RpcProbeFail = { ok: false; error: string; url: string };

/** Liveness + RTT for face latency hint. */
export async function probeRpcDetailed(
  chainId: DeskChainId,
  rpc?: RpcOverride,
): Promise<RpcProbeOk | RpcProbeFail> {
  const url = resolveRpcUrl(chainId, rpc);
  const t0 = performance.now();
  try {
    const client = makePublicClient(chainId, rpc);
    const [id, block] = await Promise.all([
      client.getChainId(),
      client.getBlockNumber(),
    ]);
    const latencyMs = Math.round(performance.now() - t0);
    if (id !== chainId) {
      return {
        ok: false,
        error: `wrong chain ${id} (want ${chainId})`,
        url,
      };
    }
    return { ok: true, block, latencyMs, url };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      url,
    };
  }
}

/**
 * Try pack RPC list until one answers correctly.
 * Skips when user already forced a custom RPC string.
 */
export async function failoverRpc(
  chainId: DeskChainId,
  preferred?: RpcOverride,
): Promise<RpcProbeOk | RpcProbeFail> {
  if (typeof preferred === "string" && preferred.trim()) {
    return probeRpcDetailed(chainId, preferred.trim());
  }
  if (preferred && typeof preferred === "object" && preferred[chainId]?.trim()) {
    return probeRpcDetailed(chainId, preferred);
  }
  const list = packFor(chainId).rpc;
  let last: RpcProbeFail = {
    ok: false,
    error: "no RPC",
    url: list[0] ?? "",
  };
  for (const url of list) {
    const r = await probeRpcDetailed(chainId, url);
    if (r.ok) return r;
    last = r;
  }
  return last;
}

export function explorerAddressUrl(chainId: DeskChainId, address: string) {
  const explorers = packFor(chainId).explorers;
  const base = explorers?.[0]?.url ?? "https://scan.pulsechain.com";
  return `${base}/address/${address}`;
}

export function explorerTxUrl(chainId: DeskChainId, hash: string) {
  const explorers = packFor(chainId).explorers;
  const base = explorers?.[0]?.url ?? "https://scan.pulsechain.com";
  return `${base}/tx/${hash}`;
}

export function explorerNftUrl(
  chainId: DeskChainId,
  contract: string,
  tokenId: string,
) {
  const explorers = packFor(chainId).explorers;
  const base = explorers?.[0]?.url ?? "https://scan.pulsechain.com";
  return `${base}/token/${contract}/instance/${encodeURIComponent(tokenId)}`;
}

/** Poll until mined (or timeout). Used for face pending → confirmed. */
export async function waitForTxStatus(
  chainId: DeskChainId,
  hash: `0x${string}`,
  rpc?: RpcOverride,
  timeoutMs = 120_000,
): Promise<"confirmed" | "reverted" | "timeout"> {
  const client = makePublicClient(chainId, rpc);
  try {
    const receipt = await client.waitForTransactionReceipt({
      hash,
      timeout: timeoutMs,
    });
    return receipt.status === "success" ? "confirmed" : "reverted";
  } catch {
    return "timeout";
  }
}

/** Parse `eip155:369` or `0x171` / decimal string → chain id or null. */
export function parseChainRef(
  ref: string | number | undefined | null,
): DeskChainId | null {
  if (ref == null) return null;
  let n: number;
  if (typeof ref === "number") {
    n = ref;
  } else {
    const s = String(ref).trim();
    const eip = /^eip155:(\d+)$/i.exec(s);
    if (eip) n = Number(eip[1]);
    else if (/^0x[0-9a-f]+$/i.test(s)) n = Number.parseInt(s, 16);
    else if (/^\d+$/.test(s)) n = Number(s);
    else return null;
  }
  if (!isEvmChainId(n)) return null;
  // WC switch: allow any EVM id; signing still needs a pack (add first).
  return n;
}
