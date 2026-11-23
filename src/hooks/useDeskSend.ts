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
  deadEndNativeSend,
  deadEndTokenTransfer,
} from "../chain/deadEndRecipients";
import {
  waitForTxStatus,
  type DeskChainId,
  type RpcOverride,
} from "../chain/client";
import type { CustomToken } from "../chain/customTokens";
import type { FullBag } from "../chain/portfolio";
import {
  encodeErc20Transfer,
  parseTokenAmount,
  type PackToken,
} from "../chain/tokens";
import { humanTrezorError } from "../trezor/connect";
import {
  bumpFees,
  loadBroadcastMeta,
  previewFees,
  sendPlsWithTrezor,
  type BroadcastResult,
  type FeePreview,
} from "../trezor/signPulseTx";
import {
  loadFirstMainnetSendAcked,
  saveFirstMainnetSendAcked,
  type Session,
} from "../ui/deskStorage";
import { trimGwei } from "../ui/swapFace";

type TokenRow = { token: PackToken; raw: bigint; formatted: string };
type SelectedToken = {
  address: Address | string;
  symbol: string;
  decimals: number;
} | null;
type GasSpeed = "normal" | "faster" | "fastest";
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
    setBusy,
    setErr,
    refreshBalances,
    refreshActivity,
  } = opts;

  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [feeHint, setFeeHint] = useState<string | null>(null);
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null);
  const [gasSpeed, setGasSpeed] = useState<GasSpeed>("normal");
  const [maxFeeGwei, setMaxFeeGwei] = useState("");
  const [tipGwei, setTipGwei] = useState("");
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [stuckTx, setStuckTx] = useState<BroadcastResult | null>(null);
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

  function applyGasSpeed(preview: FeePreview | null, speed: GasSpeed) {
    setGasSpeed(speed);
    if (!preview || speed === "normal") {
      setMaxFeeGwei("");
      setTipGwei("");
      return;
    }
    const tipMul = speed === "faster" ? [3n, 2n] : [2n, 1n];
    const maxMul = speed === "faster" ? [5n, 4n] : [3n, 2n];
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
          const feeStr = formatEther(feeWei);
          const wild = feeWei > 100_000_000_000_000_000n;
          setFeeHint(
            wild
              ? `~${feeStr} ${currencySymbol} fee · gas ${p.gas.toString()} (network quote — testnets can be wild)`
              : `~${feeStr} ${currencySymbol} fee · gas ${p.gas.toString()}`,
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
    if (
      chainId !== 369 &&
      chainId !== 943 &&
      chainId !== 1 &&
      chainId !== 11155111 &&
      chainId !== 17000
    ) {
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
            throw new Error(
              "Pack tokens are mainnet only — import a custom token for testnet.",
            );
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
          saveFirstMainnetSendAcked();
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

  function clearSendDraft() {
    setLastTx(null);
    setTo("");
    setAmount("");
  }

  function clearSendHard() {
    clearSendDraft();
    setStuckTx(null);
    setTxStatus(null);
  }

  return {
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
