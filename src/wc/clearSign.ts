/**
 * Human clear-sign strip for WalletConnect → Trezor.
 * Graded warnings — not a full ABI decoder.
 */
import { formatEther, formatUnits, maxUint256, type Hex } from "viem";
import {
  deadEndNativeSend,
  deadEndTokenTransfer,
} from "../chain/deadEndRecipients";

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
    tone: "danger",
    note: "HEX token contract — never plain-send PLS here (use stakeStart / wallet addr)",
  },
  "0xa1077a294dde1b09bb078844df40758a5d0f9a27": {
    name: "WPLS",
    tone: "warn",
    note: "Wrapped PLS — plain send locks; use deposit()",
  },
  "0x70499adebb11efd915e3b69e700c331778628707": {
    name: "WPLS (testnet)",
    tone: "ok",
    note: "Wrapped tPLS · testnet V4",
  },
};

const SELECTORS: Record<
  string,
  { name: string; tone: ClearTone; note: string }
> = {
  "0xd0e30db0": {
    name: "deposit()",
    tone: "ok",
    note: "Wrap native → WPLS",
  },
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
  "0xa22cb465": {
    name: "setApprovalForAll(address,bool)",
    tone: "danger",
    note: "NFT operator — can move all tokens in this collection",
  },
  "0xd505accf": {
    name: "permit(address,address,uint256,uint256,uint8,bytes32,bytes32)",
    tone: "danger",
    note: "EIP-2612 Permit — gasless allowance; verify owner/spender/value/deadline",
  },
  "0x52a438b8": {
    name: "stakeStart(uint256,uint256)",
    tone: "warn",
    note: "HEX stakeStart — confirm hearts + days on device",
  },
  "0x67dcb881": {
    name: "stakeEnd(uint256,uint256)",
    tone: "warn",
    note: "HEX stakeEnd — confirm stake index / id on device",
  },
};

/** Domains we treat as high-risk lookalikes / empty origin. Expand carefully. */
const PHISH_HINTS: { re: RegExp; detail: string }[] = [
  {
    re: /metamask\.io\.|pulsechain-?airdrop|claim-?hex|free-?pls|connect-wallet\./i,
    detail: "Looks like a phishing lure — do not sign",
  },
  {
    re: /claim[-_.]?pls|pls[-_.]?giveaway|hex[-_.]?drain|trezor[-_.]?(sync|suite|login|support)|wallet[-_.]?validate|seed[-_.]?phrase|support[-_.]?trezor|suite[-_.]?login/i,
    detail: "Classic wallet-drain / fake-support lure — do not sign",
  },
  {
    // Fake Suite / Connect hosts (real = trezor.io / suite.trezor.io / connect.trezor.io).
    re: /suiteconnect[-_.]?trezor|trezor[-_.]?connect\.com|connect[-_.]?trezor\.com|trezor[-_.]?suite\.(?!io\b)|trezor[-_.]?wallet|trezor[-_.]?app\.(?!io\b)|firmware[-_.]?trezor|trezor[-_.]?update/i,
    detail: "Fake Trezor Suite/Connect host — never enter a seed; close this origin",
  },
  {
    // Real ProveX is app.provex.com / provex.com — do NOT match that (prover?x did).
    // Catch typosquats: proverx.*, prove-x.*, pulsex/pulsechain off-TLD.
    re: /pulsex\.(?!com\b)|pulsechain\.(?!com\b)|proverx[-_.]|prove[-_.]x[-_.]/i,
    detail: "Lookalike Pulse brand domain — verify carefully",
  },
  {
    re: /^https?:\/\/\d+\.\d+\.\d+\.\d+/i,
    detail: "Raw IP origin — unusual for real Pulse apps",
  },
];

export function phishingWarn(dappUrl?: string | null): ClearLine | null {
  const u = (dappUrl || "").trim();
  if (!u) {
    return {
      tone: "danger",
      title: "Origin",
      detail: "Missing dApp URL — treat as hostile until proven",
    };
  }
  for (const h of PHISH_HINTS) {
    if (h.re.test(u)) {
      return { tone: "danger", title: "Phishing warn", detail: `${h.detail} · ${u}` };
    }
  }
  return null;
}

/** Decode spender from approve / setApprovalForAll calldata. */
export function decodeSpenderFromCalldata(data?: string | null): string | null {
  const d = (data || "").toLowerCase();
  if (d.length < 74) return null;
  if (
    !d.startsWith("0x095ea7b3") &&
    !d.startsWith("0xa22cb465") &&
    !d.startsWith("0x39509351")
  ) {
    return null;
  }
  return `0x${d.slice(34, 74)}`;
}

/** approve(address,uint256) amount word — maxUint256 = unlimited. */
export function decodeApproveAmount(data?: string | null): {
  raw: bigint;
  unlimited: boolean;
} | null {
  const d = (data || "").toLowerCase().replace(/^0x/, "");
  if (!d.startsWith("095ea7b3") || d.length < 8 + 64 + 64) return null;
  const raw = BigInt(`0x${d.slice(8 + 64, 8 + 64 + 64)}`);
  return { raw, unlimited: raw === maxUint256 };
}

/** transfer(address,uint256) recipient + amount. */
export function decodeErc20Transfer(data?: string | null): {
  to: string;
  raw: bigint;
} | null {
  const d = (data || "").toLowerCase().replace(/^0x/, "");
  if (!d.startsWith("a9059cbb") || d.length < 8 + 64 + 64) return null;
  return {
    to: `0x${d.slice(8 + 24, 8 + 64)}`,
    raw: BigInt(`0x${d.slice(8 + 64, 8 + 64 + 64)}`),
  };
}

/** Pull human fields from EIP-712 JSON preview (Permit / Order / generic). */
export function clearSignTypedFields(preview: string): ClearLine[] {
  let j: {
    primaryType?: string;
    domain?: Record<string, unknown>;
    message?: Record<string, unknown>;
  };
  try {
    j = JSON.parse(preview) as typeof j;
  } catch {
    return [];
  }
  const lines: ClearLine[] = [];
  const domain = j.domain || {};
  const message = j.message || {};
  if (typeof domain.name === "string" && domain.name) {
    lines.push({
      tone: "warn",
      title: "712 domain",
      detail: domain.name,
    });
  }
  if (domain.chainId != null) {
    lines.push({
      tone: "warn",
      title: "712 chainId",
      detail: String(domain.chainId),
    });
  }
  if (typeof domain.verifyingContract === "string") {
    lines.push({
      tone: "danger",
      title: "712 verifyingContract",
      detail: `${short(domain.verifyingContract)} — confirm on Trezor`,
    });
  }
  const fieldKeys = [
    "owner",
    "spender",
    "value",
    "amount",
    "deadline",
    "nonce",
    "allowed",
    "from",
    "to",
    "token",
  ] as const;
  for (const key of fieldKeys) {
    const v = message[key];
    if (v == null || v === "") continue;
    const s = String(v);
    const isAddr = /^0x[0-9a-fA-F]{40}$/.test(s);
    let unlimitedish = false;
    if (
      (key === "value" || key === "amount" || key === "deadline") &&
      /^\d+$/.test(s)
    ) {
      try {
        const n = BigInt(s);
        if (n === maxUint256 || n >= 10n ** 18n * 10n ** 12n) {
          unlimitedish = true;
        }
        // Far-future deadline (unix >> ~year 2100) ≈ never expires
        if (key === "deadline" && n > 4_102_444_800n) unlimitedish = true;
      } catch {
        /* ignore */
      }
    }
    if (key === "allowed" && /^(true|1)$/i.test(s)) unlimitedish = true;
    const danger =
      key === "spender" ||
      key === "value" ||
      key === "amount" ||
      key === "allowed" ||
      unlimitedish;
    lines.push({
      tone: danger ? "danger" : "warn",
      title: unlimitedish
        ? `712 ${key} · UNLIMITED / NEVER`
        : `712 ${key}`,
      detail: isAddr
        ? `${short(s)} — confirm on Trezor`
        : unlimitedish
          ? `${s.slice(0, 48)} — classic Permit drain bait; refuse unless you trust spender`
          : s.slice(0, 96),
    });
  }
  if (typeof j.primaryType === "string" && j.primaryType) {
    lines.push({
      tone: "warn",
      title: "712 primaryType",
      detail: j.primaryType,
    });
  }
  return lines;
}

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
    re: /pump\.tires/i,
    title: "PUMP.tires / meme launch",
    tone: "warn",
    detail: "Bonding-curve meme path — high loss risk; confirm amounts on Trezor",
  },
  {
    re: /hex\.com|go\.hex\.com|hexican/i,
    title: "HEX stake UI",
    tone: "warn",
    detail: "Stake path — confirm hearts, days, and stake index on Trezor",
  },
  {
    re: /coast|rampnow|heliuspay/i,
    title: "Fiat / pay corridor",
    tone: "danger",
    detail: "Money leaves crypto — double-check recipient and amount",
  },
];

/** Decode HEX stakeStart / stakeEnd args for clear-sign companions. */
export function decodeHexStakeCalldata(data?: string | null): ClearLine[] {
  const d = (data || "").toLowerCase().replace(/^0x/, "");
  if (d.length < 8 + 64 + 64) return [];
  const sel = `0x${d.slice(0, 8)}`;
  const a = BigInt(`0x${d.slice(8, 72)}`);
  const b = BigInt(`0x${d.slice(72, 136)}`);
  if (sel === "0x52a438b8") {
    // stakeStart(newStakedHearts, newStakedDays) — HEX 8 decimals
    return [
      {
        tone: "warn",
        title: "HEX stakeStart · hearts",
        detail: `${formatUnits(a, 8)} HEX — confirm on Trezor`,
      },
      {
        tone: "warn",
        title: "HEX stakeStart · days",
        detail: `${String(b)} days — confirm on Trezor`,
      },
    ];
  }
  if (sel === "0x67dcb881") {
    // stakeEnd(stakeIndex, stakeIdUint)
    return [
      {
        tone: "warn",
        title: "HEX stakeEnd · index",
        detail: `stakeLists index ${String(a)} — confirm on Trezor`,
      },
      {
        tone: "warn",
        title: "HEX stakeEnd · stakeId",
        detail: `id ${String(b)} — confirm on Trezor`,
      },
    ];
  }
  return [];
}

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

  const phish = phishingWarn(opts.dappUrl);
  if (phish) lines.push(phish);
  else if (opts.dappUrl) {
    lines.push({ tone: "ok", title: "Origin", detail: opts.dappUrl });
    for (const h of HOST_HINTS) {
      if (h.re.test(opts.dappUrl)) {
        lines.push({
          tone: h.tone,
          title: h.title,
          detail: h.detail,
        });
        break;
      }
    }
  } else {
    lines.push({
      tone: "danger",
      title: "Origin",
      detail: "No dApp origin on this request",
    });
  }

  const spender = decodeSpenderFromCalldata(opts.data);
  if (spender) {
    lines.push({
      tone: "danger",
      title: "Spender / operator",
      detail: `${short(spender)} — confirm this address on Trezor`,
    });
  }
  const approveAmt = decodeApproveAmount(opts.data);
  if (approveAmt) {
    lines.push({
      tone: "danger",
      title: approveAmt.unlimited ? "Approve amount · UNLIMITED" : "Approve amount",
      detail: approveAmt.unlimited
        ? "max uint256 — spender can drain this token until revoke"
        : `${approveAmt.raw.toString()} (raw token units — check decimals on device)`,
    });
  }
  const xfer = decodeErc20Transfer(opts.data);
  if (xfer) {
    lines.push({
      tone: "warn",
      title: "ERC-20 transfer to",
      detail: `${short(xfer.to)} · raw ${xfer.raw.toString()}`,
    });
  }

  if (to) {
    const dead = deadEndNativeSend(to, opts.data);
    if (dead) {
      lines.push({
        tone: "danger",
        title: `Dead-end · ${dead.name}`,
        detail: dead.reason,
      });
    }
    const xferHit = decodeErc20Transfer(opts.data);
    if (xferHit) {
      const tokDead = deadEndTokenTransfer(to, xferHit.to);
      if (tokDead) {
        lines.push({
          tone: "danger",
          title: `Dead-end · ${tokDead.name}`,
          detail: tokDead.reason,
        });
      }
    }
    const known = KNOWN_TO[to];
    if (known) {
      lines.push({
        tone: known.tone,
        title: `To · ${known.name}`,
        detail: `${short(to)} · ${known.note}`,
      });
    } else if (!dead) {
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
      for (const hexLine of decodeHexStakeCalldata(opts.data)) {
        lines.push(hexLine);
      }
    } else {
      lines.push({
        tone: "danger",
        title: `Blind calldata · ${sel}`,
        detail:
          "Unknown selector — read the Trezor screen; dApp labels can lie. Extra confirm required.",
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
    detail: "EVM session — confirm chain on device / clear-sign strip",
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
  const phish = phishingWarn(opts.dappUrl);
  if (phish) lines.push(phish);
  else if (opts.dappUrl) {
    lines.push({ tone: "ok", title: "Origin", detail: opts.dappUrl });
  } else {
    lines.push({
      tone: "danger",
      title: "Origin",
      detail: "No dApp origin on this request",
    });
  }
  const preview = opts.preview || "";
  lines.push({
    tone: "warn",
    title: "Preview",
    detail: preview.slice(0, 280) || "(empty)",
  });

  const method = opts.method || "";
  const hexOpaque =
    /^0x[0-9a-fA-F]{64,}$/.test(preview.trim()) ||
    (/^0x[0-9a-fA-F]+$/.test(preview.trim()) && preview.trim().length >= 66);
  if (/^eth_sign$/i.test(method) || hexOpaque) {
    lines.push({
      tone: "danger",
      title: "Raw hex",
      detail:
        "Opaque hex message (eth_sign-style) — can authorize spends. Prefer plain personal_sign text you can read.",
    });
  }

  if (/typed|712/i.test(method)) {
    lines.push({
      tone: "danger",
      title: "EIP-712",
      detail: "Typed data can authorize spends — read every field on Trezor",
    });
    for (const field of clearSignTypedFields(preview)) {
      lines.push(field);
    }
    let primary = "";
    try {
      const j = JSON.parse(preview) as { primaryType?: string };
      if (typeof j.primaryType === "string") primary = j.primaryType;
    } catch {
      /* preview may be truncated string */
    }
    const blob = `${primary} ${preview}`;
    if (/permit/i.test(blob)) {
      lines.push({
        tone: "danger",
        title: "Permit",
        detail:
          "Looks like Permit / Permit2 — same power as approve; check spender + amount + deadline on device",
      });
    }
    if (/\b(order|seaport|listing|offer)\b/i.test(blob)) {
      lines.push({
        tone: "danger",
        title: "Order",
        detail:
          "Looks like a marketplace Order — can move NFTs/tokens. Read maker/taker/price on Trezor",
      });
    }
  }

  // EIP-7702 / set-code style authority — rising drain chain after Pectra.
  if (
    /7702|setCode|set.?code|authorization.?list|eth_signTransaction.*code/i.test(
      `${method} ${preview}`,
    )
  ) {
    lines.push({
      tone: "danger",
      title: "EIP-7702 / set-code",
      detail:
        "Can change how this EOA executes — refuse unless you fully trust the dApp and read the device",
    });
  }
  return lines;
}

/** One-line plain explain for face / AI stub. */
export function explainClearLines(lines: ClearLine[]): string {
  const danger = lines.filter((l) => l.tone === "danger");
  if (danger.length) {
    return danger.map((l) => `${l.title}: ${l.detail}`).join(" · ");
  }
  const warn = lines.filter((l) => l.tone === "warn");
  if (warn.length) {
    return warn.map((l) => `${l.title}: ${l.detail}`).slice(0, 2).join(" · ");
  }
  return lines
    .slice(0, 2)
    .map((l) => `${l.title}: ${l.detail}`)
    .join(" · ");
}

export function worstTone(lines: ClearLine[]): ClearTone {
  if (lines.some((l) => l.tone === "danger")) return "danger";
  if (lines.some((l) => l.tone === "warn")) return "warn";
  return "ok";
}

/** True when calldata has a selector we don't recognize (needs extra ack). */
export function isBlindCalldata(data?: string | null): boolean {
  const d = (data || "0x").toLowerCase();
  if (d === "0x" || d === "0x0" || d.length < 10) return false;
  const sel = d.slice(0, 10);
  return !SELECTORS[sel];
}

export function needsBlindConfirm(lines: ClearLine[]): boolean {
  return lines.some((l) => /blind calldata/i.test(l.title));
}

/** Extra face ack before Sign — blind calldata, Permit, Order, raw eth_sign hex. */
export function needsDangerAck(lines: ClearLine[]): boolean {
  return lines.some(
    (l) =>
      l.tone === "danger" &&
      /blind calldata|Permit|Order|Raw hex|7702|UNLIMITED|Fake Trezor|phishing|Dead-end/i.test(
        `${l.title} ${l.detail}`,
      ),
  );
}

/** Desk Sign & send should refuse (no override) when clear-sign shows a hard dead-end. */
export function hasHardDeadEnd(lines: ClearLine[]): boolean {
  return lines.some((l) => /Dead-end/i.test(l.title));
}

export function dangerAckLabel(lines: ClearLine[]): string {
  if (lines.some((l) => /Raw hex/i.test(l.title))) {
    return "I understand this is opaque hex — I will read the Trezor screen before signing.";
  }
  if (lines.some((l) => /7702|set-code/i.test(l.title))) {
    return "I understand EIP-7702 can change this wallet’s execution — I will refuse unless I trust this dApp completely.";
  }
  if (lines.some((l) => /Permit|UNLIMITED/i.test(`${l.title}`))) {
    return "I understand Permit / unlimited can drain this token — I will check spender, amount, and deadline on Trezor.";
  }
  if (lines.some((l) => /Order/i.test(l.title))) {
    return "I understand this Order can move assets — I will read every field on Trezor.";
  }
  return "I will read the Trezor screen for this high-risk request (dApp labels can lie).";
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
