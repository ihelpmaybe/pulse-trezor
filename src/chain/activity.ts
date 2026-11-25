/**
 * Recent txs via PulseScan Blockscout v2 — mainnet + testnet V4.
 * Native txs + token transfers merged for the Activity face.
 */
import { formatEther, formatUnits, type Address } from "viem";
import { nativeSymbol, packFor, type DeskChainId } from "./client";
import { scanApiFromIndexer } from "./indexer";

export type ActivityRow = {
  hash: `0x${string}`;
  timestamp: string;
  direction: "in" | "out" | "self" | "other";
  valueEth: string;
  status: "ok" | "error" | "pending";
  method: string | null;
  /** Counterparty for out/in; empty for self/other edge cases. */
  counterparty: string | null;
  /** Native coin or token symbol when known. */
  asset?: string;
  kind?: "native" | "token";
  /** One-line human summary (Blockscout-style face). */
  summary?: string;
};

function scanApiBase(chainId: DeskChainId): string | null {
  const explorers = packFor(chainId).explorers as
    | { apiUrl?: string }[]
    | undefined;
  const api = explorers?.[0]?.apiUrl?.trim();
  if (api) return api.replace(/\/$/, "");
  return scanApiFromIndexer(chainId);
}

function shortPeer(a: string | null | undefined): string {
  if (!a || a.length < 12) return a || "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function trimAmt(v: string): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/** Dig 4b — human tx summary for Activity face (no indexer). */
export function activitySummary(
  row: ActivityRow,
  nativeSym = "PLS",
): string {
  const peer = shortPeer(row.counterparty);
  const amt = Number(row.valueEth);
  const hasAmt = Number.isFinite(amt) && amt !== 0;
  const asset =
    row.asset && row.asset !== "PLS" && row.asset !== nativeSym
      ? row.asset
      : nativeSym;
  if (row.kind === "token" || (hasAmt && !row.method)) {
    const body = `${trimAmt(row.valueEth)} ${asset}`;
    if (row.direction === "in")
      return peer ? `Received ${body} from ${peer}` : `Received ${body}`;
    if (row.direction === "out")
      return peer ? `Sent ${body} to ${peer}` : `Sent ${body}`;
    if (row.direction === "self") return `Self ${body}`;
  }
  if (row.method) {
    return peer ? `${row.method} · ${peer}` : row.method;
  }
  if (row.direction === "in") return peer ? `In from ${peer}` : "In";
  if (row.direction === "out") return peer ? `Out to ${peer}` : "Out";
  return row.direction;
}

export function mapScanTx(
  raw: unknown,
  owner: string,
  nativeSym = "PLS",
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

  const row: ActivityRow = {
    hash: r.hash as `0x${string}`,
    timestamp: r.timestamp || "",
    direction,
    valueEth,
    status: bad ? "error" : ok ? "ok" : "pending",
    method: r.method ?? null,
    counterparty,
    asset: nativeSym,
    kind: "native",
  };
  row.summary = activitySummary(row, nativeSym);
  return row;
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

  const row: ActivityRow = {
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
  row.summary = activitySummary(row);
  return row;
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

async function fetchScanPages(
  startUrl: string,
  maxPages: number,
): Promise<unknown[]> {
  const items: unknown[] = [];
  let url: string | null = startUrl;
  for (let page = 0; page < maxPages && url; page++) {
    const res = await fetch(url);
    if (!res.ok) {
      if (page === 0) throw new Error(`Activity ${res.status}`);
      break;
    }
    const body = (await res.json()) as {
      items?: unknown[];
      next_page_params?: Record<string, string | number> | null;
    };
    items.push(...(body.items ?? []));
    if (body.next_page_params) {
      const cur: string = url;
      const parsed = new URL(cur);
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(body.next_page_params)) {
        q.set(k, String(v));
      }
      url = `${parsed.origin}${parsed.pathname}?${q}`;
    } else {
      url = null;
    }
  }
  return items;
}

/**
 * Deeper Activity: page PulseScan native + token feeds until `max` rows.
 * Default pages scale with max (≈50 items/page).
 */
export async function fetchAddressActivity(
  chainId: DeskChainId,
  owner: Address,
  max = 48,
): Promise<ActivityRow[]> {
  const base = scanApiBase(chainId);
  if (!base) return [];
  let nativeSym = "PLS";
  try {
    nativeSym = nativeSymbol(chainId);
  } catch {
    /* pack missing — keep PLS label */
  }
  const pages = Math.max(1, Math.min(12, Math.ceil(max / 40)));
  const nativeUrl = `${base}/api/v2/addresses/${owner}/transactions?filter=to%20%7C%20from`;
  const tokenUrl = `${base}/api/v2/addresses/${owner}/token-transfers`;
  const [nativeItems, tokenItems] = await Promise.all([
    fetchScanPages(nativeUrl, pages),
    fetchScanPages(tokenUrl, pages).catch(() => [] as unknown[]),
  ]);
  const out: ActivityRow[] = [];
  const seen = new Set<string>();
  for (const raw of nativeItems) {
    const row = mapScanTx(raw, owner, nativeSym);
    if (!row) continue;
    const k = rowKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  for (const raw of tokenItems) {
    const row = mapScanTokenTransfer(raw, owner);
    if (!row) continue;
    const k = rowKey(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
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
