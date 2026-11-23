/**
 * Recent txs via PulseScan Blockscout v2 — mainnet + testnet V4.
 */
import { formatEther, type Address } from "viem";
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
  };
}

export async function fetchAddressActivity(
  chainId: DeskChainId,
  owner: Address,
  max = 8,
): Promise<ActivityRow[]> {
  const base = scanApiBase(chainId);
  if (!base) return [];
  const url = `${base}/api/v2/addresses/${owner}/transactions?filter=to%20%7C%20from`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Activity ${res.status}`);
  const body = (await res.json()) as { items?: unknown[] };
  const out: ActivityRow[] = [];
  for (const raw of body.items ?? []) {
    const row = mapScanTx(raw, owner);
    if (row) out.push(row);
    if (out.length >= max) break;
  }
  return out;
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
