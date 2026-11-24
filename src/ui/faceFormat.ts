/**
 * Compact face formatters — shared so extreme/fuzz tests can hit real logic.
 */
import { formatEther } from "viem";
import type { DeskChainId } from "../chain/client";

/** Pulse gas unit is beats (not gwei). Same 1e9 wei scale as ETH gwei. */
export function gasUnitLabel(chainId: DeskChainId): "beats" | "gwei" {
  return chainId === 369 || chainId === 943 ? "beats" : "gwei";
}

export const ACCOUNT_COUNT_MIN = 1;
/**
 * BIP32 non-hardened child index max (2^31 − 1).
 * Path slots + Load count share this — no fake 2000 product cap.
 */
export const ACCOUNT_INDEX_MAX = 2_147_483_647;
/** Same as index max — Count may request any legal BIP32 span. */
export const ACCOUNT_COUNT_MAX = ACCOUNT_INDEX_MAX;

/** Parse `20-40` → inclusive BIP44 indices (single digit → that slot only). */
export function parseAccountRange(
  raw: string,
): { from: number; to: number } | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (!s) return null;
  const m = /^(\d+)(?:[-–—](\d+))?$/.exec(s);
  if (!m) return null;
  let from = Number(m[1]);
  let to = m[2] != null ? Number(m[2]) : from;
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  from = Math.floor(from);
  to = Math.floor(to);
  if (from > to) return null;
  from = Math.max(0, Math.min(ACCOUNT_INDEX_MAX, from));
  to = Math.max(0, Math.min(ACCOUNT_INDEX_MAX, to));
  if (from > to) return null;
  if (to - from + 1 > ACCOUNT_COUNT_MAX) {
    to = from + ACCOUNT_COUNT_MAX - 1;
  }
  return { from, to };
}

/**
 * Device Count field: `20` = load 20 wallets from slot 0;
 * `2000-3000` = load that inclusive index range.
 */
export function parseLoadSpec(
  raw: string,
): { from: number; to: number; span: number } | null {
  const s = raw.trim().replace(/\s+/g, "");
  if (!s) return null;
  if (/^\d+$/.test(s)) {
    const count = clampAccountCount(Number(s));
    return { from: 0, to: count - 1, span: count };
  }
  if (!/^\d+[-–—]\d+$/.test(s)) return null;
  const r = parseAccountRange(s);
  if (!r) return null;
  return { from: r.from, to: r.to, span: r.to - r.from + 1 };
}

export function formatAccountRange(from: number, to: number): string {
  const a = Math.max(0, Math.floor(from));
  const b = Math.max(0, Math.floor(to));
  return a === b ? String(a) : `${a}-${b}`;
}

/** Compact PLS for account cards (not full wei string). */
export function shortNative(wei: bigint): string {
  const s = formatEther(wei);
  const n = Number(s);
  if (!Number.isFinite(n)) return s;
  if (n === 0) return "0";
  if (n >= 1000)
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 1)
    return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
  return n.toLocaleString(undefined, { maximumSignificantDigits: 4 });
}

export function shortAddr(a: string) {
  if (a.length < 10) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** Split for decimal-column align in Activity. */
export function fmtActivityAmtParts(
  raw: string,
  digits = 6,
): { int: string; frac: string | null } | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return null;
  const s = n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
    useGrouping: true,
  });
  const dot = s.lastIndexOf(".");
  const comma = s.lastIndexOf(",");
  const sep =
    dot > comma && /\.\d+$/.test(s)
      ? dot
      : comma > dot && /,\d+$/.test(s)
        ? comma
        : -1;
  if (sep < 0) return { int: s, frac: null };
  return { int: s.slice(0, sep), frac: s.slice(sep + 1) };
}

export function clampAccountCount(n: number): number {
  if (!Number.isFinite(n)) return ACCOUNT_COUNT_MIN;
  return Math.max(
    ACCOUNT_COUNT_MIN,
    Math.min(ACCOUNT_COUNT_MAX, Math.floor(n)),
  );
}
