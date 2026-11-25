/**
 * Any-EVM custom networks — Chainlist / ethereum-lists resolve + localStorage.
 * Builtin Pulse/ETH packs stay in pack/rpc.json; this is the escape hatch.
 */
export type EvmCurrency = {
  name: string;
  symbol: string;
  decimals: number;
};

export type EvmExplorer = {
  name: string;
  url: string;
  apiUrl?: string;
};

export type EvmChainPack = {
  name: string;
  chainId: number;
  currency: EvmCurrency;
  rpc: string[];
  rpcOptions?: { name: string; url: string }[];
  explorers?: EvmExplorer[];
  apps?: Record<string, string>;
  /** Where this pack came from. */
  source?: "pack" | "custom" | "chainlist";
};

const CUSTOM_KEY = "pulse-perch-custom-evms-v1";

export function isEvmChainId(n: number): boolean {
  return Number.isInteger(n) && n > 0 && n <= 0xffffffff;
}

function loadRaw(): EvmChainPack[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as EvmChainPack[];
    return Array.isArray(arr) ? arr.filter((c) => isEvmChainId(c.chainId)) : [];
  } catch {
    return [];
  }
}

function saveRaw(rows: EvmChainPack[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(rows.slice(0, 64)));
  } catch {
    /* ignore */
  }
}

export function listCustomEvmPacks(): EvmChainPack[] {
  return loadRaw().sort((a, b) => a.chainId - b.chainId);
}

export function getCustomEvmPack(chainId: number): EvmChainPack | null {
  return loadRaw().find((c) => c.chainId === chainId) ?? null;
}

export function upsertCustomEvmPack(pack: EvmChainPack): EvmChainPack[] {
  if (!isEvmChainId(pack.chainId)) {
    throw new Error("Invalid chain id");
  }
  const rpc = (pack.rpc || []).map((u) => u.trim()).filter(Boolean);
  if (!rpc.length) throw new Error("Need at least one RPC URL");
  const row: EvmChainPack = {
    ...pack,
    name: (pack.name || `Chain ${pack.chainId}`).slice(0, 64),
    currency: {
      name: pack.currency?.name || pack.currency?.symbol || "Ether",
      symbol: (pack.currency?.symbol || "ETH").slice(0, 12),
      decimals: pack.currency?.decimals ?? 18,
    },
    rpc,
    rpcOptions:
      pack.rpcOptions?.length && pack.rpcOptions.length > 0
        ? pack.rpcOptions
        : rpc.map((url, i) => ({ name: i === 0 ? "Primary" : `RPC ${i + 1}`, url })),
    explorers: pack.explorers,
    source: pack.source || "custom",
  };
  const rows = loadRaw().filter((c) => c.chainId !== pack.chainId);
  rows.push(row);
  saveRaw(rows);
  return listCustomEvmPacks();
}

export function removeCustomEvmPack(chainId: number): EvmChainPack[] {
  saveRaw(loadRaw().filter((c) => c.chainId !== chainId));
  return listCustomEvmPacks();
}

type ChainlistRow = {
  name?: string;
  chainId?: number;
  chain?: string;
  nativeCurrency?: { name?: string; symbol?: string; decimals?: number };
  rpc?: (string | { url?: string })[];
  explorers?: { name?: string; url?: string }[];
};

function normalizeRpcList(rpc: ChainlistRow["rpc"]): string[] {
  if (!Array.isArray(rpc)) return [];
  const out: string[] = [];
  for (const r of rpc) {
    const u = typeof r === "string" ? r : r?.url;
    if (!u || !/^https?:\/\//i.test(u)) continue;
    if (/\$\{|API_KEY|INFURA|ALCHEMY/i.test(u)) continue;
    out.push(u.trim());
  }
  return [...new Set(out)];
}

/** ethereum-lists / chainid.network — one file per chain (prefer-existing). */
export async function fetchChainlistPack(
  chainId: number,
): Promise<EvmChainPack> {
  if (!isEvmChainId(chainId)) throw new Error("Invalid chain id");
  const url = `https://raw.githubusercontent.com/ethereum-lists/chains/master/_data/chains/eip155-${chainId}.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? `Chain ${chainId} not in Chainlist — paste an RPC URL manually`
        : `Chainlist HTTP ${res.status}`,
    );
  }
  const j = (await res.json()) as ChainlistRow;
  const rpc = normalizeRpcList(j.rpc);
  if (!rpc.length) {
    throw new Error(
      `Chain ${chainId} listed but has no public HTTPS RPC — paste one`,
    );
  }
  const explorers =
    j.explorers
      ?.filter((e) => e.url)
      .map((e) => ({
        name: e.name || "Explorer",
        url: (e.url || "").replace(/\/$/, ""),
      })) ?? [];
  return {
    name: j.name || j.chain || `Chain ${chainId}`,
    chainId,
    currency: {
      name: j.nativeCurrency?.name || "Ether",
      symbol: j.nativeCurrency?.symbol || "ETH",
      decimals: j.nativeCurrency?.decimals ?? 18,
    },
    rpc,
    rpcOptions: rpc.slice(0, 8).map((u, i) => ({
      name: i === 0 ? "Chainlist" : `RPC ${i + 1}`,
      url: u,
    })),
    explorers: explorers.length ? explorers : undefined,
    source: "chainlist",
  };
}

/**
 * Resolve + persist a custom EVM.
 * If rpcUrl set, skip Chainlist RPC list (still try Chainlist for name/explorer).
 */
export async function addEvmByChainId(opts: {
  chainId: number;
  rpcUrl?: string;
}): Promise<EvmChainPack> {
  const id = opts.chainId;
  const manual = opts.rpcUrl?.trim();
  let pack: EvmChainPack;
  try {
    pack = await fetchChainlistPack(id);
    if (manual) {
      pack = {
        ...pack,
        rpc: [manual, ...pack.rpc.filter((u) => u !== manual)],
        rpcOptions: [
          { name: "Custom", url: manual },
          ...(pack.rpcOptions || []).filter((o) => o.url !== manual),
        ],
        source: "custom",
      };
    }
  } catch (e) {
    if (!manual) throw e;
    pack = {
      name: `Chain ${id}`,
      chainId: id,
      currency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpc: [manual],
      rpcOptions: [{ name: "Custom", url: manual }],
      source: "custom",
    };
  }
  upsertCustomEvmPack(pack);
  return pack;
}

/** EIP-3085 wallet_addEthereumChain params (Chainlist “Add to wallet”). */
export type Eip3085AddChainParams = {
  chainId?: string | number;
  chainName?: string;
  nativeCurrency?: { name?: string; symbol?: string; decimals?: number };
  rpcUrls?: string[];
  blockExplorerUrls?: string[];
};

function parseEip3085ChainId(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.floor(raw);
  const s = String(raw ?? "");
  if (/^0x/i.test(s)) return Number.parseInt(s, 16);
  return Number.parseInt(s, 10);
}

/**
 * Chainlist magic: prefer ethereum-lists by id; fall back to dapp RPC list.
 * Idempotent if the pack already exists.
 */
export async function addEthereumChainFromEip3085(
  params: Eip3085AddChainParams,
): Promise<EvmChainPack> {
  const id = parseEip3085ChainId(params.chainId);
  if (!isEvmChainId(id)) throw new Error("Invalid chainId in add-chain request");

  const existing = getCustomEvmPack(id);
  if (existing) return existing;

  const dappRpcs = normalizeRpcList(params.rpcUrls);
  const preferredRpc = dappRpcs[0];

  try {
    return await addEvmByChainId({
      chainId: id,
      rpcUrl: preferredRpc,
    });
  } catch (e) {
    if (!preferredRpc) throw e;
    const pack: EvmChainPack = {
      name: (params.chainName || `Chain ${id}`).slice(0, 64),
      chainId: id,
      currency: {
        name: params.nativeCurrency?.name || "Ether",
        symbol: (params.nativeCurrency?.symbol || "ETH").slice(0, 12),
        decimals: params.nativeCurrency?.decimals ?? 18,
      },
      rpc: dappRpcs,
      rpcOptions: dappRpcs.map((url, i) => ({
        name: i === 0 ? "Dapp" : `RPC ${i + 1}`,
        url,
      })),
      explorers: params.blockExplorerUrls
        ?.filter(Boolean)
        .map((url, i) => ({
          name: i === 0 ? "Explorer" : `Explorer ${i + 1}`,
          url: url.replace(/\/$/, ""),
        })),
      source: "custom",
    };
    upsertCustomEvmPack(pack);
    return pack;
  }
}
