/**
 * Embeddable Pulse × Trezor kernel: connect · balances · send · approve.
 * Host apps mount this; standalone App is only a thin shell.
 * Device wire = Connect 10 → Trezor Suite (not a fake HD).
 */
import { useEffect, useRef, useState } from "react";
import { useDeskConnect } from "./hooks/useDeskConnect";
import { useDeskBag } from "./hooks/useDeskBag";
import { useDeskSend } from "./hooks/useDeskSend";
import { useDeskApprovals } from "./hooks/useDeskApprovals";
import { useDeskSwap } from "./hooks/useDeskSwap";
import { useDeskWatch } from "./hooks/useDeskWatch";
import { useDeskRpc } from "./hooks/useDeskRpc";
import { useDeskInject } from "./hooks/useDeskInject";
import {
  type Address,
} from "viem";
import {
  makePublicClient,
  chainLabel,
  type DeskChainId,
  type RpcOverride,
} from "./chain/client";
import {
  loadAddressBook,
  type BookEntry,
} from "./chain/addressBook";
import { type ScanToken } from "./chain/portfolio";
import { type PackToken } from "./chain/tokens";
import { reconcileErrWithSuite } from "./trezor/errors";
import { WcPanel } from "./wc/WcPanel";
import { loadFavorites } from "./chain/favorites";
import { fetchTokenUsdHints, type PriceHint } from "./chain/prices";
import { decodeSyncPayload } from "./chain/syncPair";
import { FaqModal } from "./ui/FaqModal";
import { OtherSoftwareModal } from "./ui/OtherSoftwareModal";
import { CoreFooter } from "./ui/CoreFooter";
import { AppsPanel } from "./ui/AppsPanel";
import { ActivityPanel } from "./ui/ActivityPanel";
import { SwapPanel } from "./ui/SwapPanel";
import { SendPanel } from "./ui/SendPanel";
import { BagPanel } from "./ui/BagPanel";
import { ApprovePanel } from "./ui/ApprovePanel";
import { DevicePanel } from "./ui/DevicePanel";
import { TopStrip } from "./ui/TopStrip";
import { DeskTools } from "./ui/DeskTools";
import { SettingsModal } from "./ui/SettingsModal";
import {
  type A11yPrefs,
  type ThemePref,
  applyA11y,
  applyTheme,
  loadA11y,
  loadPrivacyHide,
  loadTheme,
  saveA11y,
  savePrivacyHide,
  saveWatch,
} from "./ui/deskStorage";
import {
  loadHexModule,
  loadMascot,
} from "./ui/modules";
import { t } from "./i18n/en";
import { getFocusable, trapTabKey } from "./a11y/focusTrap";

export type PulseTrezorProps = {
  /** Default 369. Standalone App uses 943. */
  defaultChainId?: DeskChainId;
  /** Network select (Pulse + test + ETH peers). Lab: true. */
  showTestnet?: boolean;
  /** Host RPC override; user can also set under Settings. */
  rpc?: RpcOverride;
  /** Settings (RPC). Default true. */
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
  const [busy, setBusy] = useState(false);
  const bagRef = useRef<{ clearBagFace: () => void } | null>(null);
  const sendRef = useRef<{
    clearSendDraft: () => void;
    clearSendHard: () => void;
  } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [softwareOpen, setSoftwareOpen] = useState(false);
  const [a11y, setA11y] = useState<A11yPrefs>(() => loadA11y());
  const [privacyHide, setPrivacyHide] = useState(() => loadPrivacyHide());
  const [theme, setTheme] = useState<ThemePref>(() => loadTheme());
  const [hexModule, setHexModule] = useState(() => loadHexModule());
  const [mascotOn, setMascotOn] = useState(() => loadMascot());
  const [favs, setFavs] = useState<string[]>(() => loadFavorites(369));
  const [priceHints, setPriceHints] = useState<PriceHint[]>([]);
  const [deepWcUri, setDeepWcUri] = useState<string | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const settingsBtnRef = useRef<HTMLButtonElement | null>(null);
  const [chainId, setChainId] = useState<DeskChainId>(defaultChainId);
  const [copied, setCopied] = useState(false);
  const [asset, setAsset] = useState<"PLS" | string>("PLS");
  const [nonceHint, setNonceHint] = useState<number | null>(null);
  const [addressBook, setAddressBook] = useState<BookEntry[]>(() =>
    loadAddressBook(),
  );
  const [bookLabelDraft, setBookLabelDraft] = useState("");
  const [actionTab, setActionTab] = useState<
    "send" | "swap" | "sites" | "approve" | "apps"
  >("send");
  const [bagTab, setBagTab] = useState<"tokens" | "nfts" | "stakes">("tokens");

  const bagRefreshRef = useRef<
    | ((addr: Address, cid: DeskChainId) => void | Promise<void>)
    | null
  >(null);

  const {
    warm,
    suite,
    connecting,
    listing,
    session,
    watch,
    setWatch,
    accountIndex,
    setAccountIndex,
    accountList,
    accountCount,
    setAccountCount,
    deviceId,
    suiteChannel,
    deviceHints,
    active,
    canSign,
    selectListedAccount,
    onCancelConnect,
    onCancelBusy,
    onLoadAccounts,
    onConnect,
    onDisconnect,
    onForget: onForgetSession,
  } = useDeskConnect({
    setErr,
    setBusy,
    chainId,
    rpc,
    onDisconnectExtras: () => {
      sendRef.current?.clearSendDraft();
    },
    onForgetExtras: () => {
      bagRef.current?.clearBagFace();
      sendRef.current?.clearSendHard();
    },
  });

  function onForget() {
    onForgetSession();
  }

  const {
    pack,
    effectiveRpc,
    activeRpcUrl,
    defaultRpcUrl,
    rpcOptions,
    rpcSelectValue,
    rpcDraft,
    setRpcDraft,
    setRpcCustomMode,
    rpcHealthMs,
    setRpcHealthMs,
    rpcHealth,
    applyRpc,
    onSaveRpc,
  } = useDeskRpc({
    chainId,
    rpc,
    active,
    setErr,
    refreshBalances: (addr, cid) => {
      void bagRefreshRef.current?.(addr, cid);
    },
  });

  const bag = useDeskBag({
    active,
    accountList,
    chainId,
    effectiveRpc,
    bagTab,
    asset,
    setAsset,
    setErr,
  });
  bagRef.current = bag;
  const {
    balance,
    acctPls,
    acctHexStakes,
    balBusy,
    tokenRows,
    customRows,
    fullBag,
    bagBusy,
    activity,
    actBusy,
    actErr,
    actFilter,
    setActFilter,
    actLimit,
    setActLimit,
    actHasMore,
    nfts,
    nftsTruncated,
    nftBusy,
    nftErr,
    hideZeroBal,
    setHideZeroBal,
    importAddr,
    setImportAddr,
    importBusy,
    setImportBusy,
    refreshBalances,
    refreshActivity,
    refreshNfts,
    onLoadFullBag,
  } = bag;
  bagRefreshRef.current = refreshBalances;

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


  const send = useDeskSend({
    session,
    chainId,
    effectiveRpc,
    currencySymbol: pack.currency.symbol,
    asset,
    selectedToken,
    selectedCustom: selectedCustom ?? null,
    balance,
    tokenRows,
    customRows,
    fullBag,
    setBusy,
    setErr,
    refreshBalances,
    refreshActivity,
  });
  sendRef.current = send;
  const {
    to,
    setTo,
    amount,
    setAmount,
    feeHint,
    feePreview,
    gasSpeed,
    setGasSpeed,
    tipGwei,
    setTipGwei,
    maxFeeGwei,
    setMaxFeeGwei,
    lastTx,
    setLastTx,
    setStuckTx,
    txStatus,
    setTxStatus,
    hashCopied,
    setHashCopied,
    nonceOverride,
    setNonceOverride,
    callData,
    setCallData,
    callTo,
    setCallTo,
    customCallOpen,
    setCustomCallOpen,
    mainnetSendAcked,
    mainnetSendAck,
    setMainnetSendAck,
    applyGasSpeed,
    onMaxSend,
    onSend,
    onSpeedUp,
    onCancelStuck,
    onCustomCall,
  } = send;

  const {
    nftApprovals,
    approvals,
    apprMeta,
    apprBusy,
    apprErr,
    revokeSel,
    setRevokeSel,
    approveMaxAck,
    setApproveMaxAck,
    spender,
    setSpender,
    approveAmt,
    setApproveAmt,
    approvalKey,
    refreshApprovals,
    onRevokeNft,
    onRevoke,
    onBulkRevoke,
    onApprove,
  } = useDeskApprovals({
    active,
    session,
    chainId,
    effectiveRpc,
    fullBag,
    asset,
    selectedToken,
    selectedCustom: selectedCustom ?? null,
    setBusy,
    setErr,
    setLastTx,
    setStuckTx,
    setTxStatus,
    refreshBalances,
    refreshActivity,
  });

  const {
    swapIn,
    setSwapIn,
    swapOut,
    setSwapOut,
    swapAmt,
    setSwapAmt,
    slipBps,
    setSlipBps,
    deadlineMin,
    setDeadlineMin,
    swapQuote,
    setSwapQuote,
    swapQuoteBusy,
    swapNeedApprove,
    refreshSwapQuote,
    onSwapApproveRouter,
    onSwap,
  } = useDeskSwap({
    session,
    chainId,
    effectiveRpc,
    setBusy,
    setErr,
    setLastTx,
    setStuckTx,
    setTxStatus,
    refreshBalances,
    refreshActivity,
  });

  const {
    watchImportBusy,
    setWatchImportBusy,
    exportWatchJson,
    exportBagSnapshot,
    applyWatchImportText,
    onImportWatchFile,
  } = useDeskWatch({
    active,
    session,
    watch,
    accountList,
    deviceId,
    chainId,
    balance,
    tokenRows,
    customRows,
    fullBag,
    setWatch,
    setAccountIndex,
    setAddressBook,
    setErr,
    refreshBalances,
  });

  const { injectEth, setInjectEth } = useDeskInject({
    session,
    chainId,
    effectiveRpc,
    setChainId,
    refreshBalances,
  });

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
    <>
      <DeskTools
        faqOpen={faqOpen}
        onOpenFaq={() => {
          setSettingsOpen(false);
          setSoftwareOpen(false);
          setFaqOpen(true);
        }}
        softwareOpen={softwareOpen}
        onOpenSoftware={() => {
          setSettingsOpen(false);
          setFaqOpen(false);
          setSoftwareOpen(true);
        }}
        privacyHide={privacyHide}
        togglePrivacyHide={togglePrivacyHide}
        showSettings={showSettings}
        settingsOpen={settingsOpen}
        onOpenSettings={() => {
          setFaqOpen(false);
          setSoftwareOpen(false);
          setSettingsOpen(true);
        }}
        settingsBtnRef={settingsBtnRef}
      />
      {showSettings && settingsOpen ? (
        <SettingsModal
          panelRef={settingsRef}
          onClose={() => setSettingsOpen(false)}
          onOpenFaq={() => {
            setSettingsOpen(false);
            setSoftwareOpen(false);
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
    </>
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
      <TopStrip
        activeAddress={active?.address ?? null}
        privacyHide={privacyHide}
        copied={copied}
        onCopy={onCopy}
        watch={!!watch}
        onForget={onForget}
        chainId={chainId}
      />
      <div className="grid">
        <DevicePanel
          showTestnet={showTestnet}
          chainId={chainId}
          setChainId={setChainId}
          setAsset={setAsset}
          accountCount={accountCount}
          setAccountCount={setAccountCount}
          connecting={connecting}
          listing={listing}
          busy={busy}
          session={session}
          active={active}
          canSign={canSign}
          onLoadAccounts={onLoadAccounts}
          onConnect={onConnect}
          onCancelConnect={onCancelConnect}
          onCancelBusy={onCancelBusy}
          onDisconnect={onDisconnect}
          accountIndex={accountIndex}
          suiteCue={suiteCue}
          suiteChannel={suiteChannel}
          deviceHints={deviceHints}
          accountList={accountList}
          acctPls={acctPls}
          acctHexStakes={acctHexStakes}
          packSymbol={pack.currency.symbol}
          privacyHide={privacyHide}
          hexModule={hexModule}
          selectListedAccount={selectListedAccount}
          setBagTab={setBagTab}
        />

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
          actHasMore={actHasMore}
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

      <CoreFooter />
      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
      <OtherSoftwareModal
        open={softwareOpen}
        onClose={() => setSoftwareOpen(false)}
        activeAddress={active?.address ?? null}
      />
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
