/**
 * PulseX swap quote / approve / execute for the desk.
 */
import {
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { maxUint256, type Address, type Hash } from "viem";
import type { DeskChainId, RpcOverride } from "../chain/client";
import { waitForTxStatus } from "../chain/client";
import { encodeErc20Approve } from "../chain/tokens";
import {
  PULSEX_V2_ROUTER,
  preparePulsexSwap,
  quotePulsexSwap,
  routerAllowance,
  type SwapAsset,
  type SwapQuote,
} from "../chain/pulsex";
import { humanTrezorError } from "../trezor/connect";
import {
  sendPlsWithTrezor,
  type BroadcastResult,
} from "../trezor/signPulseTx";
import type { Session } from "../ui/deskStorage";

type TxStatus = "pending" | "confirmed" | "reverted" | "timeout" | null;

const HEX_MAIN = "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39" as Address;

export function useDeskSwap(opts: {
  session: Session | null;
  chainId: DeskChainId;
  effectiveRpc: RpcOverride | undefined;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setErr: Dispatch<SetStateAction<string | null>>;
  setLastTx: Dispatch<SetStateAction<Hash | null>>;
  setStuckTx: Dispatch<SetStateAction<BroadcastResult | null>>;
  setTxStatus: Dispatch<SetStateAction<TxStatus>>;
  refreshBalances: (addr: Address, cid: DeskChainId) => void | Promise<void>;
  refreshActivity: (addr: Address, cid: DeskChainId) => void | Promise<void>;
}) {
  const {
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
  } = opts;

  const [swapIn, setSwapIn] = useState<SwapAsset>("PLS");
  const [swapOut, setSwapOut] = useState<SwapAsset>(HEX_MAIN);
  const [swapAmt, setSwapAmt] = useState("");
  const [slipBps, setSlipBps] = useState(50); // 0.50%
  const [deadlineMin, setDeadlineMin] = useState(20);
  const [swapQuote, setSwapQuote] = useState<SwapQuote | null>(null);
  const [swapQuoteBusy, setSwapQuoteBusy] = useState(false);
  const [swapNeedApprove, setSwapNeedApprove] = useState(false);

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

  return {
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
  };
}
