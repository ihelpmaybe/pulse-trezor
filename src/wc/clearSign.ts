/**
 * Human clear-sign strip for WalletConnect → Trezor.
 * Graded warnings — not a full ABI decoder.
 */
import { formatEther, type Hex } from "viem";

export type ClearTone = "ok" | "warn" | "danger";

export type ClearLine = {
  tone: ClearTone;
  title: string;
  detail: string;
};

/** Known Pulse / fiat / bridge names by lowercase address (expand over time). */
export const KNOWN_TO: Record<
  string,
  { name: string; tone: ClearTone; note: string }
> = {
  "0x15d38573d2feeb82e7ad5187ab8c1d52810b1f07": {
    name: "USDC (Pulse)",
    tone: "warn",
    note: "Stablecoin — check approve spender & amount",
  },
  "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39": {
    name: "HEX",
    tone: "ok",
    note: "HEX token",
  },
  "0xa1077a294dde1b09bb078844df40758a5d0f9a27": {
    name: "WPLS",
    tone: "ok",
    note: "Wrapped PLS",
  },
};

const SELECTORS: Record<
  string,
  { name: string; tone: ClearTone; note: string }
> = {
  "0xa9059cbb": {
    name: "transfer(address,uint256)",
    tone: "ok",
    note: "ERC-20 transfer",
  },
  "0x095ea7b3": {
    name: "approve(address,uint256)",
    tone: "danger",
    note: "Approve can drain this token — verify spender on device",
  },
  "0x39509351": {
    name: "increaseAllowance(address,uint256)",
    tone: "danger",
    note: "Allowance increase — verify spender",
  },
  "0x23b872dd": {
    name: "transferFrom(address,address,uint256)",
    tone: "warn",
    note: "transferFrom — who is spending?",
  },
};

const HOST_HINTS: {
  re: RegExp;
  title: string;
  tone: ClearTone;
  detail: string;
}[] = [
  {
    re: /provex/i,
    title: "ProveX / fiat corridor",
    tone: "danger",
    detail: "On-ramp/off-ramp — verify amount, asset, and destination carefully",
  },
  {
    re: /bridge\.pulsechain|pulsebridge|tokensex|gibs\.finance/i,
    title: "Bridge path",
    tone: "warn",
    detail: "Cross-chain — confirm chain + receive address before signing",
  },
  {
    re: /pulsex|piteas|phux|9inch|switchx/i,
    title: "DEX / router",
    tone: "ok",
    detail: "Swap path — still confirm token + amounts on Trezor",
  },
  {
    re: /coast|rampnow|heliuspay/i,
    title: "Fiat / pay corridor",
    tone: "danger",
    detail: "Money leaves crypto — double-check recipient and amount",
  },
];

function short(addr: string): string {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function clearSignTx(opts: {
  to?: string | null;
  valueHex?: string | null;
  data?: string | null;
  dappUrl?: string | null;
  method?: string | null;
}): ClearLine[] {
  const lines: ClearLine[] = [];
  const to = (opts.to || "").toLowerCase();
  const data = (opts.data || "0x") as string;
  const method = opts.method || "eth_sendTransaction";

  lines.push({ tone: "ok", title: "Method", detail: method });

  if (opts.dappUrl) {
    let hit = false;
    for (const h of HOST_HINTS) {
      if (h.re.test(opts.dappUrl)) {
        lines.push({
          tone: h.tone,
          title: h.title,
          detail: `${h.detail} · ${opts.dappUrl}`,
        });
        hit = true;
        break;
      }
    }
    if (!hit) {
      lines.push({ tone: "ok", title: "dApp", detail: opts.dappUrl });
    }
  }

  if (to) {
    const known = KNOWN_TO[to];
    if (known) {
      lines.push({
        tone: known.tone,
        title: `To · ${known.name}`,
        detail: `${short(to)} · ${known.note}`,
      });
    } else {
      lines.push({
        tone: "warn",
        title: "To · unknown contract",
        detail: `${short(to)} — not in known list; read Trezor screen`,
      });
    }
  }

  if (opts.valueHex && opts.valueHex !== "0x" && opts.valueHex !== "0x0") {
    try {
      const wei = BigInt(opts.valueHex);
      if (wei > 0n) {
        lines.push({
          tone: "warn",
          title: "Native PLS value",
          detail: `${formatEther(wei)} PLS`,
        });
      }
    } catch {
      lines.push({
        tone: "warn",
        title: "Native value",
        detail: String(opts.valueHex),
      });
    }
  }

  const sel = data.length >= 10 ? data.slice(0, 10).toLowerCase() : "";
  if (sel && sel !== "0x") {
    const known = SELECTORS[sel];
    if (known) {
      lines.push({
        tone: known.tone,
        title: known.name,
        detail: known.note,
      });
    } else {
      lines.push({
        tone: "warn",
        title: `Selector ${sel}`,
        detail: "Unknown calldata — trust Trezor display, not the dApp UI",
      });
    }
  } else if (to) {
    lines.push({
      tone: "ok",
      title: "Calldata",
      detail: "Empty — simple send / receive path",
    });
  }

  lines.push({
    tone: "ok",
    title: "Chain",
    detail: "PulseChain (369) for WalletConnect sessions",
  });

  return lines;
}

export function clearSignMessage(opts: {
  method: string;
  dappUrl?: string | null;
  preview: string;
}): ClearLine[] {
  const lines: ClearLine[] = [
    { tone: "warn", title: "Sign message", detail: opts.method },
  ];
  if (opts.dappUrl) {
    lines.push({ tone: "ok", title: "dApp", detail: opts.dappUrl });
  }
  lines.push({
    tone: "warn",
    title: "Preview",
    detail: opts.preview.slice(0, 280) || "(empty)",
  });
  if (/typed|712/i.test(opts.method)) {
    lines.push({
      tone: "danger",
      title: "EIP-712",
      detail: "Typed data can authorize spends — read every field on Trezor",
    });
  }
  return lines;
}

export function worstTone(lines: ClearLine[]): ClearTone {
  if (lines.some((l) => l.tone === "danger")) return "danger";
  if (lines.some((l) => l.tone === "warn")) return "warn";
  return "ok";
}

export type TxLike = {
  to?: string;
  value?: string | number | bigint;
  data?: Hex | string;
  gas?: string | number | bigint;
  gasPrice?: string | number | bigint;
  maxFeePerGas?: string | number | bigint;
  maxPriorityFeePerGas?: string | number | bigint;
  nonce?: string | number;
};
