/**
 * Soft USD hints via DexScreener (public, free). Never blocks bag/send.
 */
import type { Address } from "viem";

export type PriceHint = {
  address: Address;
  usd: number | null;
  source: "dexscreener";
};

const CACHE = new Map<string, { at: number; hint: PriceHint }>();
const TTL_MS = 60_000;

export async function fetchTokenUsdHints(
  chainId: number,
  addresses: Address[],
): Promise<PriceHint[]> {
  if (chainId !== 369 || !addresses.length) return [];
  const uniq = [
    ...new Set(addresses.map((a) => a.toLowerCase() as Address)),
  ].slice(0, 30);
  const out: PriceHint[] = [];
  const need: Address[] = [];
  const now = Date.now();
  for (const a of uniq) {
    const hit = CACHE.get(a);
    if (hit && now - hit.at < TTL_MS) out.push(hit.hint);
    else need.push(a);
  }
  if (!need.length) return out;

  // DexScreener batch: /tokens/{addr1},{addr2}
  const url = `https://api.dexscreener.com/latest/dex/tokens/${need.join(",")}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      for (const a of need) {
        out.push({ address: a, usd: null, source: "dexscreener" });
      }
      return out;
    }
    const body = (await res.json()) as {
      pairs?: {
        chainId?: string;
        baseToken?: { address?: string };
        priceUsd?: string;
        liquidity?: { usd?: number };
      }[];
    };
    const best = new Map<string, { usd: number; liq: number }>();
    for (const p of body.pairs ?? []) {
      if (p.chainId !== "pulsechain") continue;
      const addr = (p.baseToken?.address || "").toLowerCase();
      if (!addr) continue;
      const usd = Number(p.priceUsd);
      if (!Number.isFinite(usd)) continue;
      const liq = p.liquidity?.usd ?? 0;
      const prev = best.get(addr);
      if (!prev || liq > prev.liq) best.set(addr, { usd, liq });
    }
    for (const a of need) {
      const b = best.get(a.toLowerCase());
      const hint: PriceHint = {
        address: a,
        usd: b?.usd ?? null,
        source: "dexscreener",
      };
      CACHE.set(a.toLowerCase(), { at: now, hint });
      out.push(hint);
    }
  } catch {
    for (const a of need) {
      out.push({ address: a, usd: null, source: "dexscreener" });
    }
  }
  return out;
}

export function formatUsdHint(usd: number | null): string {
  if (usd == null) return "";
  if (usd >= 1000) return `~$${usd.toFixed(0)}`;
  if (usd >= 1) return `~$${usd.toFixed(2)}`;
  if (usd >= 0.0001) return `~$${usd.toFixed(4)}`;
  return `~$${usd.toExponential(2)}`;
}
