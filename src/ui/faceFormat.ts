/**
 * Compact face formatters — shared so extreme/fuzz tests can hit real logic.
 */
import { formatEther } from "viem";

export const ACCOUNT_COUNT_MIN = 1;
/** Suite address-pull headroom (not Blsx monthly product cap). */
export const ACCOUNT_COUNT_MAX = 2000;

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
