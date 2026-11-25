/**
 * Rabby-ish balance-change face from calldata + Temper Transfer/Approval logs.
 * Decimals from known Pulse tokens; unknown → 18 with a guess flag.
 */
import { formatEther, formatUnits, type Address, type Hex } from "viem";
import { decodeErc20Transfer } from "../wc/clearSign";
import type { TemperLog } from "./temperClient";
import { nativeSymbol, type DeskChainId } from "./client";
import tokenlist from "../pack/tokenlist.json";

export type BalanceDelta = {
  /** Human face line. */
  line: string;
  kind: "native" | "erc20" | "approve" | "log";
  /** Guessed decimals when token not in the known table. */
  guessed?: boolean;
};

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const APPROVAL_TOPIC =
  "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";

/** Extra face decimals beyond pulse-core tokenlist. */
const EXTRA_KNOWN: Record<string, { ticker: string; decimals: number }> = {
  "0x0cb6f5a34ad42ec934882a05238669b12e9621e9": { ticker: "USDT", decimals: 6 },
  "0xefd766cbb243bac7659ce4ada79e976567fd1e32": { ticker: "DAI", decimals: 18 },
  "0x70499adebb11efd915e3b69e700c331778628707": {
    ticker: "WPLS",
    decimals: 18,
  },
};

/** Pulse mainnet — ticker + decimals from SYNC4 pack (+ extras). */
const KNOWN: Record<string, { ticker: string; decimals: number }> = {
  ...Object.fromEntries(
    tokenlist.tokens
      .filter(
        (t) =>
          t.chainId === 369 &&
          !t.extensions?.native &&
          t.address !== "0x0000000000000000000000000000000000000000",
      )
      .map((t) => [
        t.address.toLowerCase(),
        { ticker: t.symbol, decimals: t.decimals },
      ]),
  ),
  ...EXTRA_KNOWN,
};

function short(a: string): string {
  if (!a || a.length < 12) return a || "?";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function topicAddress(topic: string): string {
  return `0x${topic.slice(-40)}`.toLowerCase();
}

function tokenMeta(addr: string): {
  ticker: string;
  decimals: number;
  guessed: boolean;
} {
  const hit = KNOWN[addr.toLowerCase()];
  if (hit) return { ...hit, guessed: false };
  return { ticker: short(addr), decimals: 18, guessed: true };
}

function fmtAmount(raw: bigint, decimals: number, ticker: string): string {
  try {
    return `${formatUnits(raw, decimals)} ${ticker}`;
  } catch {
    return `${raw.toString()} raw ${ticker}`;
  }
}

/** Calldata + native value → face deltas (before Temper). */
export function deltasFromCalldata(opts: {
  chainId: DeskChainId;
  from: Address;
  to: Address;
  data?: Hex | string;
  valueWei?: bigint;
}): BalanceDelta[] {
  const out: BalanceDelta[] = [];
  const value = opts.valueWei ?? 0n;
  if (value > 0n) {
    out.push({
      kind: "native",
      line: `−${formatEther(value)} ${nativeSymbol(opts.chainId)} → ${short(opts.to)}`,
    });
  }
  const data = (opts.data?.trim() || "0x") as string;
  const xfer = decodeErc20Transfer(data);
  if (xfer) {
    const meta = tokenMeta(opts.to);
    out.push({
      kind: "erc20",
      guessed: meta.guessed,
      line: `−${fmtAmount(xfer.raw, meta.decimals, meta.ticker)} → ${short(xfer.to)}${meta.guessed ? " (18dec guess)" : ""}`,
    });
  }
  // approve(spender, amount)
  if (data.startsWith("0x095ea7b3") && data.length >= 138) {
    const spender = `0x${data.slice(34, 74)}`;
    const raw = BigInt(`0x${data.slice(74, 138)}`);
    const meta = tokenMeta(opts.to);
    const amt =
      raw === 2n ** 256n - 1n
        ? `unlimited ${meta.ticker}`
        : fmtAmount(raw, meta.decimals, meta.ticker);
    out.push({
      kind: "approve",
      guessed: meta.guessed,
      line: `Allow ${short(spender)} to spend ${amt}`,
    });
  }
  return out;
}

/** Temper / eth logs → Transfer & Approval face lines. */
export function deltasFromLogs(
  logs: TemperLog[] | undefined,
  viewer?: Address,
): BalanceDelta[] {
  if (!logs?.length) return [];
  const out: BalanceDelta[] = [];
  const me = viewer?.toLowerCase();
  for (const log of logs.slice(0, 12)) {
    const t0 = (log.topics?.[0] || "").toLowerCase();
    const token = (log.address || "").toLowerCase();
    const meta = tokenMeta(token);
    if (t0 === TRANSFER_TOPIC && (log.topics?.length ?? 0) >= 3) {
      const from = topicAddress(log.topics[1]);
      const to = topicAddress(log.topics[2]);
      let raw = 0n;
      try {
        raw = BigInt(log.data || "0x0");
      } catch {
        raw = 0n;
      }
      const amt = fmtAmount(raw, meta.decimals, meta.ticker);
      let dir = `${short(from)} → ${short(to)}`;
      if (me) {
        if (from === me) dir = `−${amt}`;
        else if (to === me) dir = `+${amt}`;
        else dir = `${amt} (${short(from)} → ${short(to)})`;
      } else {
        dir = `${amt} ${short(from)} → ${short(to)}`;
      }
      out.push({
        kind: "log",
        guessed: meta.guessed,
        line: `Transfer ${dir} @ ${meta.guessed ? short(token) : meta.ticker}`,
      });
      continue;
    }
    if (t0 === APPROVAL_TOPIC && (log.topics?.length ?? 0) >= 3) {
      const owner = topicAddress(log.topics[1]);
      const spender = topicAddress(log.topics[2]);
      let raw = 0n;
      try {
        raw = BigInt(log.data || "0x0");
      } catch {
        raw = 0n;
      }
      const amt =
        raw === 2n ** 256n - 1n
          ? `unlimited ${meta.ticker}`
          : fmtAmount(raw, meta.decimals, meta.ticker);
      out.push({
        kind: "approve",
        guessed: meta.guessed,
        line: `Approval ${short(owner)} → ${short(spender)} ${amt}`,
      });
    }
  }
  if (!out.length && logs.length) {
    out.push({
      kind: "log",
      line: `${logs.length} log(s) — open Temper for full decode`,
    });
  }
  return out;
}

export function linesFromDeltas(deltas: BalanceDelta[]): string[] {
  return deltas.map((d) => d.line);
}
