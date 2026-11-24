/**
 * Face explain + dry-run — clearSign strip + Temper/RPC simulate (one-shot).
 */
import { useState } from "react";
import type { Address, Hex } from "viem";
import { simulateDeskTx } from "../chain/txSimulate";
import {
  clearSignTx,
  explainClearLines,
  worstTone,
} from "../wc/clearSign";
import type { DeskChainId, RpcOverride } from "../chain/client";

export function TxExplain(props: {
  chainId: DeskChainId;
  account: Address | null;
  to: string;
  data?: string;
  valueWei?: bigint;
  rpc?: RpcOverride;
}) {
  const data = props.data?.trim() || "0x";
  const valueHex =
    props.valueWei != null && props.valueWei > 0n
      ? `0x${props.valueWei.toString(16)}`
      : undefined;
  const lines = clearSignTx({
    to: props.to || null,
    data,
    valueHex,
    method: "eth_sendTransaction",
    dappUrl: "pulse-perch://desk",
    chainId: props.chainId,
  });
  const tone = worstTone(lines);
  const [sim, setSim] = useState<string | null>(null);
  const [simTone, setSimTone] = useState<"ok" | "warn" | "danger" | null>(
    null,
  );
  const [deltas, setDeltas] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  if (!props.to) return null;

  return (
    <div className={`clear-box ${tone} tx-explain`}>
      <p className="muted fee">Explain: {explainClearLines(lines)}</p>
      <ul className="clear-list">
        {lines.slice(0, 6).map((l, i) => (
          <li key={i} className={l.tone}>
            <span className="t">{l.title}</span>
            <span className="d">{l.detail}</span>
          </li>
        ))}
      </ul>
      {sim ? (
        <p
          className={
            simTone === "danger"
              ? "warn-line"
              : simTone === "warn"
                ? "muted fee"
                : "muted fee"
          }
          role="status"
        >
          {sim}
        </p>
      ) : null}
      {deltas.length ? (
        <ul className="clear-list sim-deltas" aria-label="Balance change">
          {deltas.slice(0, 6).map((line, i) => (
            <li key={i} className={simTone === "danger" ? "danger" : "ok"}>
              <span className="t">Δ</span>
              <span className="d">{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        type="button"
        className="btn ghost"
        disabled={busy || !props.account}
        onClick={() => {
          if (!props.account) return;
          setBusy(true);
          setSim("Simulating…");
          setSimTone(null);
          setDeltas([]);
          void simulateDeskTx({
            chainId: props.chainId,
            from: props.account,
            to: props.to as Address,
            valueWei: props.valueWei ?? 0n,
            data: data as Hex,
            rpc: props.rpc,
          })
            .then((r) => {
              setSimTone(r.tone);
              setSim(r.detail);
              setDeltas(r.balanceHints);
            })
            .catch((e) => {
              setSimTone("danger");
              setSim(
                `Dry-run failed — ${e instanceof Error ? e.message : String(e)}`,
              );
              setDeltas([]);
            })
            .finally(() => setBusy(false));
        }}
      >
        {busy ? "…" : "Dry-run"}
      </button>
    </div>
  );
}
