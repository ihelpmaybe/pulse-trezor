/**
 * BIP44-style gap trim — keep through last used index + one spare empty.
 */
import type { Address } from "viem";
import { fetchPlsBalance, type DeskChainId, type RpcOverride } from "../chain/client";
import type { ListedAccount } from "./connect";

/** Default spare empty slots after last used (not full BIP44 gap of 20). */
export const ACCOUNT_GAP_SPARE = 1;

export async function trimAccountsByPlsGap(
  accounts: ListedAccount[],
  chainId: DeskChainId,
  rpc?: RpcOverride,
  spare = ACCOUNT_GAP_SPARE,
): Promise<{ trimmed: ListedAccount[]; lastUsed: number }> {
  if (!accounts.length) return { trimmed: [], lastUsed: -1 };
  let lastUsed = -1;
  for (let i = 0; i < accounts.length; i++) {
    try {
      const bal = await fetchPlsBalance(
        chainId,
        accounts[i].address as Address,
        rpc,
      );
      if (bal > 0n) lastUsed = i;
    } catch {
      /* RPC miss — don't treat as used; keep scanning */
    }
  }
  if (lastUsed < 0) {
    return { trimmed: accounts.slice(0, 1), lastUsed: -1 };
  }
  const end = Math.min(accounts.length, lastUsed + 1 + Math.max(0, spare));
  return { trimmed: accounts.slice(0, end), lastUsed };
}
