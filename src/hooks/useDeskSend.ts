/**
 * Send / gas / stuck-tx handlers for the desk.
 */
import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  formatEther,
  formatGwei,
  isAddress,
  isHex,
  parseEther,
  parseGwei,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import {
  sendLookalikePoison,
  type BookEntry,
} from "../chain/addressBook";
import type { ActivityRow } from "../chain/activity";
import {
  deadEndNativeSend,
  deadEndTokenTransfer,
} from "../chain/deadEndRecipients";
import {
  hasChainPack,
  isNativeAsset,
  makePublicClient,
  waitForTxStatus,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";
import type { CustomToken } from "../chain/customTokens";
import type { GasSpeed } from "../chain/gasOracle";
import type { FullBag } from "../chain/portfolio";
import {
  encodeErc20Transfer,
  parseTokenAmount,
  type PackToken,
} from "../chain/tokens";
import { humanTrezorError } from "../trezor/connect";
import {
  bumpFeesAtStep,
  clearPendingBroadcast,
  nextPendingNonce,
  rememberPendingBroadcast,
} from "../trezor/rbf";
import {
  loadBroadcastMeta,
  previewFees,
  sendPlsWithTrezor,
  type BroadcastResult,
  type FeePreview,
  type SendPhase,
} from "../trezor/signPulseTx";
import {
  loadFirstMainnetSendAcked,
  saveFirstMainnetSendAcked,
  type Session,
} from "../ui/deskStorage";
import { recordLocalSend } from "../ui/lightMetrics";
import { trimGwei } from "../ui/swapFace";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };
type SelectedToken = {
  address: Address | string;
  symbol: string;
  decimals: number;
} | null;
type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

export function useDeskSend(opts: {
  session: Session | null;
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  currencySymbol: string;
  asset: "PLS" | string;
  selectedToken: SelectedToken;
  selectedCustom: CustomToken | null | undefined;
  balance: bigint | null;
  tokenRows: TokenRow[];
  customRows: { token: CustomToken; raw: bigint; formatted: string }[];
  fullBag: FullBag | null;
  addressBook: BookEntry[];
  activity: ActivityRow[];
  setBusy: Dispatch<SetStateAction<boolean>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  refreshBalances: (addr: Address, cid: DeskChainId) => void | Promise<void>;
  refreshActivity: (addr: Address, cid: DeskChainId) => void | Promise<void>;
}) {
  const {
    session,
    chainId,
    effectiveRpc,
    currencySymbol,
    asset,
    selectedToken,
    selectedCustom,
    balance,
    tokenRows,
    customRows,
    fullBag,
    addressBook,
    activity,
    setBusy,
    setErr,
    refreshBalances,
    refreshActivity,
  } = opts;

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [sendPhase, setSendPhase] = useState<SendPhase | null>(null);
  const [feeHint, setFeeHint] = useState<string | null>(null);
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null);
  const [gasSpeed, setGasSpeed] = useState<GasSpeed>("standard");
  const [maxFeeGwei, setMaxFeeGwei] = useState("");
  const [tipGwei, setTipGwei] = useState("");
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [stuckTx, setStuckTx] = useState<BroadcastResult | null>(null);
  /** ynatm ladder step — increments on each Speed up / Cancel while still pending. */
  const [rbfStep, setRbfStep] = useState(0);
  const [txStatus, setTxStatus] = useState<TxStatus>(null);
  const [hashCopied, setHashCopied] = useState(false);
  const [nonceHint, setNonceHint] = useState<number | null>(null);
  const [nonceOverride, setNonceOverride] = useState("");
  const [callData, setCallData] = useState("");
  const [callTo, setCallTo] = useState("");
  const [customCallOpen, setCustomCallOpen] = useState(false);
  const [mainnetSendAcked, setMainnetSendAcked] = useState(() =>
    loadFirstMainnetSendAcked(),
  );
  const [mainnetSendAck, setMainnetSendAck] = useState(false);
  /** Required when recipient is a lookalike of book / prior Out. */
  const [poisonAck, setPoisonAck] = useState(false);

  useEffect(() => {
    setPoisonAck(false);
  }, [to]);

  function applyGasSpeed(preview: FeePreview | null, speed: GasSpeed) {
    setGasSpeed(speed);
    if (!preview || speed === "standard") {
      setMaxFeeGwei("");
      setTipGwei("");
      return;
    }
    const tier = preview.tiers?.[speed];
    if (tier) {
      if (preview.eip1559) {
        setTipGwei(trimGwei(formatGwei(tier.maxPriorityFeePerGas)));
        setMaxFeeGwei(trimGwei(formatGwei(tier.maxFeePerGas)));
      } else {
        setTipGwei("");
        setMaxFeeGwei(trimGwei(formatGwei(tier.gasPrice)));
      }
      return;
    }
    // Oracle miss → old multiplier ladder off the network quote.
    const tipMul =
      speed === "slow" ? [4n, 5n] : speed === "fast" ? [3n, 2n] : [2n, 1n];
    const maxMul =
      speed === "slow" ? [9n, 10n] : speed === "fast" ? [5n, 4n] : [3n, 2n];
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
          if (isNativeAsset(asset, chainId)) {
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
          const tier = p.tiers?.[gasSpeed];
          const maxFee =
            tier && p.eip1559
              ? tier.maxFeePerGas
              : (p.maxFeePerGas ?? 0n);
          const gasPrice =
            tier && !p.eip1559 ? tier.gasPrice : (p.gasPrice ?? 0n);
          const feeWei = p.eip1559
            ? p.gas * maxFee
            : p.gas * gasPrice;
          const feeStr = formatEther(feeWei);
          const wild = feeWei > 100_000_000_000_000_000n;
          const src = p.tiers ? "Valve" : "RPC";
          setFeeHint(
            wild
              ? `~${feeStr} ${currencySymbol} fee · gas ${p.gas.toString()} (${src} · testnets can be wild)`
              : `~${feeStr} ${currencySymbol} fee · gas ${p.gas.toString()} · ${src} ${gasSpeed}`,
          );
          if (gasSpeed !== "standard") {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    session,
    to,
    amount,
    chainId,
    currencySymbol,
    asset,
    selectedToken,
    effectiveRpc,
  ]);

  function onMaxSend() {
    if (isNativeAsset(asset, chainId)) {
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
    if (!hasChainPack(chainId)) {
      setErr("Add this chain ID (and RPC) under Network before sending.");
      return;
    }
    if (chainId === 369 && !mainnetSendAcked && !mainnetSendAck) {
      setErr("Confirm the mainnet first-send warning before signing.");
      return;
    }
    if (isNativeAsset(asset, chainId)) {
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
    const poison = sendLookalikePoison(to, addressBook, activity);
    if (poison && !poisonAck) {
      setErr(
        `Lookalike of “${poison.label}” — same start/end, different middle. Confirm the poison warning before signing.`,
      );
      return;
    }
    try {
      if (isNativeAsset(asset, chainId)) {
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
    setSendPhase("prepare");
    void (async () => {
      try {
        let value = 0n;
        let data: `0x${string}` | undefined;
        let txTo = to as Address;
        if (isNativeAsset(asset, chainId)) {
          value = parseEther(amount);
        } else {
          if (!selectedToken) throw new Error("Pick a token.");
          if (chainId !== 369 && !selectedCustom) {
            throw new Error(
              "Pack tokens are mainnet only — import a custom token for testnet.",
            );
          }
          const raw = parseTokenAmount(amount, selectedToken.decimals);
          if (raw <= 0n) throw new Error("Amount must be > 0.");
          data = encodeErc20Transfer(to as Address, raw);
          txTo = selectedToken.address as Address;
        }
        if (isNativeAsset(asset, chainId) && value <= 0n) {
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
            fee.gasPrice = wei;
          }
          if (tipGwei.trim()) {
            fee.maxPriorityFeePerGas = parseGwei(tipGwei.trim());
          }
        }
        let nonceN = nonceOverride.trim()
          ? Number(nonceOverride.trim())
          : undefined;
        if (nonceN == null || !Number.isFinite(nonceN)) {
          const rpcN = await makePublicClient(
            chainId,
            effectiveRpc,
          ).getTransactionCount({
            address: session.address,
            blockTag: "pending",
          });
          nonceN = nextPendingNonce(chainId, session.address, rpcN);
        }
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: txTo,
          value,
          data,
          derivationIndex: session.derivationIndex,
          derivationPath: session.derivationPath,
          rpc: effectiveRpc,
          fee,
          nonce: nonceN,
          onPhase: setSendPhase,
        });
        setLastTx(broadcast.hash);
        recordLocalSend();
        setStuckTx(broadcast);
        setRbfStep(0);
        setTxStatus("pending");
        rememberPendingBroadcast(
          chainId,
          session.address,
          broadcast.nonce,
          broadcast.hash,
        );
        if (chainId === 369 && !mainnetSendAcked) {
          saveFirstMainnetSendAcked();
          setMainnetSendAcked(true);
        }
        void refreshBalances(session.address, chainId);
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              clearPendingBroadcast(chainId, session.address, broadcast.hash);
              setStuckTx(null);
              setRbfStep(0);
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
        setSendPhase(null);
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
    setSendPhase("prepare");
    void (async () => {
      try {
        const meta = await resolveStuckMeta();
        if (!meta) {
          throw new Error(
            "No pending tx to speed up — it may already be mined.",
          );
        }
        const step = rbfStep;
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: meta.to,
          value: meta.value,
          data: meta.data,
          derivationIndex: session.derivationIndex,
          derivationPath: session.derivationPath,
          rpc: effectiveRpc,
          nonce: meta.nonce,
          fee: bumpFeesAtStep(meta, step),
          onPhase: setSendPhase,
        });
        setLastTx(broadcast.hash);
        recordLocalSend();
        setStuckTx(broadcast);
        setRbfStep(step + 1);
        setTxStatus("pending");
        rememberPendingBroadcast(
          chainId,
          session.address,
          broadcast.nonce,
          broadcast.hash,
        );
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              clearPendingBroadcast(chainId, session.address, broadcast.hash);
              setStuckTx(null);
              setRbfStep(0);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      } finally {
        setSendPhase(null);
        setBusy(false);
      }
    })();
  }

  function onCancelStuck() {
    if (!session) return;
    setErr(null);
    setBusy(true);
    setSendPhase("prepare");
    void (async () => {
      try {
        const meta = await resolveStuckMeta();
        if (!meta) {
          throw new Error(
            "No pending tx to cancel — it may already be mined.",
          );
        }
        const step = rbfStep;
        const broadcast = await sendPlsWithTrezor({
          chainId,
          account: session.address,
          to: session.address,
          value: 0n,
          data: "0x",
          derivationIndex: session.derivationIndex,
          derivationPath: session.derivationPath,
          rpc: effectiveRpc,
          nonce: meta.nonce,
          fee: bumpFeesAtStep({ ...meta, gas: 21_000n }, step),
          onPhase: setSendPhase,
        });
        setLastTx(broadcast.hash);
        recordLocalSend();
        setStuckTx(broadcast);
        setRbfStep(step + 1);
        setTxStatus("pending");
        rememberPendingBroadcast(
          chainId,
          session.address,
          broadcast.nonce,
          broadcast.hash,
        );
        void waitForTxStatus(chainId, broadcast.hash, effectiveRpc).then(
          (st) => {
            setTxStatus(st);
            if (st === "confirmed" || st === "reverted") {
              clearPendingBroadcast(chainId, session.address, broadcast.hash);
              setStuckTx(null);
              setRbfStep(0);
              void refreshBalances(session.address, chainId);
              void refreshActivity(session.address, chainId);
            }
          },
        );
      } catch (e) {
        setErr(humanTrezorError(e instanceof Error ? e.message : String(e)));
      } finally {
        setSendPhase(null);
        setBusy(false);
      }
    })();
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
    setSendPhase("prepare");
    void sendPlsWithTrezor({
      chainId,
      account: session.address,
      to: callTo as Address,
      value,
      data: data as Hex,
      derivationIndex: session.derivationIndex,
      derivationPath: session.derivationPath,
      rpc: effectiveRpc,
      onPhase: setSendPhase,
    })
      .then((broadcast) => {
        setLastTx(broadcast.hash);
        recordLocalSend();
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
      .finally(() => {
        setSendPhase(null);
        setBusy(false);
      });
  }

  function clearSendDraft() {
    setLastTx(null);
    setTo("");
    setAmount("");
  }

  function clearSendHard() {
    clearSendDraft();
    setStuckTx(null);
    setRbfStep(0);
    setTxStatus(null);
    if (session) clearPendingBroadcast(chainId, session.address);
  }

  return {
    to,
    setTo,
    amount,
    setAmount,
    sendPhase,
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
    stuckTx,
    setStuckTx,
    txStatus,
    setTxStatus,
    hashCopied,
    setHashCopied,
    nonceHint,
    setNonceHint,
    nonceOverride,
    setNonceOverride,
    callData,
    setCallData,
    callTo,
    setCallTo,
    customCallOpen,
    setCustomCallOpen,
    mainnetSendAcked,
    setMainnetSendAcked,
    mainnetSendAck,
    setMainnetSendAck,
    poisonAck,
    setPoisonAck,
    applyGasSpeed,
    onMaxSend,
    onSend,
    onSpeedUp,
    onCancelStuck,
    onCustomCall,
    clearSendDraft,
    clearSendHard,
  };
}
