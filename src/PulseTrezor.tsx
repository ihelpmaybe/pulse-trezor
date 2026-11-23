/**
 * Embeddable Pulse × Trezor kernel: connect · balances · send · approve.
 * Host apps mount this; standalone App is only a thin shell.
 * Device wire = Connect 10 → Trezor Suite (not a fake HD).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatEther,
  formatGwei,
  formatUnits,
  hexToString,
  isAddress,
  isHex,
  maxUint256,
  parseEther,
  parseGwei,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import {
  explorerAddressUrl,
  explorerNftUrl,
  explorerTxUrl,
  failoverRpc,
  fetchPlsBalance,
  makePublicClient,
  packFor,
  resolveRpcUrl,
  chainLabel,
  DESK_CHAIN_IDS,
  isDeskChainId,
  waitForTxStatus,
  type DeskChainId,
  type RpcOverride,
} from "./chain/client";
import {
  activityPoison,
  bookLabel,
  isKnownRecipient,
  loadAddressBook,
  lookalikePoison,
  upsertAddressBook,
  type BookEntry,
} from "./chain/addressBook";
import {
  encodeSetApprovalForAll,
  fetchNftApprovalInventory,
  type NftApprovalRow,
} from "./chain/nftApprovals";
import {
  fetchFullBag,
  fetchHexStakeCount,
  fetchScanNfts,
  type FullBag,
  type ScanNft,
  type ScanToken,
} from "./chain/portfolio";
import {
  fetchAddressActivity,
  fullWhen,
  shortWhen,
  type ActivityRow,
} from "./chain/activity";
import {
  ACCOUNT_COUNT_MAX,
  ACCOUNT_COUNT_MIN,
  clampAccountCount,
  fmtActivityAmtParts,
  gasUnitLabel,
  shortAddr,
  shortNative,
} from "./ui/faceFormat";
import {
  addCustomToken,
  fetchCustomBalances,
  fetchCustomTokenMeta,
  loadCustomTokens,
  removeCustomToken,
  type CustomToken,
} from "./chain/customTokens";
import {
  fetchApprovalInventory,
  KNOWN_SPENDERS,
  type ApprovalRow,
  type ApprovalScanMeta,
} from "./chain/approvals";
import {
  encodeErc20Approve,
  encodeErc20Transfer,
  fetchTokenBalances,
  parseTokenAmount,
  type PackToken,
} from "./chain/tokens";
import {
  cancelTrezorConnect,
  connectTrezorFromGesture,
  humanTrezorError,
  listTrezorAccountsFromGesture,
  detectSuiteChannel,
  getDeviceHints,
  probeSuite,
  resetTrezorInit,
  warmTrezorConnect,
  type DeviceHints,
  type ListedAccount,
  type SuiteChannel,
} from "./trezor/connect";
import { reconcileErrWithSuite } from "./trezor/errors";
import {
  bumpFees,
  loadBroadcastMeta,
  previewFees,
  sendPlsWithTrezor,
  type BroadcastResult,
  type FeePreview,
} from "./trezor/signPulseTx";
import {
  parseTypedDataParams,
  signPersonalMessage,
  signTypedData,
} from "./trezor/signMessage";
import { WcPanel } from "./wc/WcPanel";
import { ReceiveQr } from "./ui/ReceiveQr";
import { TxExplain } from "./ui/TxExplain";
import { loadFavorites, toggleFavorite } from "./chain/favorites";
import {
  fetchTokenUsdHints,
  formatUsdHint,
  type PriceHint,
} from "./chain/prices";
import {
  buildWatchRegistryExport,
  parseWatchImportJson,
} from "./chain/watchImport";
import { decodeSyncPayload } from "./chain/syncPair";
import { SyncPair } from "./ui/SyncPair";
import { loadHexModule, saveHexModule } from "./ui/modules";
import { t } from "./i18n/en";
import {
  PULSEX_V2_ROUTER,
  preparePulsexSwap,
  quotePulsexSwap,
  routerAllowance,
  swapTokenMeta,
  type SwapAsset,
  type SwapQuote,
} from "./chain/pulsex";
import deeplinks from "./pack/deeplinks.json";
import { AiPolicyPanel } from "./ai/AiPolicyPanel";
import {
  bootAiPolicy,
  registerAgentHandlers,
  type AgentTxDraft,
} from "./ai/hooks";
import { getFocusable, trapTabKey } from "./a11y/focusTrap";
import {
  PulsePerchProvider,
  attachInjectedProvider,
  detachInjectedProvider,
  getInjectedProvider,
  type InjectedHost,
} from "./provider/eip1193";
/** Official core + scan + GoPulse + PUMP.tires — fine-print footer only. */
const FOOTER_CORE_IDS = [
  "pulsechain",
  "hex",
  "pulsex",
  "provex",
  "bridge",
  "gopulse",
  "pump-tires",
  "scan",
] as const;

/** Drop trailing zeros from formatGwei for input fields. */
function trimGwei(s: string): string {
  if (!s.includes(".")) return s;
  return s.replace(/\.?0+$/, "");
}

const SWAP_FACE: { id: SwapAsset; label: string }[] = [
  { id: "PLS", label: "PLS" },
  {
    id: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as Address,
    label: "HEX",
  },
  {
    id: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab" as Address,
    label: "PLSX",
  },
  {
    id: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d" as Address,
    label: "INC",
  },
  {
    id: "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07" as Address,
    label: "USDC",
  },
];

function swapAssetLabel(a: SwapAsset): string {
  if (a === "PLS") return "PLS";
  const hit = SWAP_FACE.find(
    (x) => typeof x.id === "string" && x.id.toLowerCase() === a.toLowerCase(),
  );
  return hit?.label ?? `${String(a).slice(0, 6)}…`;
}

const WATCH_KEY = "pulse-trezor-watch-v1";
const RPC_KEY = "pulse-trezor-rpc-v1";
const RPC_HEALTH_MS_KEY = "pulse-perch-rpc-health-ms-v1";
/** Default 60s — public RPCs; user can slow/stop in Settings. */
const RPC_HEALTH_MS_DEFAULT = 60_000;
const RPC_HEALTH_MS_OPTIONS = [
  { ms: 30_000, label: "30 seconds" },
  { ms: 60_000, label: "1 minute" },
  { ms: 120_000, label: "2 minutes" },
  { ms: 300_000, label: "5 minutes" },
  { ms: 0, label: "Off (check once)" },
] as const;
const ACCOUNT_KEY = "pulse-trezor-account-v1";
const ACCOUNTS_KEY = "pulse-trezor-accounts-v1";
const ACCOUNT_COUNT_KEY = "pulse-trezor-account-count-v1";
const A11Y_KEY = "pulse-perch-a11y-v1";
const PRIVACY_KEY = "pulse-perch-privacy-hide-v1";
const INJECT_KEY = "pulse-perch-inject-v1";
const THEME_KEY = "pulse-perch-theme-v1";
/** One-time stronger mainnet send cue — then soft “Mainnet” line only. */
const FIRST_MAINNET_SEND_KEY = "pulse-perch-first-mainnet-send-v1";
const BRIDGED_USDC =
  "0x15D38573d2feeb82e7ad5187aB8c1D52810B1f07" as Address;
const INHERITED_USDC =
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" as Address;

type A11yPrefs = {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  strongFocus: boolean;
};

type ThemePref = "dark" | "light";

function loadTheme(): ThemePref {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(t: ThemePref) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(THEME_KEY, t);
  } catch {
    /* ignore */
  }
}

const A11Y_DEFAULT: A11yPrefs = {
  largeText: false,
  highContrast: false,
  reduceMotion: false,
  strongFocus: false,
};

function loadPrivacyHide(): boolean {
  try {
    return localStorage.getItem(PRIVACY_KEY) === "1";
  } catch {
    return false;
  }
}

function savePrivacyHide(on: boolean) {
  try {
    if (on) localStorage.setItem(PRIVACY_KEY, "1");
    else localStorage.removeItem(PRIVACY_KEY);
  } catch {
    /* ignore */
  }
}

function loadA11y(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_KEY);
    if (!raw) return { ...A11Y_DEFAULT };
    return { ...A11Y_DEFAULT, ...(JSON.parse(raw) as Partial<A11yPrefs>) };
  } catch {
    return { ...A11Y_DEFAULT };
  }
}

function saveA11y(prefs: A11yPrefs) {
  try {
    localStorage.setItem(A11Y_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

function applyA11y(prefs: A11yPrefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.toggleAttribute("data-a11y-large", prefs.largeText);
  root.toggleAttribute("data-a11y-contrast", prefs.highContrast);
  root.toggleAttribute("data-a11y-motion", prefs.reduceMotion);
  root.toggleAttribute("data-a11y-focus", prefs.strongFocus);
}
function HexStakeMark({
  count,
  onOpen,
}: {
  count: number;
  onOpen?: () => void;
}) {
  const label = `${count} HEX stake${count === 1 ? "" : "s"} — open Stakes`;
  return (
    <span
      className="acct-hex"
      title={label}
      aria-label={label}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={
        onOpen
          ? (e) => {
              e.stopPropagation();
              onOpen();
            }
          : undefined
      }
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpen();
              }
            }
          : undefined
      }
    >
      <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
        <polygon
          points="8,1.1 13.9,4.5 13.9,11.5 8,14.9 2.1,11.5 2.1,4.5"
          fill="#ff3178"
        />
        <text
          x="8"
          y="11"
          textAnchor="middle"
          fontSize="7.2"
          fontWeight="700"
          fill="#fff"
          fontFamily="system-ui,Segoe UI,sans-serif"
        >
          H
        </text>
      </svg>
    </span>
  );
}

type Session = {
  address: Address;
  derivationIndex: number;
  derivationPath: string;
  deviceId: string;
};

type TokenRow = { token: PackToken; raw: bigint; formatted: string };

export type PulseTrezorProps = {
  /** Default 369. Standalone demo may pass 943. */
  defaultChainId?: DeskChainId;
  /**
   * Show network select (Pulse + test Pulse + ETH / Sepolia / Holesky).
   * Lab / demo: pass true. Embedders can leave false for Pulse-only default.
   */
  showTestnet?: boolean;
  /**
   * Custom RPC from the host app (own node).
   * User can also set one under collapsed Settings (saved locally).
   */
  rpc?: RpcOverride;
  /** Show collapsed Settings (RPC). Default true. */
  showSettings?: boolean;
  className?: string;
};


function AddrParts({ address }: { address: string }) {
  const a = address.startsWith("0x") ? address : `0x${address}`;
  const body = a.slice(2);
  const head = body.slice(0, 4);
  const mid = body.slice(4, -4);
  const tail = body.slice(-4);
  return (
    <code className="addr-parts" aria-hidden="true">
      <span className="addr-0x">0x</span>
      <span className="addr-ends">{head}</span>
      <span className="addr-mid">
        {[...mid].map((ch, i) => (
          <span
            key={i}
            className={/[a-fA-F]/.test(ch) ? "addr-letter" : "addr-digit"}
          >
            {ch}
          </span>
        ))}
      </span>
      <span className="addr-ends">{tail}</span>
    </code>
  );
}

function loadWatch(): Session | null {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Session;
    if (!j?.address || !isAddress(j.address)) return null;
    return j;
  } catch {
    return null;
  }
}

function saveWatch(s: Session | null) {
  try {
    if (!s) localStorage.removeItem(WATCH_KEY);
    else localStorage.setItem(WATCH_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function loadAccountIndex(): number {
  try {
    const n = Number(localStorage.getItem(ACCOUNT_KEY));
    if (Number.isFinite(n) && n >= 0 && n < 100) return Math.floor(n);
  } catch {
    /* ignore */
  }
  return 0;
}

function saveAccountIndex(i: number) {
  try {
    localStorage.setItem(ACCOUNT_KEY, String(Math.max(0, Math.floor(i))));
  } catch {
    /* ignore */
  }
}

function loadAccountCount(): number {
  try {
    const n = Number(localStorage.getItem(ACCOUNT_COUNT_KEY));
    if (Number.isFinite(n) && n >= ACCOUNT_COUNT_MIN) return clampAccountCount(n);
  } catch {
    /* ignore */
  }
  return 12;
}

function saveAccountCount(n: number) {
  try {
    localStorage.setItem(ACCOUNT_COUNT_KEY, String(clampAccountCount(n)));
  } catch {
    /* ignore */
  }
}

function loadAccountList(): ListedAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    if (!raw) return [];
    const j = JSON.parse(raw) as ListedAccount[];
    if (!Array.isArray(j)) return [];
    return j.filter(
      (a) =>
        a &&
        typeof a.derivationIndex === "number" &&
        typeof a.address === "string" &&
        isAddress(a.address),
    );
  } catch {
    return [];
  }
}

function saveAccountList(list: ListedAccount[]) {
  try {
    if (!list.length) localStorage.removeItem(ACCOUNTS_KEY);
    else localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

function loadRpcOverride(): string {
  try {
    return (localStorage.getItem(RPC_KEY) || "").trim();
  } catch {
    return "";
  }
}

function saveRpcOverride(url: string) {
  try {
    const t = url.trim();
    if (!t) localStorage.removeItem(RPC_KEY);
    else localStorage.setItem(RPC_KEY, t);
  } catch {
    /* ignore */
  }
}

function loadRpcHealthMs(): number {
  try {
    const n = Number(localStorage.getItem(RPC_HEALTH_MS_KEY));
    if (
      RPC_HEALTH_MS_OPTIONS.some((o) => o.ms === n) ||
      n === RPC_HEALTH_MS_DEFAULT
    ) {
      return n;
    }
  } catch {
    /* ignore */
  }
  return RPC_HEALTH_MS_DEFAULT;
}

function saveRpcHealthMs(ms: number) {
  try {
    localStorage.setItem(RPC_HEALTH_MS_KEY, String(ms));
  } catch {
    /* ignore */
  }
}

export function PulseTrezor({
  defaultChainId = 369,
  showTestnet = false,
  rpc,
  showSettings = true,
  className,
}: PulseTrezorProps) {
  const [warm, setWarm] = useState(false);
  const [suite, setSuite] = useState<"ok" | "missing" | "unknown" | "…">("…");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const connectGen = useRef(0);
  const [err, setErr] = useState<string | null>(null);
  const [rpcDraft, setRpcDraft] = useState(() => loadRpcOverride());
  const [rpcSaved, setRpcSaved] = useState(() => loadRpcOverride());
  const [rpcHealthMs, setRpcHealthMs] = useState(() => loadRpcHealthMs());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rpcCustomMode, setRpcCustomMode] = useState(false);
  const [a11y, setA11y] = useState<A11yPrefs>(() => loadA11y());
  const [privacyHide, setPrivacyHide] = useState(() => loadPrivacyHide());
  const [theme, setTheme] = useState<ThemePref>(() => loadTheme());
  /** Optional HEX stakes UI (Stakes tab / marks) — Settings modules. */
  const [hexModule, setHexModule] = useState(() => loadHexModule());
  const [favs, setFavs] = useState<string[]>(() => loadFavorites(369));
  const [callData, setCallData] = useState("");
  const [callTo, setCallTo] = useState("");
  const [priceHints, setPriceHints] = useState<PriceHint[]>([]);
  const [watchImportBusy, setWatchImportBusy] = useState(false);
  const [deepWcUri, setDeepWcUri] = useState<string | null>(null);
  const [injectEth, setInjectEth] = useState(() => {
    try {
      return localStorage.getItem(INJECT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  /** Live device session (can sign). */
  const [session, setSession] = useState<Session | null>(null);
  /** Last known address for balances after disconnect. */
  const [watch, setWatch] = useState<Session | null>(() => loadWatch());
  /** BIP44 index — 0 = first account (Suite still labels it Ethereum #1). */
  const [accountIndex, setAccountIndex] = useState(() => {
    const w = loadWatch();
    if (w && typeof w.derivationIndex === "number") return w.derivationIndex;
    return loadAccountIndex();
  });
  const [accountList, setAccountList] = useState<ListedAccount[]>(() =>
    loadAccountList(),
  );
  const [accountCount, setAccountCount] = useState(() => loadAccountCount());
  const [deviceId, setDeviceId] = useState("trezor-default");
  const [listing, setListing] = useState(false);
  const [chainId, setChainId] = useState<DeskChainId>(defaultChainId);
  const [balance, setBalance] = useState<bigint | null>(null);
  /** Native PLS per listed account (lowercase address → wei). */
  const [acctPls, setAcctPls] = useState<Record<string, bigint>>({});
  /** HEX stakeCount > 0 → show mark on account card. */
  const [acctHexStakes, setAcctHexStakes] = useState<Record<string, number>>(
    {},
  );
  const [balBusy, setBalBusy] = useState(false);
  const [tokenRows, setTokenRows] = useState<TokenRow[]>([]);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [feeHint, setFeeHint] = useState<string | null>(null);
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null);
  /** normal = network quote; faster/fastest raise tip so validators pick you sooner. */
  const [gasSpeed, setGasSpeed] = useState<"normal" | "faster" | "fastest">(
    "normal",
  );
  const [maxFeeGwei, setMaxFeeGwei] = useState("");
  const [tipGwei, setTipGwei] = useState("");
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [stuckTx, setStuckTx] = useState<BroadcastResult | null>(null);
  const [txStatus, setTxStatus] = useState<
    "pending" | "confirmed" | "reverted" | "timeout" | null
  >(null);
  const [copied, setCopied] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [asset, setAsset] = useState<"PLS" | string>("PLS");
  const [spender, setSpender] = useState("");
  const [approveAmt, setApproveAmt] = useState("");
  const [rpcHealth, setRpcHealth] = useState<
    | { state: "checking" }
    | { state: "ok"; block: bigint; latencyMs: number; url: string }
    | { state: "down"; detail: string }
  >({ state: "checking" });
  const [rpcFailoverUrl, setRpcFailoverUrl] = useState<string | null>(null);
  const [suiteChannel, setSuiteChannel] = useState<SuiteChannel>("unknown");
  const [deviceHints, setDeviceHints] = useState<DeviceHints | null>(null);
  const [nonceHint, setNonceHint] = useState<number | null>(null);
  const [nonceOverride, setNonceOverride] = useState("");
  const [addressBook, setAddressBook] = useState<BookEntry[]>(() =>
    loadAddressBook(),
  );
  const [bookLabelDraft, setBookLabelDraft] = useState("");
  const [nftApprovals, setNftApprovals] = useState<NftApprovalRow[]>([]);
  const [fullBag, setFullBag] = useState<FullBag | null>(null);
  const [bagBusy, setBagBusy] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [actBusy, setActBusy] = useState(false);
  const [actErr, setActErr] = useState<string | null>(null);
  const [actFilter, setActFilter] = useState<"all" | "in" | "out">("all");
  const [customRows, setCustomRows] = useState<
    { token: CustomToken; raw: bigint; formatted: string }[]
  >([]);
  const [importAddr, setImportAddr] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [approvals, setApprovals] = useState<ApprovalRow[]>([]);
  const [apprMeta, setApprMeta] = useState<ApprovalScanMeta | null>(null);
  const [apprBusy, setApprBusy] = useState(false);
  const [apprErr, setApprErr] = useState<string | null>(null);
  const [revokeSel, setRevokeSel] = useState<Set<string>>(() => new Set());
  const [hideZeroBal, setHideZeroBal] = useState(true);
  const [approveMaxAck, setApproveMaxAck] = useState(false);
  const [mainnetSendAcked, setMainnetSendAcked] = useState(() => {
    try {
      return localStorage.getItem(FIRST_MAINNET_SEND_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [mainnetSendAck, setMainnetSendAck] = useState(false);
  const [actionTab, setActionTab] = useState<
    "send" | "swap" | "sites" | "approve" | "apps"
  >("send");
  const [swapIn, setSwapIn] = useState<SwapAsset>("PLS");
  const [swapOut, setSwapOut] = useState<SwapAsset>(
    "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as Address, // HEX
  );
  const [swapAmt, setSwapAmt] = useState("");
  const [slipBps, setSlipBps] = useState(50); // 0.50%
  const [deadlineMin, setDeadlineMin] = useState(20);
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [swapQuoteBusy, setSwapQuoteBusy] = useState(false);
  const [swapNeedApprove, setSwapNeedApprove] = useState(false);
  const [bagTab, setBagTab] = useState<"tokens" | "nfts" | "stakes">("tokens");
  const [nfts, setNfts] = useState<ScanNft[]>([]);
  const [nftsTruncated, setNftsTruncated] = useState(0);
  const [nftBusy, setNftBusy] = useState(false);
  const [nftErr, setNftErr] = useState<string | null>(null);

  const pack = packFor(chainId);
  const active = session ?? watch;
  const canSign = !!session;
  /** User saved RPC wins; else host prop; else auto-failover pick; else pack default. */
  const effectiveRpc: RpcOverride | undefined =
    rpcSaved || rpc || rpcFailoverUrl || undefined;
  const activeRpcUrl = resolveRpcUrl(chainId, effectiveRpc);
  const defaultRpcUrl = pack.rpc[0];
  const rpcNorm = (u: string) => u.replace(/\/$/, "").toLowerCase();
  const rpcOptions: { name: string; url: string }[] =
    (
      pack as {
        rpcOptions?: { name: string; url: string }[];
      }
    ).rpcOptions?.length
      ? (pack as { rpcOptions: { name: string; url: string }[] }).rpcOptions
      : pack.rpc.map((url, i) => ({
          name: i === 0 ? "Official" : url,
          url,
        }));
  const rpcMatchesPreset = rpcOptions.some(
    (s) => rpcNorm(s.url) === rpcNorm(activeRpcUrl),
  );
  const rpcSelectValue =
    rpcCustomMode || !rpcMatchesPreset ? "__custom__" : activeRpcUrl;
  const selectedCore: PackToken | null =
    asset === "PLS"
      ? null
      : tokenRows.find(
          (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
        )?.token ?? null;
  const selectedExtra: ScanToken | null =
    asset === "PLS" || selectedCore
      ? null
      : (fullBag?.tokens.find(
          (t) => t.address.toLowerCase() === asset.toLowerCase(),
        ) ?? null);
  const selectedCustom =
    asset === "PLS" || selectedCore || selectedExtra
      ? null
      : (customRows.find(
          (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
        )?.token ?? null);
  const selectedToken: {
    address: string;
    decimals: number;
    symbol: string;
  } | null = selectedCore
    ? {
        address: selectedCore.address,
        decimals: selectedCore.decimals,
        symbol: selectedCore.symbol,
      }
    : selectedExtra
      ? {
          address: selectedExtra.address,
          decimals: selectedExtra.decimals,
          symbol: selectedExtra.symbol,
        }
      : selectedCustom
        ? {
            address: selectedCustom.address,
            decimals: selectedCustom.decimals,
            symbol: selectedCustom.symbol,
          }
        : null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await warmTrezorConnect();
        if (cancelled) return;
        setWarm(true);
        // Suite probe ≠ Connect SDK; don't leave a stale "not initialized" under green Suite.
        setErr((prev) =>
          prev && /not initialized/i.test(prev) ? null : prev,
        );
      } catch (e) {
        const raw = e instanceof Error ? e.message : String(e);
        if (/not initialized/i.test(raw)) {
          resetTrezorInit();
          try {
            await warmTrezorConnect();
            if (cancelled) return;
            setWarm(true);
            setErr(null);
            return;
          } catch (e2) {
            if (!cancelled) {
              setErr(
                humanTrezorError(
                  e2 instanceof Error ? e2.message : String(e2),
                ),
              );
            }
            return;
          }
        }
        if (!cancelled) setErr(humanTrezorError(raw));
      }
    })();
    void probeSuite().then((s) => {
      if (!cancelled) setSuite(s);
    });
    void detectSuiteChannel().then((c) => {
      if (!cancelled) setSuiteChannel(c);
    });
    void getDeviceHints().then((h) => {
      if (!cancelled) setDeviceHints(h);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let first = true;

    const tick = async () => {
      if (first && !cancelled) {
        setRpcHealth({ state: "checking" });
        first = false;
      }
      // Custom RPC: probe only that. Else walk pack list and stick to a healthy one.
      const forced = rpcSaved || rpc;
      const r = forced
        ? await failoverRpc(chainId, forced)
        : await failoverRpc(chainId);
      if (cancelled) return;
      if (r.ok) {
        if (!forced) setRpcFailoverUrl(r.url);
        setRpcHealth({
          state: "ok",
          block: r.block,
          latencyMs: r.latencyMs,
          url: r.url,
        });
      } else {
        setRpcHealth({ state: "down", detail: r.error });
      }
      if (!cancelled && rpcHealthMs > 0) {
        timer = window.setTimeout(() => {
          void tick();
        }, rpcHealthMs);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [chainId, rpcSaved, rpc, rpcHealthMs]);

  useEffect(() => {
    if (!active) {
      setNonceHint(null);
      return;
    }
    let cancelled = false;
    void makePublicClient(chainId, effectiveRpc)
      .getTransactionCount({
        address: active.address as Address,
        blockTag: "pending",
      })
      .then((n) => {
        if (!cancelled) setNonceHint(n);
      })
      .catch(() => {
        if (!cancelled) setNonceHint(null);
      });
    return () => {
      cancelled = true;
    };
  }, [active, chainId, effectiveRpc, lastTx, txStatus]);

  const refreshAcctFace = useCallback(async () => {
    if (accountList.length === 0) {
      setAcctPls({});
      setAcctHexStakes({});
      return;
    }
    const rows = await Promise.all(
      accountList.map(async (a) => {
        const key = a.address.toLowerCase();
        const addr = a.address as Address;
        const [plsR, hexR] = await Promise.allSettled([
          fetchPlsBalance(chainId, addr, effectiveRpc),
          fetchHexStakeCount(chainId, addr, effectiveRpc),
        ]);
        return {
          key,
          pls: plsR.status === "fulfilled" ? plsR.value : null,
          hex: hexR.status === "fulfilled" ? hexR.value : 0,
        };
      }),
    );
    const nextPls: Record<string, bigint> = {};
    const nextHex: Record<string, number> = {};
    for (const r of rows) {
      if (r.pls != null) nextPls[r.key] = r.pls;
      if (r.hex > 0) nextHex[r.key] = r.hex;
    }
    setAcctPls(nextPls);
    setAcctHexStakes(nextHex);
  }, [accountList, chainId, effectiveRpc]);

  useEffect(() => {
    void refreshAcctFace();
  }, [refreshAcctFace]);

  const refreshBalances = useCallback(
    async (addr: Address, cid: DeskChainId) => {
      setBalBusy(true);
      try {
        const b = await fetchPlsBalance(cid, addr, effectiveRpc);
        setBalance(b);
        setAcctPls((prev) => ({ ...prev, [addr.toLowerCase()]: b }));
        const rows = await fetchTokenBalances(cid, addr, effectiveRpc);
        setTokenRows(rows);
        const customs = loadCustomTokens(cid);
        const crows = await fetchCustomBalances(
          cid,
          addr,
          customs,
          effectiveRpc,
        );
        setCustomRows(crows);
      } catch (e) {
        setBalance(null);
        setTokenRows([]);
        setCustomRows([]);
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBalBusy(false);
      }
    },
    [effectiveRpc],
  );

  const refreshActivity = useCallback(async (addr: Address, cid: DeskChainId) => {
    setActBusy(true);
    setActErr(null);
    try {
      const rows = await fetchAddressActivity(cid, addr, 8);
      setActivity(rows);
    } catch (e) {
      setActivity([]);
      setActErr(e instanceof Error ? e.message : String(e));
    } finally {
      setActBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setBalance(null);
      setTokenRows([]);
      setFullBag(null);
      setActivity([]);
      setActErr(null);
      setNfts([]);
      setNftsTruncated(0);
      setNftErr(null);
      return;
    }
    setFullBag(null);
    void refreshBalances(active.address, chainId);
    void refreshActivity(active.address, chainId);
  }, [active, chainId, refreshBalances, refreshActivity]);

  useEffect(() => {
    if (asset === "PLS") return;
    const row = tokenRows.find(
      (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
    );
    if (row && row.raw === 0n) setAsset("PLS");
  }, [asset, tokenRows]);

  function onLoadFullBag() {
    if (!active || (chainId !== 369 && chainId !== 943)) return;
    setBagBusy(true);
    setErr(null);
    const skip = new Set(
      tokenRows.map((r) => r.token.address.toLowerCase()),
    );
    void fetchFullBag(chainId, active.address, effectiveRpc, skip)
      .then((bag) => {
        setFullBag(bag);
        setNfts(bag.nfts);
        setNftsTruncated(bag.nftsTruncated);
        const ak = active.address.toLowerCase();
        setAcctHexStakes((prev) => {
          if (bag.stakeCount > 0) return { ...prev, [ak]: bag.stakeCount };
          const next = { ...prev };
          delete next[ak];
          return next;
        });
        if (bag.warnings?.length) {
          setErr(`Full bag partial: ${bag.warnings[0]}`);
        }
      })
      .catch((e) =>
        setErr(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setBagBusy(false));
  }

  const refreshNfts = useCallback(
    async (addr: Address, cid: DeskChainId) => {
      if (cid !== 369 && cid !== 943) {
        setNfts([]);
        setNftsTruncated(0);
        setNftErr("NFTs load on Pulse mainnet / testnet V4.");
        return;
      }
      setNftBusy(true);
      setNftErr(null);
      try {
        const { nfts: rows, truncated } = await fetchScanNfts(cid, addr);
        setNfts(rows);
        setNftsTruncated(truncated);
      } catch (e) {
        setNfts([]);
        setNftsTruncated(0);
        setNftErr(e instanceof Error ? e.message : String(e));
      } finally {
        setNftBusy(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (bagTab !== "nfts" || !active) return;
    void refreshNfts(active.address, chainId);
  }, [bagTab, active, chainId, refreshNfts]);

  useEffect(() => {
    if (bagTab !== "stakes" || !active || chainId !== 369) return;
    if (!fullBag && !bagBusy) onLoadFullBag();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load bag once when Stakes opens
  }, [bagTab, active?.address, chainId]);

  useEffect(() => {
    if (actionTab !== "approve" || !active) return;
    if (chainId !== 369 && chainId !== 943) return;
    refreshApprovals();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scan on tab open / account change
  }, [actionTab, active?.address, chainId]);

  function applyGasSpeed(
    preview: FeePreview | null,
    speed: "normal" | "faster" | "fastest",
  ) {
    setGasSpeed(speed);
    if (!preview || speed === "normal") {
      setMaxFeeGwei("");
      setTipGwei("");
      return;
    }
    // Faster tip → validators pick you sooner. Max fee is the ceiling you might pay.
    const tipMul = speed === "faster" ? [3n, 2n] : [2n, 1n]; // 1.5x / 2x
    const maxMul = speed === "faster" ? [5n, 4n] : [3n, 2n]; // 1.25x / 1.5x
    if (preview.eip1559) {
      const tip = preview.maxPriorityFeePerGas ?? 1n;
      const max = preview.maxFeePerGas ?? tip;
      const nextTip = (tip * tipMul[0]) / tipMul[1];
      let nextMax = (max * maxMul[0]) / maxMul[1];
      if (nextMax < nextTip) nextMax = nextTip;
      setTipGwei(trimGwei(formatGwei(nextTip)));
      setMaxFeeGwei(trimGwei(formatGwei(nextMax)));
    } else {
      const gp = preview.gasPrice ?? 1n;
      setTipGwei("");
      setMaxFeeGwei(trimGwei(formatGwei((gp * tipMul[0]) / tipMul[1])));
    }
  }

  useEffect(() => {
    if (!session || !to || !amount || !isAddress(to)) {
      setFeeHint(null);
      setFeePreview(null);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          let value = 0n;
          let data: `0x${string}` = "0x";
          let txTo = to as Address;
          if (asset === "PLS") {
            value = parseEther(amount);
          } else if (selectedToken) {
            const raw = parseTokenAmount(amount, selectedToken.decimals);
            data = encodeErc20Transfer(to as Address, raw);
            txTo = selectedToken.address as Address;
          } else {
            setFeeHint(null);
            setFeePreview(null);
            return;
          }
          const p = await previewFees(
            chainId,
            session.address,
            txTo,
            value,
            data,
            effectiveRpc,
          );
          if (cancelled) return;
          setFeePreview(p);
          const feeWei = p.eip1559
            ? p.gas * (p.maxFeePerGas ?? 0n)
            : p.gas * (p.gasPrice ?? 0n);
          // Pulse testnet often quotes absurd beats — show raw + short note, don't hide it.
          const feeStr = formatEther(feeWei);
          const wild = feeWei > 100_000_000_000_000_000n; // > 0.1 native
          setFeeHint(
            wild
              ? `~${feeStr} ${pack.currency.symbol} fee · gas ${p.gas.toString()} (network quote — testnets can be wild)`
              : `~${feeStr} ${pack.currency.symbol} fee · gas ${p.gas.toString()}`,
          );
          if (gasSpeed !== "normal") {
            applyGasSpeed(p, gasSpeed);
          }
        } catch {
          if (!cancelled) {
            setFeeHint(null);
            setFeePreview(null);
          }
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // gasSpeed intentionally omitted — re-apply only when quote refreshes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session,
    to,
    amount,
    chainId,
    pack.currency.symbol,
    asset,
    selectedToken,
    effectiveRpc,
  ]);

  function onCancelConnect() {
    connectGen.current += 1;
    cancelTrezorConnect("user-cancel");
    setConnecting(false);
    setListing(false);
    setBusy(false);
    setErr(
      suite === "ok"
        ? "Cancelled. Suite is still linked — click Connect or Sign again when ready."
        : "Cancelled. Open Suite, then try Connect again.",
    );
  }

  /** Abort stuck Suite Allow / device confirm (connect or sign). */
  function onCancelBusy() {
    connectGen.current += 1;
    cancelTrezorConnect("user-cancel");
    setConnecting(false);
    setListing(false);
    setBusy(false);
    setErr(
      suite === "ok"
        ? "Cancelled. Suite is still linked — check Suite on other screens, then retry."
        : "Cancelled. Open Suite, then retry.",
    );
  }

  function applySession(
    address: Address,
    derivationIndex: number,
    derivationPath: string,
    id: string,
  ) {
    const next: Session = {
      address,
      derivationIndex,
      derivationPath,
      deviceId: id,
    };
    setSession(next);
    setWatch(next);
    saveWatch(next);
    setAccountIndex(derivationIndex);
    saveAccountIndex(derivationIndex);
    setDeviceId(id);
  }

  function selectListedAccount(a: ListedAccount) {
    applySession(
      a.address as Address,
      a.derivationIndex,
      a.derivationPath,
      deviceId,
    );
    setErr(null);
  }

  /** One Suite Allow → Account #1…#N (same BIP44 slots Suite calls Ethereum #). */
  function onLoadAccounts() {
    setErr(null);
    setBusy(true);
    setListing(true);
    setConnecting(true);
    const gen = ++connectGen.current;
    saveAccountCount(accountCount);
    const pending = listTrezorAccountsFromGesture(accountCount);
    const timeout = window.setTimeout(() => {
      if (connectGen.current !== gen) return;
      cancelTrezorConnect("timeout");
      setConnecting(false);
      setListing(false);
      setBusy(false);
      setErr(
        suite === "ok"
          ? "Suite is running but did not finish Allow. Check Suite, Allow Pulse Perch, then Load accounts again."
          : "Timed out loading accounts. Open Trezor Suite, then retry.",
      );
      void probeSuite().then(setSuite);
    }, 90_000);
    void pending
      .then(({ accounts, deviceId: id }) => {
        if (connectGen.current !== gen) return;
        setAccountList(accounts);
        saveAccountList(accounts);
        setDeviceId(id);
        const prefer =
          accounts.find((a) => a.derivationIndex === accountIndex) ??
          accounts[0];
        if (prefer) {
          applySession(
            prefer.address as Address,
            prefer.derivationIndex,
            prefer.derivationPath,
            id,
          );
        }
        void probeSuite().then(setSuite);
      })
      .catch((e) => {
        if (connectGen.current !== gen) return;
        const raw = e instanceof Error ? e.message : String(e);
        if (/not\s*initialized/i.test(raw)) {
          resetTrezorInit();
          setWarm(false);
          void warmTrezorConnect()
            .then(() => setWarm(true))
            .catch(() => setWarm(false));
          setErr(
            "Connect got reset — wait a second, then Load accounts again.",
          );
        } else {
          setErr(humanTrezorError(raw));
        }
        void probeSuite().then(setSuite);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (connectGen.current !== gen) return;
        setConnecting(false);
        setListing(false);
        setBusy(false);
      });
  }

  function onConnect() {
    setErr(null);
    setBusy(true);
    setConnecting(true);
    const gen = ++connectGen.current;
    saveAccountIndex(accountIndex);
    const pending = connectTrezorFromGesture(accountIndex);
    const timeout = window.setTimeout(() => {
      if (connectGen.current !== gen) return;
      cancelTrezorConnect("timeout");
      setConnecting(false);
      setBusy(false);
      setErr(
        suite === "ok"
          ? "Suite is running but did not finish Allow. Check Suite (other screen / behind windows), unlock Trezor, Allow Pulse Perch, confirm address — then Connect again."
          : "Connect timed out. Open Trezor Suite, unlock the device, then Connect again.",
      );
      void probeSuite().then(setSuite);
    }, 45_000);
    void pending
      .then((r) => {
        if (connectGen.current !== gen) return;
        applySession(
          r.address0 as Address,
          r.derivationIndex,
          r.derivationPath,
          r.deviceId,
        );
        void probeSuite().then(setSuite);
      })
      .catch((e) => {
        if (connectGen.current !== gen) return;
        const raw = e instanceof Error ? e.message : String(e);
        if (/not\s*initialized/i.test(raw)) {
          resetTrezorInit();
          setWarm(false);
          void warmTrezorConnect()
            .then(() => setWarm(true))
            .catch(() => setWarm(false));
          setErr(
            "Connect got reset — wait a second for Suite link, then click Connect again.",
          );
        } else {
          setErr(humanTrezorError(raw));
        }
        void probeSuite().then(setSuite);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (connectGen.current !== gen) return;
        setConnecting(false);
        setBusy(false);
      });
  }

  function onDisconnect() {
    setSession(null);
    setErr(null);
    setLastTx(null);
    setTo("");
    setAmount("");
    // keep watch so balances stay
  }

  function onForget() {
    setSession(null);
    setWatch(null);
    saveWatch(null);
    setAccountList([]);
    saveAccountList([]);
    setBalance(null);
    setTokenRows([]);
    setErr(null);
    setLastTx(null);
    setStuckTx(null);
    setTxStatus(null);
  }

  function onCopy() {
    if (!active) return;
    if (privacyHide) {
      setErr("Unhide (dox shield) before copying the address.");
      return;
    }
    void navigator.clipboard.writeText(active.address).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  function togglePrivacyHide() {
    setPrivacyHide((on) => {
      const next = !on;
      savePrivacyHide(next);
      return next;
    });
  }

  function onMaxSend() {
    if (asset === "PLS") {
      if (balance == null) return;
      let leave = parseEther("0.001");
      if (feePreview) {
        const feeWei = feePreview.eip1559
          ? feePreview.gas * (feePreview.maxFeePerGas ?? 0n)
          : feePreview.gas * (feePreview.gasPrice ?? 0n);
        leave = (feeWei * 12n) / 10n;
        if (leave < parseEther("0.0001")) leave = parseEther("0.0001");
      }
      const max = balance > leave ? balance - leave : 0n;
      setAmount(formatEther(max));
      return;
    }
    const core = tokenRows.find(
      (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
    );
    if (core) {
      setAmount(core.formatted);
      return;
    }
    const custom = customRows.find(
      (r) => r.token.address.toLowerCase() === asset.toLowerCase(),
    );
    if (custom) {
      setAmount(custom.formatted);
      return;
    }
    const extra = fullBag?.tokens.find(
      (t) => t.address.toLowerCase() === asset.toLowerCase(),
    );
    if (extra) setAmount(extra.formatted);
  }

  function onSend() {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    setStuckTx(null);
    setTxStatus(null);
    if (!isAddress(to)) {
      setErr("Recipient must be a valid 0x address.");
      return;
    }
    if (!amount.trim() || Number.isNaN(Number(amount))) {
      setErr("Amount must be a number.");
      return;
    }
    if (chainId !== 369 && chainId !== 943 && chainId !== 1 && chainId !== 11155111 && chainId !== 17000) {
      setErr("Unsupported chain.");
      return;
    }
    if (chainId === 369 && !mainnetSendAcked && !mainnetSendAck) {
      setErr("Confirm the mainnet first-send warning before signing.");
      return;
    }
    try {
      if (asset === "PLS") {
        const value = parseEther(amount);
        if (value <= 0n) {
          setErr("Amount must be > 0.");
          return;
        }
        if (balance != null && value > balance) {
          setErr("Amount exceeds PLS balance.");
          return;
        }
      } else if (selectedToken) {
        const raw = parseTokenAmount(amount, selectedToken.decimals);
        if (raw <= 0n) {
          setErr("Amount must be > 0.");
          return;
        }
        const core = tokenRows.find(
          (r) =>
            r.token.address.toLowerCase() ===
            selectedToken.address.toLowerCase(),
        );
        const custom = customRows.find(
          (r) =>
            r.token.address.toLowerCase() ===
            selectedToken.address.toLowerCase(),
        );
        const extra = fullBag?.tokens.find(
          (t) =>
            t.address.toLowerCase() === selectedToken.address.toLowerCase(),
        );
        const have = core?.raw ?? custom?.raw ?? extra?.raw;
        if (have != null && raw > have) {
          setErr("Amount exceeds token balance.");
          return;
        }
      }
    } catch {
      setErr("Amount invalid.");
      return;
    }
    setBusy(true);
    void (async () => {
      try {
        let value = 0n;
        let data: `0x${string}` | undefined;
        let txTo = to as Address;
        if (asset === "PLS") {
          value = parseEther(amount);
        } else {
          if (!selectedToken) throw new Error("Pick a token.");
          if (chainId !== 369 && !selectedCustom) {
            throw new Error("Pack tokens are mainnet only — import a custom token for testnet.");
          }
          const raw = parseTokenAmount(amount, selectedToken.decimals);
          if (raw <= 0n) throw new Error("Amount must be > 0.");
          data = encodeErc20Transfer(to as Address, raw);
          txTo = selectedToken.address as Address;
        }
        if (asset === "PLS" && value <= 0n) {
          throw new Error("Amount must be > 0.");
        }
        let fee:
          | {
              maxFeePerGas?: bigint;
              maxPriorityFeePerGas?: bigint;
              gasPrice?: bigint;
            }
          | undefined;
        if (maxFeeGwei.trim() || tipGwei.trim()) {
          fee = {};
          if (maxFeeGwei.trim()) {
            const wei = parseGwei(maxFeeGwei.trim());
            fee.maxFeePerGas = wei;
            // Legacy networks: same field drives gasPrice when EIP-1559 isn’t used.
            fee.gasPrice = wei;
          }
          if (tipGwei.trim()) {
            fee.maxPriorityFeePerGas = parseGwei(tipGwei.trim());
          }
        }
        const nonceN = nonceOverride.trim()
          ? Number(nonceOverride.trim())
          : undefined;
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: txTo,
          value,
          data,
          derivationIndex: session.derivationIndex,
          rpc: effectiveRpc,
          fee,
          nonce:
            nonceN != null && Number.isFinite(nonceN) ? nonceN : undefined,
        });
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        if (chainId === 369 && !mainnetSendAcked) {
          try {
            localStorage.setItem(FIRST_MAINNET_SEND_KEY, "1");
          } catch {
            /* ignore */
          }
          setMainnetSendAcked(true);
        }
        void refreshBalances(session.address, chainId);
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              setStuckTx(null);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      } finally {
        setBusy(false);
      }
    })();
  }

  async function resolveStuckMeta(): Promise<BroadcastResult | null> {
    if (stuckTx) return stuckTx;
    if (!lastTx) return null;
    return loadBroadcastMeta(chainId, lastTx, effectiveRpc);
  }

  function onSpeedUp() {
    if (!session) return;
    setErr(null);
    setBusy(true);
    void (async () => {
      try {
        const meta = await resolveStuckMeta();
        if (!meta) {
          throw new Error(
            "No pending tx to speed up — it may already be mined.",
          );
        }
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: meta.to,
          value: meta.value,
          data: meta.data,
          derivationIndex: session.derivationIndex,
          rpc: effectiveRpc,
          nonce: meta.nonce,
          fee: bumpFees(meta),
        });
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              setStuckTx(null);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      } finally {
        setBusy(false);
      }
    })();
  }

  function onCancelStuck() {
    if (!session) return;
    setErr(null);
    setBusy(true);
    void (async () => {
      try {
        const meta = await resolveStuckMeta();
        if (!meta) {
          throw new Error(
            "No pending tx to cancel — it may already be mined.",
          );
        }
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: session.address,
          value: 0n,
          data: "0x",
          derivationIndex: session.derivationIndex,
          rpc: effectiveRpc,
          nonce: meta.nonce,
          fee: bumpFees({ ...meta, gas: 21_000n }),
        });
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              setStuckTx(null);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      } finally {
        setBusy(false);
      }
    })();
  }

  function applyRpc(url: string, custom = false) {
    const next = url.trim();
    setRpcDraft(next);
    saveRpcOverride(next);
    setRpcSaved(next);
    setRpcCustomMode(custom);
    setErr(null);
    if (active) void refreshBalances(active.address, chainId);
  }

  function onSaveRpc() {
    applyRpc(rpcDraft, true);
  }

  function patchA11y(partial: Partial<A11yPrefs>) {
    setA11y((prev) => {
      const next = { ...prev, ...partial };
      saveA11y(next);
      applyA11y(next);
      return next;
    });
  }

  useEffect(() => {
    applyA11y(loadA11y());
    applyTheme(loadTheme());
    bootAiPolicy();
    try {
      const q = new URLSearchParams(window.location.search);
      const syncParam = q.get("sync");
      const applySyncBoot = (payload: string) => {
        const dec = decodeSyncPayload(payload);
        if (dec.ok && dec.import.accounts[0]) {
          const a = dec.import.accounts[0];
          const idx = a.derivationIndex ?? 0;
          const sess = {
            address: a.address,
            derivationIndex: idx,
            derivationPath: a.derivationPath || `m/44'/60'/0'/0/${idx}`,
            deviceId: "imported-watch",
          };
          setWatch(sess);
          saveWatch(sess);
          void refreshBalances(a.address, chainId);
          return true;
        }
        if (!dec.ok) setErr(dec.error);
        return false;
      };
      if (syncParam) {
        applySyncBoot(
          syncParam.startsWith("v1.") || syncParam.startsWith("{")
            ? syncParam
            : `v1.${syncParam}`,
        );
      } else if (/web\+pulseperch:\/\/sync\/v1\//i.test(window.location.href)) {
        const href = window.location.href;
        const m = href.match(/web\+pulseperch:\/\/sync\/v1\/[A-Za-z0-9_-]+/i);
        if (m) applySyncBoot(m[0]);
      }
      let raw =
        q.get("uri") ||
        q.get("wc") ||
        q.get("session") ||
        "";
      if (!raw && window.location.href.includes("web+pulseperch:")) {
        raw = decodeURIComponent(
          window.location.href.split("web+pulseperch:")[1] || "",
        );
      }
      raw = raw.trim();
      if (raw.startsWith("web+pulseperch://")) {
        raw = decodeURIComponent(raw.replace(/^web\+pulseperch:\/\//i, ""));
      }
      if (/^wc:/i.test(raw) || raw.includes("wc:")) {
        const idx = raw.indexOf("wc:");
        const uri = idx >= 0 ? raw.slice(idx) : raw;
        setDeepWcUri(uri);
        setActionTab("sites");
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setFavs(loadFavorites(chainId));
  }, [chainId]);

  useEffect(() => {
    if (chainId !== 369) {
      setPriceHints([]);
      return;
    }
    const addrs = [
      ...tokenRows.map((r) => r.token.address as Address),
      ...customRows.map((r) => r.token.address as Address),
    ];
    if (!addrs.length) {
      setPriceHints([]);
      return;
    }
    let cancelled = false;
    void fetchTokenUsdHints(chainId, addrs).then((hints) => {
      if (!cancelled) setPriceHints(hints);
    });
    return () => {
      cancelled = true;
    };
  }, [chainId, tokenRows, customRows]);

  /** Agent bridge only — human Send / WC stay ungated. */
  useEffect(() => {
    if (!session) {
      registerAgentHandlers({ sign: null, prepare: null });
      return;
    }
    const account = session.address;
    const derivationIndex = session.derivationIndex;
    registerAgentHandlers({
      sign: async (draft: AgentTxDraft) => {
        const value =
          typeof draft.value === "bigint"
            ? draft.value
            : BigInt(draft.value ?? 0);
        const broadcast = await sendPlsWithTrezor({
          chainId: draft.chainId ?? chainId,
          account,
          to: draft.to,
          value,
          data: draft.data,
          derivationIndex,
          rpc: draft.rpc ?? effectiveRpc,
        });
        return broadcast.hash;
      },
      prepare: async (draft: AgentTxDraft) => {
        const value =
          typeof draft.value === "bigint"
            ? draft.value.toString()
            : String(draft.value ?? "0");
        return {
          chainId: draft.chainId ?? chainId,
          to: draft.to,
          value,
          data: draft.data,
          note: `Prepared for ${account} — unsigned. Sign only via requestSign if policy allows.`,
        };
      },
    });
    return () => registerAgentHandlers({ sign: null, prepare: null });
  }, [session, chainId, effectiveRpc]);

  /**
   * Extension content script is isolated — it cannot read `__pulsePerchInject`.
   * Answer postMessage relays from perch-bridge.js (pulse-perch-ext-bridge).
   */
  useEffect(() => {
    const onBridgeMsg = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.source !== "pulse-perch-ext-bridge") return;
      if (data.type === "ping") {
        const inject = (
          window as Window & { __pulsePerchInject?: { request?: unknown } }
        ).__pulsePerchInject;
        window.postMessage(
          {
            source: "pulse-perch-page-bridge",
            type: "pong",
            id: data.id,
            ready: typeof inject?.request === "function",
          },
          "*",
        );
        return;
      }
      if (data.type !== "request") return;
      void (async () => {
        const inject = (
          window as Window & {
            __pulsePerchInject?: {
              request: (args: {
                method: string;
                params?: unknown;
              }) => Promise<unknown>;
            };
          }
        ).__pulsePerchInject;
        if (!inject?.request) {
          window.postMessage(
            {
              source: "pulse-perch-page-bridge",
              type: "response",
              id: data.id,
              error: {
                code: 4100,
                message:
                  "Pulse Perch tab open but inject bridge not ready — connect Trezor",
              },
            },
            "*",
          );
          return;
        }
        try {
          const result = await inject.request({
            method: data.method,
            params: data.params,
          });
          window.postMessage(
            {
              source: "pulse-perch-page-bridge",
              type: "response",
              id: data.id,
              result,
            },
            "*",
          );
        } catch (e) {
          const err = e as { code?: number; message?: string };
          window.postMessage(
            {
              source: "pulse-perch-page-bridge",
              type: "response",
              id: data.id,
              error: {
                code: err?.code ?? 4200,
                message: err?.message || String(e),
              },
            },
            "*",
          );
        }
      })();
    };
    window.addEventListener("message", onBridgeMsg);
    return () => window.removeEventListener("message", onBridgeMsg);
  }, []);

  /** Host for this-tab inject + extension bridge (`window.__pulsePerchInject`). */
  useEffect(() => {
    const host: InjectedHost = {
      getSelectedAddress: () => session?.address ?? null,
      getChainId: () => chainId,
      switchChain: async (id) => {
        if (!isDeskChainId(id)) throw new Error(`Unsupported chain ${id}`);
        setChainId(id);
      },
      sendTransaction: async (tx) => {
        if (!session) throw new Error("Connect Trezor first");
        if (!tx.to || !isAddress(tx.to)) throw new Error("Invalid tx.to");
        const value =
          tx.value != null && String(tx.value) !== ""
            ? BigInt(tx.value as string)
            : 0n;
        const data = (tx.data as Hex | undefined) || "0x";
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: tx.to as Address,
          value,
          data,
          derivationIndex: session.derivationIndex,
          rpc: effectiveRpc,
        });
        return broadcast.hash;
      },
      personalSign: async (message) => {
        if (!session) throw new Error("Connect Trezor first");
        let text = message;
        if (isHex(message)) {
          try {
            text = hexToString(message as Hex);
          } catch {
            text = message;
          }
        }
        return signPersonalMessage(text, session.derivationIndex);
      },
      signTypedData: async (params) => {
        if (!session) throw new Error("Connect Trezor first");
        const { address, data } = parseTypedDataParams(params);
        if (
          address &&
          address.toLowerCase() !== session.address.toLowerCase()
        ) {
          throw new Error("Typed-data address mismatch");
        }
        return signTypedData(data, session.derivationIndex);
      },
      watchAsset: async (asset) => {
        if (!isDeskChainId(chainId)) return false;
        const addr = asset.options.address as Address;
        if (!isAddress(addr)) return false;
        const symbol = String(asset.options.symbol || "TOKEN").slice(0, 32);
        const decimals = Number(asset.options.decimals);
        addCustomToken({
          chainId,
          address: addr,
          symbol,
          name: symbol,
          decimals: Number.isFinite(decimals) ? decimals : 18,
        });
        const who = session?.address;
        if (who) void refreshBalances(who, chainId);
        return true;
      },
      readRpc: async (method, params) => {
        const client = makePublicClient(chainId, effectiveRpc);
        return client.request({
          method: method as "eth_blockNumber",
          params: params as never,
        });
      },
    };

    const w = window as Window & {
      __pulsePerchInject?: PulsePerchProvider;
    };
    if (w.__pulsePerchInject) {
      w.__pulsePerchInject.setHost(host);
    } else {
      w.__pulsePerchInject = new PulsePerchProvider(host);
    }
    w.__pulsePerchInject.notifyAccountsChanged(
      session?.address ? [session.address] : [],
    );
    w.__pulsePerchInject.notifyChainChanged(chainId);

    if (injectEth) {
      const existing = getInjectedProvider();
      if (existing) {
        existing.setHost(host);
      } else {
        attachInjectedProvider(host);
      }
      getInjectedProvider()?.notifyAccountsChanged(
        session?.address ? [session.address] : [],
      );
      getInjectedProvider()?.notifyChainChanged(chainId);
    } else {
      detachInjectedProvider();
    }
  }, [injectEth, session, chainId, effectiveRpc, refreshBalances]);

  useEffect(() => {
    if (!settingsOpen) return;
    const root = settingsRef.current;
    const previously = document.activeElement as HTMLElement | null;
    if (root) {
      const first = getFocusable(root)[0];
      first?.focus();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSettingsOpen(false);
        return;
      }
      if (root) trapTabKey(e, root);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      (settingsBtnRef.current || previously)?.focus?.();
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!rpcMatchesPreset && rpcSaved) setRpcCustomMode(true);
  }, [rpcMatchesPreset, rpcSaved]);

  function refreshApprovals() {
    if (!active) return;
    setApprBusy(true);
    setApprErr(null);
    const extra =
      fullBag?.tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        decimals: t.decimals,
      })) ?? [];
    void Promise.all([
      fetchApprovalInventory(chainId, active.address, {
        rpc: effectiveRpc,
        extraTokens: extra,
      }),
      fetchNftApprovalInventory(chainId, active.address, effectiveRpc).catch(
        () => [] as NftApprovalRow[],
      ),
    ])
      .then(([{ rows, meta }, nftRows]) => {
        setApprovals(rows);
        setApprMeta(meta);
        setNftApprovals(nftRows);
        setRevokeSel((prev) => {
          const next = new Set<string>();
          for (const r of rows) {
            const k = `${r.token}:${r.spender}`;
            if (prev.has(k)) next.add(k);
          }
          return next;
        });
      })
      .catch((e) => {
        setApprovals([]);
        setNftApprovals([]);
        setApprMeta(null);
        setApprErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setApprBusy(false));
  }

  function onRevokeNft(row: NftApprovalRow) {
    if (!session) return;
    setErr(null);
    setBusy(true);
    const data = encodeSetApprovalForAll(row.operator, false);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: row.collection,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed") {
              setStuckTx(null);
              refreshApprovals();
            }
          },
        );
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      })
      .finally(() => setBusy(false));
  }

  function exportWatchJson() {
    const payload = buildWatchRegistryExport({
      accounts: accountList.map((a) => ({
        address: a.address,
        derivationIndex: a.derivationIndex,
        derivationPath: a.derivationPath,
      })),
      watch: watch
        ? { address: watch.address, derivationIndex: watch.derivationIndex }
        : session
          ? {
              address: session.address,
              derivationIndex: session.derivationIndex,
            }
          : null,
      addressBook: loadAddressBook(),
      chainId,
      walletFingerprint: deviceId
        ? `trezor:${deviceId}`
        : watch
          ? "watch"
          : "perch",
    });
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-watch-registry-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportBagSnapshot() {
    if (!active) return;
    const payload = {
      kind: "pulse-perch-bag-snapshot",
      exportedAt: new Date().toISOString(),
      chainId,
      address: active.address,
      pls: balance != null ? balance.toString() : null,
      tokens: tokenRows.map((r) => ({
        address: r.token.address,
        symbol: r.token.symbol,
        raw: r.raw.toString(),
        formatted: r.formatted,
        tags: r.token.tags ?? [],
      })),
      custom: customRows.map((r) => ({
        address: r.token.address,
        symbol: r.token.symbol,
        raw: r.raw.toString(),
        formatted: r.formatted,
      })),
      fullBag: fullBag
        ? {
            tokenCount: fullBag.tokens.length,
            stakeCount: fullBag.stakeCount,
            stakes: fullBag.stakes.map((s) => ({
              stakeId: s.stakeId,
              hex: s.formattedHex,
              days: s.stakedDays,
              unlockedDay: s.unlockedDay,
            })),
          }
        : null,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulse-perch-bag-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applyWatchImportText(text: string) {
    const sync = decodeSyncPayload(text);
    const result = sync.ok ? sync.import : parseWatchImportJson(text);
    if (!result.ok) {
      setErr(
        result.error ||
          (!sync.ok ? sync.error : undefined) ||
          "Import failed.",
      );
      return false;
    }
    setAddressBook(loadAddressBook());
    if (result.accounts[0]) {
      const a = result.accounts[0];
      const idx = a.derivationIndex ?? 0;
      const sess = {
        address: a.address,
        derivationIndex: idx,
        derivationPath: a.derivationPath || `m/44'/60'/0'/0/${idx}`,
        deviceId: "imported-watch",
      };
      setWatch(sess);
      saveWatch(sess);
      if (typeof a.derivationIndex === "number") {
        setAccountIndex(a.derivationIndex);
      }
      void refreshBalances(result.accounts[0].address, chainId);
    }
    setErr(null);
    return true;
  }

  function onImportWatchFile(file: File) {
    setWatchImportBusy(true);
    setErr(null);
    void file
      .text()
      .then((text) => {
        applyWatchImportText(text);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setWatchImportBusy(false));
  }

  function approvalKey(row: ApprovalRow): string {
    return `${row.token}:${row.spender}`;
  }

  async function revokeOne(row: ApprovalRow): Promise<boolean> {
    if (!session) return false;
    const data = encodeErc20Approve(row.spender, 0n);
    const broadcast = await sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: row.token,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    });
    setLastTx(broadcast.hash);
    setStuckTx(broadcast);
    setTxStatus("pending");
    const st = await waitForTxStatus(chainId, broadcast.hash, effectiveRpc);
    setTxStatus(st);
    if (st === "confirmed") {
      setStuckTx(null);
      return true;
    }
    return false;
  }

  function onRevoke(row: ApprovalRow) {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    setStuckTx(null);
    setTxStatus(null);
    setBusy(true);
    void revokeOne(row)
      .then((ok) => {
        if (ok) {
          refreshApprovals();
          void refreshActivity(session.address, chainId);
        }
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      })
      .finally(() => setBusy(false));
  }

  function onCustomCall() {
    if (!session) return;
    if (!isAddress(callTo)) {
      setErr("Contract address invalid.");
      return;
    }
    const data = callData.trim() || "0x";
    if (!isHex(data)) {
      setErr("Calldata must be 0x-hex.");
      return;
    }
    let value = 0n;
    if (amount.trim()) {
      try {
        value = parseEther(amount.trim());
      } catch {
        setErr("Amount invalid for payable call.");
        return;
      }
    }
    setErr(null);
    setBusy(true);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: callTo as Address,
      value,
      data: data as Hex,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") setStuckTx(null);
          },
        );
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      })
      .finally(() => setBusy(false));
  }

  function onBulkRevoke() {
    if (!session || !revokeSel.size) return;
    const rows = approvals.filter((r) => revokeSel.has(approvalKey(r)));
    if (!rows.length) return;
    setErr(null);
    setBusy(true);
    void (async () => {
      let okN = 0;
      try {
        for (const row of rows) {
          const ok = await revokeOne(row);
          if (ok) okN += 1;
          else break;
        }
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      } finally {
        setBusy(false);
        refreshApprovals();
        void refreshActivity(session.address, chainId);
        if (okN) setRevokeSel(new Set());
      }
    })();
  }

  function refreshSwapQuote() {
    if (chainId !== 369 || !swapAmt.trim()) {
      setSwapQuote(null);
      setSwapNeedApprove(false);
      return;
    }
    setSwapQuoteBusy(true);
    void quotePulsexSwap(
      chainId,
      swapIn,
      swapOut,
      swapAmt.trim(),
      slipBps,
      effectiveRpc,
    )
      .then(async (q) => {
        setSwapQuote(q);
        if (swapIn === "PLS" || !session) {
          setSwapNeedApprove(false);
          return;
        }
        const token = swapIn as Address;
        const allow = await routerAllowance(
          chainId,
          token,
          session.address,
          effectiveRpc,
        );
        setSwapNeedApprove(allow < q.amountIn);
      })
      .catch((e) => {
        setSwapQuote(null);
        setSwapNeedApprove(false);
        setErr(e instanceof Error ? e.message : String(e));
      })
      .finally(() => setSwapQuoteBusy(false));
  }

  function onSwapApproveRouter() {
    if (!session || swapIn === "PLS") return;
    setErr(null);
    setBusy(true);
    const data = encodeErc20Approve(PULSEX_V2_ROUTER, maxUint256);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: swapIn as Address,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed") {
              setStuckTx(null);
              setSwapNeedApprove(false);
              refreshSwapQuote();
            }
          },
        );
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      })
      .finally(() => setBusy(false));
  }

  function onSwap() {
    if (!session || !swapQuote) return;
    setErr(null);
    setBusy(true);
    try {
      const prepared = preparePulsexSwap({
        account: session.address,
        tokenIn: swapIn,
        tokenOut: swapOut,
        quote: swapQuote,
        deadlineSec: Math.max(1, deadlineMin) * 60,
      });
      void sendPlsWithTrezor({
        chainId,
        account: session.address,
        to: prepared.to,
        value: prepared.value,
        data: prepared.data,
        derivationIndex: session.derivationIndex,
        rpc: effectiveRpc,
      })
        .then((broadcast) => {
          setLastTx(broadcast.hash);
          setStuckTx(broadcast);
          setTxStatus("pending");
          void refreshBalances(session.address, chainId);
          void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
            (st) => {
              setTxStatus(st);
              if (st === "confirmed" || st === "reverted") {
                setStuckTx(null);
                void refreshBalances(session.address, chainId);
                void refreshActivity(session.address, chainId);
              }
            },
          );
        })
        .catch((e) => {
          setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
          setTxStatus(null);
          setStuckTx(null);
        })
        .finally(() => setBusy(false));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  function onApprove(unlimited: boolean) {
    if (!session) return;
    setErr(null);
    setLastTx(null);
    setTxStatus(null);
    if (chainId !== 369 && !selectedCustom) {
      setErr(
        "Pack-token approve is mainnet only — import a custom token on testnet.",
      );
      return;
    }
    if (!selectedToken || asset === "PLS") {
      setErr("Pick a token from balances.");
      return;
    }
    if (!isAddress(spender)) {
      setErr("Spender must be a valid 0x address.");
      return;
    }
    let raw: bigint;
    try {
      raw = unlimited
        ? maxUint256
        : parseTokenAmount(approveAmt, selectedToken.decimals);
    } catch {
      setErr("Approve amount invalid.");
      return;
    }
    if (!unlimited && raw < 0n) {
      setErr("Approve amount invalid.");
      return;
    }
    setBusy(true);
    const data = encodeErc20Approve(spender as Address, raw);
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: selectedToken.address as Address,
      value: 0n,
      data,
      derivationIndex: session.derivationIndex,
      rpc: effectiveRpc,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        setStuckTx(broadcast);
        setTxStatus("pending");
        void refreshBalances(session.address, chainId);
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              setStuckTx(null);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      })
      .catch((e) => {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
        setTxStatus(null);
        setStuckTx(null);
      })
      .finally(() => setBusy(false));
  }

  // Anti-phish: Pulse networks always say Pulse — path lives on Device, not here.
  const networkName =
    chainId === 369
      ? t("pulseChain")
      : chainId === 943
        ? `${t("pulseChain")} test`
        : chainLabel(chainId);
  /** Never show “Suite is down” beside green Suite linked. */
  const faceErr = reconcileErrWithSuite(err, suite);
  const suiteStatusMeta =
    suite === "ok" ? (
      <span className="rpc-status-meta ok"> · Suite</span>
    ) : suite === "missing" ? (
      <span className="rpc-status-meta bad"> · open Suite</span>
    ) : !warm ? (
      <span className="rpc-status-meta warn"> · …</span>
    ) : null;
  const rpcStatusLine =
    rpcHealth.state === "ok" ? (
      <p
        className="rpc-status ok"
        role="status"
        title={`${networkName} · ${rpcHealth.latencyMs}ms${
          active ? ` · ${active.derivationPath}` : ""
        }`}
      >
        ● {networkName}
        <span className="rpc-status-meta"> · {rpcHealth.latencyMs}ms</span>
        {suiteStatusMeta}
      </p>
    ) : rpcHealth.state === "down" ? (
      <p className="rpc-status bad" role="status" title={rpcHealth.detail}>
        ● {networkName}
        <span className="rpc-status-meta"> · RPC down</span>
        {suiteStatusMeta}
      </p>
    ) : (
      <p className="rpc-status warn" role="status">
        ● {networkName}…
        {suiteStatusMeta}
      </p>
    );

  const suiteCue = connecting
    ? listing
      ? `Suite Allow — exporting Account #1–#${accountCount}.`
      : suite === "ok"
        ? "Suite is up — look for Allow in Suite (may be on another screen)."
        : "Waiting on Suite — unlock Trezor and confirm."
    : null;

  /* Errors use role=alert separately — keep this polite region for cues only. */
  const a11yLive = [
    suiteCue,
    busy ? "Signing — confirm on your Trezor if prompted." : null,
    copied ? "Address copied to clipboard." : null,
  ]
    .filter(Boolean)
    .join(" ");

  const deskTools = (
    <div className="rpc-pop-wrap desk-tools">
      <button
        type="button"
        className={
          privacyHide
            ? "btn ghost rpc-pop-btn privacy-btn on"
            : "btn ghost rpc-pop-btn privacy-btn"
        }
        aria-pressed={privacyHide}
        title={
          privacyHide
            ? "Show addresses & amounts"
            : "Hide addresses & amounts (********)"
        }
        aria-label={
          privacyHide
            ? "Show addresses and amounts"
            : "Hide addresses and amounts"
        }
        onClick={togglePrivacyHide}
      >
        {privacyHide ? (
          <svg
            className="privacy-eye"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.5 11.5 0 0 1-4.2 5.1M6.6 6.6A11.4 11.4 0 0 0 1 12.5C2.7 16.9 7 20 12 20a10.5 10.5 0 0 0 4.3-.9"
            />
          </svg>
        ) : (
          <svg
            className="privacy-eye"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2 12.5C3.7 8.1 7.9 5 12 5s8.3 3.1 10 7.5c-1.7 4.4-5.9 7.5-10 7.5S3.7 16.9 2 12.5z"
            />
            <circle
              cx="12"
              cy="12.5"
              r="3"
              stroke="currentColor"
              strokeWidth="1.75"
            />
          </svg>
        )}
      </button>
      {showSettings ? (
      <button
        type="button"
        ref={settingsBtnRef}
        className={
          settingsOpen ? "btn ghost rpc-pop-btn on" : "btn ghost rpc-pop-btn"
        }
        aria-haspopup="dialog"
        aria-expanded={settingsOpen}
        aria-label="Settings"
        title="Settings"
        onClick={() => setSettingsOpen(true)}
      >
        <svg
          className="settings-gear"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
          />
          <circle
            cx="12"
            cy="12"
            r="3"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      </button>
      ) : null}
      {showSettings && settingsOpen ? (
        <div
          className="rpc-modal-root"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSettingsOpen(false);
          }}
        >
          <div
            className="rpc-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            ref={settingsRef}
          >
            <div className="rpc-modal-head">
              <h3>Settings</h3>
              <button
                type="button"
                className="btn ghost rpc-modal-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <h4 className="settings-section">About</h4>
            <p className="muted fee">
              Pulse Perch desk · v0.1.0 · no telemetry · hardware path only
            </p>
            <p className="muted fee">
              <a
                className="link"
                href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/status.md"
                target="_blank"
                rel="noreferrer"
              >
                What works today
              </a>
              {" · "}
              <a
                className="link"
                href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/trezor-on-pulse.md"
                target="_blank"
                rel="noreferrer"
              >
                Trezor on Pulse
              </a>
              {" · "}
              <a
                className="link"
                href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/bridge-receive.md"
                target="_blank"
                rel="noreferrer"
              >
                Bridge → receive
              </a>
              {" · "}
              <a
                className="link"
                href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/provex.md"
                target="_blank"
                rel="noreferrer"
              >
                ProveX
              </a>
            </p>
            <p className="muted fee">
              <a
                className="link"
                href="https://github.com/ihelpmaybe/pulse-trezor-guides/blob/main/migrate-from-eth.md"
                target="_blank"
                rel="noreferrer"
              >
                Migrate from ETH
              </a>
              {" · "}
              <a
                className="link"
                href="https://github.com/ihelpmaybe/pulse-trezor/blob/main/docs/UNINSTALL-METAMASK-FOR-PULSE.md"
                target="_blank"
                rel="noreferrer"
              >
                Uninstall MetaMask
              </a>
              {" · "}
              <a
                className="link"
                href="https://suite.trezor.io"
                target="_blank"
                rel="noreferrer"
              >
                Trezor Suite
              </a>
              {" · "}
              <a
                className="link"
                href="https://bridge.pulsechain.com"
                target="_blank"
                rel="noreferrer"
              >
                Pulse Bridge
              </a>
            </p>
            <p className="muted fee">
              Channel: desk-web · rebuild to update (
              <code>docs/UPDATE-CHANNEL.md</code>).
            </p>

            <h4 className="settings-section">Device</h4>
            <p className="muted fee">
              Suite:{" "}
              {suiteChannel === "desktop"
                ? "Desktop (connect-ws)"
                : suiteChannel === "web-or-missing"
                  ? "Desktop not detected — use Suite Web or start Desktop"
                  : "checking…"}
              {deviceHints?.firmware
                ? ` · FW ${deviceHints.firmware}${deviceHints.outdated ? " (outdated)" : ""}`
                : ""}
              {deviceHints?.passphraseProtection
                ? " · passphrase on"
                : ""}
            </p>
            <button
              type="button"
              className="btn ghost"
              onClick={exportWatchJson}
            >
              {t("exportWatch")}
            </button>
            <button
              type="button"
              className="btn ghost"
              disabled={!active}
              onClick={exportBagSnapshot}
            >
              Export bag snapshot
            </button>
            <label className="btn ghost watch-import">
              {watchImportBusy ? "…" : t("importWatch")}
              <input
                type="file"
                accept="application/json,.json"
                hidden
                disabled={watchImportBusy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) onImportWatchFile(f);
                }}
              />
            </label>
            <SyncPair
              accounts={accountList.map((a) => ({
                address: a.address,
                derivationIndex: a.derivationIndex,
                derivationPath: a.derivationPath,
              }))}
              watch={
                watch
                  ? {
                      address: watch.address,
                      derivationIndex: watch.derivationIndex,
                    }
                  : session
                    ? {
                        address: session.address,
                        derivationIndex: session.derivationIndex,
                      }
                    : null
              }
              chainId={chainId}
              walletFingerprint={
                deviceId ? `trezor:${deviceId}` : watch ? "watch" : "perch"
              }
              busy={watchImportBusy}
              onImportText={(text) => {
                setWatchImportBusy(true);
                try {
                  applyWatchImportText(text);
                } finally {
                  setWatchImportBusy(false);
                }
              }}
            />

            <h4 className="settings-section">RPC</h4>
            <label className="field">
              Node
              <select
                value={rpcSelectValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "__custom__") {
                    setRpcCustomMode(true);
                    setRpcDraft(activeRpcUrl);
                    return;
                  }
                  applyRpc(v === defaultRpcUrl ? "" : v, false);
                }}
              >
                {rpcOptions.map((s) => (
                  <option key={s.url} value={s.url}>
                    {s.name}
                  </option>
                ))}
                <option value="__custom__">Custom…</option>
              </select>
            </label>
            {rpcSelectValue === "__custom__" ? (
              <>
                <label className="field">
                  Custom URL
                  <input
                    value={rpcDraft}
                    onChange={(e) => setRpcDraft(e.target.value)}
                    placeholder={defaultRpcUrl}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <button type="button" className="btn" onClick={onSaveRpc}>
                  Save RPC
                </button>
              </>
            ) : null}
            <label className="field">
              Health check
              <select
                value={String(rpcHealthMs)}
                onChange={(e) => {
                  const ms = Number(e.target.value);
                  setRpcHealthMs(ms);
                  saveRpcHealthMs(ms);
                }}
              >
                {RPC_HEALTH_MS_OPTIONS.map((o) => (
                  <option key={o.ms} value={o.ms}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted fee">
              How often Perch pings the node for the latency chip. Off = once
              when the desk loads or RPC changes.
            </p>

            <h4 className="settings-section">Display</h4>
            <label className="hide-zero">
              <input
                type="checkbox"
                checked={theme === "light"}
                onChange={(e) => {
                  const next: ThemePref = e.target.checked ? "light" : "dark";
                  setTheme(next);
                  applyTheme(next);
                }}
              />
              {t("lightTheme")}
            </label>

            <h4 className="settings-section">Modules</h4>
            <label className="hide-zero">
              <input
                type="checkbox"
                checked={hexModule}
                onChange={(e) => {
                  const on = e.target.checked;
                  setHexModule(on);
                  saveHexModule(on);
                  if (!on && bagTab === "stakes") setBagTab("tokens");
                }}
              />
              HEX stakes
            </label>
            <p className="muted fee">
              Shows Stakes tab and “has stakes” marks. Liquid HEX in Tokens
              stays either way. Off by default — lean face.
            </p>

            <h4 className="settings-section">Privacy</h4>
            <button
              type="button"
              className={privacyHide ? "vision-tile on" : "vision-tile"}
              aria-pressed={privacyHide}
              onClick={togglePrivacyHide}
            >
              <span className="vision-copy">
                <span className="vision-title">Dox shield</span>
                <span className="vision-blurb">
                  Mask addresses &amp; amounts as ******** (screen share)
                </span>
              </span>
              <span className="vision-switch" aria-hidden="true">
                <span className="vision-knob" />
              </span>
            </button>

            <h4 className="settings-section">Vision impaired</h4>
            <div className="vision-grid" role="group" aria-label="Vision impaired">
              {(
                [
                  {
                    key: "largeText" as const,
                    title: "Larger text",
                    blurb: "Bump type size",
                  },
                  {
                    key: "highContrast" as const,
                    title: "High contrast",
                    blurb: "Brighter type & edges",
                  },
                  {
                    key: "reduceMotion" as const,
                    title: "Calm motion",
                    blurb: "Kill animations",
                  },
                  {
                    key: "strongFocus" as const,
                    title: "Focus ring",
                    blurb: "Thicker keyboard outline",
                  },
                ] as const
              ).map((opt) => {
                const on = a11y[opt.key];
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={on ? "vision-tile on" : "vision-tile"}
                    aria-pressed={on}
                    onClick={() => patchA11y({ [opt.key]: !on })}
                  >
                    <span className="vision-copy">
                      <span className="vision-title">{opt.title}</span>
                      <span className="vision-blurb">{opt.blurb}</span>
                    </span>
                    <span className="vision-switch" aria-hidden="true">
                      <span className="vision-knob" />
                    </span>
                  </button>
                );
              })}
            </div>

            <AiPolicyPanel />

            <h4 className="settings-section">Injected provider</h4>
            <button
              type="button"
              className={injectEth ? "vision-tile on" : "vision-tile"}
              aria-pressed={injectEth}
              onClick={() => {
                setInjectEth((on) => {
                  const next = !on;
                  try {
                    localStorage.setItem(INJECT_KEY, next ? "1" : "0");
                  } catch {
                    /* ignore */
                  }
                  return next;
                });
              }}
            >
              <span className="vision-copy">
                <span className="vision-title">window.ethereum (this tab)</span>
                <span className="vision-blurb">
                  Lab inject for MM-shaped APIs. Cross-site needs extension next.
                </span>
              </span>
              <span className="vision-switch" aria-hidden="true">
                <span className="vision-knob" />
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={["pulse-trezor", className].filter(Boolean).join(" ")}
      data-privacy-hide={privacyHide ? "1" : undefined}
    >
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {a11yLive}
      </div>
      <div className="status-row">
        <div className="status-stack">
          {rpcStatusLine}
          {faceErr ? (
            <p className="err banner err-top" role="alert">
              {faceErr}
            </p>
          ) : null}
        </div>
        {deskTools}
      </div>
      <div className="top-strip">
        {active ? (
          <button
            type="button"
            className="addr-bar"
            onClick={onCopy}
            title={
              privacyHide
                ? "Unhide to copy address"
                : copied
                  ? "Copied"
                  : "Click to copy full address"
            }
            aria-label={
              privacyHide
                ? "Address hidden"
                : copied
                  ? `Copied address ${active.address}`
                  : `Copy address ${active.address}`
            }
          >
            <AddrParts address={active.address} />
            {copied ? (
              <span className="addr-copied" aria-hidden="true">
                Copied
              </span>
            ) : null}
            <svg
              className="addr-copy-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              aria-hidden="true"
              focusable="false"
            >
              <rect
                x="5.5"
                y="5.5"
                width="8"
                height="8"
                rx="1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}
        {watch ? (
          <button
            type="button"
            className="btn ghost addr-forget"
            onClick={onForget}
            title="Forget watched address"
          >
            Forget
          </button>
        ) : null}
        {active ? (
          <ReceiveQr address={active.address as Address} chainId={chainId} />
        ) : null}
      </div>
      <div className="grid">
        <section className="card device">
          <div className="device-head">
            <h2>Device</h2>
          </div>
          {showTestnet ? (
            <label className="field">
              Network
              <select
                value={chainId}
                onChange={(e) => {
                  setChainId(Number(e.target.value) as DeskChainId);
                  setAsset("PLS");
                }}
              >
                {DESK_CHAIN_IDS.map((id) => (
                  <option key={id} value={id}>
                    {chainLabel(id)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="field">
            How many addresses?
            <input
              type="number"
              min={ACCOUNT_COUNT_MIN}
              max={ACCOUNT_COUNT_MAX}
              step={1}
              value={accountCount}
              disabled={connecting}
              onChange={(e) => {
                const n = clampAccountCount(Number(e.target.value));
                setAccountCount(n);
                saveAccountCount(n);
              }}
            />
          </label>
          <div className="row" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              disabled={connecting}
              onClick={onLoadAccounts}
            >
              {listing ? "Loading…" : `Load ${accountCount} accounts`}
            </button>
            {!session ? (
              <button
                type="button"
                className="btn ghost"
                disabled={connecting}
                onClick={onConnect}
              >
                {connecting && !listing
                  ? "Connecting…"
                  : `Connect #${accountIndex + 1} only`}
              </button>
            ) : null}
            {connecting || busy ? (
              <button
                type="button"
                className="btn ghost"
                onClick={connecting ? onCancelConnect : onCancelBusy}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {connecting && suiteCue ? (
            <p className="muted" role="status">
              {suiteCue}
            </p>
          ) : null}
          {!active ? (
            <p className="muted empty-teach">
              First run: open Trezor Suite (
              {suiteChannel === "desktop"
                ? "Desktop detected"
                : "Desktop not seen — Suite Web / Desktop both work with Connect 10"}
              ) → Connect → Load full bag → Sites to pair a dApp.
            </p>
          ) : null}
          {deviceHints?.outdated ? (
            <p className="warn-line" role="status">
              Firmware {deviceHints.firmware ?? "?"} looks outdated — update in
              Suite before big moves.
            </p>
          ) : null}
          {deviceHints?.passphraseProtection ? (
            <p className="muted fee" role="status">
              Passphrase / hidden wallet is on this device — the account you
              unlock in Suite is the one Perch will use.
            </p>
          ) : null}
          {busy && !connecting ? (
            <p className="muted" role="status">
              Signing — confirm in Trezor Suite / on device (may be on another
              screen). Fee on Pulse testnet can look huge; that&apos;s the
              network, not Perch.
            </p>
          ) : null}

          {accountList.length > 0 ? (
            <div className="acct-grid" role="list">
              {accountList.map((a) => {
                const key = a.address.toLowerCase();
                const on = active?.address?.toLowerCase() === key;
                const wei = acctPls[key];
                const hexN = acctHexStakes[key] ?? 0;
                const balText =
                  wei != null
                    ? `${shortNative(wei)} ${pack.currency.symbol}`
                    : "…";
                return (
                  <button
                    key={a.derivationIndex}
                    type="button"
                    role="listitem"
                    className={on ? "acct-card on" : "acct-card"}
                    onClick={() => selectListedAccount(a)}
                    title={a.derivationPath}
                    aria-label={
                      privacyHide
                        ? `Account #${a.derivationIndex + 1}${on ? ", selected" : ""}, values hidden`
                        : `Account #${a.derivationIndex + 1}, ${a.address}, ${balText}${
                            hexModule && hexN > 0
                              ? `, ${hexN} HEX stakes`
                              : ""
                          }${on ? ", selected" : ""}`
                    }
                    aria-current={on ? "true" : undefined}
                  >
                    <span className="acct-label">
                      #{a.derivationIndex + 1}
                    </span>
                    <code className="acct-addr">{shortAddr(a.address)}</code>
                    <span className="acct-bal">{balText}</span>
                    {hexModule && hexN > 0 ? (
                      <HexStakeMark
                        count={hexN}
                        onOpen={() => {
                          selectListedAccount(a);
                          setBagTab("stakes");
                        }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
          {active ? (
            <div className="session">
              {!canSign ? (
                <p className="muted">
                  Watching — click Connect, then green Confirm in Suite (check
                  other screens).
                </p>
              ) : null}
              {canSign ? (
                <div className="row">
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={onDisconnect}
                  >
                    Disconnect
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

        </section>

        <section className="card bag-card">
          <div className="bag-head">
            <h2 title={active ? "Balances for this account" : undefined}>
              {active ? `Account #${active.derivationIndex + 1}` : "Balances"}
            </h2>
            <div className="action-tabs bag-tabs" role="tablist" aria-label="Bag">
              <button
                type="button"
                id="bag-tab-tokens"
                role="tab"
                aria-selected={bagTab === "tokens"}
                aria-controls="bag-panel-tokens"
                tabIndex={bagTab === "tokens" ? 0 : -1}
                className={bagTab === "tokens" ? "tab on" : "tab"}
                onClick={() => setBagTab("tokens")}
              >
                Tokens
              </button>
              <button
                type="button"
                id="bag-tab-nfts"
                role="tab"
                aria-selected={bagTab === "nfts"}
                aria-controls="bag-panel-nfts"
                tabIndex={bagTab === "nfts" ? 0 : -1}
                className={bagTab === "nfts" ? "tab on" : "tab"}
                onClick={() => setBagTab("nfts")}
              >
                NFTs
              </button>
              {hexModule && chainId === 369 ? (
                <button
                  type="button"
                  id="bag-tab-stakes"
                  role="tab"
                  aria-selected={bagTab === "stakes"}
                  aria-controls="bag-panel-stakes"
                  tabIndex={bagTab === "stakes" ? 0 : -1}
                  className={bagTab === "stakes" ? "tab on" : "tab"}
                  onClick={() => setBagTab("stakes")}
                >
                  Stakes
                  {(acctHexStakes[active?.address?.toLowerCase() ?? ""] ?? 0) >
                  0
                    ? ` · ${acctHexStakes[active!.address.toLowerCase()]}`
                    : ""}
                </button>
              ) : null}
            </div>
          </div>

          <div
            id="bag-panel-tokens"
            role="tabpanel"
            aria-labelledby="bag-tab-tokens"
            hidden={bagTab !== "tokens"}
          >
            {!active ? (
              <p className="muted">Connect to load balances.</p>
            ) : (
              <>
                {balBusy ? (
                  <p className="bal">…</p>
                ) : balance != null && balance > 0n ? (
                  <p className="bal">
                    {formatEther(balance)} {pack.currency.symbol}
                  </p>
                ) : null}
                {chainId === 369 && active && hexModule ? (
                  <p className="hex-strip muted fee" aria-label="HEX liquid vs staked">
                    {(() => {
                      const hexRow = tokenRows.find(
                        (r) =>
                          r.token.address.toLowerCase() ===
                          "0x2b591e99afe9f32eaa6214f7b7629768c40eeb39",
                      );
                      const liquid = hexRow?.formatted ?? "—";
                      const stakedN =
                        fullBag?.stakeCount ??
                        acctHexStakes[active.address.toLowerCase()] ??
                        0;
                      const stakedHex =
                        fullBag?.stakes.reduce(
                          (n, s) => n + Number(s.formattedHex || 0),
                          0,
                        ) ?? null;
                      return (
                        <>
                          HEX liquid {liquid}
                          {" · "}
                          {stakedN > 0
                            ? stakedHex != null
                              ? `staked ~${stakedHex.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${stakedN})`
                              : `${stakedN} stake${stakedN === 1 ? "" : "s"}`
                            : "no stakes"}
                          {" · "}
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setBagTab("stakes")}
                          >
                            Stakes
                          </button>
                        </>
                      );
                    })()}
                  </p>
                ) : null}
                {chainId === 369 &&
                active &&
                !hexModule &&
                (acctHexStakes[active.address.toLowerCase()] ?? 0) > 0 ? (
                  <p className="muted fee">
                    This bag has HEX stakes — turn on{" "}
                    <strong>HEX stakes</strong> under Settings → Modules to
                    see them.
                  </p>
                ) : null}
                <label className="hide-zero">
                  <input
                    type="checkbox"
                    checked={hideZeroBal}
                    onChange={(e) => setHideZeroBal(e.target.checked)}
                  />
                  {t("hideZeros")}
                </label>
                {chainId === 369 ? (
                  <ul className="token-grid">
                    {[...tokenRows]
                      .filter((r) => !hideZeroBal || r.raw > 0n)
                      .sort((a, b) => {
                        const af = favs.includes(a.token.address.toLowerCase())
                          ? 0
                          : 1;
                        const bf = favs.includes(b.token.address.toLowerCase())
                          ? 0
                          : 1;
                        return af - bf;
                      })
                      .map((r) => {
                        const tags = r.token.tags ?? [];
                        const bridged = tags.includes("bridged");
                        const inherited = tags.includes("inherited");
                        const fav = favs.includes(
                          r.token.address.toLowerCase(),
                        );
                        return (
                          <li key={r.token.address}>
                            <button
                              type="button"
                              className={
                                asset === r.token.address ? "tok on" : "tok"
                              }
                              onClick={() => setAsset(r.token.address)}
                              title={r.token.name}
                            >
                              <span>
                                {r.token.symbol}
                                {bridged ? (
                                  <span className="tok-tag ok"> bridged</span>
                                ) : null}
                                {inherited ? (
                                  <span className="tok-tag bad"> inherited</span>
                                ) : null}
                              </span>
                              <span className="muted">
                                {r.formatted}
                                {(() => {
                                  const ph = priceHints.find(
                                    (p) =>
                                      p.address.toLowerCase() ===
                                      r.token.address.toLowerCase(),
                                  );
                                  const u = formatUsdHint(ph?.usd ?? null);
                                  return u ? ` · ${u}` : "";
                                })()}
                              </span>
                            </button>
                            <button
                              type="button"
                              className={
                                fav ? "btn ghost tok-forget on" : "btn ghost tok-forget"
                              }
                              aria-label={
                                fav
                                  ? `Unfavorite ${r.token.symbol}`
                                  : `Favorite ${r.token.symbol}`
                              }
                              onClick={() =>
                                setFavs(
                                  toggleFavorite(chainId, r.token.address),
                                )
                              }
                            >
                              {fav ? "★" : "☆"}
                            </button>
                          </li>
                        );
                      })}
                  </ul>
                ) : null}
                {customRows.length ? (
                  <ul className="token-grid">
                    {customRows
                      .filter((r) => !hideZeroBal || r.raw > 0n)
                      .map((r) => (
                      <li key={`c-${r.token.address}`}>
                        <button
                          type="button"
                          className={
                            asset.toLowerCase() ===
                            r.token.address.toLowerCase()
                              ? "tok on"
                              : "tok"
                          }
                          onClick={() => setAsset(r.token.address)}
                          title={r.token.name}
                        >
                          <span>{r.token.symbol}</span>
                          <span className="muted">{r.formatted}</span>
                        </button>
                        <button
                          type="button"
                          className="btn ghost tok-forget"
                          aria-label={`Remove ${r.token.symbol}`}
                          onClick={() => {
                            removeCustomToken(chainId, r.token.address);
                            if (
                              asset.toLowerCase() ===
                              r.token.address.toLowerCase()
                            ) {
                              setAsset("PLS");
                            }
                            if (active) {
                              void refreshBalances(active.address, chainId);
                            }
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {chainId === 943 && !customRows.length ? (
                  <p className="muted empty-teach">
                    Testnet has no pack tokens — Import a contract below, then
                    Send as ERC-20.
                  </p>
                ) : null}
                <details className="gas-details">
                  <summary>Import token</summary>
                  <label className="field">
                    Contract
                    <input
                      value={importAddr}
                      onChange={(e) => setImportAddr(e.target.value)}
                      placeholder="0x…"
                      spellCheck={false}
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={importBusy || !importAddr.trim()}
                    onClick={() => {
                      if (!isAddress(importAddr.trim())) {
                        setErr("Token address invalid.");
                        return;
                      }
                      setImportBusy(true);
                      setErr(null);
                      void fetchCustomTokenMeta(
                        chainId,
                        importAddr.trim() as Address,
                        effectiveRpc,
                      )
                        .then((meta) => {
                          addCustomToken({
                            chainId,
                            ...meta,
                          });
                          setImportAddr("");
                          setAsset(meta.address);
                          if (active) {
                            void refreshBalances(active.address, chainId);
                          }
                        })
                        .catch((e) => {
                          setErr(
                            e instanceof Error ? e.message : String(e),
                          );
                        })
                        .finally(() => setImportBusy(false));
                    }}
                  >
                    {importBusy ? "…" : "Add"}
                  </button>
                </details>
                <div className="row">
                  {chainId === 369 && asset !== "PLS" ? (
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setAsset("PLS")}
                    >
                      Use PLS
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={balBusy}
                    onClick={() =>
                      void refreshBalances(active.address, chainId)
                    }
                  >
                    Refresh
                  </button>
                  {chainId === 369 || chainId === 943 ? (
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={bagBusy}
                      onClick={onLoadFullBag}
                    >
                      {bagBusy
                        ? "Loading bag…"
                        : fullBag
                          ? "Reload full bag"
                          : "Load full bag"}
                    </button>
                  ) : null}
                </div>
                {fullBag ? (
                  <div className="full-bag">
                    <p className="muted bag-sum">
                      Extra tokens {fullBag.tokens.length}
                      {fullBag.tokensTruncated ? "+" : ""} · HEX stakes{" "}
                      {fullBag.stakeCount}
                    </p>
                    {fullBag.tokens.filter(
                      (t) => !hideZeroBal || t.raw > 0n,
                    ).length ? (
                      <ul className="token-grid">
                        {fullBag.tokens
                          .filter((t) => !hideZeroBal || t.raw > 0n)
                          .map((t) => (
                          <li key={t.address}>
                            <button
                              type="button"
                              className={
                                asset.toLowerCase() ===
                                t.address.toLowerCase()
                                  ? "tok on"
                                  : "tok"
                              }
                              onClick={() => setAsset(t.address)}
                              title={t.name}
                            >
                              <span>{t.symbol}</span>
                              <span className="muted">{t.formatted}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">
                        No extra ERC-20s (or all spam-filtered).
                      </p>
                    )}
                    {fullBag.stakeCount > 0 ? (
                      <p className="muted fee">
                        HEX stakes {fullBag.stakeCount} ·{" "}
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => setBagTab("stakes")}
                        >
                          Open Stakes
                        </button>
                      </p>
                    ) : (
                      <p className="muted">No HEX stakes.</p>
                    )}
                    <p className="muted">
                      <a
                        className="link"
                        href={explorerAddressUrl(chainId, active.address)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open full bag on PulseScan
                      </a>
                    </p>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div
            id="bag-panel-nfts"
            role="tabpanel"
            aria-labelledby="bag-tab-nfts"
            hidden={bagTab !== "nfts"}
          >
            {!active ? (
              <p className="muted">Connect to load NFTs.</p>
            ) : (
              <>
                <div className="row nft-toolbar">
                  <p className="muted nft-status">
                    {nftBusy
                      ? "Loading…"
                      : nftErr
                        ? nftErr
                        : `${nfts.length}${nftsTruncated ? "+" : ""} on PulseScan`}
                  </p>
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={nftBusy}
                    onClick={() => void refreshNfts(active.address, chainId)}
                  >
                    Refresh
                  </button>
                </div>
                {!nftBusy && !nftErr && !nfts.length ? (
                  <p className="muted empty-teach">
                    No NFTs on first PulseScan page — try Refresh, or check
                    Approvals → NFT operators if a marketplace still has
                    setApprovalForAll.
                  </p>
                ) : null}
                {nfts.length ? (
                  <ul className="nft-grid">
                    {nfts.map((n) => (
                      <li key={`${n.contract}-${n.tokenId}`}>
                        <a
                          className="nft-card"
                          href={explorerNftUrl(
                            chainId,
                            n.contract,
                            n.tokenId,
                          )}
                          target="_blank"
                          rel="noreferrer"
                          title={`${n.collection} #${n.tokenId}`}
                        >
                          <span className="nft-type">{n.type || "NFT"}</span>
                          <span className="nft-col">{n.collection}</span>
                          <span className="nft-id">#{n.tokenId}</span>
                          <span className="muted nft-type">{n.type}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="muted">
                  <a
                    className="link"
                    href={explorerAddressUrl(chainId, active.address)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open bag on PulseScan
                  </a>
                </p>
              </>
            )}
          </div>

          <div
            id="bag-panel-stakes"
            role="tabpanel"
            aria-labelledby="bag-tab-stakes"
            hidden={!hexModule || bagTab !== "stakes"}
          >
            {!hexModule ? null : !active ? (
              <p className="muted">Connect to load HEX stakes.</p>
            ) : chainId !== 369 ? (
              <p className="muted">HEX stakes are mainnet (369) only.</p>
            ) : bagBusy && !fullBag ? (
              <p className="muted">Loading stakes…</p>
            ) : (
              <>
                <p className="muted fee">
                  Clear-sign: Sites shows stakeStart hearts/days and stakeEnd
                  index/id. Confirm on Trezor — dApp labels can lie.{" "}
                  <a
                    className="link"
                    href="https://go.hex.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    go.hex.com
                  </a>
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={bagBusy}
                    onClick={onLoadFullBag}
                  >
                    {bagBusy ? "Loading…" : "Reload stakes"}
                  </button>
                </div>
                {fullBag && fullBag.stakeCount > 0 ? (
                  <ul className="stake-grid">
                    {fullBag.stakes.map((s) => (
                      <li key={s.stakeId} className="stake-card">
                        <span className="stake-id">#{s.stakeId}</span>
                        <span className="stake-amt">
                          {s.formattedHex} HEX
                        </span>
                        <span className="muted">
                          {s.stakedDays}d
                          {s.unlockedDay > 0 ? " · ended" : " · locked"}
                        </span>
                      </li>
                    ))}
                    {fullBag.stakeCount > fullBag.stakes.length ? (
                      <li className="stake-card muted">
                        +{fullBag.stakeCount - fullBag.stakes.length} more
                        on-chain
                      </li>
                    ) : null}
                  </ul>
                ) : (
                  <p className="muted empty-teach">
                    No HEX stakes on this account. Start / end stakes via{" "}
                    <a
                      className="link"
                      href="https://go.hex.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      go.hex.com
                    </a>{" "}
                    → Sites (WalletConnect).
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section className="card activity">
          <div className="device-head activity-head">
            <h2>Activity</h2>
            {active ? (
              <div className="row activity-tools">
                <div className="gas-speed" role="group" aria-label="Activity filter">
                  {(
                    [
                      ["all", "All"],
                      ["in", "In"],
                      ["out", "Out"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={
                        actFilter === id
                          ? "btn gas-pill on"
                          : "btn ghost gas-pill"
                      }
                      onClick={() => setActFilter(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn ghost gas-pill"
                  disabled={actBusy}
                  onClick={() => void refreshActivity(active.address, chainId)}
                >
                  {actBusy ? "…" : "↻"}
                </button>
              </div>
            ) : null}
          </div>
          {!active ? (
            <p className="muted empty-teach">
              Next: Connect, then Refresh here for recent PulseScan txs.
            </p>
          ) : actErr ? (
            <p className="muted">{actErr}</p>
          ) : actBusy && !activity.length ? (
            <p className="muted">…</p>
          ) : !activity.length ? (
            <p className="muted">No recent txs on this chain.</p>
          ) : (
            <ul className="activity-list">
              {lastTx &&
              txStatus === "pending" &&
              !activity.some((a) => a.hash.toLowerCase() === lastTx.toLowerCase()) ? (
                <li className="activity-row pending">
                  <button
                    type="button"
                    className="activity-dir"
                    title={`Copy ${lastTx}`}
                    onClick={() => {
                      void navigator.clipboard.writeText(lastTx);
                    }}
                  >
                    …
                  </button>
                  <span className="activity-amt">
                    <span className="activity-int">…</span>
                    <span className="activity-frac" />
                  </span>
                  <span className="activity-when">mining</span>
                </li>
              ) : null}
              {(() => {
                const poisonPeers: { address: string; label: string }[] = [
                  ...addressBook.map((b) => ({
                    address: b.address,
                    label: b.label,
                  })),
                ];
                const seen = new Set(
                  poisonPeers.map((p) => p.address.toLowerCase()),
                );
                for (const a of activity) {
                  if (a.direction !== "out" || !a.counterparty) continue;
                  const k = a.counterparty.toLowerCase();
                  if (seen.has(k)) continue;
                  seen.add(k);
                  poisonPeers.push({
                    address: a.counterparty,
                    label:
                      bookLabel(a.counterparty) ||
                      `${a.counterparty.slice(0, 6)}…${a.counterparty.slice(-4)}`,
                  });
                }
                return activity
                  .filter((row) =>
                    actFilter === "all" ? true : row.direction === actFilter,
                  )
                  .map((row) => {
                    const parts =
                      !row.method && Number(row.valueEth) !== 0
                        ? fmtActivityAmtParts(row.valueEth)
                        : null;
                    const dirLabel =
                      row.direction === "in"
                        ? "In"
                        : row.direction === "out"
                          ? "Out"
                          : row.direction === "self"
                            ? "Self"
                            : row.direction;
                    const poison = activityPoison(row, poisonPeers);
                    const poisonTitle = poison
                      ? poison.direction === "in"
                        ? `Possible poison${poison.dust ? " dust" : ""} — lookalike of “${poison.label}”. Don’t copy this sender as a recipient.`
                        : `Lookalike of “${poison.label}” — confirm full address before trusting this Out.`
                      : undefined;
                    return (
                      <li
                        key={row.hash}
                        className={
                          poison
                            ? poison.dust
                              ? "activity-row poison dust"
                              : "activity-row poison"
                            : "activity-row"
                        }
                      >
                        <button
                          type="button"
                          className={`activity-dir ${row.direction}`}
                          title={`Copy ${row.hash}`}
                          onClick={() => {
                            void navigator.clipboard.writeText(row.hash);
                          }}
                        >
                          {dirLabel}
                        </button>
                        <span
                          className="activity-amt"
                          title={
                            row.method
                              ? `${row.method} · ${row.valueEth}`
                              : row.valueEth
                          }
                        >
                          {parts ? (
                            <>
                              <span className="activity-int">{parts.int}</span>
                              <span className="activity-frac">
                                {parts.frac != null ? `.${parts.frac}` : ""}
                              </span>
                            </>
                          ) : (
                            <span className="activity-int method">
                              {row.method || "—"}
                            </span>
                          )}
                        </span>
                        <span
                          className={
                            poison ? "activity-poison on" : "activity-poison"
                          }
                          title={poisonTitle}
                          aria-label={poisonTitle}
                        >
                          {poison ? "!" : ""}
                        </span>
                        <span
                          className="activity-when"
                          title={fullWhen(row.timestamp) || undefined}
                        >
                          {shortWhen(row.timestamp)}
                        </span>
                      </li>
                    );
                  });
              })()}
            </ul>
          )}
        </section>

        <section className="card send">
          <div className="action-tabs" role="tablist" aria-label="Actions">
            <button
              type="button"
              id="perch-tab-send"
              role="tab"
              aria-selected={actionTab === "send"}
              aria-controls="perch-panel-send"
              tabIndex={actionTab === "send" ? 0 : -1}
              className={actionTab === "send" ? "tab on" : "tab"}
              onClick={() => setActionTab("send")}
            >
              Send
            </button>
            <button
              type="button"
              id="perch-tab-swap"
              role="tab"
              aria-selected={actionTab === "swap"}
              aria-controls="perch-panel-swap"
              tabIndex={actionTab === "swap" ? 0 : -1}
              className={actionTab === "swap" ? "tab on" : "tab"}
              onClick={() => setActionTab("swap")}
              disabled={chainId !== 369}
              title={
                chainId === 369
                  ? "PulseX V2"
                  : "PulseX swap is mainnet only"
              }
            >
              Swap
            </button>
            <button
              type="button"
              id="perch-tab-sites"
              role="tab"
              aria-selected={actionTab === "sites"}
              aria-controls="perch-panel-sites"
              tabIndex={actionTab === "sites" ? 0 : -1}
              className={actionTab === "sites" ? "tab on" : "tab"}
              onClick={() => setActionTab("sites")}
            >
              Sites
            </button>
            <button
              type="button"
              id="perch-tab-approve"
              role="tab"
              aria-selected={actionTab === "approve"}
              aria-controls="perch-panel-approve"
              tabIndex={actionTab === "approve" ? 0 : -1}
              className={actionTab === "approve" ? "tab on" : "tab"}
              onClick={() => setActionTab("approve")}
              disabled={chainId !== 369 && chainId !== 943}
            >
              Approvals
            </button>
            <button
              type="button"
              id="perch-tab-apps"
              role="tab"
              aria-selected={actionTab === "apps"}
              aria-controls="perch-panel-apps"
              tabIndex={actionTab === "apps" ? 0 : -1}
              className={actionTab === "apps" ? "tab on" : "tab"}
              onClick={() => setActionTab("apps")}
            >
              Apps
            </button>
          </div>

          <div
            id="perch-panel-send"
            role="tabpanel"
            aria-labelledby="perch-tab-send"
            hidden={actionTab !== "send"}
          >
            {actionTab === "send" ? (
              !canSign ? (
                <p className="muted empty-teach">
                  Next: Connect Trezor, then paste a recipient and amount.
                </p>
              ) : (
                <>
                  {chainId === 369 &&
                  balance != null &&
                  balance === 0n &&
                  asset === "PLS" ? (
                    <p className="muted empty-teach">
                      Bag is 0 PLS on mainnet — bridge or receive first (Apps →
                      Bridge), or switch to testnet for lab dust.
                    </p>
                  ) : null}
                  <label className="field">
                    To
                    <span className="amount-row">
                      <input
                        value={to}
                        onChange={(e) => setTo(e.target.value.trim())}
                        placeholder="0x…"
                        spellCheck={false}
                        autoComplete="off"
                        list="perch-address-book"
                      />
                      <button
                        type="button"
                        className="btn ghost gas-pill"
                        onClick={() => {
                          void navigator.clipboard.readText().then(
                            (t) => {
                              const v = t.trim();
                              if (v) setTo(v);
                            },
                            () => setErr("Clipboard paste blocked by browser."),
                          );
                        }}
                      >
                        Paste
                      </button>
                    </span>
                  </label>
                  <datalist id="perch-address-book">
                    {addressBook.map((b) => (
                      <option
                        key={b.address}
                        value={b.address}
                        label={b.label}
                      />
                    ))}
                  </datalist>
                  {addressBook.length ||
                  activity.some((a) => a.counterparty) ? (
                    <div className="book-chips" role="list">
                      {addressBook.slice(0, 8).map((b) => (
                        <button
                          key={b.address}
                          type="button"
                          role="listitem"
                          className={
                            to.toLowerCase() === b.address.toLowerCase()
                              ? "btn gas-pill on"
                              : "btn ghost gas-pill"
                          }
                          onClick={() => setTo(b.address)}
                          title={b.address}
                        >
                          {b.label || shortAddr(b.address)}
                        </button>
                      ))}
                      {Array.from(
                        new Set(
                          activity
                            .filter((a) => a.direction === "out" && a.counterparty)
                            .map((a) => a.counterparty!.toLowerCase()),
                        ),
                      )
                        .filter(
                          (addr) =>
                            !addressBook.some(
                              (b) => b.address.toLowerCase() === addr,
                            ),
                        )
                        .slice(0, 4)
                        .map((addr) => (
                          <button
                            key={addr}
                            type="button"
                            role="listitem"
                            className={
                              to.toLowerCase() === addr
                                ? "btn gas-pill on"
                                : "btn ghost gas-pill"
                            }
                            onClick={() => setTo(addr)}
                            title={addr}
                          >
                            recent {shortAddr(addr)}
                          </button>
                        ))}
                    </div>
                  ) : null}
                  {to && isAddress(to)
                    ? (() => {
                        const poison = lookalikePoison(to, addressBook);
                        return poison ? (
                          <p className="warn-line" role="alert">
                            Lookalike of “{poison.label}” — same start/end,
                            different middle. Clipboard scams do this. Check
                            every character on Trezor.
                          </p>
                        ) : null;
                      })()
                    : null}
                  {to && isAddress(to) ? (
                    isKnownRecipient(to) ? (
                      <p className="muted fee">
                        Address book: {bookLabel(to)}
                      </p>
                    ) : (
                      <div className="row revoke-bulk">
                        <p className="warn-line">New recipient — not in book.</p>
                        <input
                          className="book-label-in"
                          value={bookLabelDraft}
                          onChange={(e) => setBookLabelDraft(e.target.value)}
                          placeholder="label"
                        />
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            setAddressBook(
                              upsertAddressBook(
                                to,
                                bookLabelDraft || shortAddr(to),
                              ),
                            );
                            setBookLabelDraft("");
                          }}
                        >
                          Save
                        </button>
                      </div>
                    )
                  ) : null}
                  <label className="field">
                    Amount
                    <span className="amount-row">
                      <input
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.01"
                        inputMode="decimal"
                      />
                      <button
                        type="button"
                        className="btn ghost gas-pill"
                        disabled={
                          asset === "PLS"
                            ? balance == null
                            : !selectedToken
                        }
                        onClick={onMaxSend}
                      >
                        Max
                      </button>
                    </span>
                  </label>
                  {amount.trim() &&
                  (() => {
                    try {
                      if (asset === "PLS" && balance != null) {
                        return parseEther(amount.trim()) > balance;
                      }
                      if (selectedToken) {
                        const raw = parseTokenAmount(
                          amount.trim(),
                          selectedToken.decimals,
                        );
                        const core = tokenRows.find(
                          (r) =>
                            r.token.address.toLowerCase() ===
                            selectedToken.address.toLowerCase(),
                        );
                        if (core) return raw > core.raw;
                        const custom = customRows.find(
                          (r) =>
                            r.token.address.toLowerCase() ===
                            selectedToken.address.toLowerCase(),
                        );
                        if (custom) return raw > custom.raw;
                        const extra = fullBag?.tokens.find(
                          (t) =>
                            t.address.toLowerCase() ===
                            selectedToken.address.toLowerCase(),
                        );
                        if (extra) return raw > extra.raw;
                      }
                      return false;
                    } catch {
                      return false;
                    }
                  })() ? (
                    <p className="warn-line">Amount exceeds balance.</p>
                  ) : null}
                  <details className="gas-details">
                    <summary>
                      Nonce
                      {nonceHint != null ? ` (pending ${nonceHint})` : ""}
                    </summary>
                    <label className="field">
                      Override
                      <input
                        value={nonceOverride}
                        onChange={(e) => setNonceOverride(e.target.value)}
                        placeholder="auto"
                        inputMode="numeric"
                        autoComplete="off"
                      />
                    </label>
                    <p className="muted fee">
                      Leave blank for next pending nonce. Only set this if you
                      know why (stuck queue / replace).
                    </p>
                  </details>
                  {feeHint ? <p className="muted fee">{feeHint}</p> : null}
                  <div className="gas-speed" role="group" aria-label="Send speed">
                    <span className="gas-speed-label">Speed</span>
                    {(
                      [
                        ["normal", "Normal"],
                        ["faster", "Faster"],
                        ["fastest", "Fastest"],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={
                          gasSpeed === id ? "btn gas-pill on" : "btn ghost gas-pill"
                        }
                        disabled={!feePreview && id !== "normal"}
                        onClick={() => applyGasSpeed(feePreview, id)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="muted fee gas-explain">
                    {gasSpeed === "normal"
                      ? "Normal uses the network quote. Want it mined sooner? Pick Faster — that raises the priority tip validators earn."
                      : gasSpeed === "faster"
                        ? `Priority tip raised (~1.5×). You’re paying validators more to pick you sooner.${
                            tipGwei
                              ? ` Tip ${tipGwei} ${gasUnitLabel(chainId)}.`
                              : ""
                          }`
                        : `Highest tip (~2×). Use when a tx is urgent or the mempool is busy.${
                            tipGwei
                              ? ` Tip ${tipGwei} ${gasUnitLabel(chainId)}.`
                              : ""
                          }`}
                  </p>
                  <details className="gas-details">
                    <summary>Advanced ({gasUnitLabel(chainId)})</summary>
                    <div className="gas-grid">
                      <label className="field">
                        Priority tip
                        <input
                          value={tipGwei}
                          onChange={(e) => {
                            setTipGwei(e.target.value);
                            setGasSpeed(
                              e.target.value.trim() ? "faster" : "normal",
                            );
                          }}
                          placeholder="auto"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Priority tip in ${gasUnitLabel(chainId)}`}
                        />
                      </label>
                      <label className="field">
                        Max fee ceiling
                        <input
                          value={maxFeeGwei}
                          onChange={(e) => {
                            setMaxFeeGwei(e.target.value);
                            if (e.target.value.trim()) setGasSpeed("faster");
                          }}
                          placeholder="auto"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Max fee ceiling in ${gasUnitLabel(chainId)}`}
                        />
                      </label>
                    </div>
                    <p className="muted fee">
                      Tip = what validators get to include you. Max fee = hard
                      ceiling (base fee + tip). Blank = network estimate.
                      {chainId === 369 || chainId === 943
                        ? " Pulse gas is in beats — not gwei."
                        : ""}
                    </p>
                  </details>
                  {to && isAddress(to) ? (
                    <TxExplain
                      chainId={chainId}
                      account={session?.address ?? null}
                      to={
                        asset === "PLS"
                          ? to
                          : (selectedToken?.address as string) || to
                      }
                      data={
                        asset === "PLS"
                          ? "0x"
                          : selectedToken
                            ? encodeErc20Transfer(
                                to as Address,
                                parseTokenAmount(
                                  amount || "0",
                                  selectedToken.decimals,
                                ),
                              )
                            : "0x"
                      }
                      valueWei={
                        asset === "PLS" && amount.trim()
                          ? (() => {
                              try {
                                return parseEther(amount.trim());
                              } catch {
                                return 0n;
                              }
                            })()
                          : 0n
                      }
                      rpc={effectiveRpc}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="btn"
                    disabled={
                      busy ||
                      !to ||
                      !amount ||
                      (chainId === 369 &&
                        !mainnetSendAcked &&
                        !mainnetSendAck) ||
                      (() => {
                        try {
                          if (asset === "PLS" && balance != null) {
                            return parseEther(amount.trim()) > balance;
                          }
                          if (selectedToken) {
                            const raw = parseTokenAmount(
                              amount.trim(),
                              selectedToken.decimals,
                            );
                            const have =
                              tokenRows.find(
                                (r) =>
                                  r.token.address.toLowerCase() ===
                                  selectedToken.address.toLowerCase(),
                              )?.raw ??
                              customRows.find(
                                (r) =>
                                  r.token.address.toLowerCase() ===
                                  selectedToken.address.toLowerCase(),
                              )?.raw ??
                              fullBag?.tokens.find(
                                (t) =>
                                  t.address.toLowerCase() ===
                                  selectedToken.address.toLowerCase(),
                              )?.raw;
                            return have != null && raw > have;
                          }
                          return false;
                        } catch {
                          return false;
                        }
                      })()
                    }
                    onClick={onSend}
                  >
                    {busy ? "Signing…" : "Sign & send"}
                  </button>
                  {chainId === 369 && !mainnetSendAcked ? (
                    <label className="blind-ack">
                      <input
                        type="checkbox"
                        checked={mainnetSendAck}
                        onChange={(e) => setMainnetSendAck(e.target.checked)}
                      />
                      <span>
                        First mainnet send — real PLS/tokens leave this wallet.
                        I will read the recipient and amount on Trezor.
                      </span>
                    </label>
                  ) : null}
                  <details className="gas-details">
                    <summary>Custom contract call</summary>
                    <label className="field">
                      Contract
                      <input
                        value={callTo}
                        onChange={(e) => setCallTo(e.target.value.trim())}
                        placeholder="0x…"
                        spellCheck={false}
                      />
                    </label>
                    <label className="field">
                      Calldata (hex)
                      <input
                        value={callData}
                        onChange={(e) => setCallData(e.target.value.trim())}
                        placeholder="0x…"
                        spellCheck={false}
                      />
                    </label>
                    <p className="muted">
                      Payable value uses Amount above (e.g. WPLS{" "}
                      <code>deposit()</code> = <code>0xd0e30db0</code>).
                    </p>
                    <p className="warn-line">
                      Power / rescue only — read every byte on Trezor. Blind
                      selectors need extra care.
                    </p>
                    {callTo && isAddress(callTo) ? (
                      <TxExplain
                        chainId={chainId}
                        account={session?.address ?? null}
                        to={callTo}
                        data={callData.trim() || "0x"}
                        rpc={effectiveRpc}
                      />
                    ) : null}
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={busy || !callTo}
                      onClick={onCustomCall}
                    >
                      Sign call
                    </button>
                  </details>
                  {chainId === 369 && mainnetSendAcked ? (
                    <p className="warn-line">Mainnet — real funds.</p>
                  ) : null}
                  {lastTx ? (
                    <div className="stuck-box">
                      <p>
                        Tx{" "}
                        <a
                          className="link"
                          href={explorerTxUrl(chainId, lastTx)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {shortAddr(lastTx)}
                        </a>
                        {txStatus ? (
                          <span className="muted"> · {txStatus}</span>
                        ) : null}
                      </p>
                      <div className="row">
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => {
                            void navigator.clipboard.writeText(lastTx).then(
                              () => {
                                setHashCopied(true);
                                window.setTimeout(
                                  () => setHashCopied(false),
                                  1500,
                                );
                              },
                            );
                          }}
                        >
                          {hashCopied ? "Copied" : "Copy hash"}
                        </button>
                        {txStatus === "confirmed" ||
                        txStatus === "reverted" ? (
                          <button
                            type="button"
                            className="btn ghost"
                            onClick={() => {
                              setLastTx(null);
                              setTxStatus(null);
                            }}
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                      {txStatus === "pending" || txStatus === "timeout" ? (
                        <>
                          <p className="muted fee">
                            Still pending? Speed up = same transfer, +25% tip —
                            like bumping priority after you already sent. Cancel
                            = replace it with a 0-value self-send so the nonce
                            clears.
                          </p>
                          <div className="row">
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={busy}
                              onClick={onSpeedUp}
                            >
                              Speed up (+25%)
                            </button>
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={busy}
                              onClick={onCancelStuck}
                            >
                              Cancel stuck
                            </button>
                          </div>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )
            ) : null}
          </div>

          <div
            id="perch-panel-swap"
            role="tabpanel"
            aria-labelledby="perch-tab-swap"
            hidden={actionTab !== "swap"}
          >
            {actionTab === "swap" ? (
              chainId !== 369 ? (
                <p className="muted">PulseX swap is mainnet only.</p>
              ) : !canSign ? (
                <p className="muted">Connect Trezor to swap.</p>
              ) : (
                <>
                  <div className="swap-grid">
                    <label className="field">
                      From
                      <select
                        value={String(swapIn)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSwapIn(v === "PLS" ? "PLS" : (v as Address));
                          setSwapQuote(null);
                        }}
                      >
                        {SWAP_FACE.map((o) => (
                          <option key={String(o.id)} value={String(o.id)}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      To
                      <select
                        value={String(swapOut)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSwapOut(v === "PLS" ? "PLS" : (v as Address));
                          setSwapQuote(null);
                        }}
                      >
                        {SWAP_FACE.map((o) => (
                          <option key={`out-${String(o.id)}`} value={String(o.id)}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Amount in
                      <input
                        value={swapAmt}
                        onChange={(e) => {
                          setSwapAmt(e.target.value);
                          setSwapQuote(null);
                        }}
                        placeholder="0.0"
                        inputMode="decimal"
                      />
                    </label>
                  </div>
                  <div className="gas-grid swap-controls">
                    <label className="field">
                      Slippage %
                      <input
                        value={(slipBps / 100).toFixed(2)}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n) || n < 0) return;
                          setSlipBps(Math.round(n * 100));
                          setSwapQuote(null);
                        }}
                        inputMode="decimal"
                      />
                    </label>
                    <label className="field">
                      Deadline (min)
                      <input
                        value={String(deadlineMin)}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n) || n < 1) return;
                          setDeadlineMin(Math.floor(n));
                        }}
                        inputMode="numeric"
                      />
                    </label>
                  </div>
                  <div className="row">
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={swapQuoteBusy || !swapAmt.trim()}
                      onClick={refreshSwapQuote}
                    >
                      {swapQuoteBusy ? "Quoting…" : "Quote"}
                    </button>
                    {swapNeedApprove ? (
                      <button
                        type="button"
                        className="btn ghost"
                        disabled={busy}
                        onClick={onSwapApproveRouter}
                      >
                        Approve PulseX
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn"
                      disabled={
                        busy || !swapQuote || swapNeedApprove || swapQuoteBusy
                      }
                      onClick={onSwap}
                    >
                      {busy ? "Signing…" : "Sign swap"}
                    </button>
                  </div>
                  {swapQuote ? (
                    <p className="muted fee">
                      ~{formatUnits(
                        swapQuote.amountOut,
                        swapTokenMeta(369, swapOut)?.decimals ?? 18,
                      )}{" "}
                      {swapAssetLabel(swapOut)} out · min{" "}
                      {formatUnits(
                        swapQuote.amountOutMin,
                        swapTokenMeta(369, swapOut)?.decimals ?? 18,
                      )}{" "}
                      (slip {(slipBps / 100).toFixed(2)}%) · PulseX V2 · ends
                      in {deadlineMin}m
                    </p>
                  ) : (
                    <p className="muted fee">
                      Quote uses PulseX V2. Token→token hops via WPLS. Confirm
                      path on Trezor. Prefer Sites for the full PulseX UI:{" "}
                      <a
                        className="link"
                        href="https://ipfs.app.pulsex.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        ipfs.app.pulsex.com
                      </a>
                      .
                    </p>
                  )}
                  {chainId === 369 ? (
                    <p className="warn-line">Mainnet — real funds.</p>
                  ) : null}
                </>
              )
            ) : null}
          </div>

          <div
            id="perch-panel-sites"
            role="tabpanel"
            aria-labelledby="perch-tab-sites"
            hidden={actionTab !== "sites"}
          >
            {actionTab === "sites" ? (
              <WcPanel
                embedded
                address={canSign && session ? session.address : null}
                derivationIndex={session?.derivationIndex ?? 0}
                chainId={chainId}
                initialUri={deepWcUri}
                onSwitchChain={(id) => {
                  setChainId(id);
                  setAsset("PLS");
                }}
                onError={(msg) => setErr(msg)}
              />
            ) : null}
          </div>

          <div
            id="perch-panel-approve"
            role="tabpanel"
            aria-labelledby="perch-tab-approve"
            hidden={actionTab !== "approve"}
          >
            {actionTab === "approve" ? (
              !active ? (
                <p className="muted">Connect to load approvals.</p>
              ) : (
                <>
                  <div className="row nft-toolbar">
                    <p className="muted nft-status">
                      {apprBusy
                        ? "Deep scan — history, bag tokens, Approval logs…"
                        : apprErr
                          ? apprErr
                          : approvals.length
                            ? `${approvals.length} open approval${approvals.length === 1 ? "" : "s"}`
                            : "No open allowances in coverage."}
                    </p>
                    <button
                      type="button"
                      className="btn ghost"
                      disabled={apprBusy}
                      onClick={refreshApprovals}
                    >
                      {apprBusy ? "…" : "Scan"}
                    </button>
                  </div>
                  {approvals.length ? (
                    <>
                      <div className="row revoke-bulk">
                        <label className="hide-zero">
                          <input
                            type="checkbox"
                            checked={
                              revokeSel.size > 0 &&
                              revokeSel.size === approvals.length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setRevokeSel(
                                  new Set(approvals.map(approvalKey)),
                                );
                              } else {
                                setRevokeSel(new Set());
                              }
                            }}
                          />
                          Select all
                        </label>
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={busy || !canSign || !revokeSel.size}
                          onClick={onBulkRevoke}
                        >
                          Revoke selected ({revokeSel.size})
                        </button>
                      </div>
                      <ul className="approval-list">
                        {approvals.map((row) => {
                          const k = approvalKey(row);
                          return (
                            <li key={k} className="approval-row">
                              <label className="approval-pick">
                                <input
                                  type="checkbox"
                                  checked={revokeSel.has(k)}
                                  onChange={(e) => {
                                    setRevokeSel((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(k);
                                      else next.delete(k);
                                      return next;
                                    });
                                  }}
                                />
                                <span className="approval-copy">
                                  <span className="approval-sym">
                                    {row.symbol}
                                  </span>
                                  <span className="muted">
                                    → {row.spenderName} · {row.allowanceLabel}
                                  </span>
                                  <span className="muted approval-addr">
                                    {shortAddr(row.spender)}
                                  </span>
                                </span>
                              </label>
                              <button
                                type="button"
                                className="btn ghost"
                                disabled={busy || !canSign}
                                onClick={() => onRevoke(row)}
                                title={
                                  canSign
                                    ? "Set allowance to 0 on Trezor"
                                    : "Connect Trezor to revoke"
                                }
                              >
                                Revoke
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </>
                  ) : null}
                  <p className="muted fee">
                    {apprMeta
                      ? `Checked ${apprMeta.tokensChecked} tokens · ${apprMeta.pairsChecked} pairs · via ${apprMeta.sources.join(" + ")}. `
                      : ""}
                    Live allowance on your RPC. Revoke = approve(spender, 0) on
                    Trezor.
                  </p>

                  {nftApprovals.length ? (
                    <>
                      <h3 className="approve-grant-h">NFT operators</h3>
                      <ul className="approval-list">
                        {nftApprovals.map((row) => (
                          <li
                            key={`${row.collection}-${row.operator}`}
                            className="approval-row"
                          >
                            <div className="approval-copy">
                              <span className="approval-sym">
                                {row.collectionName}
                              </span>
                              <span className="muted">
                                → operator {shortAddr(row.operator)}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn ghost"
                              disabled={busy || !canSign}
                              onClick={() => onRevokeNft(row)}
                            >
                              Revoke
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  <h3 className="approve-grant-h">Grant</h3>
                  {!canSign ? (
                    <p className="muted">Connect Trezor to grant approve.</p>
                  ) : (
                    <>
                      <p className="muted">
                        Token:{" "}
                        <strong>
                          {selectedToken
                            ? selectedToken.symbol
                            : "pick from balances"}
                        </strong>
                      </p>
                      <label className="field">
                        Spender
                        <input
                          value={spender}
                          onChange={(e) => setSpender(e.target.value.trim())}
                          placeholder="0x… or PulseX router"
                          spellCheck={false}
                        />
                      </label>
                      <div className="book-chips" role="list">
                        {KNOWN_SPENDERS.map((s) => (
                          <button
                            key={s.address}
                            type="button"
                            role="listitem"
                            className={
                              spender.toLowerCase() ===
                              s.address.toLowerCase()
                                ? "btn gas-pill on"
                                : "btn ghost gas-pill"
                            }
                            onClick={() => setSpender(s.address)}
                            title={s.address}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                      {spender && isAddress(spender) ? (
                        <p
                          className={
                            KNOWN_SPENDERS.some(
                              (s) =>
                                s.address.toLowerCase() ===
                                spender.toLowerCase(),
                            )
                              ? "muted fee"
                              : "warn-line"
                          }
                        >
                          Clear-sign: spender {shortAddr(spender)}
                          {KNOWN_SPENDERS.find(
                            (s) =>
                              s.address.toLowerCase() ===
                              spender.toLowerCase(),
                          )
                            ? ` · ${
                                KNOWN_SPENDERS.find(
                                  (k) =>
                                    k.address.toLowerCase() ===
                                    spender.toLowerCase(),
                                )!.name
                              }`
                            : " · unknown — read Trezor"}
                          {bookLabel(spender)
                            ? ` · book: ${bookLabel(spender)}`
                            : ""}
                        </p>
                      ) : null}
                      <label className="field">
                        Amount
                        <input
                          value={approveAmt}
                          onChange={(e) => setApproveAmt(e.target.value)}
                          placeholder="exact amount"
                          inputMode="decimal"
                        />
                      </label>
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          disabled={busy || !spender || !selectedToken}
                          onClick={() => onApprove(false)}
                        >
                          Approve amount
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          disabled={
                            busy ||
                            !spender ||
                            !selectedToken ||
                            !approveMaxAck
                          }
                          onClick={() => onApprove(true)}
                        >
                          Approve max
                        </button>
                      </div>
                      <label className="blind-ack">
                        <input
                          type="checkbox"
                          checked={approveMaxAck}
                          onChange={(e) => setApproveMaxAck(e.target.checked)}
                        />
                        <span>
                          Unlimited approve — this spender can drain the whole
                          token balance until I revoke. I will read the Trezor
                          screen.
                        </span>
                      </label>
                      <p className="warn-line">
                        Prefer exact amount when you can. Max = unlimited.
                      </p>
                    </>
                  )}
                </>
              )
            ) : null}
          </div>

          <div
            id="perch-panel-apps"
            role="tabpanel"
            aria-labelledby="perch-tab-apps"
            hidden={actionTab !== "apps"}
          >
            {actionTab === "apps" ? (
              <div className="apps-grid">
                <div className="apps-card">
                  <h3>ProveX</h3>
                  <p className="muted fee">
                    Dollar-linked corridor. Use bridged USDC only — not the
                    inherited fork copy.
                  </p>
                  {chainId === 369 && active ? (
                    <p className="muted">
                      Bridged USDC:{" "}
                      {tokenRows.find(
                        (r) =>
                          r.token.address.toLowerCase() ===
                          BRIDGED_USDC.toLowerCase(),
                      )?.formatted ?? "—"}
                      {tokenRows.some(
                        (r) =>
                          r.token.address.toLowerCase() ===
                            INHERITED_USDC.toLowerCase() && r.raw > 0n,
                      ) ? (
                        <span className="tok-tag bad">
                          {" "}
                          inherited USDC also in bag — don’t treat as $1
                        </span>
                      ) : null}
                    </p>
                  ) : (
                    <p className="muted empty-teach">
                      Connect on Pulse mainnet to see bridged USDC.
                    </p>
                  )}
                  <a
                    className="btn ghost"
                    href="https://app.provex.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open ProveX
                  </a>
                </div>
                <div className="apps-card">
                  <h3>Pulse Bridge</h3>
                  <p className="muted fee">
                    Bridge in → then receive here. After Bridge, copy your Perch
                    address (or QR) as the destination.
                  </p>
                  <a
                    className="btn ghost"
                    href="https://bridge.pulsechain.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Bridge
                  </a>
                </div>
                <div className="apps-card">
                  <h3>Migrate from ETH</h3>
                  <p className="muted fee">
                    Same BIP44 path as Suite “Ethereum #1”. Connect the same
                    Trezor account → Load full bag on Pulse → revoke old ETH
                    allowances you don’t need.
                  </p>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setActionTab("approve")}
                    disabled={chainId !== 369 && chainId !== 943}
                  >
                    Open Approvals
                  </button>
                </div>
                <div className="apps-card">
                  <h3>ZKX Wallet</h3>
                  <p className="muted fee">
                    Soft + privacy (RAILGUN). Optional HW attach — shield is
                    soft-only. HWW Pulse bag stays Perch + Trezor.
                  </p>
                  <a
                    className="btn ghost"
                    href="https://zkxwallet.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open ZKX
                  </a>
                </div>
                <div className="apps-card">
                  <h3>Internet Money</h3>
                  <p className="muted fee">
                    Soft Pulse mobile / Chrome. Not a Trezor path — use for
                    phone daily, not serious HWW.
                  </p>
                  <a
                    className="btn ghost"
                    href="https://internetmoney.io"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Internet Money
                  </a>
                </div>
                <div className="apps-card">
                  <h3>Tip (mobile soft)</h3>
                  <p className="muted fee">
                    Soft wallet companion for on-the-go. HWW stays Perch +
                    Trezor.
                  </p>
                  <a
                    className="btn ghost"
                    href="https://github.com/ihelpmaybe/Tip-wallet"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tip wallet
                  </a>
                </div>
                {deeplinks.defi
                  .filter((d) =>
                    [
                      "piteas",
                      "liquid-loans",
                      "phiat",
                      "9mm",
                      "phux",
                      "liberty-swap",
                    ].includes(d.id),
                  )
                  .map((d) => (
                    <div className="apps-card" key={d.id}>
                      <h3>{d.name}</h3>
                      <p className="muted fee">
                        {(d as { role?: string }).role || "Pulse DeFi"} · open
                        via Sites (WalletConnect) for Trezor sign.
                      </p>
                      <a
                        className="btn ghost"
                        href={d.app}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open {d.name}
                      </a>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <footer className="core-footer">
        <div className="core-footer-links">
          {FOOTER_CORE_IDS.map((id) => {
            const item = deeplinks.core.find((c) => c.id === id);
            if (!item) return null;
            // Footer = mainnet kit links. Don't follow lab/testnet chainId for PulseScan.
            const href =
              id === "scan" && active
                ? explorerAddressUrl(369, active.address)
                : item.app || item.url;
            if (!href) return null;
            return (
              <a
                key={id}
                className="link"
                href={href}
                target="_blank"
                rel="noreferrer"
              >
                {item.name}
              </a>
            );
          })}
        </div>
        <p className="core-footer-boast">
          {t("noCollect")}
        </p>
      </footer>
    </div>
  );
}
