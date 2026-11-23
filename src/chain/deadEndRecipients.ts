/**
 * Recipients that permanently trap native PLS / tokens if you "send" to them
 * with empty calldata (no stakeStart / deposit / etc.).
 * Classic footgun: paste HEX contract as recipient → PLS gone forever.
 */
import type { Address } from "viem";

export type DeadEndHit = {
  name: string;
  reason: string;
  /** Hard-block Sign & send on the desk (no override). */
  block: boolean;
};

/** Known Pulse / ETH token contracts — naked native send is a black hole. */
const TOKEN_CONTRACT_DEAD_ENDS: Record<string, string> = {
  // Pulse mainnet
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39": "HEX",
  "0x95b303987a60c71504d99aa1b13b4da07b0790ab": "PLSX",
  "0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d": "INC",
  "0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07": "USDC (Pulse bridged)",
  "0xa1077a294dde1b09bb078844df40758a5d0f9a27": "WPLS",
  // Common burn / null
  "0x0000000000000000000000000000000000000000": "null address",
  "0x0000000000000000000000000000000000000369": "Pulse burn (0x…0369)",
  "0x000000000000000000000000000000000000dead": "burn (0x…dead)",
};

function isEmptyData(data?: string | null): boolean {
  const d = (data || "0x").toLowerCase();
  return d === "0x" || d === "0x0" || d === "";
}

/**
 * Native PLS (or ETH) send with empty calldata to a token / burn address.
 * Intentional HEX stakeStart / WPLS deposit() have selectors — not empty.
 */
export function deadEndNativeSend(
  to?: string | null,
  data?: string | null,
): DeadEndHit | null {
  if (!to || !isEmptyData(data)) return null;
  const key = to.toLowerCase();
  const name = TOKEN_CONTRACT_DEAD_ENDS[key];
  if (!name) return null;
  if (name === "HEX") {
    return {
      name,
      reason:
        "Sending PLS to the HEX contract locks it forever — HEX stakes use stakeStart, not a plain send. Use go.hex.com / Stakes, or pick a wallet address.",
      block: true,
    };
  }
  if (name.startsWith("WPLS")) {
    return {
      name,
      reason:
        "Plain send to WPLS does not wrap — use deposit() (Swap / custom call) or send to a wallet address.",
      block: true,
    };
  }
  if (name.startsWith("null") || name.startsWith("burn") || name.startsWith("Pulse burn")) {
    return {
      name,
      reason: `Sending to ${name} burns funds permanently.`,
      block: true,
    };
  }
  return {
    name,
    reason: `Sending native coin to the ${name} token contract usually locks it forever — send to a wallet address, or use the app’s stake/swap/approve flow.`,
    block: true,
  };
}

/**
 * ERC-20 transfer where the recipient is the token contract itself
 * (transfer(HEX, amount) → stuck).
 */
export function deadEndTokenTransfer(
  token?: string | null,
  recipient?: string | null,
): DeadEndHit | null {
  if (!token || !recipient) return null;
  const t = token.toLowerCase();
  const r = recipient.toLowerCase();
  if (t !== r) {
    // Also block sending any token TO the HEX contract as recipient
    const recipName = TOKEN_CONTRACT_DEAD_ENDS[r];
    if (recipName === "HEX") {
      return {
        name: "HEX",
        reason:
          "Sending tokens to the HEX contract address traps them — pick a wallet recipient, not the HEX contract.",
        block: true,
      };
    }
    if (
      recipName &&
      (recipName.startsWith("null") ||
        recipName.startsWith("burn") ||
        recipName.startsWith("Pulse burn"))
    ) {
      return {
        name: recipName,
        reason: `Sending tokens to ${recipName} burns them permanently.`,
        block: true,
      };
    }
    return null;
  }
  const name = TOKEN_CONTRACT_DEAD_ENDS[t] || "token contract";
  return {
    name,
    reason: `ERC-20 transfer to the ${name} contract itself usually locks tokens forever.`,
    block: true,
  };
}

export function isDeadEndRecipient(
  to: string,
  opts?: { data?: string | null; token?: string | null },
): DeadEndHit | null {
  if (opts?.token) {
    return deadEndTokenTransfer(opts.token, to);
  }
  return deadEndNativeSend(to, opts?.data);
}

/** For tests / Settings copy. */
export function knownDeadEndContracts(): Address[] {
  return Object.keys(TOKEN_CONTRACT_DEAD_ENDS) as Address[];
}
