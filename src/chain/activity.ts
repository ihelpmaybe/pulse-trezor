/**
 * Recent txs via PulseScan Blockscout v2 — mainnet + testnet V4.
 * Native txs + token transfers merged for the Activity face.
 */
import { formatEther, formatUnits, type Address } from "viem";
import { packFor, type DeskChainId } from "./client";

export type ActivityRow = {
  hash: `0x${string}`;
  timestamp: string;
  direction: "in" | "out" | "self" | "other";
  valueEth: string;
  status: "ok" | "error" | "pending";
  method: string | null;
  /** Counterparty for out/in; empty for self/other edge cases. */
  counterparty: string | null;
  /** Native PLS or token symbol when known. */
  asset?: string;
  kind?: "native" | "token";
};

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

export function mapScanTx(
  raw: unknown,
  owner: string,
): ActivityRow | null {
  const r = raw as {
    hash?: string;
    timestamp?: string;
    status?: string;
    result?: string;
    value?: string;
    method?: string | null;
    from?: { hash?: string };
    to?: { hash?: string } | null;
  };
  if (!r.hash?.startsWith("0x")) return null;
  const from = (r.from?.hash || "").toLowerCase();
  const to = (r.to?.hash || "").toLowerCase();
  const me = owner.toLowerCase();
  let direction: ActivityRow["direction"] = "other";
  if (from === me && to === me) direction = "self";
  else if (from === me) direction = "out";
  else if (to === me) direction = "in";
  let valueEth = "0";
  try {
    valueEth = formatEther(BigInt(r.value || "0"));
  } catch {
    valueEth = "0";
  }
  const ok =
    r.status === "ok" ||
    r.result === "success" ||
    r.status === "1" ||
    r.result === "1";
  const bad =
    r.status === "error" ||
    r.result === "error" ||
    r.status === "0" ||
    r.result === "0";
  let counterparty: string | null = null;
  if (direction === "out" && to.startsWith("0x")) counterparty = to;
  else if (direction === "in" && from.startsWith("0x")) counterparty = from;

  return {
    hash: r.hash as `0x${string}`,
    timestamp: r.timestamp || "",
    direction,
    valueEth,
    status: bad ? "error" : ok ? "ok" : "pending",
    method: r.method ?? null,
    counterparty,
    asset: "PLS",
    kind: "native",
  };
}

export function mapScanTokenTransfer(
  raw: unknown,
  owner: string,
): ActivityRow | null {
  const r = raw as {
    tx_hash?: string;
    timestamp?: string;
    from?: { hash?: string };
    to?: { hash?: string } | null;
    total?: { value?: string; decimals?: string | number };
    token?: { symbol?: string; name?: string; address?: string };
    type?: string;
  };
  const hash = r.tx_hash;
  if (!hash?.startsWith("0x")) return null;
  const from = (r.from?.hash || "").toLowerCase();
  const to = (r.to?.hash || "").toLowerCase();
  const me = owner.toLowerCase();
  let direction: ActivityRow["direction"] = "other";
  if (from === me && to === me) direction = "self";
  else if (from === me) direction = "out";
  else if (to === me) direction = "in";
  const decimals = Number(r.total?.decimals ?? 18);
  let valueEth = "0";
  try {
    valueEth = formatUnits(BigInt(r.total?.value || "0"), decimals);
  } catch {
    valueEth = "0";
  }
  let counterparty: string | null = null;
  if (direction === "out" && to.startsWith("0x")) counterparty = to;
  else if (direction === "in" && from.startsWith("0x")) counterparty = from;
  const symbol = (r.token?.symbol || r.token?.name || "token").slice(0, 12);

  return {
    hash: hash as `0x${string}`,
    timestamp: r.timestamp || "",
    direction,
    valueEth,
    status: "ok",
    method: symbol,
    counterparty,
    asset: symbol,
    kind: "token",
  };
}

function rowKey(row: ActivityRow): string {
  return `${row.hash.toLowerCase()}:${row.kind || "native"}:${row.direction}:${row.asset || ""}`;
}

function sortRows(rows: ActivityRow[]): ActivityRow[] {
  return [...rows].sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return tb - ta;
  });
}

export async function fetchAddressActivity(
  chainId: DeskChainId,
  owner: Address,
  max = 24,
): Promise<ActivityRow[]> {
  const base = scanApiBase(chainId);
  if (!base) return [];
  const nativeUrl = `${base}/api/v2/addresses/${owner}/transactions?filter=to%20%7C%20from`;
  const tokenUrl = `${base}/api/v2/addresses/${owner}/token-transfers`;
  const [nativeRes, tokenRes] = await Promise.all([
    fetch(nativeUrl),
    fetch(tokenUrl),
  ]);
  if (!nativeRes.ok) throw new Error(`Activity ${nativeRes.status}`);
  const nativeBody = (await nativeRes.json()) as { items?: unknown[] };
  const out: ActivityRow[] = [];
  const seen = new Set<string>();
  for (const raw of nativeBody.items ?? []) {
    const row = mapScanTx(raw, owner);
    if (!row) continue;
    const k = rowKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  if (tokenRes.ok) {
    const tokenBody = (await tokenRes.json()) as { items?: unknown[] };
    for (const raw of tokenBody.items ?? []) {
      const row = mapScanTokenTransfer(raw, owner);
      if (!row) continue;
      const k = rowKey(row);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(row);
    }
  }
  return sortRows(out).slice(0, max);
}

/** Face: short month+day — time on hover via fullWhen. */
export function shortWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/** Full local date+time for hover / title. */
export function fullWhen(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
