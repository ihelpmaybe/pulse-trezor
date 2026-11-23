/**
 * Embeddable Pulse × Trezor kernel: connect · balances · send · approve.
 * Host apps mount this; standalone App is only a thin shell.
 * Device wire = Connect 10 → Trezor Suite (not a fake HD).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatEther,
  formatGwei,
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
  loadAddressBook,
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
  type ActivityRow,
} from "./chain/activity";
import {
  deadEndNativeSend,
  deadEndTokenTransfer,
} from "./chain/deadEndRecipients";
import {
  ACCOUNT_COUNT_MAX,
  ACCOUNT_COUNT_MIN,
  clampAccountCount,
  shortAddr,
  shortNative,
} from "./ui/faceFormat";
import {
  addCustomToken,
  fetchCustomBalances,
  loadCustomTokens,
  type CustomToken,
} from "./chain/customTokens";
import {
  fetchApprovalInventory,
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
import { loadFavorites } from "./chain/favorites";
import { fetchTokenUsdHints, type PriceHint } from "./chain/prices";
import {
  buildWatchRegistryExport,
  parseWatchImportJson,
} from "./chain/watchImport";
import { decodeSyncPayload } from "./chain/syncPair";
import { FaqModal } from "./ui/FaqModal";
import { CoreFooter } from "./ui/CoreFooter";
import { AddrParts } from "./ui/AddrParts";
import { HexStakeMark } from "./ui/HexStakeMark";
import { AppsPanel } from "./ui/AppsPanel";
import { ActivityPanel } from "./ui/ActivityPanel";
import { SwapPanel } from "./ui/SwapPanel";
import { SendPanel } from "./ui/SendPanel";
import { BagPanel } from "./ui/BagPanel";
import { ApprovePanel } from "./ui/ApprovePanel";
import { SettingsModal } from "./ui/SettingsModal";
import { trimGwei } from "./ui/swapFace";
import {
  type A11yPrefs,
  type ThemePref,
  type Session,
  applyA11y,
  applyTheme,
  loadA11y,
  loadAccountCount,
  loadAccountIndex,
  loadAccountList,
  loadFirstMainnetSendAcked,
  loadInjectEth,
  loadPrivacyHide,
  loadRpcHealthMs,
  loadRpcOverride,
  loadTheme,
  loadWatch,
  saveA11y,
  saveAccountCount,
  saveAccountIndex,
  saveAccountList,
  saveFirstMainnetSendAcked,
  savePrivacyHide,
  saveRpcOverride,
  saveWatch,
} from "./ui/deskStorage";
import {
  loadHexModule,
  loadMascot,
} from "./ui/modules";
import { t } from "./i18n/en";
import {
  PULSEX_V2_ROUTER,
  preparePulsexSwap,
  quotePulsexSwap,
  routerAllowance,
  type SwapAsset,
  type SwapQuote,
} from "./chain/pulsex";
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
  const [faqOpen, setFaqOpen] = useState(false);
  const [rpcCustomMode, setRpcCustomMode] = useState(false);
  const [a11y, setA11y] = useState<A11yPrefs>(() => loadA11y());
  const [privacyHide, setPrivacyHide] = useState(() => loadPrivacyHide());
  const [theme, setTheme] = useState<ThemePref>(() => loadTheme());
  /** Optional HEX stakes UI (Stakes tab / marks) — Settings modules. */
  const [hexModule, setHexModule] = useState(() => loadHexModule());
  /** Corner anime mascot — Settings → Display; off by default. */
  const [mascotOn, setMascotOn] = useState(() => loadMascot());
  const [favs, setFavs] = useState<string[]>(() => loadFavorites(369));
  const [callData, setCallData] = useState("");
  const [callTo, setCallTo] = useState("");
  const [customCallOpen, setCustomCallOpen] = useState(false);
  const [actLimit, setActLimit] = useState(24);
  const [priceHints, setPriceHints] = useState<PriceHint[]>([]);
  const [watchImportBusy, setWatchImportBusy] = useState(false);
  const [deepWcUri, setDeepWcUri] = useState<string | null>(null);
  const [injectEth, setInjectEth] = useState(() => loadInjectEth());
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
  const [mainnetSendAcked, setMainnetSendAcked] = useState(() => loadFirstMainnetSendAcked());
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

  const refreshActivity = useCallback(
    async (addr: Address, cid: DeskChainId, limit = actLimit) => {
      setActBusy(true);
      setActErr(null);
      try {
        const rows = await fetchAddressActivity(cid, addr, limit);
        setActivity(rows);
      } catch (e) {
        setActivity([]);
        setActErr(e instanceof Error ? e.message : String(e));
      } finally {
        setActBusy(false);
      }
    },
    [actLimit],
  );

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
    if (asset === "PLS") {
      const dead = deadEndNativeSend(to, "0x");
      if (dead?.block) {
        setErr(dead.reason);
        return;
      }
    } else if (selectedToken) {
      const dead = deadEndTokenTransfer(selectedToken.address, to);
      if (dead?.block) {
        setErr(dead.reason);
        return;
      }
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
            saveFirstMainnetSendAcked();
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
        className={faqOpen ? "btn ghost rpc-pop-btn on" : "btn ghost rpc-pop-btn"}
        aria-haspopup="dialog"
        aria-expanded={faqOpen}
        aria-label="Frequently asked questions"
        title="FAQ — how to use Perch"
        onClick={() => {
          setSettingsOpen(false);
          setFaqOpen(true);
        }}
      >
        <span className="faq-btn-label" aria-hidden="true">
          ?
        </span>
      </button>
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
        <SettingsModal
          panelRef={settingsRef}
          onClose={() => setSettingsOpen(false)}
          onOpenFaq={() => {
            setSettingsOpen(false);
            setFaqOpen(true);
          }}
          suiteChannel={suiteChannel}
          deviceHints={deviceHints}
          exportWatchJson={exportWatchJson}
          exportBagSnapshot={exportBagSnapshot}
          active={active}
          watchImportBusy={watchImportBusy}
          onImportWatchFile={onImportWatchFile}
          accountList={accountList}
          watch={watch}
          session={session}
          chainId={chainId}
          deviceId={deviceId}
          applyWatchImportText={applyWatchImportText}
          setWatchImportBusy={setWatchImportBusy}
          rpcSelectValue={rpcSelectValue}
          rpcOptions={rpcOptions}
          defaultRpcUrl={defaultRpcUrl}
          activeRpcUrl={activeRpcUrl}
          rpcDraft={rpcDraft}
          setRpcDraft={setRpcDraft}
          setRpcCustomMode={setRpcCustomMode}
          applyRpc={applyRpc}
          onSaveRpc={onSaveRpc}
          rpcHealthMs={rpcHealthMs}
          setRpcHealthMs={setRpcHealthMs}
          theme={theme}
          setTheme={setTheme}
          mascotOn={mascotOn}
          setMascotOn={setMascotOn}
          hexModule={hexModule}
          setHexModule={setHexModule}
          bagTab={bagTab}
          setBagTab={setBagTab}
          privacyHide={privacyHide}
          togglePrivacyHide={togglePrivacyHide}
          a11y={a11y}
          patchA11y={patchA11y}
          injectEth={injectEth}
          setInjectEth={setInjectEth}
        />
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

        <BagPanel
          active={active}
          chainId={chainId}
          pack={pack}
          bagTab={bagTab}
          setBagTab={setBagTab}
          hexModule={hexModule}
          acctHexStakes={acctHexStakes}
          balBusy={balBusy}
          balance={balance}
          tokenRows={tokenRows}
          fullBag={fullBag}
          hideZeroBal={hideZeroBal}
          setHideZeroBal={setHideZeroBal}
          favs={favs}
          setFavs={setFavs}
          priceHints={priceHints}
          asset={asset}
          setAsset={setAsset}
          customRows={customRows}
          importAddr={importAddr}
          setImportAddr={setImportAddr}
          importBusy={importBusy}
          setImportBusy={setImportBusy}
          setErr={setErr}
          effectiveRpc={effectiveRpc}
          refreshBalances={refreshBalances}
          bagBusy={bagBusy}
          onLoadFullBag={onLoadFullBag}
          nfts={nfts}
          nftsTruncated={nftsTruncated}
          nftBusy={nftBusy}
          nftErr={nftErr}
          refreshNfts={refreshNfts}
        />

        <ActivityPanel
          active={active}
          session={!!session}
          chainId={chainId}
          activity={activity}
          actBusy={actBusy}
          actErr={actErr}
          actFilter={actFilter}
          setActFilter={setActFilter}
          actLimit={actLimit}
          setActLimit={setActLimit}
          refreshActivity={refreshActivity}
          addressBook={addressBook}
          lastTx={lastTx}
          txStatus={txStatus}
          busy={busy}
          onSpeedUp={onSpeedUp}
          onCancelStuck={onCancelStuck}
        />

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
              <SendPanel
                canSign={canSign}
                chainId={chainId}
                sessionAddress={session?.address ?? null}
                balance={balance}
                asset={asset}
                to={to}
                setTo={setTo}
                setErr={setErr}
                addressBook={addressBook}
                setAddressBook={setAddressBook}
                bookLabelDraft={bookLabelDraft}
                setBookLabelDraft={setBookLabelDraft}
                activity={activity}
                amount={amount}
                setAmount={setAmount}
                selectedToken={selectedToken}
                tokenRows={tokenRows}
                customRows={customRows}
                fullBag={fullBag}
                onMaxSend={onMaxSend}
                nonceHint={nonceHint}
                nonceOverride={nonceOverride}
                setNonceOverride={setNonceOverride}
                feeHint={feeHint}
                feePreview={feePreview}
                gasSpeed={gasSpeed}
                setGasSpeed={setGasSpeed}
                tipGwei={tipGwei}
                setTipGwei={setTipGwei}
                maxFeeGwei={maxFeeGwei}
                setMaxFeeGwei={setMaxFeeGwei}
                applyGasSpeed={applyGasSpeed}
                effectiveRpc={effectiveRpc}
                busy={busy}
                mainnetSendAcked={mainnetSendAcked}
                mainnetSendAck={mainnetSendAck}
                setMainnetSendAck={setMainnetSendAck}
                onSend={onSend}
                customCallOpen={customCallOpen}
                setCustomCallOpen={setCustomCallOpen}
                callTo={callTo}
                setCallTo={setCallTo}
                callData={callData}
                setCallData={setCallData}
                onCustomCall={onCustomCall}
                lastTx={lastTx}
                setLastTx={setLastTx}
                txStatus={txStatus}
                setTxStatus={setTxStatus}
                hashCopied={hashCopied}
                setHashCopied={setHashCopied}
                onSpeedUp={onSpeedUp}
                onCancelStuck={onCancelStuck}
              />
            ) : null}
          </div>

          <div
            id="perch-panel-swap"
            role="tabpanel"
            aria-labelledby="perch-tab-swap"
            hidden={actionTab !== "swap"}
          >
            {actionTab === "swap" ? (
              <SwapPanel
                canSign={canSign}
                chainId={chainId}
                busy={busy}
                swapIn={swapIn}
                setSwapIn={setSwapIn}
                swapOut={swapOut}
                setSwapOut={setSwapOut}
                swapAmt={swapAmt}
                setSwapAmt={setSwapAmt}
                slipBps={slipBps}
                setSlipBps={setSlipBps}
                deadlineMin={deadlineMin}
                setDeadlineMin={setDeadlineMin}
                swapQuote={swapQuote}
                setSwapQuote={setSwapQuote}
                swapQuoteBusy={swapQuoteBusy}
                swapNeedApprove={swapNeedApprove}
                refreshSwapQuote={refreshSwapQuote}
                onSwapApproveRouter={onSwapApproveRouter}
                onSwap={onSwap}
              />
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
              <ApprovePanel
                active={!!active}
                canSign={canSign}
                busy={busy}
                approvals={approvals}
                apprBusy={apprBusy}
                apprErr={apprErr}
                apprMeta={apprMeta}
                revokeSel={revokeSel}
                setRevokeSel={setRevokeSel}
                approvalKey={approvalKey}
                refreshApprovals={refreshApprovals}
                onBulkRevoke={onBulkRevoke}
                onRevoke={onRevoke}
                nftApprovals={nftApprovals}
                onRevokeNft={onRevokeNft}
                selectedToken={selectedToken}
                spender={spender}
                setSpender={setSpender}
                approveAmt={approveAmt}
                setApproveAmt={setApproveAmt}
                approveMaxAck={approveMaxAck}
                setApproveMaxAck={setApproveMaxAck}
                onApprove={onApprove}
              />
            ) : null}
          </div>

          <div
            id="perch-panel-apps"
            role="tabpanel"
            aria-labelledby="perch-tab-apps"
            hidden={actionTab !== "apps"}
          >
            {actionTab === "apps" ? (
              <AppsPanel
                chainId={chainId}
                active={!!active}
                tokenRows={tokenRows}
                onActionTab={setActionTab}
                onOpenCustomCall={() => {
                  setCustomCallOpen(true);
                  setActionTab("send");
                }}
              />
            ) : null}
          </div>
        </section>
      </div>

      <CoreFooter activeAddress={active?.address ?? null} />
      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      {mascotOn ? (
        <img
          className="mascot"
          src="/mascot-perch.png?v=5"
          alt=""
          width={512}
          height={768}
          decoding="async"
        />
      ) : null}
    </div>
  );
}
