/**
 * Stuck-tx RBF helpers — ynatm-style bump schedule + local pending-nonce track
 * (viem NonceManager idea without soft-seed). Every bump still re-signs on Trezor.
 */
import type { Address } from "viem";
import { bumpFees, type BroadcastResult, type FeeOverride } from "./signPulseTx";

/** Percents of original fee (125 = +25%). Matches common MM / ynatm ladders. */
export const RBF_BUMP_PERCENTS = [125n, 150n, 200n, 300n, 500n] as const;

export function bumpPercentAtStep(step: number): bigint {
  const i = Math.max(0, Math.min(step, RBF_BUMP_PERCENTS.length - 1));
  return RBF_BUMP_PERCENTS[i];
}

/** Fee override for speed-up / cancel at ladder step (0 = first bump). */
export function bumpFeesAtStep(
  meta: Pick<
    BroadcastResult,
    | "eip1559"
    | "maxFeePerGas"
    | "maxPriorityFeePerGas"
    | "gasPrice"
    | "gas"
  >,
  step = 0,
): FeeOverride {
  return bumpFees(meta, bumpPercentAtStep(step));
}

type PendingEntry = { nonce: number; hash: string; at: number };

/** In-tab pending nonce memory — max(rpc pending, local+1) for next send. */
const pendingByAccount = new Map<string, PendingEntry>();

function key(chainId: number, account: Address): string {
  return `${chainId}:${account.toLowerCase()}`;
}

export function rememberPendingBroadcast(
  chainId: number,
  account: Address,
  nonce: number,
  hash: string,
): void {
  pendingByAccount.set(key(chainId, account), {
    nonce,
    hash,
    at: Date.now(),
  });
}

export function clearPendingBroadcast(
  chainId: number,
  account: Address,
  hash?: string,
): void {
  const k = key(chainId, account);
  const cur = pendingByAccount.get(k);
  if (!cur) return;
  if (hash && cur.hash.toLowerCase() !== hash.toLowerCase()) return;
  pendingByAccount.delete(k);
}

/**
 * Next nonce for a fresh send: prefer RPC pending count, but never go below
 * local last-broadcast + 1 while that tx is still tracked as pending.
 */
export function nextPendingNonce(
  chainId: number,
  account: Address,
  rpcPendingCount: number,
): number {
  const cur = pendingByAccount.get(key(chainId, account));
  if (!cur) return rpcPendingCount;
  // Stale after 30m — don't block forever if waitForTxStatus missed.
  if (Date.now() - cur.at > 30 * 60_000) {
    pendingByAccount.delete(key(chainId, account));
    return rpcPendingCount;
  }
  return Math.max(rpcPendingCount, cur.nonce + 1);
}

export function getTrackedPending(
  chainId: number,
  account: Address,
): PendingEntry | null {
  return pendingByAccount.get(key(chainId, account)) ?? null;
}
