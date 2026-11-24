/**
 * In-desk PulseX V2 quote → Trezor sign.
 */
import { formatUnits, type Address } from "viem";
import type { DeskChainId } from "../chain/client";
import {
  swapTokenMeta,
  type SwapAsset,
  type SwapQuote,
} from "../chain/pulsex";
import { SWAP_FACE, swapAssetLabel } from "./swapFace";

type Props = {
  canSign: boolean;
  chainId: DeskChainId;
  busy: boolean;
  swapIn: SwapAsset;
  setSwapIn: (a: SwapAsset) => void;
  swapOut: SwapAsset;
  setSwapOut: (a: SwapAsset) => void;
  swapAmt: string;
  setSwapAmt: (v: string) => void;
  slipBps: number;
  setSlipBps: (n: number) => void;
  deadlineMin: number;
  setDeadlineMin: (n: number) => void;
  swapQuote: SwapQuote | null;
  setSwapQuote: (q: SwapQuote | null) => void;
  swapQuoteBusy: boolean;
  swapNeedApprove: boolean;
  refreshSwapQuote: () => void;
  onSwapApproveRouter: () => void;
  onSwap: () => void;
};

export function SwapPanel({
  canSign,
  chainId,
  busy,
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
}: Props) {
  return chainId !== 369 ? (
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
              disabled={busy || !swapQuote || swapNeedApprove || swapQuoteBusy}
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
              (slip {(slipBps / 100).toFixed(2)}%) · PulseX V2 · ends in{" "}
              {deadlineMin}m
            </p>
          ) : (
            <p className="muted fee">
              Quote uses PulseX V2. Token→token hops via WPLS. Confirm path on
              Trezor. Prefer Apps for the full PulseX UI:{" "}
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
  );
}
